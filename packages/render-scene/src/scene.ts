import { type Atmosphere, atmosphereWgsl, createAtmosphere } from './atmosphere/atmosphere.ts'
import type { AtmosphereConstants } from './atmosphere/constants.ts'
import { CAMERA_UNIFORM_BYTES, cameraPose, cameraUniform, cameraWgsl, type Vec3, viewProjection } from './camera.ts'
import type { Gpu } from './gpu.ts'
import { createMarkerPass } from './markers.ts'
import { createBindGroup, createBindGroupLayout, createUniformBuffer } from './pipeline.ts'
import { type RenderSettings, sunDirection } from './settings.ts'
import { createSkyPass } from './sky.ts'
import { createPassTimestamps, type PassTimestamps } from './timestamps.ts'
import { createHdrTarget, DEPTH_FORMAT, HDR_FORMAT, type HdrTarget, hdrPassDescriptor, MSAA_SAMPLES } from './target.ts'
import { createTonemapPass } from './tonemap.ts'

/**
 * Timed passes, in frame order. The sea's compute work and its surface each have a pass of their own so the ocean's
 * budget lines (#23: FFT with post and mips, foam, surface draw) read one by one.
 */
const PASSES = ['ocean FFT', 'ocean foam', 'ocean surface', 'scene', 'tonemap'] as const
type PassName = (typeof PASSES)[number]

/** The camera as a layer sees it for one frame. */
export interface LayerView {
  /** World eye position, m. */
  readonly eye: Vec3
  /** The frame's view-projection for positions measured from `origin`, so a layer can keep its coordinates small. */
  viewProjectionFrom(origin: Vec3): Float32Array<ArrayBuffer>
}

/**
 * Something another renderer draws into the scene, such as render-ocean's surface. Renderers may not import each other,
 * so the layer is this shape and the tool joins the two.
 */
export interface SceneLayer {
  /** The frame's uploads, before any pass is encoded. */
  prepare(view: LayerView): void
  /** The layer's work that the draw reads, each in its own timed pass. */
  readonly compute?: {
    /** The sea's FFT, into a compute pass the scene opens. */
    readonly fft: (pass: GPUComputePassEncoder) => void
    /**
     * The foam buffer's update, which renders into the layer's own target, so the layer opens exactly one pass itself
     * with `timestampWrites`.
     */
    readonly foam: (encoder: GPUCommandEncoder, timestampWrites: GPURenderPassTimestampWrites | undefined) => void
  }
  /** Draws into an open scene pass; `sceneGroups` are the bind groups of `LayerTarget.sceneLayouts`. */
  draw(pass: GPURenderPassEncoder, sceneGroups: readonly GPUBindGroup[]): void
}

/** What a layer builds its pipelines against. */
export interface LayerTarget {
  readonly device: GPUDevice
  readonly format: GPUTextureFormat
  readonly sampleCount: number
  readonly depthFormat: GPUTextureFormat
  /** Declares the camera at group 0 and the atmosphere at group 1, which also holds the planet's radius. */
  readonly sceneWgsl: string
  readonly sceneLayouts: readonly GPUBindGroupLayout[]
}

/** What the frame shows besides the sky, owned by the caller. */
export interface SceneContent {
  /** The sea surface, drawn first in its own timed pass; without one the sky's planet ground shows. */
  readonly sea?: SceneLayer
  /** xyz per marker in world metres. */
  readonly markers: Float32Array<ArrayBuffer>
  /** The highest the sea's surface can reach, m above mean level; the eye stays above it. Absent: flat water. */
  readonly crest?: number
}

/**
 * The frame as render-scene draws it: the sea, then the sky where the sea is not and markers into the HDR target, then
 * tone mapping onto the canvas.
 */
export interface SceneRenderer {
  readonly atmosphere: Atmosphere
  /** Bind group layout of the camera uniform at group 0 of every scene pass (see `cameraWgsl`). */
  readonly cameraLayout: GPUBindGroupLayout
  /** For a renderer whose passes join the scene as a `SceneLayer`. */
  readonly layerTarget: LayerTarget
  /** Draws one frame at the canvas's current size. */
  render(settings: RenderSettings, content: SceneContent): void
  /** Milliseconds per pass from GPU timestamps, absent when the device has no `timestamp-query`. */
  readonly timings: ReadonlyMap<string, number> | undefined
  destroy(): void
}

