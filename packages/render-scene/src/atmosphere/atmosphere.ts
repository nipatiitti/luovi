import { createBindGroup, createBindGroupLayout, createComputePipeline, createUniformBuffer } from '../pipeline.ts'
import type { Vec3 } from '../camera.ts'
import {
  type AtmosphereConstants,
  ATMOSPHERE_UNIFORM_FLOATS,
  packAtmosphere,
  SUN_DIRECTION_OFFSET,
} from './constants.ts'
import { atmosphereFunctionsWgsl, IRRADIANCE_SIZE, SCATTERING_SIZE, TRANSMITTANCE_SIZE } from './functions.ts'
import {
  directIrradianceWgsl,
  indirectIrradianceWgsl,
  multipleScatteringWgsl,
  packWgsl,
  scatteringDensityWgsl,
  singleScatteringWgsl,
  transmittanceWgsl,
} from './precomputeWgsl.ts'

/** Orders of scattering summed into the tables, Bruneton's default (num_scattering_orders in model.cc). */
const SCATTERING_ORDERS = 4

const WORKGROUP = 8

/**
 * The precomputed atmosphere: one bind group (uniform, transmittance, scattering, single Mie, irradiance, sampler)
 * and the WGSL that reads it. A shader that wants sky light declares `atmosphereWgsl(group)` and binds `bindGroup`
 * at that group with `layout` in its pipeline layout.
 */
export interface Atmosphere {
  readonly layout: GPUBindGroupLayout
  readonly bindGroup: GPUBindGroup
  /** The unit vector towards the Sun in the world frame; a render setting, written whenever it changes. */
  setSunDirection(direction: Vec3): void
  destroy(): void
}

const VISIBLE = GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX

const createAtmosphereLayout = (device: GPUDevice): GPUBindGroupLayout =>
  createBindGroupLayout(device, 'atmosphere', VISIBLE, [
    { uniform: true },
    { texture: 'unfilterable-float' },
    { texture: 'float', dimension: '3d' },
    { texture: 'float', dimension: '3d' },
    { texture: 'float' },
    { sampler: 'filtering' },
  ])

const workgroups = (size: readonly number[]): [number, number, number] => [
  Math.ceil((size[0] ?? 1) / WORKGROUP),
  Math.ceil((size[1] ?? 1) / WORKGROUP),
  size[2] ?? 1,
]

/**
 * Runs Bruneton's precomputation once with compute passes and returns the tables. Each step is its own submission
 * so no single command buffer runs long enough to trip a GPU watchdog; the promise settles when the GPU is done.
 */
