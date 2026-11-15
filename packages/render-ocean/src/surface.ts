import type { WhitecapTable } from '@luovi/core'
import type { SeaDescription } from '@luovi/sim-world'
import {
  bandWeights,
  CDLOD_MORPH_SHARE,
  cascadeWeights,
  type Clipmap,
  clipmapFor,
  ringTotal,
  surfacePhases,
} from './clipmap.ts'
import { createOceanFoam } from './foam.ts'
import { type RingMesh, ringMesh } from './mesh.ts'
import { defaultRenderOceanSettings, type OceanDebug, type RenderOceanSettings } from './settings.ts'
import {
  bandSlopeCovariance,
  coxMunkCovariance,
  type OceanOptics,
  unresolvedBandCovariance,
  waterAbsorption,
} from './shading.ts'
import { cascadeWgsl, phaseWgsl, waveWgsl, wrap } from './shared.ts'
import { createOceanTail, MAX_CASCADES, type TailFields } from './tail.ts'
import { CREST_BANDS, whitecapWgsl } from './whitecaps.ts'

// The sea surface draw: every ring of the clipmap as one indexed draw of the shared ring mesh, the band summed per vertex
// and the tail's cascades sampled where the ring resolves them (ADR 0011). render-ocean may not import render-scene (both
// are renderers), so the frame's target formats, the camera and atmosphere WGSL and their bind group layouts come in as
// arguments.
//
// Shading (#36) filters every slope the pixel cannot resolve into one Gaussian slope distribution per pixel: its mean is
// the drawn surface's slope, its covariance the cascades' slope covariance over the pixel's footprint (from the moment
// mips), the band's displacement the ring does not carry, and a floor that tops the drawn variance up to Cox and Munk's
// at the generating wind. Whatever is not drawn, a band the ring flattened or a cascade switched off, so joins the
// roughness and the sea's total slope variance, and with it its mean brightness, stays put.

/** What the scene renderer lends the sea: its device, target formats and the WGSL and layouts of its shared groups. */
export interface OceanTarget {
  readonly device: GPUDevice
  readonly format: GPUTextureFormat
  readonly sampleCount: number
  /** Reverse-Z: the pipeline keeps the greater depth. */
  readonly depthFormat: GPUTextureFormat
  /**
   * WGSL that declares `camera` (with a world `eye`) at group 0 and the atmosphere at group 1, with
   * `sky_radiance(position, ray)` and `sky_radiance_to_point(eye, point)` returning `radiance` and `transmittance`,
   * `sun_and_sky_irradiance(point, normal)` returning `sun` and `sky`, `sun_direction()`,
   * `atmosphere.sun_angular_radius`, `planet_radius()` (m) and `curvature_drop(from_eye)` (m).
   */
  readonly sceneWgsl: string
  /** The layouts of groups 0 and 1 in that order. */
  readonly sceneLayouts: readonly GPUBindGroupLayout[]
}

/** One frame of the sea as the scene renderer asks for it. */
export interface OceanFrame {
  /** The published slot's tick: the sea is drawn at tick / TICKS_PER_SECOND and never at wall time, so pause freezes it. */
  readonly tick: number
  /** World eye position, m, f64. */
  readonly eye: readonly [number, number, number]
  /** m, the scenario's effective roughness length z0, which carries the sea's U10 to the Cox and Munk floor's height. */
  readonly roughnessLength: number
  /** The frame's view-projection for positions measured from `origin` (world m), so the GPU never sees a large coordinate. */
  viewProjectionFrom(origin: readonly [number, number, number]): Float32Array<ArrayBuffer>
  readonly debug: OceanDebug
  /**
   * Foam stamps for the frame: world x, y, radius (m) and density per stamp, at most MAX_FOAM_STAMPS. None are sent yet; hull
   * contact from render-ship sends them at step 2. They land at undisplaced positions, where the buffer stores foam, so
   * a sender holding a displaced point inverts the displacement first.
   */
  readonly foamStamps?: Float64Array
}

export interface OceanSurface {
  /**
   * A new sea state: uploads its wave vectors, frequencies and amplitudes, the only time they move to the GPU. null is
   * flat water. Settings default to those derived from the sea; a host override replaces them whole.
   */
  setSea(sea: SeaDescription | null, settings?: RenderOceanSettings): void
  readonly settings: RenderOceanSettings
  /** Tail cascades of the current sea, 0 for flat water; the panel offers a toggle per cascade. */
  readonly cascadeCount: number
  /**
   * m above mean level: the band's amplitudes summed, which no crest of the band exceeds, since the choppy displacement
   * moves water sideways and never higher. 0 for flat water.
   */
  readonly crest: number
  /** The frame's CPU work and uploads: the clipmap, the per-ring band and cascade weights, the N phases, the tail's time. */
  prepare(frame: OceanFrame): void
  /** The tail's evolution, FFT and mips into an open compute pass, before the surface draws. */
  encodeTail(pass: GPUComputePassEncoder): void
  /**
   * The foam buffer's update as one render pass of its own, carrying `timestampWrites`; the pass exists in every frame,
   * empty when foam is off, so the foam's timing always has its line.
   */
  encodeFoam(encoder: GPUCommandEncoder, timestampWrites: GPURenderPassTimestampWrites | undefined): void
  /** Encodes the surface into an open scene pass; `sceneGroups` are the bind groups for `sceneLayouts`. */
  draw(pass: GPURenderPassEncoder, sceneGroups: readonly GPUBindGroup[]): void
  destroy(): void
}

/** Floats per component in the wave table: kx, ky, amplitude, lambda A / k, omega, |k|, then padding to 32 bytes. */
const WAVE_FLOATS = 8
/**
 * Floats per ring: centre x and y from the origin, spacing, carry, height morph, level, padding, cascade weights, the
 * band's unresolved slope covariance and padding.
 */
const RING_FLOATS = 16
/**
 * Where each field of the `Ocean` uniform starts, in 4-byte words; the WGSL struct below lists them in this order. After
 * the cascades come the shading constants (band covariance with the refractive index, Cox and Munk covariance with the
 * backscattering, absorption) and the foam's (window, sampling offset with threshold and lifetime reflectance, albedos).
 */
/** Crest bands the surface tests for whitecaps: the CPU band as one, then each cascade's. */
const CREST_BAND_SLOTS = 1 + CREST_BANDS * MAX_CASCADES

const OCEAN_WORD = (() => {
  const shading = 28 + 4 * MAX_CASCADES
  const foam = shading + 12
  return {
    viewProjection: 0,
    eye: 16,
    count: 19,
    origin: 20,
    wireframe: 23,
    band: 24,
    cascadeCount: 25,
    cascades: 28,
    shading,
    coxMunk: shading + 4,
    foamWindow: foam,
    /** foam_sample.z: the threshold, then the lifetime, fresh and thin reflectances. */
    foamThreshold: foam + 6,
    /** The whitecap model's constants as three vec4, then a vec4 per crest band, the band's first. */
    whitecap: foam + 12,
    crestBands: foam + 24,
    end: foam + 24 + 4 * CREST_BAND_SLOTS,
  } as const
})()

const OCEAN_UNIFORM_BYTES = 4 * OCEAN_WORD.end

