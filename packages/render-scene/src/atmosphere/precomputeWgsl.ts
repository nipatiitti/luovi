// The precomputation kernels of Bruneton's model.cc (kComputeTransmittanceShader and the five that follow), as
// compute shaders. Where the original accumulates orders of scattering with additive blending, these add into
// storage buffers, which WebGPU can read and write in place; a final pack pass copies the sums into the
// rgba16float tables the renderer samples.
import { atmosphereFunctionsWgsl } from './functions.ts'

const uniform = /* wgsl */ `@group(0) @binding(0) var<uniform> atmosphere: Atmosphere;`

/** Recovers (r, mu, mu_s, nu) from a scattering texel centre, GetRMuMuSNuFromScatteringTextureFragCoord. */
const scatteringTexelWgsl = /* wgsl */ `
struct ScatteringTexel {
  r: f32,
  mu: f32,
  mu_s: f32,
  nu: f32,
  ray_r_mu_intersects_ground: bool,
}

fn scattering_texel(id: vec3u) -> ScatteringTexel {
  let frag = vec3f(id) + 0.5;
  let frag_nu = floor(frag.x / f32(SCATTERING_MU_S_SIZE));
  let frag_mu_s = frag.x - frag_nu * f32(SCATTERING_MU_S_SIZE);
  let uvwz = vec4f(frag_nu, frag_mu_s, frag.y, frag.z) /
    vec4f(f32(SCATTERING_NU_SIZE - 1u), f32(SCATTERING_MU_S_SIZE), f32(SCATTERING_MU_SIZE), f32(SCATTERING_R_SIZE));
  let h = horizon_length();
  let rho = h * unit_range_from_texture_coord(uvwz.w, SCATTERING_R_SIZE);
  let r = sqrt(rho * rho + atmosphere.bottom_radius * atmosphere.bottom_radius);
  var mu: f32;
  var ground: bool;
  if (uvwz.z < 0.5) {
    let d_min = r - atmosphere.bottom_radius;
    let d_max = rho;
    let d = d_min + (d_max - d_min) * unit_range_from_texture_coord(1.0 - 2.0 * uvwz.z, SCATTERING_MU_SIZE / 2u);
    mu = select(clamp_cosine(-(rho * rho + d * d) / (2.0 * r * d)), -1.0, d == 0.0);
    ground = true;
  } else {
    let d_min = atmosphere.top_radius - r;
    let d_max = rho + h;
    let d = d_min + (d_max - d_min) * unit_range_from_texture_coord(2.0 * uvwz.z - 1.0, SCATTERING_MU_SIZE / 2u);
    mu = select(clamp_cosine((h * h - rho * rho - d * d) / (2.0 * r * d)), 1.0, d == 0.0);
    ground = false;
  }
  let x_mu_s = unit_range_from_texture_coord(uvwz.y, SCATTERING_MU_S_SIZE);
  let d_min = atmosphere.top_radius - atmosphere.bottom_radius;
  let d_max = h;
  let big_d = distance_to_top_atmosphere_boundary(atmosphere.bottom_radius, atmosphere.mu_s_min);
  let big_a = (big_d - d_min) / (d_max - d_min);
  let a = (big_a - x_mu_s * big_a) / (1.0 + x_mu_s * big_a);
  let d = d_min + min(a, big_a) * (d_max - d_min);
  let mu_s = select(clamp_cosine((h * h - d * d) / (2.0 * atmosphere.bottom_radius * d)), 1.0, d == 0.0);
  // nu is only free within the range mu and mu_s allow.
  let spread = sqrt((1.0 - mu * mu) * (1.0 - mu_s * mu_s));
  let nu = clamp(clamp_cosine(uvwz.x * 2.0 - 1.0), mu * mu_s - spread, mu * mu_s + spread);
  return ScatteringTexel(r, mu, mu_s, nu, ground);
}

fn scattering_index(id: vec3u) -> u32 {
  return id.x + SCATTERING_WIDTH * (id.y + SCATTERING_HEIGHT * id.z);
}

fn distance_to_nearest_atmosphere_boundary(r: f32, mu: f32, ray_r_mu_intersects_ground: bool) -> f32 {
  if (ray_r_mu_intersects_ground) { return distance_to_bottom_atmosphere_boundary(r, mu); }
  return distance_to_top_atmosphere_boundary(r, mu);
}

fn in_scattering_table(id: vec3u) -> bool {
  return id.x < SCATTERING_WIDTH && id.y < SCATTERING_HEIGHT && id.z < SCATTERING_R_SIZE;
}
`