export const createSceneRenderer = async (
  gpu: Gpu,
  canvas: HTMLCanvasElement,
  constants: AtmosphereConstants,
): Promise<SceneRenderer> => {
  const { device } = gpu
  const context = canvas.getContext('webgpu')
  if (context === null) throw new Error('The canvas has no WebGPU context.')
  context.configure({ device, format: gpu.canvasFormat, alphaMode: 'opaque' })

  const atmosphere = await createAtmosphere(device, constants)
  const cameraLayout = createBindGroupLayout(device, 'camera', GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, [
    { uniform: true },
  ])
  const camera = createUniformBuffer(device, 'camera', CAMERA_UNIFORM_BYTES)
  const cameraGroup = createBindGroup(device, 'camera', cameraLayout, [camera.buffer])
  const sky = createSkyPass(device, cameraLayout, atmosphere)
  const markers = createMarkerPass(device, cameraLayout, atmosphere)
  const tonemap = createTonemapPass(device, gpu.canvasFormat)
  const timestamps: PassTimestamps<PassName> | undefined = createPassTimestamps(device, gpu.timestampQuery, PASSES)

  // White balance on the Sun: dividing by its spectrum normalised to a mean of one makes direct sunlight neutral.
  const [s0, s1, s2] = constants.solarIrradiance.value
  const mean = (s0 + s1 + s2) / 3
  const whitePoint = [s0 / mean, s1 / mean, s2 / mean] as const

  let target: HdrTarget | undefined
  const targetFor = (width: number, height: number): HdrTarget => {
    if (target?.width === width && target.height === height) return target
    target?.destroy()
    const next = createHdrTarget(device, width, height)
    tonemap.setSource(next.resolve)
    target = next
    return next
  }

  const sceneGroups = [cameraGroup, atmosphere.bindGroup] as const

  return {
    atmosphere,
    cameraLayout,
    layerTarget: {
      device,
      format: HDR_FORMAT,
      sampleCount: MSAA_SAMPLES,
      depthFormat: DEPTH_FORMAT,
      sceneWgsl: cameraWgsl(0) + atmosphereWgsl(1),
      sceneLayouts: [cameraLayout, atmosphere.layout],
    },
    render: (settings, content) => {
      const width = Math.max(1, canvas.width)
      const height = Math.max(1, canvas.height)
      const hdr = targetFor(width, height)
      const pose = cameraPose(settings.camera, content.crest)
      const aspect = width / height
      camera.write(cameraUniform(pose, aspect))
      content.sea?.prepare({
        eye: pose.eye,
        viewProjectionFrom: (origin) =>
          viewProjection(
            { ...pose, eye: [pose.eye[0] - origin[0], pose.eye[1] - origin[1], pose.eye[2] - origin[2]] },
            aspect,
          ),
      })
      atmosphere.setSunDirection(sunDirection(settings.sunElevation, settings.sunAzimuth))
      const exposure = 2 ** -settings.exposureValue
      tonemap.setScale([exposure / whitePoint[0], exposure / whitePoint[1], exposure / whitePoint[2]])
      markers.setPositions(content.markers)

      const encoder = device.createCommandEncoder({ label: 'frame' })
      // Every timed pass exists in every frame, empty when there is nothing to encode, so its timing always has a line.
      const emptyPass = (label: PassName): GPUComputePassEncoder => {
        const writes = timestamps?.writesFor(label)
        return encoder.beginComputePass({ label, ...(writes && { timestampWrites: writes }) })
      }
      const fftPass = emptyPass('ocean FFT')
      content.sea?.compute?.fft(fftPass)
      fftPass.end()
      const foam = content.sea?.compute?.foam
      if (foam === undefined) emptyPass('ocean foam').end()
      else foam(encoder, timestamps?.writesFor('ocean foam'))
      // The sea clears the target and draws first, alone, so its timestamp is the surface draw and nothing else. The
      // sky then fills only what is still at the far plane, and the markers depth-test against the sea.
      const seaPass = encoder.beginRenderPass(
        hdrPassDescriptor(hdr, 'ocean surface', { first: true, last: false }, timestamps?.writesFor('ocean surface')),
      )
      content.sea?.draw(seaPass, sceneGroups)
      seaPass.end()
      const scenePass = encoder.beginRenderPass(
        hdrPassDescriptor(hdr, 'scene', { first: false, last: true }, timestamps?.writesFor('scene')),
      )
      sky.draw(scenePass, cameraGroup)
      markers.draw(scenePass, cameraGroup)
      scenePass.end()
      const toneWrites = timestamps?.writesFor('tonemap')
      const tonePass = encoder.beginRenderPass({
        label: 'tonemap',
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: [0, 0, 0, 1],
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        ...(toneWrites && { timestampWrites: toneWrites }),
      })
      tonemap.draw(tonePass)
      tonePass.end()
      timestamps?.resolve(encoder)
      device.queue.submit([encoder.finish()])
      timestamps?.read()
    },
    get timings() {
      return timestamps?.latest
    },
    destroy: () => {
      target?.destroy()
      markers.destroy()
      atmosphere.destroy()
      camera.buffer.destroy()
      context.unconfigure()
    },
  }
}