/** Anisotropic taps the crest fields are sampled with. */
const CREST_ANISOTROPY = 16
/** Cells of the foam lace's coarse grid before it repeats; the fine grid is a third of the coarse cell. */
const LACE_PERIOD = 1024
const LACE_FINE = 3
/** Times longer the lace's cells are along the waves' direction of travel than across it. */
const LACE_STRETCH = 3
/** The share of the foam a roller leaves that the lace keeps on average, for the expected cover of unresolved waves. */
const TRAIL_COVER = 0.3
/** Where across the foam buffer's half-width its foam starts to fade out, so the buffer's edge never shows. */
const FOAM_FADE_START = 0.75

const surfaceWgsl = (sceneWgsl: string, whitecaps: WhitecapTable): string => /* wgsl */ `
${sceneWgsl}
${phaseWgsl}
${waveWgsl}
${cascadeWgsl}
${whitecapWgsl(CREST_BAND_SLOTS)}

struct Ocean {
  view_projection: mat4x4f,
  eye: vec3f,
  count: u32,
  origin: vec2f,
  cells: f32,
  wireframe: u32,
  band: u32,
  cascade_count: u32,
  _pad: vec2u,
  // Per cascade: tile L (m), the clipmap origin modulo L plus half a texel (m), and 1 when the debug panel draws it.
  cascades: array<vec4f, ${String(MAX_CASCADES)}>,
  // The band's exact slope covariance (xx, yy, xy) and the water's refractive index.
  band_covariance: vec4f,
  // Cox and Munk's slope covariance at the generating wind (xx, yy, xy) and the water's backscattering, 1/m.
  cox_munk: vec4f,
  // Absorption of the water per channel, 1/m.
  absorption: vec4f,
  // The foam buffer's first corner from the origin (m), its side (m), and 1 when foam is drawn.
  foam_window: vec4f,
  // The origin modulo the buffer's side (m), the breaking threshold, and the lifetime-average foam reflectance.
  foam_sample: vec4f,
  // Foam reflectance fresh and thin.
  foam_albedo: vec4f,
  // The onset and full steepness of a breaking group, and the unit vector the waves travel along.
  whitecap: vec4f,
  // The roller's phase ahead of and behind the crest (rad), and the clipmap origin modulo the lace's period (m).
  whitecap_shape: vec4f,
  // The plume's backscattering (1/m) and persistence, the lace's coarse cell (m).
  whitecap_plume: vec4f,
  // Per crest band, the CPU band first: the steepness variance, the mean wavenumber (rad/m), the phase over which its
  // foam fades by e (rad), and the share of a full whitecap's foam its breakers make: 1 for long waves, falling to 0
  // across the wavelengths too short to entrain air, where a breaker leaves only a fleck.
  crest_bands: array<vec4f, ${String(CREST_BAND_SLOTS)}>,
}

struct Ring {
  centre: vec2f,
  spacing: f32,
  carry: f32,
  height_morph: f32,
  level: f32,
  _pad: vec2f,
  // How much of each cascade's displacement the ring carries, cascade 0 first.
  cascades: vec4f,
  // The slope covariance (xx, yy, xy) of the band displacement this ring does not carry.
  unresolved: vec4f,
}

@group(2) @binding(0) var<uniform> ocean: Ocean;
@group(2) @binding(1) var<storage, read> waves: array<Wave>;
@group(2) @binding(2) var<storage, read> phases: array<f32>;
@group(2) @binding(3) var<storage, read> weights: array<f32>;
@group(2) @binding(4) var<storage, read> rings: array<Ring>;
// The tail's fields, a layer per cascade (see tail.ts): (Dx, Dy, h, dDx/dy) and (dh/dx, dh/dy, dDx/dx, dDy/dy).
@group(2) @binding(5) var displacement: texture_2d_array<f32>;
@group(2) @binding(6) var derivatives: texture_2d_array<f32>;
@group(2) @binding(7) var tail_sampler: sampler;
// The slope's second moments per cascade layer: (sx^2, sy^2, sx sy).
@group(2) @binding(8) var moments: texture_2d_array<f32>;
// Near-field foam density, indexed by undisplaced position (foam.ts).
@group(2) @binding(9) var foam: texture_2d<f32>;
// (steepness, slope x, slope y, squared envelope) per crest band, ${String(CREST_BANDS)} layers per cascade (tail.ts).
@group(2) @binding(10) var crests: texture_2d_array<f32>;
// Seen at a grazing angle a whitecap is a dash a pixel or two high and many wide, so the crest fields keep sixteen taps
// of anisotropy where the drawn fields make do with four.
@group(2) @binding(11) var crest_sampler: sampler;

struct Varying {
  @builtin(position) position: vec4f,
  // Displaced position measured from the clipmap origin.
  @location(0) relative: vec3f,
  // The displaced surface's tangents along the undisplaced x and y; their cross product is the normal, formed per pixel
  // from interpolated vertex slopes.
  @location(1) tangent_x: vec3f,
  @location(2) tangent_y: vec3f,
  // Ring-local cell coordinates after the morph, for the wireframe overlay.
  @location(3) cell: vec2f,
  @location(4) @interpolate(flat) level: f32,
  // Aerial perspective between the eye and the vertex, which varies over hundreds of metres, so per vertex.
  @location(5) transmittance: vec3f,
  @location(6) in_scatter: vec3f,
  // The undisplaced position after the morph, measured from the clipmap origin: where the tail's fields are sampled.
  @location(7) lagrangian: vec2f,
  // The band's slope covariance the ring flattened, morphed with the ring's band weights.
  @location(8) unresolved: vec4f,
  // The divergence of the band displacement the vertex carries: the long waves' share of the surface's Jacobian.
  @location(9) band_divergence: f32,
  // The carried band's crest fields, its steepness sum a k cos and its linear slope.
  @location(10) crest: vec3f,
}

// Where cascade c samples the point x from the clipmap origin.
fn tail_uv(c: u32, x: vec2f) -> vec2f {
  return cascade_uv(ocean.cascades[c], x);
}

fn crest_band(b: u32) -> vec4f {
  return ocean.crest_bands[b];
}

fn whitecap_steepness() -> vec4f {
  return ocean.whitecap;
}

fn whitecap_shape() -> vec4f {
  return ocean.whitecap_shape;
}

// Crest band j of cascade c over the pixel's footprint.
fn crest_pixel(c: u32, j: u32, x: vec2f) -> vec3f {
  return textureSample(crests, crest_sampler, tail_uv(c, x), ${String(CREST_BANDS)}u * c + j).xyz;
}

// The root mean square envelope steepness of crest band j of cascade c around x: the squared envelope averaged over
// about a wavelength, from the mip whose texel is that wide, or the pixel's own footprint when that is wider.
fn crest_group(c: u32, j: u32, x: vec2f, wavenumber: f32, sampled: f32) -> f32 {
  let texel = ocean.cascades[c].x / f32(textureDimensions(crests).x);
  let lod = max(log2(max(${String(whitecaps.groupWavelengths.value)} * TAU / wavenumber, sampled) / texel), 0.0);
  return sqrt(textureSampleLevel(crests, tail_sampler, tail_uv(c, x), ${String(CREST_BANDS)}u * c + j, lod).w);
}

// pcg2d (Jarzynski and Olano 2020) of a cell's integer coordinates, as a point in the unit square: algorithm
// constants, not data.
fn cell_point(id: vec2f) -> vec2f {
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

// The distances to the nearest and the second nearest point of a jittered grid, in cells; the grid repeats every
// \`period\` cells. Their difference is zero on the walls between cells and largest at a cell's own point.
fn cellular(p: vec2f, period: f32) -> vec2f {
  let cell = floor(p);
  let f = p - cell;
  var nearest = 8.0;
  var second = 8.0;
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let o = vec2f(f32(i), f32(j));
      let id = cell + o;
      let q = o + cell_point(id - period * floor(id / period)) - f;
      let d = dot(q, q);
      if (d < nearest) {
        second = nearest;
        nearest = d;
      } else if (d < second) {
        second = d;
      }
    }
  }
  return sqrt(vec2f(nearest, second));
}

@vertex
fn vertex_main(@builtin(vertex_index) index: u32, @builtin(instance_index) slot: u32) -> Varying {
  let ring = rings[slot];
  let side = u32(ocean.cells) + 1u;
  let half = ocean.cells * 0.5;
  let grid = vec2f(f32(index % side), f32(index / side)) - half;
  let flat_position = ring.centre + grid * ring.spacing;

  // CDLOD morph over the outer quarter of the ring, by distance from the eye so a vertex never moves when the ring
  // snaps. The ring's edge lies at least half - 1 cells from the eye, since its centre is snapped to twice its spacing,
  // so the edge is always fully morphed onto the next ring's vertices.
  let reach = max(abs(flat_position.x - ocean.eye.x), abs(flat_position.y - ocean.eye.y)) / ring.spacing;
  let morph_end = half - 1.0;
  let morph_start = morph_end - ${String(CDLOD_MORPH_SHARE)} * half;
  let morph = max(clamp((reach - morph_start) / (morph_end - morph_start), 0.0, 1.0), ring.height_morph);
  // Odd vertices slide onto the even one below them; the centre is on the coarser grid, so local parity is world parity.
  let odd = grid - 2.0 * floor(grid * 0.5);
  let cell = grid - odd * morph;
  let position = ring.centre + cell * ring.spacing;
  // The planet's curvature ends the drawn sea at the true horizon, dipping sqrt(2 h / R) below eye level, where a flat
  // plane would run up to eye level; the rings beyond lie under it, hidden by the nearer sea. Measured from the eye, not
  // the world origin, so the sea under the eye stays the simulation's flat sea.
  let from_eye = position - ocean.eye.xy;

  var height = 0.0;
  var shift = vec2f(0.0);
  var slope = vec2f(0.0);
  var stretch = vec3f(0.0); // d(shift.x)/dx, d(shift.x)/dy = d(shift.y)/dx, d(shift.y)/dy
  var band_divergence = 0.0;
  var crest_steepness = 0.0;
  var crest_slope = vec2f(0.0);
  // Rings are ordered by carry, so a ring that carries nothing also morphs towards a ring that carries nothing.
  if (ring.carry > 0.0 && ocean.band != 0u) {
    let row = slot * ocean.count;
    for (var i = 0u; i < ocean.count; i++) {
      // The morph also blends the band weights towards the next ring's, so a vertex that lands on the next ring
      // carries exactly what that ring carries there.
      let weight = mix(weights[row + i], weights[row + ocean.count + i], morph);
      if (weight == 0.0) {
        continue;
      }
      let wave = waves[i];
      let theta = reduce_phase(dot(wave.k, position) + phases[i]);
      let s = sin(theta);
      let c = cos(theta);
      let a = weight * wave.amplitude;
      let d = weight * wave.displacement;
      height += a * c;
      shift -= d * s * wave.k;
      slope -= a * s * wave.k;
      stretch -= d * c * vec3f(wave.k.x * wave.k.x, wave.k.x * wave.k.y, wave.k.y * wave.k.y);
      band_divergence += wave_divergence(wave, d, c);
      crest_steepness += a * wave.magnitude * c;
    }
    crest_slope = slope;
  }
  if (ring.carry > 0.0) {
    let carried = mix(ring.cascades, rings[slot + 1u].cascades, morph);
    let texels = f32(textureDimensions(displacement).x);
    for (var c = 0u; c < ocean.cascade_count; c++) {
      let weight = carried[c] * ocean.cascades[c].w;
      if (weight == 0.0) {
        continue;
      }
      // The mip whose texel matches the ring's spacing: the waves a ring cannot carry average out instead of aliasing.
      let lod = max(0.0, log2(mix(1.0, 2.0, morph) * ring.spacing * texels / ocean.cascades[c].x));
      let uv = tail_uv(c, position);
      let field = textureSampleLevel(displacement, tail_sampler, uv, c, lod);
      let derivative = textureSampleLevel(derivatives, tail_sampler, uv, c, lod);
      height += weight * field.z;
      shift += weight * field.xy;
      // The stretch of the displacement the vertex carries, at the same filter, so the normal belongs to the drawn mesh.
      stretch += weight * vec3f(derivative.z, field.w, derivative.w);
    }
  }
  var unresolved = ring.unresolved;
  if (ring.carry > 0.0) {
    unresolved = mix(unresolved, rings[slot + 1u].unresolved, morph);
  }
  height -= curvature_drop(from_eye);
  slope -= from_eye / planet_radius();
  let relative = vec3f(position + shift, height);
  let between = sky_radiance_to_point(camera.eye, vec3f(ocean.origin + relative.xy, relative.z));
  return Varying(
    ocean.view_projection * vec4f(relative, 1.0),
    relative,
    vec3f(1.0 + stretch.x, stretch.y, slope.x),
    vec3f(stretch.y, 1.0 + stretch.z, slope.y),
    cell,
    ring.level,
    between.transmittance,
    between.radiance,
    position,
    unresolved,
    band_divergence,
    vec3f(crest_steepness, crest_slope),
  );
}

// Tints for the wireframe overlay, alternating by ring level so each ring's extent reads against its neighbours.
const RING_TINTS = array<vec3f, 2>(vec3f(0.1, 0.9, 1.0), vec3f(1.0, 0.2, 0.8));

// Symmetric 2 by 2 matrices travel as (xx, yy, xy). The nearest positive semi-definite one: negative eigenvalues to 0.
fn clamp_covariance(m: vec3f) -> vec3f {
  let centre = 0.5 * (m.x + m.y);
  let deviation = vec2f(0.5 * (m.x - m.y), m.z);
  let radius = length(deviation);
  let high = max(centre + radius, 0.0);
  let low = max(centre - radius, 0.0);
  let axis = select(vec2f(1.0, 0.0), deviation / radius, radius > 0.0);
  let mean = 0.5 * (high + low);
  let spread = 0.5 * (high - low);
  return vec3f(mean + spread * axis.x, mean - spread * axis.x, spread * axis.y);
}

// The Gaussian slope density with the given mean slope and covariance s, at slope zeta.
fn slope_density(zeta: vec2f, mean: vec2f, s: vec3f) -> f32 {
  let det = s.x * s.y - s.z * s.z;
  let d = zeta - mean;
  let q = (s.y * d.x * d.x - 2.0 * s.z * d.x * d.y + s.x * d.y * d.y) / det;
  return exp(-0.5 * q) / (TAU * sqrt(det));
}

// Smith's masking term for a Gaussian slope distribution seen from direction w (away from the surface). Along w's
// azimuth the slopes are Gaussian with the projected variance; a facet is edge-on where its slope there equals cot of
// w's zenith angle, measured from the mean slope. The rational form is Walter, Marschner, Li and Torrance 2007 (EGSR,
// eq. 27), their fit to Beckmann's Lambda in a = cot / (sqrt 2 sigma): an algorithm constant, not data.
fn smith_lambda(w: vec3f, mean: vec2f, s: vec3f) -> f32 {
  let horizontal = length(w.xy);
  if (horizontal == 0.0) {
    return 0.0;
  }
  let along = w.xy / horizontal;
  let variance = s.x * along.x * along.x + 2.0 * s.z * along.x * along.y + s.y * along.y * along.y;
  let a = max((w.z / horizontal - dot(mean, along)) / sqrt(2.0 * max(variance, 1e-12)), 1e-3);
  if (a >= 1.6) {
    return 0.0;
  }
  return (1.0 - 1.259 * a + 0.396 * a * a) / (3.535 * a + 2.181 * a * a);
}

// Unpolarised Fresnel reflectance of a dielectric of relative index n at incidence cosine c (Cook and Torrance 1982).
fn fresnel(cosine: f32, n: f32) -> f32 {
  let c = clamp(cosine, 0.0, 1.0);
  let g = sqrt(n * n - 1.0 + c * c);
  let a = (g - c) / (g + c);
  let b = (c * (g + c) - 1.0) / (c * (g - c) + 1.0);
  return 0.5 * a * a * (1.0 + b * b);
}

// The cosine from the normal of a ray refracted into the water, by Snell.
fn refracted_cosine(cosine: f32, n: f32) -> f32 {
  return sqrt(1.0 - (1.0 - cosine * cosine) / (n * n));
}

// A reflected ray that dips under the horizon would see the sea itself, which this shade cannot draw, so it is held just
// above the horizon: from a point at or under mean level a ray exactly along it already meets the planet's ground in the
// atmosphere's tables, which reads black.
fn sky_along(world: vec3f, mirror: vec3f) -> vec3f {
  return sky_radiance(world, normalize(vec3f(mirror.xy, max(mirror.z, 0.01)))).radiance;
}

// The facet normal of slope zeta: the surface z = zeta . x has normal (-zeta, 1).
fn facet_normal(zeta: vec2f) -> vec3f {
  return normalize(vec3f(-zeta, 1.0));
}

@fragment
fn fragment_main(in: Varying) -> @location(0) vec4f {
  let n = ocean.band_covariance.w;
  let backscattering = ocean.cox_munk.w;
  // Every drawn cascade's slope per pixel through the hardware filter, with its covariance over the same footprint from
  // the moment mips. Only the slope: the horizontal stretch came with the displacement the vertex carried.
  var slope = vec2f(in.tangent_x.z, in.tangent_y.z);
  var variance = vec3f(0.0);
  // The slope variance the drawn sea holds in all, whatever this pixel resolves of it: the floor tops it up to Cox and
  // Munk's. Cascades switched off and an undrawn band leave theirs to the floor.
  var drawn = vec3f(0.0);
  if (ocean.band != 0u) {
    variance += in.unresolved.xyz;
    drawn += ocean.band_covariance.xyz;
  }
  // The surface's linearised Jacobian 1 + div D over the pixel's footprint, which the foam lying on it thins and gathers
  // by: the band's carried divergence and each cascade's filtered mean.
  var jacobian = 1.0 + in.band_divergence;
  let whole = i32(textureNumLevels(moments)) - 1;
  // Every crest band's steepness and slope here, the band's from the vertex stage first.
  var crest_s: array<f32, ${String(CREST_BAND_SLOTS)}>;
  var crest_g: array<vec2f, ${String(CREST_BAND_SLOTS)}>;
  crest_s[0] = in.crest.x;
  crest_g[0] = in.crest.yz;
  let foot_x = dpdx(in.lagrangian);
  let foot_y = dpdy(in.lagrangian);
  for (var c = 0u; c < ocean.cascade_count; c++) {
    for (var j = 0u; j < ${String(CREST_BANDS)}u; j++) {
      let slot = 1u + ${String(CREST_BANDS)}u * c + j;
      // A band too short to whitecap is never read, so it is not sampled either.
      if (ocean.crest_bands[slot].w > 0.0) {
        let field = crest_pixel(c, j, in.lagrangian);
        crest_s[slot] = field.x;
        crest_g[slot] = field.yz;
      }
    }
    let uv = tail_uv(c, in.lagrangian);
    let derivative = textureSample(derivatives, tail_sampler, uv, c);
    let second = textureSample(moments, tail_sampler, uv, c);
    jacobian += derivative.z + derivative.w;
    if (ocean.cascades[c].w != 0.0) {
      let mean = derivative.xy;
      slope += mean;
      variance += second.xyz - vec3f(mean * mean, mean.x * mean.y);
      let tile_mean = textureLoad(derivatives, vec2i(0), c, whole).xy;
      drawn += textureLoad(moments, vec2i(0), c, whole).xyz - vec3f(tile_mean * tile_mean, tile_mean.x * tile_mean.y);
    }
  }
  // The near buffer, sampled before any branch since sampling needs uniform control flow.
  let window = ocean.foam_window;
  // Four taps half a texel apart, a tent three texels wide, so the buffer's grid does not show in the foam's outline.
  let foam_uv = (in.lagrangian + ocean.foam_sample.xy) / window.z;
  let foam_step = 0.5 / f32(textureDimensions(foam).x);
  let density = 0.25 * (textureSample(foam, tail_sampler, foam_uv + vec2f(foam_step, foam_step)).r
    + textureSample(foam, tail_sampler, foam_uv + vec2f(-foam_step, foam_step)).r
    + textureSample(foam, tail_sampler, foam_uv + vec2f(foam_step, -foam_step)).r
    + textureSample(foam, tail_sampler, foam_uv + vec2f(-foam_step, -foam_step)).r);
  // The rollers of the crest bands here (whitecaps.ts) and the foam earlier rollers left on this
  // water, from the buffer.
  let footprint = max(length(foot_x), length(foot_y));
  // What the crest sampler's anisotropic filter averages a crest field over.
  let sampled = max(footprint / ${String(CREST_ANISOTROPY)}.0, min(length(foot_x), length(foot_y)));
  // A pixel's width in the wave's phase is its footprint along the direction of travel; the lace, which has no
  // direction, blurs with the footprint's area.
  let travel = ocean.whitecap.zw;
  let travel_footprint = abs(dot(foot_x, travel)) + abs(dot(foot_y, travel));
  let lace_footprint = sqrt(footprint * min(length(foot_x), length(foot_y)));
  let onset = ocean.whitecap.x;
  let full = ocean.whitecap.y;
  let band_count = 1u + ${String(CREST_BANDS)}u * ocean.cascade_count;
  var groups: array<f32, ${String(CREST_BAND_SLOTS)}>;
  var resolved: array<f32, ${String(CREST_BAND_SLOTS)}>;
  var breaking = false;
  // The steepness of every longer wave here, and the share of the surface the bands this pixel cannot resolve leave clear.
  var longer = 0.0;
  var clear_far = 1.0;
  let band_slope = max(ocean.band_covariance.x + ocean.band_covariance.y, 1e-12);
  for (var b = 0u; b < band_count; b++) {
    let info = ocean.crest_bands[b];
    let lift = clamp(1.0 + longer, 0.6, 1.5);
    longer += crest_s[b];
    // The group's steepness: for a tail band the envelope's mean over a wavelength. The band's envelope is not
    // averaged, and a point's envelope passes a level a group's mean never reaches.
    var group = length(vec3f(crest_s[b], crest_g[b])) / ${String(whitecaps.pointOverGroup.value)};
    var share = clamp(1.0 - (in.unresolved.x + in.unresolved.y) / band_slope, 0.0, 1.0);
    if (b > 0u && info.w > 0.0) {
      let c = (b - 1u) / ${String(CREST_BANDS)}u;
      group = crest_group(c, (b - 1u) % ${String(CREST_BANDS)}u, in.lagrangian, info.y, sampled);
      share = 1.0 - smoothstep(0.5, 1.5, info.y * sampled);
    }
    groups[b] = group;
    resolved[b] = select(0.0, share, info.w > 0.0);
    breaking = breaking || (lift * lift * group > onset && resolved[b] > 0.0);
    // The envelope's square is exponential with mean twice the variance, so this is the share of the band's groups
    // steeper than half way up the ramp, times the share of a breaking wave its foam covers.
    let middle = 0.5 * (onset + full) / (lift * lift);
    let spilling = exp(-middle * middle / max(2.0 * info.x, 1e-9));
    let duty = info.w * (0.5 * ocean.whitecap_shape.x + ocean.whitecap_shape.y + ${String(TRAIL_COVER)} * info.z) / TAU;
    clear_far *= 1.0 - (1.0 - share) * spilling * duty;
  }
  // The foam the buffer holds on this water, fading out over the window's outer quarter.
  let from_centre = abs((in.lagrangian - window.xy) / window.z * 2.0 - 1.0);
  // Foam is carried by the water under it: where the short waves squeeze the surface the foam gathers, where they
  // stretch it the foam thins, by the surface's own Jacobian, so ripples move through a patch instead of under it.
  let laid = density / clamp(jacobian, 0.4, 2.5)
    * (1.0 - clamp((max(from_centre.x, from_centre.y) - ${String(FOAM_FADE_START)}) / ${String(1 - FOAM_FADE_START)}, 0.0, 1.0));
  var rollers = vec3f(0.0);
  // Where there is too little foam to be worth the lace's cells, the lace reads as all hole.
  var lace = 1.0;
  // How bright the foam's own texture makes it here: its clumps of bubbles, where the eye is close enough to see them.
  var froth = 1.0;
  if (breaking || laid > 0.004) {
    // The lace's grid lies along the direction of travel, its cells longer that way, so the thinning foam streaks downwind.
    let cell = ocean.whitecap_plume.z;
    let along = dot(in.lagrangian, travel) + ocean.whitecap_shape.z;
    let across = dot(in.lagrangian, vec2f(-travel.y, travel.x)) + ocean.whitecap_shape.w;
    let at = vec2f(along / (${String(LACE_STRETCH)}.0 * cell), across / cell);
    let fine = cellular(at * ${String(LACE_FINE)}.0, ${String(LACE_PERIOD * LACE_FINE)}.0);
    // The fine cells bend the coarse ones' walls, which would otherwise be a honeycomb of straight edges.
    let coarse = cellular(at + 0.35 * (fine - 0.4), ${String(LACE_PERIOD)}.0);
    // Patches four cells across open and close together, so the holes do not open as an even grid of dots, and cells a
    // ninth of the coarse ones give the foam its bubbles where the eye is close enough to see them.
    let clump = cellular(at * 0.25, ${String(LACE_PERIOD / 4)}.0);
    let bubble = cellular(at * ${String(LACE_FINE * LACE_FINE)}.0, ${String(LACE_PERIOD * LACE_FINE * LACE_FINE)}.0);
    let bubbles = 1.0 - clamp(${String(LACE_FINE * LACE_FINE)}.0 * lace_footprint / cell, 0.0, 1.0);
    lace = clamp(0.85 * (coarse.y - coarse.x) + 0.45 * (fine.y - fine.x) + 0.2 * (clump.x - 0.45)
      + 0.3 * bubbles * (bubble.y - bubble.x - 0.3), 0.0, 1.0);
    froth = 1.0 + bubbles * (0.9 * bubble.x - 0.3) + 0.5 * (fine.x - 0.35);
    if (breaking) {
      rollers = whitecap_rollers(&crest_s, &crest_g, &groups, &resolved, band_count, coarse.x, travel_footprint);
    }
  }
  // Foam density, 1 in a long wave's roller; its thickness, which sets how much light it returns; and the bubble plume
  // under it, which outlasts the foam.
  let whitecap = max(rollers.x, laid);
  let thickness = max(rollers.y, laid);
  let plume = max(rollers.y, clamp(ocean.whitecap_plume.y * laid, 0.0, 1.0));
  // The patch opens into lace as it thins: foam stays where the cell walls are, and the holes grow from the cells' own
  // points. Where a pixel holds many cells it shows their mean cover.
  let lace_blur = clamp(lace_footprint / ocean.whitecap_plume.z, 0.0, 1.0);
  let lace_edge = 1.1 * whitecap;
  let lace_width = mix(0.04, 0.5, lace_blur);
  let whitecap_cover = mix(1.0 - smoothstep(lace_edge - lace_width, lace_edge + lace_width, lace), clamp(lace_edge, 0.0, 1.0), lace_blur)
    * step(1e-4, whitecap);
  let sigma = clamp_covariance(variance) + clamp_covariance(ocean.cox_munk.xyz - drawn);
  let surface = cross(vec3f(in.tangent_x.xy, slope.x), vec3f(in.tangent_y.xy, slope.y));
  // The pixel's mean slope: the drawn surface's, horizontal stretch included.
  let mean = -surface.xy / surface.z;
  let world = vec3f(ocean.origin + in.relative.xy, in.relative.z);
  let eye = normalize(ocean.eye - in.relative);
  let sun = sun_direction();

  // Sky reflection: the sky seen in the mirror of four slopes, the unscented transform's sigma points of the pixel's
  // slope distribution (mean plus and minus sqrt 2 times each column of its Cholesky factor, a quarter each), weighted by
  // the area each facet shows the eye. The factor is taken in the frame of the view's azimuth, slope along it first, so
  // the points tilt the mirror up and down the sky, the direction its radiance changes fastest, and follow the eye
  // smoothly as it turns. Sky radiance varies too slowly away from the Sun to need more; the Sun is integrated below.
  let toward = select(vec2f(1.0, 0.0), normalize(eye.xy), length(eye.xy) > 0.0);
  let across = vec2f(-toward.y, toward.x);
  let s_along = sigma.x * toward.x * toward.x + 2.0 * sigma.z * toward.x * toward.y + sigma.y * toward.y * toward.y;
  let s_across = sigma.x * across.x * across.x + 2.0 * sigma.z * across.x * across.y + sigma.y * across.y * across.y;
  let s_both = (sigma.x - sigma.y) * toward.x * across.x + sigma.z * (toward.x * across.y + toward.y * across.x);
  let l_along = sqrt(max(s_along, 1e-12));
  let l_mixed = s_both / l_along;
  let l_across = sqrt(max(s_across - l_mixed * l_mixed, 0.0));
  let spread = array<vec2f, 2>(
    (l_along * toward + l_mixed * across) * sqrt(2.0),
    l_across * across * sqrt(2.0),
  );
  var reflected = vec3f(0.0);
  var reflectance = 0.0;
  var shown = 0.0;
  for (var i = 0u; i < 4u; i++) {
    let facet = facet_normal(mean + select(1.0, -1.0, i >= 2u) * spread[i % 2u]);
    let facing = dot(eye, facet);
    if (facing > 0.0) {
      let area = facing / facet.z;
      let f = fresnel(facing, n);
      reflected += area * f * sky_along(world, reflect(-eye, facet));
      reflectance += area * f;
      shown += area;
    }
  }
  if (shown > 0.0) {
    reflected /= shown;
    reflectance /= shown;
  } else {
    let facet = facet_normal(mean);
    reflectance = fresnel(abs(dot(eye, facet)), n);
    reflected = reflectance * sky_along(world, reflect(-eye, facet));
  }

  // Sun glitter: the expected radiance of a Gaussian slope field toward the eye, E F p(zeta_h) / (4 mu_v cos^4 beta)
  // (Cox and Munk 1954), with Smith's masking and shadowing. The Sun's disc widens the lobe: a light direction moved by
  // delta moves the half vector by delta / 2, and a disc of radius r has variance r^2 / 4 per axis.
  let half_vector = normalize(eye + sun);
  let disc = atmosphere.sun_angular_radius * atmosphere.sun_angular_radius / 16.0;
  let glitter_sigma = sigma + vec3f(disc, disc, 0.0);
  let shadowing = 1.0 / (1.0 + smith_lambda(eye, mean, glitter_sigma) + smith_lambda(sun, mean, glitter_sigma));
  let beam = sun_and_sky_irradiance(world, sun).sun;
  let cos4 = half_vector.z * half_vector.z * half_vector.z * half_vector.z;
  var glitter = vec3f(0.0);
  if (sun.z > 0.0 && eye.z > 0.0) {
    glitter = beam * fresnel(dot(eye, half_vector), n) * slope_density(-half_vector.xy / half_vector.z, mean, glitter_sigma) *
      shadowing / (4.0 * eye.z * cos4);
  }

  // The water body in the quasi-single-scattering approximation (Gordon 1973): light enters through the mean facet,
  // decays at a + b_b along both paths, and is scattered back once, isotropically over the backward hemisphere, so the
  // phase function is b_b / 2 pi. A beam of in-water irradiance E at cosine mu_s seen at cosine mu_v gives
  // b_b / (2 pi) E mu_s / ((a + b_b) (mu_s + mu_v)) below the surface; sky light enters as a beam along the normal.
  let normal = facet_normal(mean);
  let cos_sun = max(dot(sun, normal), 0.0);
  let mu_v = refracted_cosine(clamp(dot(eye, normal), 0.0, 1.0), n);
  let mu_s = refracted_cosine(cos_sun, n);
  let light = sun_and_sky_irradiance(world, normal);
  // irradiance.sun is on the facet's plane; the refracted beam's own is that over mu_s.
  let sun_in = light.sun * (1.0 - fresnel(cos_sun, n)) / mu_s;
  let sky_in = light.sky * (1.0 - fresnel(1.0, n));
  // A bubble plume scatters as the water's own particles do, only far more of it.
  let scattering = backscattering + plume * ocean.whitecap_plume.x * select(0.0, 1.0, window.w != 0.0);
  let extinction = ocean.absorption.xyz + scattering;
  let below = scattering / TAU / extinction * (sun_in * mu_s / (mu_s + mu_v) + sky_in / (1.0 + mu_v));
  // Out through the surface, the radiance diluted by n^2 as the cone widens.
  let body = below * (1.0 - reflectance) / (n * n);

  // Foam covers a fraction of the pixel and scatters as a Lambertian surface lit through the mean facet.
  var water = reflected + glitter + body;
  if (window.w != 0.0) {
    // The rollers and the foam the buffer holds, bright where it is thick and dim where it is thin, and the bands this
    // pixel cannot resolve at their expected cover and the lifetime reflectance.
    let far = 1.0 - clear_far;
    let cap_albedo = mix(ocean.foam_albedo.y, ocean.foam_albedo.x, thickness) * froth;
    let clear = (1.0 - whitecap_cover) * (1.0 - far);
    let lit = whitecap_cover * cap_albedo + (1.0 - whitecap_cover) * far * ocean.foam_sample.w;
    // Foam hides the water's body, but its wet bubbles still mirror the sky and glint, less so the thicker it lies.
    let sheen = whitecap_cover * mix(${String(whitecaps.thinSheen.value)}, ${String(whitecaps.thickSheen.value)}, thickness);
    water = (reflected + glitter) * (clear + sheen) + body * clear + lit * (light.sun + light.sky) / ${String(Math.PI)};
  }

  var color = water * in.transmittance + in.in_scatter;

  // The wireframe as lines one pixel wide along every cell edge, faded where the cells crowd closer than four pixels.
  let cell_footprint = fwidth(in.cell);
  let pixels = abs(fract(in.cell + 0.5) - 0.5) / max(cell_footprint, vec2f(1e-6));
  let line = (1.0 - clamp(min(pixels.x, pixels.y), 0.0, 1.0)) * (1.0 - clamp(max(cell_footprint.x, cell_footprint.y) * 4.0, 0.0, 1.0));
  if (ocean.wireframe != 0u) {
    let tint = RING_TINTS[u32(in.level) % 2u] * dot(color, vec3f(1.0)) * 0.5;
    color = mix(color * 0.6, tint, line);
  }
  return vec4f(color, 1.0);
}
`