const irradianceTexelWgsl = /* wgsl */ `
fn irradiance_r_mu_s(id: vec2u) -> vec2f {
  let uv = (vec2f(id) + 0.5) / vec2f(f32(IRRADIANCE_WIDTH), f32(IRRADIANCE_HEIGHT));
  let x_mu_s = unit_range_from_texture_coord(uv.x, IRRADIANCE_WIDTH);
  let x_r = unit_range_from_texture_coord(uv.y, IRRADIANCE_HEIGHT);
  return vec2f(
    atmosphere.bottom_radius + x_r * (atmosphere.top_radius - atmosphere.bottom_radius),
    clamp_cosine(2.0 * x_mu_s - 1.0),
  );
}

fn in_irradiance_table(id: vec2u) -> bool { return id.x < IRRADIANCE_WIDTH && id.y < IRRADIANCE_HEIGHT; }
`

export const transmittanceWgsl = /* wgsl */ `
${atmosphereFunctionsWgsl}
${uniform}
@group(0) @binding(1) var transmittance_out: texture_storage_2d<rgba32float, write>;

const SAMPLE_COUNT: i32 = 500;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= TRANSMITTANCE_WIDTH || id.y >= TRANSMITTANCE_HEIGHT) { return; }
  let uv = (vec2f(id.xy) + 0.5) / vec2f(f32(TRANSMITTANCE_WIDTH), f32(TRANSMITTANCE_HEIGHT));
  let x_mu = unit_range_from_texture_coord(uv.x, TRANSMITTANCE_WIDTH);
  let x_r = unit_range_from_texture_coord(uv.y, TRANSMITTANCE_HEIGHT);
  let h = horizon_length();
  let rho = h * x_r;
  let r = sqrt(rho * rho + atmosphere.bottom_radius * atmosphere.bottom_radius);
  let d_min = atmosphere.top_radius - r;
  let d_max = rho + h;
  let d_top = d_min + x_mu * (d_max - d_min);
  let mu = select(clamp_cosine((h * h - rho * rho - d_top * d_top) / (2.0 * r * d_top)), 1.0, d_top == 0.0);
  // Trapezoidal optical lengths of the three profiles along the ray to the top boundary.
  let dx = distance_to_top_atmosphere_boundary(r, mu) / f32(SAMPLE_COUNT);
  var optical = vec3f(0.0);
  for (var i = 0; i <= SAMPLE_COUNT; i++) {
    let d_i = f32(i) * dx;
    let altitude = sqrt(d_i * d_i + 2.0 * r * mu * d_i + r * r) - atmosphere.bottom_radius;
    let weight = select(1.0, 0.5, i == 0 || i == SAMPLE_COUNT);
    optical += vec3f(rayleigh_density(altitude), mie_density(altitude), ozone_density(altitude)) * weight * dx;
  }
  let depth = atmosphere.rayleigh_scattering * optical.x + atmosphere.mie_extinction * optical.y +
    atmosphere.absorption_extinction * optical.z;
  textureStore(transmittance_out, id.xy, vec4f(exp(-depth), 1.0));
}
`

