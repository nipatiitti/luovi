import { type Atmosphere, createAtmosphere } from './atmosphere/atmosphere.ts'
import type { AtmosphereConstants } from './atmosphere/constants.ts'
import { CAMERA_UNIFORM_BYTES, cameraPose, cameraUniform } from './camera.ts'
import type { Gpu } from './gpu.ts'
import { createFlatSeaPass } from './flatSea.ts'
import { createMarkerPass } from './markers.ts'
import { createBindGroup, createBindGroupLayout, createUniformBuffer } from './pipeline.ts'
import { type RenderSettings, sunDirection } from './settings.ts'
import { createSkyPass } from './sky.ts'
import { createPassTimestamps, type PassTimestamps } from './timestamps.ts'
import { createHdrTarget, type HdrTarget, hdrPassDescriptor } from './target.ts'
import { createTonemapPass } from './tonemap.ts'

const PASSES = ['scene', 'tonemap'] as const

/** What the frame shows besides sky and sea, owned by the caller. */
export interface SceneContent {
  /** xyz per marker in world metres. */
  readonly markers: Float32Array<ArrayBuffer>
}

/**
 * The frame as render-scene draws it today: sky, the flat sea and markers into the HDR target, then tone mapping onto
 * the canvas.
 */
export interface SceneRenderer {
  readonly atmosphere: Atmosphere
  /** Bind group layout of the camera uniform at group 0 of every scene pass (see `cameraWgsl`). */
  readonly cameraLayout: GPUBindGroupLayout
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
  const sea = createFlatSeaPass(device, cameraLayout, atmosphere)
  const markers = createMarkerPass(device, cameraLayout, atmosphere)
  const tonemap = createTonemapPass(device, gpu.canvasFormat)
  const timestamps: PassTimestamps | undefined = createPassTimestamps(device, gpu.timestampQuery, PASSES)

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

  return {
    atmosphere,
    cameraLayout,
    render: (settings, content) => {
      const width = Math.max(1, canvas.width)
      const height = Math.max(1, canvas.height)
      const hdr = targetFor(width, height)
      camera.write(cameraUniform(cameraPose(settings.camera), width / height))
      atmosphere.setSunDirection(sunDirection(settings.sunElevation, settings.sunAzimuth))
      const exposure = 2 ** -settings.exposureValue
      tonemap.setScale([exposure / whitePoint[0], exposure / whitePoint[1], exposure / whitePoint[2]])
      markers.setPositions(content.markers)

      const encoder = device.createCommandEncoder({ label: 'frame' })
      // The sky writes no depth and draws first; the sea and markers then depth-test against each other over it.
      const scenePass = encoder.beginRenderPass(hdrPassDescriptor(hdr, 'scene', timestamps?.writesFor(0)))
      sky.draw(scenePass, cameraGroup)
      sea.draw(scenePass, cameraGroup)
      markers.draw(scenePass, cameraGroup)
      scenePass.end()
      const toneWrites = timestamps?.writesFor(1)
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
