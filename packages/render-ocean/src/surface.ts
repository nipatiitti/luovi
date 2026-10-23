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
import { cascadeWgsl, coverageWgsl, phaseWgsl, waveWgsl, wrap } from './shared.ts'
import { createOceanTail, MAX_CASCADES, type TailFields } from './tail.ts'

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

/** Floats per component in the wave table: kx, ky, amplitude, lambda A / k, omega, then padding to 32 bytes. */
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
    foamWindow: foam,
    /** foam_sample.z: the threshold, then the lifetime, fresh and thin reflectances. */
    foamThreshold: foam + 6,
    end: foam + 12,
  } as const
})()

const OCEAN_UNIFORM_BYTES = 4 * OCEAN_WORD.end

/**
 * Where across the foam buffer's half-width the near buffer starts handing over to the far coverage: the blend runs over
 * the buffer's outer quarter (#23 resolution), so the buffer's newest edge texels never show.
 */
const FOAM_BLEND_START = 0.75

const surfaceWgsl = (sceneWgsl: string): string => /* wgsl */ `
${sceneWgsl}
${phaseWgsl}
${waveWgsl}
${cascadeWgsl}
${coverageWgsl}

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
  // The slope covariance (xx, yy, xy) of the band displacement this ring does not carry, and its divergence's variance.
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
// The second moments per cascade layer: (sx^2, sy^2, sx sy, div^2).
@group(2) @binding(8) var moments: texture_2d_array<f32>;
// Near-field foam density, indexed by undisplaced position (foam.ts).
@group(2) @binding(9) var foam: texture_2d<f32>;

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
  // The band's slope covariance and divergence variance the ring flattened, morphed with the ring's band weights.
  @location(8) unresolved: vec4f,
  // The divergence of the band displacement the vertex carries: the resolved part of the far foam's Jacobian.
  @location(9) band_divergence: f32,
}

// Where cascade c samples the point x from the clipmap origin.
fn tail_uv(c: u32, x: vec2f) -> vec2f {
  return cascade_uv(ocean.cascades[c], x);
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
    }
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
  // The far foam's linearised Jacobian over the pixel's footprint, from the whole sea whatever the debug toggles draw: the
  // band's carried divergence exactly and what the ring flattened as variance, each cascade's filtered mean and variance.
  var jacobian = 1.0 + in.band_divergence;
  var jacobian_variance = in.unresolved.w;
  let whole = i32(textureNumLevels(moments)) - 1;
  for (var c = 0u; c < ocean.cascade_count; c++) {
    let uv = tail_uv(c, in.lagrangian);
    let derivative = textureSample(derivatives, tail_sampler, uv, c);
    let second = textureSample(moments, tail_sampler, uv, c);
    let divergence = cascade_divergence(derivative, second);
    jacobian += divergence.x;
    jacobian_variance += divergence.y;
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
  let density = textureSample(foam, tail_sampler, (in.lagrangian + ocean.foam_sample.xy) / window.z).r;
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
  let extinction = ocean.absorption.xyz + backscattering;
  let below = backscattering / TAU / extinction * (sun_in * mu_s / (mu_s + mu_v) + sky_in / (1.0 + mu_v));
  // Out through the surface, the radiance diluted by n^2 as the cone widens.
  let body = below * (1.0 - reflectance) / (n * n);

  // Foam covers a fraction of the pixel and scatters as a Lambertian surface lit through the mean facet. The near
  // buffer's density is that fraction, its reflectance falling from fresh to thin with it; the far coverage is the
  // filtered Jacobian's tail below the threshold at the lifetime average. Over the buffer's outer quarter one hands over
  // to the other.
  var water = reflected + glitter + body;
  if (window.w != 0.0) {
    let across = abs((in.lagrangian - window.xy) / window.z * 2.0 - 1.0);
    let near = 1.0 - clamp((max(across.x, across.y) - ${String(FOAM_BLEND_START)}) / ${String(1 - FOAM_BLEND_START)}, 0.0, 1.0);
    let far = coverage_below(ocean.foam_sample.z, jacobian, jacobian_variance);
    let near_albedo = mix(ocean.foam_albedo.y, ocean.foam_albedo.x, density);
    let cover = mix(far, density, near);
    let albedo_cover = mix(far * ocean.foam_sample.w, density * near_albedo, near);
    water = water * (1.0 - cover) + albedo_cover * (light.sun + light.sky) / ${String(Math.PI)};
  }

  var color = water * in.transmittance + in.in_scatter;

  // The wireframe as lines one pixel wide along every cell edge, faded where the cells crowd closer than four pixels.
  let footprint = fwidth(in.cell);
  let pixels = abs(fract(in.cell + 0.5) - 0.5) / max(footprint, vec2f(1e-6));
  let line = (1.0 - clamp(min(pixels.x, pixels.y), 0.0, 1.0)) * (1.0 - clamp(max(footprint.x, footprint.y) * 4.0, 0.0, 1.0));
  if (ocean.wireframe != 0u) {
    let tint = RING_TINTS[u32(in.level) % 2u] * dot(color, vec3f(1.0)) * 0.5;
    color = mix(color * 0.6, tint, line);
  }
  return vec4f(color, 1.0);
}
`

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
  const foam = createOceanFoam(device, optics.foamDecayTime.value, tailSampler)
  const module = device.createShaderModule({ label, code: surfaceWgsl(target.sceneWgsl) })
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
        waveData.set([kx[i] ?? 0, ky[i] ?? 0, a, (sea.choppiness * a) / (k[i] ?? 1), omega[i] ?? 0], i * WAVE_FLOATS)
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
    foam.setSea(sea?.breakingThreshold ?? null, settings, { count, waves, phases }, fields)
    const absorption = waterAbsorption(optics)
    uniformFloats.set(
      [
        ...bandSlopeCovariance(sea),
        optics.water.refractiveIndex.value,
        ...coxMunkCovariance(sea, optics),
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