export const directIrradianceWgsl = /* wgsl */ `
${atmosphereFunctionsWgsl}
${irradianceTexelWgsl}
${uniform}
@group(0) @binding(1) var transmittance: texture_2d<f32>;
@group(0) @binding(2) var delta_irradiance_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (!in_irradiance_table(id.xy)) { return; }
  let rm = irradiance_r_mu_s(id.xy);
  let alpha_s = atmosphere.sun_angular_radius;
  let mu_s = rm.y;
  // The cosine factor averaged over the visible part of the Sun's disc.
  var cosine = mu_s;
  if (mu_s < -alpha_s) {
    cosine = 0.0;
  } else if (mu_s <= alpha_s) {
    cosine = (mu_s + alpha_s) * (mu_s + alpha_s) / (4.0 * alpha_s);
  }
  let irradiance = atmosphere.solar_irradiance * transmittance_to_top_atmosphere_boundary(transmittance, rm.x, mu_s) * cosine;
  textureStore(delta_irradiance_out, id.xy, vec4f(irradiance, 1.0));
}
`

export const singleScatteringWgsl = /* wgsl */ `
${atmosphereFunctionsWgsl}
${scatteringTexelWgsl}
${uniform}
@group(0) @binding(1) var transmittance: texture_2d<f32>;
@group(0) @binding(2) var delta_rayleigh_out: texture_storage_3d<rgba16float, write>;
@group(0) @binding(3) var delta_mie_out: texture_storage_3d<rgba16float, write>;
@group(0) @binding(4) var<storage, read_write> scattering_sum: array<vec4f>;

const SAMPLE_COUNT: i32 = 50;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (!in_scattering_table(id)) { return; }
  let t = scattering_texel(id);
  let dx = distance_to_nearest_atmosphere_boundary(t.r, t.mu, t.ray_r_mu_intersects_ground) / f32(SAMPLE_COUNT);
  var rayleigh_sum = vec3f(0.0);
  var mie_sum = vec3f(0.0);
  for (var i = 0; i <= SAMPLE_COUNT; i++) {
    let d = f32(i) * dx;
    let r_d = clamp_radius(sqrt(d * d + 2.0 * t.r * t.mu * d + t.r * t.r));
    let mu_s_d = clamp_cosine((t.r * t.mu_s + d * t.nu) / r_d);
    let reach = transmittance_along(transmittance, t.r, t.mu, d, t.ray_r_mu_intersects_ground) *
      transmittance_to_sun(transmittance, r_d, mu_s_d);
    let weight = select(1.0, 0.5, i == 0 || i == SAMPLE_COUNT);
    rayleigh_sum += reach * rayleigh_density(r_d - atmosphere.bottom_radius) * weight;
    mie_sum += reach * mie_density(r_d - atmosphere.bottom_radius) * weight;
  }
  let rayleigh = rayleigh_sum * dx * atmosphere.solar_irradiance * atmosphere.rayleigh_scattering;
  let mie = mie_sum * dx * atmosphere.solar_irradiance * atmosphere.mie_scattering;
  textureStore(delta_rayleigh_out, id, vec4f(rayleigh, 1.0));
  textureStore(delta_mie_out, id, vec4f(mie, 1.0));
  scattering_sum[scattering_index(id)] = vec4f(rayleigh, 0.0);
}
`

/** Radiance arriving after scattering_order - 1 bounces in the air: single scattering or the previous order. */
const previousOrderWgsl = /* wgsl */ `
override previous_order: u32;

fn previous_order_scattering(r: f32, mu: f32, mu_s: f32, nu: f32, ground: bool) -> vec3f {
  if (previous_order == 1u) {
    let rayleigh = scattering_lookup(single_rayleigh, linear_sampler, r, mu, mu_s, nu, ground);
    let mie = scattering_lookup(single_mie, linear_sampler, r, mu, mu_s, nu, ground);
    return rayleigh * rayleigh_phase_function(nu) + mie * mie_phase_function(atmosphere.mie_phase_function_g, nu);
  }
  return scattering_lookup(multiple, linear_sampler, r, mu, mu_s, nu, ground);
}
`

