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
  // |k|, rad/m.
  magnitude: f32,
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
`
