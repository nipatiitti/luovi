// A WGSL port of the functions of Bruneton's 2017 reference implementation (atmosphere/functions.glsl in
// github.com/ebruneton/precomputed_atmospheric_scattering), shared by the precomputation and by every shader that
// reads the tables. Lengths are kilometres, radiance W m^-2 sr^-1 nm^-1, irradiance W m^-2 nm^-1. Each shader that
// includes this declares `var<uniform> atmosphere: Atmosphere`; tables arrive as function arguments because the
// precomputation and the renderer bind them differently. Departures from the original: the density profiles are
// the three this model uses (two exponentials and the ozone tent) rather than the general two-layer form, and the
// transmittance table is rgba32float read with a hand-written bilinear filter, because rgba32float is not
// filterable without an optional feature and transmittance ratios near the horizon need the precision.

export const TRANSMITTANCE_SIZE = [256, 64] as const
export const SCATTERING_R_SIZE = 32
export const SCATTERING_MU_SIZE = 128
export const SCATTERING_MU_S_SIZE = 32
export const SCATTERING_NU_SIZE = 8
/** The 4D scattering table packed in 3D as Bruneton does: nu and mu_s share the x axis. */
export const SCATTERING_SIZE = [
  SCATTERING_NU_SIZE * SCATTERING_MU_S_SIZE,
  SCATTERING_MU_SIZE,
  SCATTERING_R_SIZE,
] as const
export const IRRADIANCE_SIZE = [64, 16] as const