export const scatteringDensityWgsl = /* wgsl */ `
${atmosphereFunctionsWgsl}
${scatteringTexelWgsl}
${previousOrderWgsl}
${uniform}
@group(0) @binding(1) var transmittance: texture_2d<f32>;
@group(0) @binding(2) var single_rayleigh: texture_3d<f32>;
@group(0) @binding(3) var single_mie: texture_3d<f32>;
@group(0) @binding(4) var multiple: texture_3d<f32>;
@group(0) @binding(5) var delta_irradiance: texture_2d<f32>;
@group(0) @binding(6) var linear_sampler: sampler;
@group(0) @binding(7) var density_out: texture_storage_3d<rgba16float, write>;

const SAMPLE_COUNT: i32 = 16;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (!in_scattering_table(id)) { return; }
  let t = scattering_texel(id);
  let r = t.r;
  let mu = t.mu;
  let mu_s = t.mu_s;
  let zenith = vec3f(0.0, 0.0, 1.0);
  let omega = vec3f(sqrt(1.0 - mu * mu), 0.0, mu);
  let sun_x = select((t.nu - mu * mu_s) / omega.x, 0.0, omega.x == 0.0);
  let sun_y = sqrt(max(1.0 - sun_x * sun_x - mu_s * mu_s, 0.0));
  let omega_s = vec3f(sun_x, sun_y, mu_s);
  let dphi = PI / f32(SAMPLE_COUNT);
  let dtheta = PI / f32(SAMPLE_COUNT);
  let rayleigh_scattering = atmosphere.rayleigh_scattering * rayleigh_density(r - atmosphere.bottom_radius);
  let mie_scattering = atmosphere.mie_scattering * mie_density(r - atmosphere.bottom_radius);
  var density = vec3f(0.0);
  for (var l = 0; l < SAMPLE_COUNT; l++) {
    let theta = (f32(l) + 0.5) * dtheta;
    let cos_theta = cos(theta);
    let sin_theta = sin(theta);
    let ground = ray_intersects_ground(r, cos_theta);
    var distance_to_ground = 0.0;
    var ground_reflect = vec3f(0.0);
    if (ground) {
      distance_to_ground = distance_to_bottom_atmosphere_boundary(r, cos_theta);
      ground_reflect = transmittance_along(transmittance, r, cos_theta, distance_to_ground, true) *
        atmosphere.ground_albedo / PI;
    }
    for (var m = 0; m < 2 * SAMPLE_COUNT; m++) {
      let phi = (f32(m) + 0.5) * dphi;
      let omega_i = vec3f(cos(phi) * sin_theta, sin(phi) * sin_theta, cos_theta);
      let domega_i = dtheta * dphi * sin_theta;
      let nu1 = dot(omega_s, omega_i);
      var incident = previous_order_scattering(r, omega_i.z, mu_s, nu1, ground);
      let ground_normal = normalize(zenith * r + omega_i * distance_to_ground);
      let ground_irradiance = irradiance_lookup(
        delta_irradiance, linear_sampler, atmosphere.bottom_radius, dot(ground_normal, omega_s));
      incident += ground_reflect * ground_irradiance;
      let nu2 = dot(omega, omega_i);
      density += incident * (rayleigh_scattering * rayleigh_phase_function(nu2) +
        mie_scattering * mie_phase_function(atmosphere.mie_phase_function_g, nu2)) * domega_i;
    }
  }
  textureStore(density_out, id, vec4f(density, 1.0));
}
`