/**
 * The whitecap model's constants and every crest band's statistics as the `Ocean` uniform lays them out
 * from `whitecap` on, and the rate (1/s) at which each band's foam fades, for the foam buffer. The CPU band counts as
 * one crest band.
 */
const whitecapUniform = (
  sea: SeaDescription | null,
  tail: TailFields,
  whitecaps: WhitecapTable,
): { readonly values: number[]; readonly fadeRates: number[] } => {
  const direction = sea?.spectrum.meanDirection ?? 0
  const head = [
    whitecaps.onsetSteepness.value,
    whitecaps.fullSteepness.value,
    Math.cos(direction),
    Math.sin(direction),
    whitecaps.frontPhase.value,
    whitecaps.backPhase.value,
    0,
    0,
    whitecaps.plumeBackscattering.value,
    whitecaps.plumePersistence.value,
    whitecaps.laceCell.value,
    0,
  ]
  const bands = new Array<number>(4 * CREST_BAND_SLOTS).fill(0)
  const fadeRates = new Array<number>(CREST_BAND_SLOTS).fill(0)
  if (sea === null) return { values: [...head, ...bands], fadeRates }
  const frequencyOf = (wavenumber: number): number =>
    Math.sqrt(sea.gravity * wavenumber * Math.tanh(wavenumber * sea.depth))
  const fade = (wavenumber: number): number =>
    Math.min(2 * Math.PI * whitecaps.decayPeriods.value, frequencyOf(wavenumber) * whitecaps.decayLimit.value)
  // A band's breakers make less foam the shorter its waves: none below shortestWave, a full whitecap's from fullWave,
  // rising smoothly in ln of the wavelength between.
  const aeration = (band: { variance: number; wavenumber: number }): number => {
    if (!(band.variance > 0)) return 0
    const length = (2 * Math.PI) / band.wavenumber
    const u =
      Math.log(length / whitecaps.shortestWave.value) /
      Math.log(whitecaps.fullWave.value / whitecaps.shortestWave.value)
    const clamped = Math.min(1, Math.max(0, u))
    return clamped * clamped * (3 - 2 * clamped)
  }
  const { count, k, amplitude } = sea.components
  let variance = 0
  let weighted = 0
  for (let i = 0; i < count; i += 1) {
    const steepness = 0.5 * ((k[i] ?? 0) * (amplitude[i] ?? 0)) ** 2
    variance += steepness
    weighted += steepness * (k[i] ?? 0)
  }
  const all = [{ variance, wavenumber: variance > 0 ? weighted / variance : sea.peakWavenumber }, ...tail.crestBands]
  all.forEach((band, slot) => {
    bands.splice(4 * slot, 4, band.variance, band.wavenumber, fade(band.wavenumber), aeration(band))
    // 1/s: the fade's phase is the wave's frequency times the time the foam takes to fade by e.
    fadeRates[slot] = frequencyOf(band.wavenumber) / fade(band.wavenumber)
  })
  return { values: [...head, ...bands], fadeRates }
}