export const createAtmosphere = async (device: GPUDevice, constants: AtmosphereConstants): Promise<Atmosphere> => {
  const uniform = createUniformBuffer(device, 'atmosphere', ATMOSPHERE_UNIFORM_FLOATS * 4)
  const packed = packAtmosphere(constants)
  uniform.write(packed)

  const usage = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
  const table = (label: string, size: readonly number[], format: GPUTextureFormat): GPUTexture =>
    device.createTexture({ label, size: [...size], format, usage, dimension: size.length === 3 ? '3d' : '2d' })
  const transmittance = table('atmosphere transmittance', TRANSMITTANCE_SIZE, 'rgba32float')
  const scattering = table('atmosphere scattering', SCATTERING_SIZE, 'rgba16float')
  // Holds single Mie scattering from its own pass on and is never written again, so it is also the final table.
  const singleMie = table('atmosphere single mie', SCATTERING_SIZE, 'rgba16float')
  const irradiance = table('atmosphere irradiance', IRRADIANCE_SIZE, 'rgba16float')
  // Single Rayleigh scattering until order 2's density is computed, then each order's multiple scattering, as
  // Bruneton aliases delta_rayleigh and delta_multiple to save a table.
  const deltaRayleigh = table('atmosphere delta rayleigh', SCATTERING_SIZE, 'rgba16float')
  const deltaDensity = table('atmosphere delta density', SCATTERING_SIZE, 'rgba16float')
  const deltaIrradiance = table('atmosphere delta irradiance', IRRADIANCE_SIZE, 'rgba16float')
  const sum = (label: string, size: readonly number[]): GPUBuffer =>
    device.createBuffer({ label, size: size.reduce((a, b) => a * b, 16), usage: GPUBufferUsage.STORAGE })
  const scatteringSum = sum('atmosphere scattering sum', SCATTERING_SIZE)
  const irradianceSum = sum('atmosphere irradiance sum', IRRADIANCE_SIZE)
  const linear = device.createSampler({
    label: 'atmosphere linear',
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
    addressModeW: 'clamp-to-edge',
  })
  const view = (texture: GPUTexture): GPUTextureView => texture.createView()

  const C = GPUShaderStage.COMPUTE
  const sampled3d = { texture: 'float', dimension: '3d' } as const
  const storage3d = { storageTexture: 'rgba16float', dimension: '3d' } as const
  const run = async (
    label: string,
    code: string,
    kinds: Parameters<typeof createBindGroupLayout>[3],
    resources: Parameters<typeof createBindGroup>[3],
    size: readonly number[],
    constants?: Record<string, number>,
  ): Promise<void> => {
    const layout = createBindGroupLayout(device, label, C, kinds)
    const pipeline = createComputePipeline(device, label, code, [layout], constants)
    const encoder = device.createCommandEncoder({ label })
    const pass = encoder.beginComputePass({ label })
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, createBindGroup(device, label, layout, resources))
    pass.dispatchWorkgroups(...workgroups(size))
    pass.end()
    device.queue.submit([encoder.finish()])
    await device.queue.onSubmittedWorkDone()
  }

  await run(
    'transmittance',
    transmittanceWgsl,
    [{ uniform: true }, { storageTexture: 'rgba32float' }],
    [uniform.buffer, view(transmittance)],
    TRANSMITTANCE_SIZE,
  )
  await run(
    'direct irradiance',
    directIrradianceWgsl,
    [{ uniform: true }, { texture: 'unfilterable-float' }, { storageTexture: 'rgba16float' }],
    [uniform.buffer, view(transmittance), view(deltaIrradiance)],
    IRRADIANCE_SIZE,
  )
  await run(
    'single scattering',
    singleScatteringWgsl,
    [{ uniform: true }, { texture: 'unfilterable-float' }, storage3d, storage3d, { storage: 'storage' }],
    [uniform.buffer, view(transmittance), view(deltaRayleigh), view(singleMie), scatteringSum],
    SCATTERING_SIZE,
  )
  for (let order = 2; order <= SCATTERING_ORDERS; order++) {
    const previous = { previous_order: order - 1 }
    await run(
      `scattering density ${String(order)}`,
      scatteringDensityWgsl,
      [
        { uniform: true },
        { texture: 'unfilterable-float' },
        sampled3d,
        sampled3d,
        sampled3d,
        { texture: 'float' },
        { sampler: 'filtering' },
        storage3d,
      ],
      [
        uniform.buffer,
        view(transmittance),
        view(deltaRayleigh),
        view(singleMie),
        view(deltaRayleigh),
        view(deltaIrradiance),
        linear,
        view(deltaDensity),
      ],
      SCATTERING_SIZE,
      previous,
    )
    await run(
      `indirect irradiance ${String(order - 1)}`,
      indirectIrradianceWgsl,
      [
        { uniform: true },
        sampled3d,
        sampled3d,
        sampled3d,
        { sampler: 'filtering' },
        { storageTexture: 'rgba16float' },
        { storage: 'storage' },
      ],
      [
        uniform.buffer,
        view(deltaRayleigh),
        view(singleMie),
        view(deltaRayleigh),
        linear,
        view(deltaIrradiance),
        irradianceSum,
      ],
      IRRADIANCE_SIZE,
      previous,
    )
    await run(
      `multiple scattering ${String(order)}`,
      multipleScatteringWgsl,
      [
        { uniform: true },
        { texture: 'unfilterable-float' },
        sampled3d,
        { sampler: 'filtering' },
        storage3d,
        { storage: 'storage' },
      ],
      [uniform.buffer, view(transmittance), view(deltaDensity), linear, view(deltaRayleigh), scatteringSum],
      SCATTERING_SIZE,
    )
  }
  await run(
    'pack',
    packWgsl,
    [
      { uniform: true },
      { storage: 'read-only-storage' },
      { storage: 'read-only-storage' },
      storage3d,
      { storageTexture: 'rgba16float' },
    ],
    [uniform.buffer, scatteringSum, irradianceSum, view(scattering), view(irradiance)],
    SCATTERING_SIZE,
  )
  for (const scratch of [deltaRayleigh, deltaDensity, deltaIrradiance]) scratch.destroy()
  scatteringSum.destroy()
  irradianceSum.destroy()

  const layout = createAtmosphereLayout(device)
  return {
    layout,
    bindGroup: createBindGroup(device, 'atmosphere', layout, [
      uniform.buffer,
      view(transmittance),
      view(scattering),
      view(singleMie),
      view(irradiance),
      linear,
    ]),
    setSunDirection: (direction) => {
      packed.set(direction, SUN_DIRECTION_OFFSET)
      uniform.write(packed)
    },
    destroy: () => {
      for (const texture of [transmittance, scattering, singleMie, irradiance]) texture.destroy()
      uniform.buffer.destroy()
    },
  }
}

