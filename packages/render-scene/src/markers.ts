import { type Atmosphere, atmosphereWgsl } from './atmosphere/atmosphere.ts'
import { cameraWgsl } from './camera.ts'
import { createBindGroup, createBindGroupLayout, createScenePipeline } from './pipeline.ts'
import { DEPTH_FORMAT, HDR_FORMAT, MSAA_SAMPLES } from './target.ts'

// Point markers in the world, drawn as camera-facing quads that shade as small spheres (a normal reconstructed per
// pixel), lit by the same sun and sky as the sea and depth-tested against it, so a marker whose height is wrong sinks
// into the drawn surface or floats clear of it. The probe overlay is their first user.

/** m, the marker sphere's radius. */
const MARKER_RADIUS = 0.35
/** A saturated orange that no sky or sea colour comes near. */
const MARKER_ALBEDO = [0.8, 0.3, 0.05] as const

const markersWgsl = /* wgsl */ `
${cameraWgsl(0)}
${atmosphereWgsl(1)}

@group(2) @binding(0) var<storage, read> positions: array<f32>;

const MARKER_RADIUS: f32 = ${MARKER_RADIUS.toFixed(3)};
const MARKER_ALBEDO: vec3f = vec3f(${MARKER_ALBEDO.map((c) => c.toFixed(3)).join(', ')});

struct Varying {
  @builtin(position) position: vec4f,
  @location(0) centre: vec3f,
  @location(1) corner: vec2f,
}

@vertex
fn vertex_main(@builtin(vertex_index) index: u32, @builtin(instance_index) marker: u32) -> Varying {
  let corners = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1));
  let corner = corners[index];
  let centre = vec3f(positions[3u * marker], positions[3u * marker + 1u], positions[3u * marker + 2u]);
  let world = centre + (camera.right * corner.x + camera.up * corner.y) * MARKER_RADIUS;
  return Varying(camera.view_projection * vec4f(world, 1.0), centre, corner);
}

@fragment
fn fragment_main(in: Varying) -> @location(0) vec4f {
  let r2 = dot(in.corner, in.corner);
  if (r2 > 1.0) {
    discard;
  }
  let normal = normalize(camera.right * in.corner.x + camera.up * in.corner.y - camera.forward * sqrt(1.0 - r2));
  let surface = in.centre + normal * MARKER_RADIUS;
  let light = sun_and_sky_irradiance(surface, normal);
  let between = sky_radiance_to_point(camera.eye, surface);
  return vec4f(MARKER_ALBEDO / PI * (light.sun + light.sky) * between.transmittance + between.radiance, 1.0);
}
`

export interface MarkerPass {
  /** xyz per marker in world metres; the count is the length over three. */
  setPositions(positions: Float32Array<ArrayBuffer>): void
  draw(pass: GPURenderPassEncoder, cameraGroup: GPUBindGroup): void
  destroy(): void
}

export const createMarkerPass = (
  device: GPUDevice,
  cameraLayout: GPUBindGroupLayout,
  atmosphere: Atmosphere,
): MarkerPass => {
  const layout = createBindGroupLayout(device, 'markers', GPUShaderStage.VERTEX, [{ storage: 'read-only-storage' }])
  const pipeline = createScenePipeline(device, {
    label: 'markers',
    wgsl: markersWgsl,
    layouts: [cameraLayout, atmosphere.layout, layout],
    format: HDR_FORMAT,
    sampleCount: MSAA_SAMPLES,
    depthFormat: DEPTH_FORMAT,
  })
  let buffer: GPUBuffer | undefined
  let group: GPUBindGroup | undefined
  let count = 0
  return {
    setPositions: (positions) => {
      count = Math.floor(positions.length / 3)
      if (count === 0) return
      if (buffer === undefined || buffer.size < positions.byteLength) {
        buffer?.destroy()
        buffer = device.createBuffer({
          label: 'marker positions',
          size: positions.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })
        group = createBindGroup(device, 'markers', layout, [buffer])
      }
      device.queue.writeBuffer(buffer, 0, positions, 0, 3 * count)
    },
    draw: (pass, cameraGroup) => {
      if (count === 0 || group === undefined) return
      pass.setPipeline(pipeline)
      pass.setBindGroup(0, cameraGroup)
      pass.setBindGroup(1, atmosphere.bindGroup)
      pass.setBindGroup(2, group)
      pass.draw(6, count)
    },
    destroy: () => {
      buffer?.destroy()
    },
  }
}