/** `optics` holds every optical constant the shading reads; the tool passes `data`'s tables. */
export const createOceanSurface = (target: OceanTarget, optics: OceanOptics): OceanSurface => {
  const { device } = target
  const label = 'ocean surface'
  const both = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
  const fieldTexture = { sampleType: 'float', viewDimension: '2d-array' } as const
  const layout = device.createBindGroupLayout({
    label,
    entries: [
      { binding: 0, visibility: both, buffer: { type: 'uniform' } },
      ...[1, 2, 3, 4].map((binding) => ({
        binding,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'read-only-storage' as const },
      })),
      { binding: 5, visibility: both, texture: fieldTexture },
      { binding: 6, visibility: both, texture: fieldTexture },
      { binding: 7, visibility: both, sampler: { type: 'filtering' } },
      { binding: 8, visibility: GPUShaderStage.FRAGMENT, texture: fieldTexture },
      { binding: 9, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 10, visibility: GPUShaderStage.FRAGMENT, texture: fieldTexture },
      { binding: 11, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    ],
  })
  const tail = createOceanTail(device)
  // The tail tiles repeat. Some anisotropy keeps their slopes from blurring at grazing angles; on an M1 Pro at 1440p four
  // taps cost the surface about 0.3 ms over trilinear and sixteen about 1 ms, and the slope variance the filter averages
  // away is what the per-cascade moments return as roughness (#36).
  const tailSampler = device.createSampler({
    label: `${label} tail`,
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
    maxAnisotropy: 4,
  })
  const crestSampler = device.createSampler({
    label: `${label} crests`,
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
    maxAnisotropy: CREST_ANISOTROPY,
  })
  const foam = createOceanFoam(device, optics.foamDecayTime.value, optics.whitecaps, tailSampler)
  const module = device.createShaderModule({ label, code: surfaceWgsl(target.sceneWgsl, optics.whitecaps) })
  const pipeline = device.createRenderPipeline({
    label,
    layout: device.createPipelineLayout({ label, bindGroupLayouts: [...target.sceneLayouts, layout] }),
    vertex: { module, entryPoint: 'vertex_main' },
    fragment: { module, entryPoint: 'fragment_main', targets: [{ format: target.format }] },
    primitive: { topology: 'triangle-list' },
    multisample: { count: target.sampleCount },
    depthStencil: { format: target.depthFormat, depthWriteEnabled: true, depthCompare: 'greater' },
  })

  const buffer = (name: string, size: number, usage: number): GPUBuffer =>
    device.createBuffer({ label: `${label} ${name}`, size: Math.max(16, size), usage: usage | GPUBufferUsage.COPY_DST })
  const storage = (name: string, size: number): GPUBuffer => buffer(name, size, GPUBufferUsage.STORAGE)
  const uniform = buffer('uniform', OCEAN_UNIFORM_BYTES, GPUBufferUsage.UNIFORM)
  const uniformData = new ArrayBuffer(OCEAN_UNIFORM_BYTES)
  const uniformFloats = new Float32Array(uniformData)
  const uniformWords = new Uint32Array(uniformData)

  /** Everything sized by the sea and the settings, rebuilt together when either changes. */
  interface State {
    readonly sea: SeaDescription | null
    readonly settings: RenderOceanSettings
    readonly crest: number
    readonly mesh: RingMesh
    readonly indices: GPUBuffer
    readonly waves: GPUBuffer
    readonly phases: GPUBuffer
    readonly weights: GPUBuffer
    readonly rings: GPUBuffer
    readonly tail: TailFields
    /** groups[i] samples foam buffer i. */
    readonly groups: readonly [GPUBindGroup, GPUBindGroup]
    readonly phaseScratch: Float64Array
    readonly phaseData: Float32Array<ArrayBuffer>
    readonly weightData: Float32Array<ArrayBuffer>
    readonly ringData: Float32Array<ArrayBuffer>
    readonly cascadeData: Float32Array
    readonly unresolvedData: Float32Array
    clipmap: Clipmap | undefined
  }

  const build = (sea: SeaDescription | null, settings: RenderOceanSettings, previous: State | undefined): State => {
    const reuseMesh = previous?.settings.ringCells === settings.ringCells ? previous : undefined
    const mesh = reuseMesh?.mesh ?? ringMesh(settings.ringCells)
    const indices = reuseMesh?.indices ?? buffer('indices', mesh.indices.byteLength, GPUBufferUsage.INDEX)
    if (reuseMesh === undefined) device.queue.writeBuffer(indices, 0, mesh.indices)
    if (previous !== undefined) {
      if (reuseMesh === undefined) previous.indices.destroy()
      for (const old of [previous.waves, previous.phases, previous.weights, previous.rings]) old.destroy()
    }

    const count = sea?.components.count ?? 0
    const ringSlots = ringTotal(settings)
    const waveData = new Float32Array(Math.max(1, count) * WAVE_FLOATS)
    if (sea !== null) {
      const { kx, ky, k, omega, amplitude } = sea.components
      for (let i = 0; i < count; i += 1) {
        const a = amplitude[i] ?? 0
        waveData.set(
          [kx[i] ?? 0, ky[i] ?? 0, a, (sea.choppiness * a) / (k[i] ?? 1), omega[i] ?? 0, k[i] ?? 0],
          i * WAVE_FLOATS,
        )
      }
    }
    const waves = storage('waves', waveData.byteLength)
    device.queue.writeBuffer(waves, 0, waveData)
    const phaseData = new Float32Array(Math.max(1, count))
    const weightData = new Float32Array(Math.max(1, (ringSlots + 1) * count))
    const ringData = new Float32Array(ringSlots * RING_FLOATS)
    const phases = storage('phases', phaseData.byteLength)
    const weights = storage('weights', weightData.byteLength)
    const rings = storage('rings', ringData.byteLength)
    const fields = tail.setSea(sea, settings)
    const breakers = whitecapUniform(sea, fields, optics.whitecaps)
    foam.setSea(sea !== null, settings, { count, waves, phases }, fields, breakers.values, breakers.fadeRates)
    uniformFloats.set(breakers.values, OCEAN_WORD.whitecap)
    const absorption = waterAbsorption(optics)
    uniformFloats.set(
      [
        ...bandSlopeCovariance(sea),
        optics.water.refractiveIndex.value,
        // The Cox and Munk floor, written per frame from the frame's roughness length.
        0,
        0,
        0,
        optics.water.backscattering.value,
        ...absorption,
        0,
      ],
      OCEAN_WORD.shading,
    )
    const { foamReflectance } = optics
    uniformFloats.set(
      [
        sea?.breakingThreshold ?? 0,
        foamReflectance.lifetime.value,
        foamReflectance.fresh.value,
        foamReflectance.thin.value,
      ],
      OCEAN_WORD.foamThreshold,
    )
    const group = (foamView: GPUTextureView): GPUBindGroup =>
      device.createBindGroup({
        label,
        layout,
        entries: [
          ...[uniform, waves, phases, weights, rings].map((resource, binding) => ({
            binding,
            resource: { buffer: resource },
          })),
          { binding: 5, resource: fields.displacement },
          { binding: 6, resource: fields.derivatives },
          { binding: 7, resource: tailSampler },
          { binding: 8, resource: fields.moments },
          { binding: 9, resource: foamView },
          { binding: 10, resource: fields.crests },
          { binding: 11, resource: crestSampler },
        ],
      })
    return {
      sea,
      settings,
      crest: sea?.components.amplitude.reduce((sum, a) => sum + a, 0) ?? 0,
      mesh,
      indices,
      waves,
      phases,
      weights,
      rings,
      tail: fields,
      groups: [group(foam.views[0]), group(foam.views[1])],
      phaseScratch: new Float64Array(count),
      phaseData,
      weightData,
      ringData,
      cascadeData: new Float32Array(ringSlots * 4),
      unresolvedData: new Float32Array(ringSlots * 4),
      clipmap: undefined,
    }
  }

  let state = build(null, defaultRenderOceanSettings(null), undefined)

  return {
    setSea: (sea, settings) => {
      state = build(sea, settings ?? defaultRenderOceanSettings(sea), state)
    },
    get settings() {
      return state.settings
    },
    get cascadeCount() {
      return state.tail.count
    },
    get crest() {
      return state.crest
    },
    prepare: (frame) => {
      const { sea, settings } = state
      const clipmap = clipmapFor(settings, frame.eye)
      const [x0, y0] = clipmap.origin
      state.clipmap = clipmap

      if (sea !== null) {
        surfacePhases(sea, frame.tick, clipmap.origin, state.phaseScratch, state.phaseData)
        device.queue.writeBuffer(state.phases, 0, state.phaseData)
      }
      bandWeights(sea, clipmap, state.weightData)
      device.queue.writeBuffer(state.weights, 0, state.weightData)
      cascadeWeights(state.tail.longest, clipmap, state.cascadeData)
      unresolvedBandCovariance(sea, state.weightData, clipmap.rings.length, state.unresolvedData)
      clipmap.rings.forEach((ring, slot) => {
        state.ringData.set(state.cascadeData.subarray(slot * 4, slot * 4 + 4), slot * RING_FLOATS + 8)
        state.ringData.set(state.unresolvedData.subarray(slot * 4, slot * 4 + 4), slot * RING_FLOATS + 12)
        state.ringData.set(
          [
            ring.centre[0] - x0,
            ring.centre[1] - y0,
            ring.spacing,
            ring.carry,
            slot === 0 ? clipmap.heightMorph : 0,
            ring.level,
          ],
          slot * RING_FLOATS,
        )
      })
      device.queue.writeBuffer(state.rings, 0, state.ringData)

      uniformFloats.set(frame.viewProjectionFrom([x0, y0, 0]), OCEAN_WORD.viewProjection)
      uniformFloats.set([frame.eye[0] - x0, frame.eye[1] - y0, frame.eye[2]], OCEAN_WORD.eye)
      uniformWords[OCEAN_WORD.count] = sea?.components.count ?? 0
      uniformFloats.set([x0, y0, settings.ringCells], OCEAN_WORD.origin)
      uniformFloats.set(coxMunkCovariance(sea, frame.roughnessLength, optics.coxMunk), OCEAN_WORD.coxMunk)
      uniformWords[OCEAN_WORD.wireframe] = frame.debug.wireframe ? 1 : 0
      uniformWords[OCEAN_WORD.band] = frame.debug.band ? 1 : 0
      uniformWords[OCEAN_WORD.cascadeCount] = state.tail.count
      state.tail.tiles.forEach((tile, c) => {
        // The origin modulo the tile in f64, so the f32 lookup never sees a large coordinate; texel i holds x = i L / N.
        const texel = tile / settings.cascadeRule.resolution
        const offset = (x: number): number => wrap(x, tile) + texel / 2
        uniformFloats.set(
          [tile, offset(x0), offset(y0), frame.debug.cascades[c] === false ? 0 : 1],
          OCEAN_WORD.cascades + 4 * c,
        )
      })
      const window = foam.prepare({
        tick: frame.tick,
        eye: frame.eye,
        origin: clipmap.origin,
        enabled: frame.debug.foam,
        stamps: frame.foamStamps,
      })
      uniformFloats.set(
        [...window.corner, window.extent, frame.debug.foam && sea !== null ? 1 : 0, ...window.offset],
        OCEAN_WORD.foamWindow,
      )
      // The lace's grid origin in its own frame, along the waves' travel and across it, wrapped in f64.
      const lacePeriod = LACE_PERIOD * optics.whitecaps.laceCell.value
      const direction = sea?.spectrum.meanDirection ?? 0
      const [cos, sin] = [Math.cos(direction), Math.sin(direction)]
      uniformFloats.set(
        [wrap(cos * x0 + sin * y0, LACE_STRETCH * lacePeriod), wrap(-sin * x0 + cos * y0, lacePeriod)],
        OCEAN_WORD.whitecap + 6,
      )
      device.queue.writeBuffer(uniform, 0, uniformData)
      tail.prepare(frame.tick)
    },
    encodeTail: (pass) => {
      tail.encode(pass)
    },
    encodeFoam: (encoder, timestampWrites) => {
      foam.encode(encoder, timestampWrites)
    },
    draw: (pass, sceneGroups) => {
      const { clipmap, mesh, indices } = state
      const group = state.groups[foam.current]
      if (clipmap === undefined) return
      pass.setPipeline(pipeline)
      sceneGroups.forEach((sceneGroup, index) => {
        pass.setBindGroup(index, sceneGroup)
      })
      pass.setBindGroup(sceneGroups.length, group)
      pass.setIndexBuffer(indices, 'uint32')
      clipmap.rings.forEach((ring, slot) => {
        const range = ring.hole === undefined ? mesh.full : mesh.holed(ring.hole[0], ring.hole[1])
        // The instance index carries the ring's slot into the shader; one instance per draw.
        pass.drawIndexed(range.count, 1, range.first, 0, slot)
      })
    },
    destroy: () => {
      for (const old of [uniform, state.indices, state.waves, state.phases, state.weights, state.rings]) old.destroy()
      tail.destroy()
      foam.destroy()
    },
  }
}