/**
 * The sky light every shader reads, bound at `group`. Positions are world metres (z up, sea level at z = 0); the
 * planet's centre sits one bottom radius below the origin.
 *
 * - `sky_radiance(camera, view_ray)`: radiance of the sky along a ray to infinity, and its transmittance.
 * - `sky_radiance_to_point(camera, point)`: aerial perspective, the radiance scattered in between camera and point
 *   and the transmittance that dims the point's own radiance.
 * - `sun_and_sky_irradiance(point, normal)`: direct sun and diffuse sky irradiance on a surface.
 * - `solar_radiance()`, `sun_direction()`.
 * - `planet_radius()`, and `curvature_drop(from_eye)`: how far the planet's surface lies below the eye's horizontal plane.
 */
export const atmosphereWgsl = (group: number): string => {
  const g = String(group)
  return /* wgsl */ `
${atmosphereFunctionsWgsl}
@group(${g}) @binding(0) var<uniform> atmosphere: Atmosphere;
@group(${g}) @binding(1) var atmosphere_transmittance: texture_2d<f32>;
@group(${g}) @binding(2) var atmosphere_scattering: texture_3d<f32>;
@group(${g}) @binding(3) var atmosphere_single_mie: texture_3d<f32>;
@group(${g}) @binding(4) var atmosphere_irradiance: texture_2d<f32>;
@group(${g}) @binding(5) var atmosphere_sampler: sampler;

struct AtmosphereRadiance {
  radiance: vec3f,
  transmittance: vec3f,
}

struct AtmosphereIrradiance {
  sun: vec3f,
  sky: vec3f,
}

fn sun_direction() -> vec3f { return atmosphere.sun_direction; }

fn solar_radiance() -> vec3f {
  return atmosphere.solar_irradiance / (PI * atmosphere.sun_angular_radius * atmosphere.sun_angular_radius);
}

/** World metres to the planet-centred kilometres of the tables. */
fn atmosphere_position(world: vec3f) -> vec3f {
  return world * 0.001 + vec3f(0.0, 0.0, atmosphere.bottom_radius);
}

fn rayleigh_and_mie(r: f32, mu: f32, mu_s: f32, nu: f32, ground: bool) -> array<vec3f, 2> {
  return array<vec3f, 2>(
    scattering_lookup(atmosphere_scattering, atmosphere_sampler, r, mu, mu_s, nu, ground),
    scattering_lookup(atmosphere_single_mie, atmosphere_sampler, r, mu, mu_s, nu, ground),
  );
}

fn sky_radiance_km(camera_km: vec3f, view_ray: vec3f) -> AtmosphereRadiance {
  let sun = atmosphere.sun_direction;
  var camera = camera_km;
  var r = length(camera);
  var rmu = dot(camera, view_ray);
  let distance_to_top = -rmu - sqrt(rmu * rmu - r * r + atmosphere.top_radius * atmosphere.top_radius);
  if (distance_to_top > 0.0) {
    camera = camera + view_ray * distance_to_top;
    r = atmosphere.top_radius;
    rmu += distance_to_top;
  } else if (r > atmosphere.top_radius) {
    return AtmosphereRadiance(vec3f(0.0), vec3f(1.0));
  }
  let mu = rmu / r;
  let mu_s = dot(camera, sun) / r;
  let nu = dot(view_ray, sun);
  let ground = ray_intersects_ground(r, mu);
  var transmittance = vec3f(0.0);
  if (!ground) { transmittance = transmittance_to_top_atmosphere_boundary(atmosphere_transmittance, r, mu); }
  let s = rayleigh_and_mie(r, mu, mu_s, nu, ground);
  let radiance = s[0] * rayleigh_phase_function(nu) + s[1] * mie_phase_function(atmosphere.mie_phase_function_g, nu);
  return AtmosphereRadiance(radiance, transmittance);
}

fn sky_radiance_to_point_km(camera_km: vec3f, point_km: vec3f) -> AtmosphereRadiance {
  let sun = atmosphere.sun_direction;
  let view_ray = normalize(point_km - camera_km);
  var camera = camera_km;
  var r = length(camera);
  var rmu = dot(camera, view_ray);
  let distance_to_top = -rmu - sqrt(rmu * rmu - r * r + atmosphere.top_radius * atmosphere.top_radius);
  if (distance_to_top > 0.0) {
    camera = camera + view_ray * distance_to_top;
    r = atmosphere.top_radius;
    rmu += distance_to_top;
  }
  let mu = rmu / r;
  let mu_s = dot(camera, sun) / r;
  let nu = dot(view_ray, sun);
  let d = length(point_km - camera);
  let ground = ray_intersects_ground(r, mu);
  let transmittance = transmittance_along(atmosphere_transmittance, r, mu, d, ground);
  let s = rayleigh_and_mie(r, mu, mu_s, nu, ground);
  let r_p = clamp_radius(sqrt(d * d + 2.0 * r * mu * d + r * r));
  let mu_p = (r * mu + d) / r_p;
  let mu_s_p = (r * mu_s + d * nu) / r_p;
  let s_p = rayleigh_and_mie(r_p, mu_p, mu_s_p, nu, ground);
  let rayleigh = s[0] - transmittance * s_p[0];
  // Bruneton's guard against artefacts in the single Mie term when the Sun is below the horizon.
  let mie = (s[1] - transmittance * s_p[1]) * smoothstep(0.0, 0.01, mu_s);
  let radiance = rayleigh * rayleigh_phase_function(nu) + mie * mie_phase_function(atmosphere.mie_phase_function_g, nu);
  // The difference of two interpolated lookups can dip below zero for short rays; in-scattering never does.
  return AtmosphereRadiance(max(radiance, vec3f(0.0)), transmittance);
}

fn sun_and_sky_irradiance_km(point_km: vec3f, normal: vec3f) -> AtmosphereIrradiance {
  let sun = atmosphere.sun_direction;
  let r = length(point_km);
  let mu_s = dot(point_km, sun) / r;
  // The table holds a horizontal surface's sky irradiance; a tilted one sees that much less of the sky dome.
  let sky = irradiance_lookup(atmosphere_irradiance, atmosphere_sampler, r, mu_s) * (1.0 + dot(normal, point_km) / r) * 0.5;
  let direct = atmosphere.solar_irradiance * transmittance_to_sun(atmosphere_transmittance, r, mu_s) *
    max(dot(normal, sun), 0.0);
  return AtmosphereIrradiance(direct, sky);
}

fn sky_radiance(camera: vec3f, view_ray: vec3f) -> AtmosphereRadiance {
  return sky_radiance_km(atmosphere_position(camera), view_ray);
}

fn sky_radiance_to_point(camera: vec3f, point: vec3f) -> AtmosphereRadiance {
  return sky_radiance_to_point_km(atmosphere_position(camera), atmosphere_position(point));
}

fn sun_and_sky_irradiance(point: vec3f, normal: vec3f) -> AtmosphereIrradiance {
  return sun_and_sky_irradiance_km(atmosphere_position(point), normal);
}

// The planet's radius in metres.
fn planet_radius() -> f32 {
  return 1000.0 * atmosphere.bottom_radius;
}

// How far the planet's surface lies below the eye's horizontal plane at a horizontal offset from the eye, m: the sphere
// to second order, d^2 / 2R, off by (d / 2R)^2 of the drop, under a thousandth out to 400 km. Everything drawn on the
// sea drops by it, so the sea and what sits on it end together at the true horizon.
fn curvature_drop(from_eye: vec2f) -> f32 {
  return dot(from_eye, from_eye) / (2.0 * planet_radius());
}
`
}
