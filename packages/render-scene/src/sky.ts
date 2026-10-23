import { type Atmosphere, atmosphereWgsl } from './atmosphere/atmosphere.ts'
import { cameraWgsl } from './camera.ts'
import { createFullscreenPipeline } from './pipeline.ts'
import { DEPTH_FORMAT, HDR_FORMAT, MSAA_SAMPLES } from './target.ts'

// The background, drawn only where nothing else has been: every pixel's view ray either escapes to space, where it
// gets the sky's radiance plus the Sun's disc, or meets the planet beyond the sea's flat disc: a Lambertian ground at
// the atmosphere's ground albedo, lit by sun and sky irradiance and seen through the aerial perspective in between, as
// Bruneton's demo renders its ground.
const skyFragmentWgsl = /* wgsl */ `
${cameraWgsl(0)}
${atmosphereWgsl(1)}

@fragment
fn main(in: FullscreenVarying) -> @location(0) vec4f {
  let ray = camera_ray(in.ndc);
  let eye = atmosphere_position(camera.eye);
  let along = dot(eye, ray);
  // |eye|^2 - R^2 expanded from the world position, where eye = world / 1000 + (0, 0, R): in f32 the difference of
  // two squared planet radii loses kilometres, which frays the horizon. The horizontal term keeps the test sphere the
  // true ground away from the origin, where the sky and aerial-perspective lookups already place it.
  let world_km = camera.eye * 0.001;
  let discriminant = along * along - (dot(world_km, world_km) + 2.0 * atmosphere.bottom_radius * world_km.z);
  let ground_distance = -along - sqrt(max(discriminant, 0.0));
  if (discriminant >= 0.0 && ground_distance > 0.0) {
    let point = eye + ray * ground_distance;
    let normal = normalize(point);
    let light = sun_and_sky_irradiance_km(point, normal);
    let ground = atmosphere.ground_albedo / PI * (light.sun + light.sky);
    let between = sky_radiance_to_point_km(eye, point);
    return vec4f(ground * between.transmittance + between.radiance, 1.0);
  }
  let sky = sky_radiance_km(eye, ray);
  var radiance = sky.radiance;
  if (dot(ray, sun_direction()) > cos(atmosphere.sun_angular_radius)) {
    radiance += sky.transmittance * solar_radiance();
  }
  return vec4f(radiance, 1.0);
}
`

export interface SkyPass {
  draw(pass: GPURenderPassEncoder, cameraGroup: GPUBindGroup): void
}

export const createSkyPass = (device: GPUDevice, cameraLayout: GPUBindGroupLayout, atmosphere: Atmosphere): SkyPass => {
  const pipeline = createFullscreenPipeline(device, {
    label: 'sky',
    fragmentWgsl: skyFragmentWgsl,
    layouts: [cameraLayout, atmosphere.layout],
    format: HDR_FORMAT,
    sampleCount: MSAA_SAMPLES,
    depthFormat: DEPTH_FORMAT,
    // Drawn after the opaque scene, so it shades only the pixels the scene left at the far plane.
    depthCompare: 'equal',
  })
  return {
    draw: (pass, cameraGroup) => {
      pass.setPipeline(pipeline)
      pass.setBindGroup(0, cameraGroup)
      pass.setBindGroup(1, atmosphere.bindGroup)
      pass.draw(3)
    },
  }
}