export const indirectIrradianceWgsl = /* wgsl */ `
${atmosphereFunctionsWgsl}
${irradianceTexelWgsl}
${previousOrderWgsl}
${uniform}
@group(0) @binding(1) var single_rayleigh: texture_3d<f32>;
@group(0) @binding(2) var single_mie: texture_3d<f32>;
@group(0) @binding(3) var multiple: texture_3d<f32>;
@group(0) @binding(4) var linear_sampler: sampler;
@group(0) @binding(5) var delta_irradiance_out: texture_storage_2d<rgba16float, write>;
@group(0) @binding(6) var<storage, read_write> irradiance_sum: array<vec4f>;

const SAMPLE_COUNT: i32 = 32;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (!in_irradiance_table(id.xy)) { return; }
  let rm = irradiance_r_mu_s(id.xy);
  let mu_s = rm.y;
  let dphi = PI / f32(SAMPLE_COUNT);
  let dtheta = PI / f32(SAMPLE_COUNT);
  let omega_s = vec3f(sqrt(1.0 - mu_s * mu_s), 0.0, mu_s);
  var irradiance = vec3f(0.0);
  for (var j = 0; j < SAMPLE_COUNT / 2; j++) {
    let theta = (f32(j) + 0.5) * dtheta;
    for (var i = 0; i < 2 * SAMPLE_COUNT; i++) {
      let phi = (f32(i) + 0.5) * dphi;
      let omega = vec3f(cos(phi) * sin(theta), sin(phi) * sin(theta), cos(theta));
      let domega = dtheta * dphi * sin(theta);
      let nu = dot(omega, omega_s);
      irradiance += previous_order_scattering(rm.x, omega.z, mu_s, nu, false) * omega.z * domega;
    }
  }
  textureStore(delta_irradiance_out, id.xy, vec4f(irradiance, 1.0));
  let index = id.x + IRRADIANCE_WIDTH * id.y;
  irradiance_sum[index] += vec4f(irradiance, 0.0);
}
`

export const multipleScatteringWgsl = /* wgsl */ `
${atmosphereFunctionsWgsl}
${scatteringTexelWgsl}
${uniform}
@group(0) @binding(1) var transmittance: texture_2d<f32>;
@group(0) @binding(2) var density: texture_3d<f32>;
@group(0) @binding(3) var linear_sampler: sampler;
@group(0) @binding(4) var delta_multiple_out: texture_storage_3d<rgba16float, write>;
@group(0) @binding(5) var<storage, read_write> scattering_sum: array<vec4f>;

const SAMPLE_COUNT: i32 = 50;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (!in_scattering_table(id)) { return; }
  let t = scattering_texel(id);
  let dx = distance_to_nearest_atmosphere_boundary(t.r, t.mu, t.ray_r_mu_intersects_ground) / f32(SAMPLE_COUNT);
  var sum = vec3f(0.0);
  for (var i = 0; i <= SAMPLE_COUNT; i++) {
    let d = f32(i) * dx;
    let r_i = clamp_radius(sqrt(d * d + 2.0 * t.r * t.mu * d + t.r * t.r));
    let mu_i = clamp_cosine((t.r * t.mu + d) / r_i);
    let mu_s_i = clamp_cosine((t.r * t.mu_s + d * t.nu) / r_i);
    let weight = select(1.0, 0.5, i == 0 || i == SAMPLE_COUNT);
    sum += scattering_lookup(density, linear_sampler, r_i, mu_i, mu_s_i, t.nu, t.ray_r_mu_intersects_ground) *
      transmittance_along(transmittance, t.r, t.mu, d, t.ray_r_mu_intersects_ground) * dx * weight;
  }
  textureStore(delta_multiple_out, id, vec4f(sum, 1.0));
  // The scattering table holds Rayleigh-like irradiance; the renderer multiplies by the Rayleigh phase again.
  let index = scattering_index(id);
  scattering_sum[index] += vec4f(sum / rayleigh_phase_function(t.nu), 0.0);
}
`

export const packWgsl = /* wgsl */ `
${atmosphereFunctionsWgsl}
${uniform}
@group(0) @binding(1) var<storage, read> scattering_sum: array<vec4f>;
@group(0) @binding(2) var<storage, read> irradiance_sum: array<vec4f>;
@group(0) @binding(3) var scattering_out: texture_storage_3d<rgba16float, write>;
@group(0) @binding(4) var irradiance_out: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x < SCATTERING_WIDTH && id.y < SCATTERING_HEIGHT && id.z < SCATTERING_R_SIZE) {
    textureStore(scattering_out, id, scattering_sum[id.x + SCATTERING_WIDTH * (id.y + SCATTERING_HEIGHT * id.z)]);
  }
  if (id.z == 0u && id.x < IRRADIANCE_WIDTH && id.y < IRRADIANCE_HEIGHT) {
    textureStore(irradiance_out, id.xy, irradiance_sum[id.x + IRRADIANCE_WIDTH * id.y]);
  }
}
`