export const atmosphereFunctionsWgsl = /* wgsl */ `
const PI: f32 = 3.14159265358979;
const TRANSMITTANCE_WIDTH: u32 = ${String(TRANSMITTANCE_SIZE[0])}u;
const TRANSMITTANCE_HEIGHT: u32 = ${String(TRANSMITTANCE_SIZE[1])}u;
const SCATTERING_R_SIZE: u32 = ${String(SCATTERING_R_SIZE)}u;
const SCATTERING_MU_SIZE: u32 = ${String(SCATTERING_MU_SIZE)}u;
const SCATTERING_MU_S_SIZE: u32 = ${String(SCATTERING_MU_S_SIZE)}u;
const SCATTERING_NU_SIZE: u32 = ${String(SCATTERING_NU_SIZE)}u;
const SCATTERING_WIDTH: u32 = ${String(SCATTERING_SIZE[0])}u;
const SCATTERING_HEIGHT: u32 = ${String(SCATTERING_SIZE[1])}u;
const IRRADIANCE_WIDTH: u32 = ${String(IRRADIANCE_SIZE[0])}u;
const IRRADIANCE_HEIGHT: u32 = ${String(IRRADIANCE_SIZE[1])}u;

struct Atmosphere {
  solar_irradiance: vec3f,
  sun_angular_radius: f32,
  rayleigh_scattering: vec3f,
  bottom_radius: f32,
  mie_scattering: vec3f,
  top_radius: f32,
  mie_extinction: vec3f,
  mie_phase_function_g: f32,
  absorption_extinction: vec3f,
  mu_s_min: f32,
  ground_albedo: vec3f,
  rayleigh_scale_height: f32,
  mie_scale_height: f32,
  ozone_peak_altitude: f32,
  ozone_half_width: f32,
  sun_direction: vec3f,
}

fn clamp_cosine(mu: f32) -> f32 { return clamp(mu, -1.0, 1.0); }
fn clamp_distance(d: f32) -> f32 { return max(d, 0.0); }
fn clamp_radius(r: f32) -> f32 { return clamp(r, atmosphere.bottom_radius, atmosphere.top_radius); }
fn safe_sqrt(a: f32) -> f32 { return sqrt(max(a, 0.0)); }

fn distance_to_top_atmosphere_boundary(r: f32, mu: f32) -> f32 {
  let discriminant = r * r * (mu * mu - 1.0) + atmosphere.top_radius * atmosphere.top_radius;
  return clamp_distance(-r * mu + safe_sqrt(discriminant));
}

fn distance_to_bottom_atmosphere_boundary(r: f32, mu: f32) -> f32 {
  let discriminant = r * r * (mu * mu - 1.0) + atmosphere.bottom_radius * atmosphere.bottom_radius;
  return clamp_distance(-r * mu - safe_sqrt(discriminant));
}

fn ray_intersects_ground(r: f32, mu: f32) -> bool {
  return mu < 0.0 && r * r * (mu * mu - 1.0) + atmosphere.bottom_radius * atmosphere.bottom_radius >= 0.0;
}

fn rayleigh_density(altitude: f32) -> f32 { return clamp(exp(-altitude / atmosphere.rayleigh_scale_height), 0.0, 1.0); }
fn mie_density(altitude: f32) -> f32 { return clamp(exp(-altitude / atmosphere.mie_scale_height), 0.0, 1.0); }
fn ozone_density(altitude: f32) -> f32 {
  return clamp(1.0 - abs(altitude - atmosphere.ozone_peak_altitude) / atmosphere.ozone_half_width, 0.0, 1.0);
}

fn texture_coord_from_unit_range(x: f32, size: u32) -> f32 { return 0.5 / f32(size) + x * (1.0 - 1.0 / f32(size)); }
fn unit_range_from_texture_coord(u: f32, size: u32) -> f32 { return (u - 0.5 / f32(size)) / (1.0 - 1.0 / f32(size)); }

/** Distance to the top boundary for a horizontal ray at the ground. */
fn horizon_length() -> f32 {
  return sqrt(atmosphere.top_radius * atmosphere.top_radius - atmosphere.bottom_radius * atmosphere.bottom_radius);
}

fn transmittance_uv_from_r_mu(r: f32, mu: f32) -> vec2f {
  let h = horizon_length();
  let rho = safe_sqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
  let d = distance_to_top_atmosphere_boundary(r, mu);
  let d_min = atmosphere.top_radius - r;
  let d_max = rho + h;
  return vec2f(
    texture_coord_from_unit_range((d - d_min) / (d_max - d_min), TRANSMITTANCE_WIDTH),
    texture_coord_from_unit_range(rho / h, TRANSMITTANCE_HEIGHT),
  );
}

fn rayleigh_phase_function(nu: f32) -> f32 { return 3.0 / (16.0 * PI) * (1.0 + nu * nu); }

fn mie_phase_function(g: f32, nu: f32) -> f32 {
  let k = 3.0 / (8.0 * PI) * (1.0 - g * g) / (2.0 + g * g);
  return k * (1.0 + nu * nu) / pow(1.0 + g * g - 2.0 * g * nu, 1.5);
}

fn scattering_uvwz_from_r_mu_mu_s_nu(r: f32, mu: f32, mu_s: f32, nu: f32, ray_r_mu_intersects_ground: bool) -> vec4f {
  let h = horizon_length();
  let rho = safe_sqrt(r * r - atmosphere.bottom_radius * atmosphere.bottom_radius);
  let u_r = texture_coord_from_unit_range(rho / h, SCATTERING_R_SIZE);
  let r_mu = r * mu;
  let discriminant = r_mu * r_mu - r * r + atmosphere.bottom_radius * atmosphere.bottom_radius;
  var u_mu: f32;
  if (ray_r_mu_intersects_ground) {
    let d = -r_mu - safe_sqrt(discriminant);
    let d_min = r - atmosphere.bottom_radius;
    let d_max = rho;
    var x = 0.0;
    if (d_max != d_min) { x = (d - d_min) / (d_max - d_min); }
    u_mu = 0.5 - 0.5 * texture_coord_from_unit_range(x, SCATTERING_MU_SIZE / 2u);
  } else {
    let d = -r_mu + safe_sqrt(discriminant + h * h);
    let d_min = atmosphere.top_radius - r;
    let d_max = rho + h;
    u_mu = 0.5 + 0.5 * texture_coord_from_unit_range((d - d_min) / (d_max - d_min), SCATTERING_MU_SIZE / 2u);
  }
  let d = distance_to_top_atmosphere_boundary(atmosphere.bottom_radius, mu_s);
  let d_min = atmosphere.top_radius - atmosphere.bottom_radius;
  let d_max = h;
  let a = (d - d_min) / (d_max - d_min);
  let big_d = distance_to_top_atmosphere_boundary(atmosphere.bottom_radius, atmosphere.mu_s_min);
  let big_a = (big_d - d_min) / (d_max - d_min);
  // Bruneton's ad hoc mapping: 0 at mu_s_min, 1 at the zenith, steep near the horizon where the sky changes fastest.
  let u_mu_s = texture_coord_from_unit_range(max(1.0 - a / big_a, 0.0) / (1.0 + a), SCATTERING_MU_S_SIZE);
  let u_nu = (nu + 1.0) / 2.0;
  return vec4f(u_nu, u_mu_s, u_mu, u_r);
}

fn irradiance_uv_from_r_mu_s(r: f32, mu_s: f32) -> vec2f {
  let x_r = (r - atmosphere.bottom_radius) / (atmosphere.top_radius - atmosphere.bottom_radius);
  let x_mu_s = mu_s * 0.5 + 0.5;
  return vec2f(
    texture_coord_from_unit_range(x_mu_s, IRRADIANCE_WIDTH),
    texture_coord_from_unit_range(x_r, IRRADIANCE_HEIGHT),
  );
}

fn load_bilinear(table: texture_2d<f32>, uv: vec2f) -> vec4f {
  let size = vec2i(textureDimensions(table));
  let p = uv * vec2f(size) - 0.5;
  let base = floor(p);
  let f = p - base;
  let lo = clamp(vec2i(base), vec2i(0), size - 1);
  let hi = clamp(vec2i(base) + 1, vec2i(0), size - 1);
  let bottom = mix(textureLoad(table, lo, 0), textureLoad(table, vec2i(hi.x, lo.y), 0), f.x);
  let top = mix(textureLoad(table, vec2i(lo.x, hi.y), 0), textureLoad(table, hi, 0), f.x);
  return mix(bottom, top, f.y);
}

fn transmittance_to_top_atmosphere_boundary(table: texture_2d<f32>, r: f32, mu: f32) -> vec3f {
  return load_bilinear(table, transmittance_uv_from_r_mu(r, mu)).rgb;
}

fn transmittance_along(table: texture_2d<f32>, r: f32, mu: f32, d: f32, ray_r_mu_intersects_ground: bool) -> vec3f {
  let r_d = clamp_radius(sqrt(d * d + 2.0 * r * mu * d + r * r));
  let mu_d = clamp_cosine((r * mu + d) / r_d);
  if (ray_r_mu_intersects_ground) {
    return min(
      transmittance_to_top_atmosphere_boundary(table, r_d, -mu_d) /
        transmittance_to_top_atmosphere_boundary(table, r, -mu),
      vec3f(1.0),
    );
  }
  return min(
    transmittance_to_top_atmosphere_boundary(table, r, mu) / transmittance_to_top_atmosphere_boundary(table, r_d, mu_d),
    vec3f(1.0),
  );
}

fn transmittance_to_sun(table: texture_2d<f32>, r: f32, mu_s: f32) -> vec3f {
  let sin_theta_h = atmosphere.bottom_radius / r;
  let cos_theta_h = -sqrt(max(1.0 - sin_theta_h * sin_theta_h, 0.0));
  let disc = sin_theta_h * atmosphere.sun_angular_radius;
  return transmittance_to_top_atmosphere_boundary(table, r, mu_s) * smoothstep(-disc, disc, mu_s - cos_theta_h);
}

fn scattering_lookup(
  table: texture_3d<f32>,
  linear_sampler: sampler,
  r: f32,
  mu: f32,
  mu_s: f32,
  nu: f32,
  ray_r_mu_intersects_ground: bool,
) -> vec3f {
  let uvwz = scattering_uvwz_from_r_mu_mu_s_nu(r, mu, mu_s, nu, ray_r_mu_intersects_ground);
  let tex_coord_x = uvwz.x * f32(SCATTERING_NU_SIZE - 1u);
  let tex_x = floor(tex_coord_x);
  let lerp = tex_coord_x - tex_x;
  let uvw0 = vec3f((tex_x + uvwz.y) / f32(SCATTERING_NU_SIZE), uvwz.z, uvwz.w);
  let uvw1 = vec3f((tex_x + 1.0 + uvwz.y) / f32(SCATTERING_NU_SIZE), uvwz.z, uvwz.w);
  return mix(textureSampleLevel(table, linear_sampler, uvw0, 0.0).rgb, textureSampleLevel(table, linear_sampler, uvw1, 0.0).rgb, lerp);
}

fn irradiance_lookup(table: texture_2d<f32>, linear_sampler: sampler, r: f32, mu_s: f32) -> vec3f {
  return textureSampleLevel(table, linear_sampler, irradiance_uv_from_r_mu_s(r, mu_s), 0.0).rgb;
}
`
