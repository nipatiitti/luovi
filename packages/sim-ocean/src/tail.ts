import { createRng, type Rng, type SeaDescription } from '@luovi/core'
import { abs, atan2, PI, pow, powInt, round, sqrt, TWO_PI } from '@luovi/core/math'
import { waveSpectrum } from './spectrum.ts'

// The FFT tail's initial spectrum (ADR 0005, spec #26 "sim-ocean"): Gaussian h0 on each cascade's lattice under the
// convention on SeaDescription, zero below k_s so band and tail never count a wave twice. Generated on the CPU from the
// seeded stream so it is reproducible, but never authoritative: the renderer uploads it and no force reads it.

/** The rule that derives a default layout from the cut wavenumber; render settings, so never part of a scenario or hash. */
export interface CascadeRule {
  /** Cut wavelengths across cascade 0's tile, and the shortest wavelength (in periods per tile) a cascade owns. */
  readonly periodsPerTile: number
  /** t_c / t_(c+1) while the floor allows it. */
  readonly ratio: number
  /** m, the smallest last tile; its Nyquist wavelength, two texels, is the shortest wave drawn. */
  readonly floorTile: number
  /** Lattice side, a power of two. */
  readonly resolution: number
  readonly minCascades: number
  readonly maxCascades: number
}

/**
 * The spec's defaults (#26 "render-ocean", from the #23 render-ocean decision): three 256^2 cascades, cascade 0's tile six
 * cut wavelengths, ratio 10, the last tile floored at 1.28 m (1 cm Nyquist wavelength, where gravity-only dispersion
 * ends), a fourth cascade only when three cannot reach the floor. Design choices of that decision, not measured values.
 */
export const DEFAULT_CASCADE_RULE: CascadeRule = {
  periodsPerTile: 6,
  ratio: 10,
  floorTile: 1.28,
  resolution: 256,
  minCascades: 3,
  maxCascades: 4,
}

/**
 * The cascades a renderer evolves: cascade c owns the wavenumbers in (kInner[c], kOuter[c]] on its tiles[c] lattice. Open
 * at the inner end because the default inner bounds lie on lattice rings, where the spectrum of a cascade is largest: the
 * four axis bins of the ring counted in would add about 4% to cascade 0's variance over the annulus integral, while left
 * out the lattice count matches the inner disc's area.
 */
export interface CascadeLayout {
  readonly count: number
  /** Lattice side, a power of two, shared by every cascade. */
  readonly resolution: number
  /** L_c, m, cascade 0 first. */
  readonly tiles: readonly number[]
  /** rad/m; kInner[0] is the sea's cut wavenumber exactly. */
  readonly kInner: readonly number[]
  /** rad/m; kOuter[c] is kInner[c + 1] exactly, and the last is its lattice's Nyquist circle. */
  readonly kOuter: readonly number[]
  /** Per-cascade lambda for the GPU evolution, the scenario's unclamped lambda by default; generateTail ignores it. */
  readonly choppiness: readonly number[]
}

/** The tiles in metres, cascade 0 first, under `rule` for a cut tile of t0 = periodsPerTile cut wavelengths. */
const ruleTiles = (t0: number, rule: CascadeRule): number[] => {
  const { ratio, floorTile, minCascades, maxCascades } = rule
  let reachable = 0
  while (reachable < maxCascades && t0 / powInt(ratio, reachable) >= floorTile) reachable += 1
  if (reachable >= minCascades) {
    return Array.from({ length: reachable }, (_, c) => t0 / powInt(ratio, c))
  }
  // The ratio cannot fit minCascades tiles above the floor, so they shrink geometrically from t0 to exactly the floor.
  const last = minCascades - 1
  return Array.from({ length: minCascades }, (_, c) => (c === last ? floorTile : t0 * pow(floorTile / t0, c / last)))
}

/**
 * The default layout for a sea: tiles from the cut wavenumber by `rule`, each cascade owning the waves of at least
 * periodsPerTile periods on its tile up to the next cascade's, the last out to its Nyquist circle. None when cascade 0's
 * tile is not above the floor: the rule has no layout there, and the sea is drawn by its band alone.
 */
export const defaultCascadeLayout = (
  sea: Pick<SeaDescription, 'cutWavenumber' | 'block'>,
  rule: CascadeRule = DEFAULT_CASCADE_RULE,
): CascadeLayout | undefined => {
  const { periodsPerTile, floorTile, resolution } = rule
  const cut = sea.cutWavenumber
  const t0 = (periodsPerTile * TWO_PI) / cut
  if (!(t0 > floorTile)) return undefined
  const tiles = ruleTiles(t0, rule)
  const kInner = tiles.map((tile, c) => (c === 0 ? cut : (periodsPerTile * TWO_PI) / tile))
  const lastTile = tiles[tiles.length - 1] ?? t0
  const kOuter = kInner.map((_, c) => kInner[c + 1] ?? (PI * resolution) / lastTile)
  return {
    count: tiles.length,
    resolution,
    tiles,
    kInner,
    kOuter,
    choppiness: tiles.map(() => sea.block.choppiness),
  }
}

