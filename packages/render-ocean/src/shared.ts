// The helpers more than one of the ocean's passes needs, written once so the surface, the foam and the tail cannot read
// the same table or field two ways.

/** x modulo m into [0, m), for f64 offsets that keep large world coordinates off the GPU. */
export const wrap = (x: number, m: number): number => ((x % m) + m) % m

/** TAU, and the phase reduction every band sum applies before sin and cos. */
export const phaseWgsl = /* wgsl */ `
const TAU: f32 = 6.28318530717958648;

// WGSL bounds sin and cos only on [-pi, pi], and far rings reach phases of a thousand radians.
fn reduce_phase(theta: f32) -> f32 {
  return theta - TAU * round(theta / TAU);
}
`

/** The band's wave table as the surface uploads it, shared so the foam pass reads the same layout. */
export const waveWgsl = /* wgsl */ `
struct Wave {
  k: vec2f,
  amplitude: f32,
  // lambda A / |k|: the horizontal displacement is -lambda k_hat A sin(theta), the Gerstner sign the query uses.
  displacement: f32,
  // omega, rad/s; the draw takes time through the phases, and foam needs no velocity (foam.ts).
  frequency: f32,
  _pad0: f32,
  _pad1: vec2f,
}

// The divergence of one component's horizontal displacement -d k_hat sin(theta), at cos(theta) = c.
fn wave_divergence(wave: Wave, d: f32, c: f32) -> f32 {
  return -d * c * dot(wave.k, wave.k);
}
`

/** How the tail's per-cascade fields are sampled and what their derivative and moment channels mean (tail.ts). */
export const cascadeWgsl = /* wgsl */ `
// Where a cascade (tile L, the origin modulo L plus half a texel) samples the point x from the clipmap origin.
fn cascade_uv(cascade: vec4f, x: vec2f) -> vec2f {
  return (x + cascade.yz) / cascade.x;
}

// The cascade's displacement divergence and its variance over a filtered footprint, from the derivatives
// (.., .., dDx/dx, dDy/dy) and the second moments (.., .., .., div^2) at the same filter.
fn cascade_divergence(derivative: vec4f, second: vec4f) -> vec2f {
  let divergence = derivative.z + derivative.w;
  return vec2f(divergence, max(second.w - divergence * divergence, 0.0));
}

// PROTOTYPE (#41): the breaking-weighted divergence and its variance over a filtered footprint, from the breaking field
// (w div, (w div)^2, .., ..).
fn breaking_divergence(breaking: vec4f) -> vec2f {
  return vec2f(breaking.x, max(breaking.y - breaking.x * breaking.x, 0.0));
}
`

/**
 * The fraction of a Gaussian below `threshold`, and the step itself when the variance is zero. The erfc is Abramowitz
 * and Stegun 1964 (formula 7.1.26, absolute error under 1.5e-7): algorithm constants, not data.
 */
export const coverageWgsl = /* wgsl */ `
fn coverage_below(threshold: f32, mean: f32, variance: f32) -> f32 {
  if (variance <= 0.0) {
    return select(0.0, 1.0, mean < threshold);
  }
  let z = (threshold - mean) / sqrt(variance);
  let x = abs(z) * 0.70710678118654752;
  let t = 1.0 / (1.0 + 0.3275911 * x);
  let poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  let tail = 0.5 * poly * exp(-x * x);
  return select(1.0 - tail, tail, z < 0.0);
}
`
