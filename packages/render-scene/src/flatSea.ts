import { type Atmosphere, atmosphereWgsl } from './atmosphere/atmosphere.ts'
import { cameraWgsl } from './camera.ts'
import { createScenePipeline } from './pipeline.ts'
import { DEPTH_FORMAT, HDR_FORMAT, MSAA_SAMPLES } from './target.ts'

// The sea's place in the frame until render-ocean's clipmap and band take it (#34): a flat disc at mean level, so the
// probe overlay has a surface to stand on and be hidden by. It is lit exactly as the sky pass lights the planet
// beyond it, with grid lines so heights above and below it read against something.

/** m. Far enough that the disc's rim sits in the aerial perspective, where it meets the sky pass's ground unseen. */
const DISC_RADIUS = 5000
/** m between grid lines. */
const GRID_SPACING = 10

const flatSeaWgsl = /* wgsl */ `
${cameraWgsl(0)}
${atmosphereWgsl(1)}

const DISC_RADIUS: f32 = ${DISC_RADIUS.toFixed(1)};
const GRID_SPACING: f32 = ${GRID_SPACING.toFixed(1)};

struct Varying {
  @builtin(position) position: vec4f,
  @location(0) world: vec3f,
}

@vertex
fn vertex_main(@builtin(vertex_index) index: u32) -> Varying {
  // Two triangles covering the disc's bounding square; the fragment stage cuts the circle.
  let corners = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1));
  let world = vec3f(corners[index] * DISC_RADIUS, 0.0);
  return Varying(camera.view_projection * vec4f(world, 1.0), world);
}

@fragment
fn fragment_main(in: Varying) -> @location(0) vec4f {
  // Distance to the nearest grid line in pixels, so lines stay one pixel wide at any range, and faded out where a
  // pixel spans more than a quarter of a cell and the lines would alias. Derivatives come before the discard, which
  // leaves uniform control flow.
  let cell = in.world.xy / GRID_SPACING;
  let footprint = fwidth(cell);
  if (length(in.world.xy) > DISC_RADIUS) {
    discard;
  }
  let pixels = abs(fract(cell + 0.5) - 0.5) / max(footprint, vec2f(1e-6));
  let line = 1.0 - clamp(min(pixels.x, pixels.y), 0.0, 1.0);
  let crowding = clamp(max(footprint.x, footprint.y) * 4.0, 0.0, 1.0);
  let albedo = atmosphere.ground_albedo * (1.0 - 0.6 * line * (1.0 - crowding));
  let light = sun_and_sky_irradiance(in.world, vec3f(0.0, 0.0, 1.0));
  let between = sky_radiance_to_point(camera.eye, in.world);
  return vec4f(albedo / PI * (light.sun + light.sky) * between.transmittance + between.radiance, 1.0);
}
`

export interface FlatSeaPass {
  draw(pass: GPURenderPassEncoder, cameraGroup: GPUBindGroup): void
}

export const createFlatSeaPass = (
  device: GPUDevice,
  cameraLayout: GPUBindGroupLayout,
  atmosphere: Atmosphere,
): FlatSeaPass => {
  const pipeline = createScenePipeline(device, {
    label: 'flat sea',
    wgsl: flatSeaWgsl,
    layouts: [cameraLayout, atmosphere.layout],
    format: HDR_FORMAT,
    sampleCount: MSAA_SAMPLES,
    depthFormat: DEPTH_FORMAT,
  })
  return {
    draw: (pass, cameraGroup) => {
      pass.setPipeline(pipeline)
      pass.setBindGroup(0, cameraGroup)
      pass.setBindGroup(1, atmosphere.bindGroup)
      pass.draw(6)
    },
  }
}
