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
// PROTOTYPE (tail repetition, #44): turn is (cos, sin) of the lattice's turn; x is taken into the lattice's frame, and
// the origin offset is the lattice-frame origin modulo L (cascadeOffset).
fn cascade_uv(cascade: vec4f, turn: vec2f, x: vec2f) -> vec2f {
  let lattice = vec2f(turn.x * x.x + turn.y * x.y, -turn.y * x.x + turn.x * x.y);
  return (lattice + cascade.yz) / cascade.x;
}

// The cascade's displacement divergence and its variance over a filtered footprint, from the derivatives
// (.., .., dDx/dx, dDy/dy) and the second moments (.., .., .., div^2) at the same filter.
fn cascade_divergence(derivative: vec4f, second: vec4f) -> vec2f {
  let divergence = derivative.z + derivative.w;
  return vec2f(divergence, max(second.w - divergence * divergence, 0.0));
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

/**
 * PROTOTYPE (tail repetition, #44): a cascade's sampling offset, the clipmap origin in the turned lattice's frame modulo
 * the tile plus half a texel, in f64 so the f32 lookup never sees a large coordinate.
 */
export const cascadeOffset = (
  tile: number,
  texel: number,
  turn: number,
  x0: number,
  y0: number,
): readonly [number, number] => {
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  return [wrap(c * x0 + s * y0, tile) + texel / 2, wrap(-s * x0 + c * y0, tile) + texel / 2]
}

/**
 * PROTOTYPE (tail repetition, #44, layout L5): hex tiling of cascade 0 after Heitz and Neyret 2018. The plane is cut by
 * a triangular lattice of spacing a (one cascade 0 tile, so each vertex's Voronoi hexagon is one tile across); each
 * lattice vertex samples the cascade at its own random offset, and a point blends its triangle's three samples with
 * barycentric weights normalised to unit square sum, which keeps the variance of a zero-mean Gaussian field. `hex` is
 * (a, the origin's fractional skewed coordinate, 1 when on) and `hex_id` the origin's integer skewed coordinate.
 */
export const hexWgsl = /* wgsl */ `
struct HexTaps {
  offset0: vec2f,
  offset1: vec2f,
  offset2: vec2f,
  // Barycentric weights over the root of their square sum: a linear field blends with these, a variance with their squares.
  weight: vec3f,
}

// pcg2d (Jarzynski and Olano 2020) of the vertex's integer coordinates, as a uv offset in [0, 1).
fn hex_offset(id: vec2f) -> vec2f {
  var v = vec2u(bitcast<u32>(i32(id.x)), bitcast<u32>(i32(id.y)));
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v = v ^ (v >> vec2u(16u));
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v = v ^ (v >> vec2u(16u));
  return vec2f(v >> vec2u(8u)) / 16777216.0;
}

fn hex_taps(x: vec2f, hex: vec4f, hex_id: vec4f) -> HexTaps {
  // Skewed coordinates: the triangular lattice's vertices at integer points.
  let p = x / hex.x;
  let q = vec2f(p.x - p.y * 0.57735026918962576, p.y * 1.15470053837925153) + hex.yz;
  let base = floor(q);
  let f = q - base;
  let z = 1.0 - f.x - f.y;
  var w: vec3f;
  var v0: vec2f;
  var v1: vec2f;
  var v2: vec2f;
  if (z > 0.0) {
    w = vec3f(z, f.y, f.x);
    v0 = base;
    v1 = base + vec2f(0.0, 1.0);
    v2 = base + vec2f(1.0, 0.0);
  } else {
    w = vec3f(-z, 1.0 - f.y, 1.0 - f.x);
    v0 = base + vec2f(1.0, 1.0);
    v1 = base + vec2f(1.0, 0.0);
    v2 = base + vec2f(0.0, 1.0);
  }
  let id = hex_id.xy;
  // hex.w 2 is a check only: plain barycentric weights, which lose variance toward a triangle's centre.
  let norm = select(length(w), 1.0, hex.w > 1.5);
  return HexTaps(hex_offset(v0 + id), hex_offset(v1 + id), hex_offset(v2 + id), w / norm);
}

// The second-moment channels (sx^2, sy^2, sx sy, div^2) of a texel whose first moments are d = (sx, sy, dDx/dx, dDy/dy).
fn hex_square(d: vec4f) -> vec4f {
  let divergence = d.z + d.w;
  return vec4f(d.x * d.x, d.y * d.y, d.x * d.y, divergence * divergence);
}
`

/** PROTOTYPE (tail repetition, #44): the `hex` and `hex_id` uniforms for cascade 0's tile, origin split in f64. */
export const hexUniform = (tile: number, x0: number, y0: number, on: boolean | 'linear'): number[] => {
  const qx = (x0 - y0 / Math.sqrt(3)) / tile
  const qy = (2 * y0) / Math.sqrt(3) / tile
  const ix = Math.floor(qx)
  const iy = Math.floor(qy)
  return [tile, qx - ix, qy - iy, on === 'linear' ? 2 : on ? 1 : 0, ix, iy, 0, 0]
}