/** One cascade's h0 on its lattice: row-major index iy N + ix, kx = (ix - N/2) 2 pi / L, ky = (iy - N/2) 2 pi / L. */
export interface TailCascade {
  /** m. */
  readonly tile: number
  readonly resolution: number
  /** Length N^2. */
  readonly re: Float64Array
  readonly im: Float64Array
}

/** Throws RangeError unless the layout's annuli start at the cut, follow one another and fit inside their lattices. */
const checkLayout = (sea: SeaDescription, layout: CascadeLayout): void => {
  const { count, resolution, tiles, kInner, kOuter } = layout
  if (!(Number.isInteger(resolution) && resolution >= 2 && (resolution & (resolution - 1)) === 0)) {
    throw new RangeError(`The cascade resolution must be a power of two, got ${String(resolution)}`)
  }
  if (!(count >= 1 && tiles.length === count && kInner.length === count && kOuter.length === count)) {
    throw new RangeError(`The layout must list ${String(count)} tiles and annulus bounds, one per cascade`)
  }
  if (kInner[0] !== sea.cutWavenumber) {
    throw new RangeError(`Cascade 0 must start at the cut wavenumber ${String(sea.cutWavenumber)} rad/m`)
  }
  for (let c = 0; c < count; c += 1) {
    const tile = tiles[c] ?? 0
    const inner = kInner[c] ?? 0
    const outer = kOuter[c] ?? 0
    if (!(tile > 0 && tile < Infinity)) throw new RangeError(`Cascade ${String(c)}'s tile must be positive and finite`)
    if (!(inner < outer)) throw new RangeError(`Cascade ${String(c)}'s annulus must have kInner below kOuter`)
    if (c + 1 < count && outer !== kInner[c + 1]) {
      throw new RangeError(`Cascade ${String(c)}'s kOuter must equal cascade ${String(c + 1)}'s kInner`)
    }
    // Past the Nyquist circle the lattice has no bin for the annulus, which would leave a gap in the tail.
    if (outer > (PI * resolution) / tile) {
      throw new RangeError(`Cascade ${String(c)}'s kOuter lies beyond its lattice's Nyquist circle`)
    }
  }
}

// A bound within this fraction of a lattice ring is that ring. Rounding in tile and wavenumber arithmetic is a few ulps,
// while neighbouring rings' squared radii differ by at least one in N^2 / 2, so the snap never merges two rings.
const RING_TOLERANCE = 1e-9

/**
 * A bound's squared radius in bins, snapped to the integer when it is that ring up to rounding. The default layout puts
 * every inner bound exactly on a ring (a cascade's inner wave has periodsPerTile periods on its tile), so whether the
 * ring's bins fall inside must not hang on the last bit of 6 dk against k_s.
 */
const ringSquared = (radius: number): number => {
  const squared = radius * radius
  const ring = round(squared)
  return abs(squared - ring) <= RING_TOLERANCE * ring ? ring : squared
}

/**
 * h0 for every cascade of `layout`, pure: zero outside (kInner[c], kOuter[c]], so the annuli partition the tail with no
 * bin counted twice and no gap, and h0 = 1/2 (xi_r + i xi_i) sqrt(F dk^2) inside. `rng` is the ocean.tail stream
 * (tailStream); each cascade draws from its own fork, and every lattice bin draws one pair whether or not the annulus
 * keeps it, so a bin's normals depend on neither another cascade nor the annulus bounds. Throws RangeError on a layout
 * that does not tile the tail from the cut (checkLayout).
 */
export const generateTail = (sea: SeaDescription, layout: CascadeLayout, rng: Rng): readonly TailCascade[] => {
  checkLayout(sea, layout)
  const spectrum = waveSpectrum(sea)
  const n = layout.resolution
  const half = n / 2
  const normals = new Float64Array(2)
  return layout.tiles.map((tile, c) => {
    const inner = layout.kInner[c] ?? 0
    const outer = layout.kOuter[c] ?? 0
    const dk = TWO_PI / tile
    // 1/2 sqrt(dk^2): the bin area of the corrected normalisation, so E|h0|^2 = F dk^2 / 2.
    const scale = 0.5 * dk
    const innerSquared = ringSquared(inner / dk)
    const outerSquared = ringSquared(outer / dk)
    const re = new Float64Array(n * n)
    const im = new Float64Array(n * n)
    const stream = rng.fork(`cascade.${String(c)}`)
    for (let iy = 0; iy < n; iy += 1) {
      const ky = (iy - half) * dk
      for (let ix = 0; ix < n; ix += 1) {
        stream.gaussianPair(normals, 0)
        const radiusSquared = (ix - half) * (ix - half) + (iy - half) * (iy - half)
        if (radiusSquared <= innerSquared || radiusSquared > outerSquared) continue
        const kx = (ix - half) * dk
        const amplitude = scale * sqrt(spectrum.directional(dk * sqrt(radiusSquared), atan2(ky, kx)))
        const i = iy * n + ix
        re[i] = amplitude * (normals[0] ?? 0)
        im[i] = amplitude * (normals[1] ?? 0)
      }
    }
    return { tile, resolution: n, re, im }
  })
}

/** The ocean.tail fork of the scenario seed, so no consumer spells the fork name. */
export const tailStream = (seed: number): Rng => createRng(seed).fork('ocean.tail')
