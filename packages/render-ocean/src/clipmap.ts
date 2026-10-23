import { remainder, TWO_PI } from '@luovi/core/math'
import { bandPhases, type SeaDescription } from '@luovi/sim-world'
import type { RenderOceanSettings } from './settings.ts'

// The camera-centred clipmap of ADR 0011, worked out on the CPU each frame: which rings are drawn, where each one sits on
// its own world grid, how much of each band component each ring may carry, and the band phases with the clipmap origin
// folded in. Everything here is f64; the GPU only ever sees positions relative to the origin.

/**
 * Rings drawn flat beyond the displacing ones: the "flat disc at mean level" of the spec, built from rings so its inner
 * edge shares the last displacing ring's vertices. Three doublings put its edge eight times the displaced radius out:
 * at least 32 km, and at least 2048 eye heights, which passes the geometric horizon sqrt(2 R h) of every eye above
 * about 3 m (and 32 km passes it below). The surface shader drops every vertex by the planet's curvature, so the drawn
 * sea ends at that horizon and whatever lies beyond it is hidden behind the nearer sea; the sky's planet ground is
 * reached only by rays that miss the disc.
 */
const FLAT_RINGS = 3

/** A ring as one frame draws it. */
export interface Ring {
  /** Absolute ring index: the cell size is innerSpacing 2^level. */
  readonly level: number
  /** m, the cell size. */
  readonly spacing: number
  /** World x and y of the ring's centre, a multiple of twice the spacing so its odd vertices can morph onto the next ring. */
  readonly centre: readonly [number, number]
  /**
   * Where the ring inside sits in this ring's hole, in cells along x and y, each -1, 0 or 1; undefined for the innermost
   * ring, which has no hole.
   */
  readonly hole: readonly [number, number] | undefined
  /** Fraction of the band displacement the ring carries: 1, the emerging ring's share, or 0 on the flat disc. */
  readonly carry: number
}

export interface Clipmap {
  /** World x and y every drawn position is measured from: the innermost ring's centre, so precision sits by the eye. */
  readonly origin: readonly [number, number]
  /**
   * How far the innermost ring has morphed onto the next ring's grid as the eye climbs towards the height where that ring
   * is dropped, 0 to 1; the emerging ring beyond the last carries the same share.
   */
  readonly heightMorph: number
  /** Innermost first: ringCount displacing rings, the emerging one, then the flat disc. */
  readonly rings: readonly Ring[]
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * The innermost ring rises with the eye: ring r is innermost while its half-width reaches the eye's height, so the rings
 * under the eye are never finer than the view down needs. The last quarter of each doubling of height morphs the
 * innermost ring onto the next one's grid (the quarter is ADR 0011's CDLOD share), so dropping it changes nothing drawn.
 */
const innermostLevel = (settings: RenderOceanSettings, height: number): { level: number; morph: number } => {
  const halfWidth = (settings.ringCells / 2) * settings.innerSpacing
  const doublings = Math.log2(Math.max(height, halfWidth / 2) / (halfWidth / 2))
  const level = Math.floor(doublings)
  return { level, morph: smoothstep(0.75, 1, doublings - level) }
}

/** The rings for an eye at world `eye` (m, z above mean level). */
export const clipmapFor = (settings: RenderOceanSettings, eye: readonly [number, number, number]): Clipmap => {
  const { level: innermost, morph } = innermostLevel(settings, eye[2])
  const displacing = settings.ringCount + 1
  const centres = Array.from({ length: displacing + FLAT_RINGS }, (_, slot) => {
    const spacing = settings.innerSpacing * 2 ** (innermost + slot)
    const snap = (x: number): number => Math.round(x / (2 * spacing)) * 2 * spacing
    return { spacing, centre: [snap(eye[0]), snap(eye[1])] as const }
  })
  const rings = centres.map(({ spacing, centre }, slot): Ring => {
    const inner = centres[slot - 1]
    const carry = slot < settings.ringCount ? 1 : slot === settings.ringCount ? morph : 0
    return {
      level: innermost + slot,
      spacing,
      centre,
      hole:
        inner === undefined
          ? undefined
          : [Math.round((inner.centre[0] - centre[0]) / spacing), Math.round((inner.centre[1] - centre[1]) / spacing)],
      carry,
    }
  })
  return { origin: rings[0]?.centre ?? [0, 0], heightMorph: morph, rings }
}

/**
 * How much of each band component each ring displaces, row per ring plus a closing row of zeros (the morph target of the
 * last ring), component order as in the sea description. ADR 0011's one rule: a wave under four cells per wavelength
 * loses its displacement, here over a smoothstep from four cells down to two, the shortest wave a grid can carry at all.
 * The weight depends on the ring's spacing, never on distance; its lost slope variance goes to the ring's roughness (#36).
 */
export const bandWeights = (sea: SeaDescription | null, clipmap: Clipmap, out: Float32Array): void => {
  out.fill(0)
  if (sea === null) return
  const { count, k } = sea.components
  clipmap.rings.forEach((ring, slot) => {
    for (let i = 0; i < count; i += 1) {
      const cellsPerWavelength = TWO_PI / ((k[i] ?? 0) * ring.spacing)
      out[slot * count + i] = ring.carry * smoothstep(2, 4, cellsPerWavelength)
    }
  })
}

/**
 * The band phases the vertex shader adds k . x to, x measured from the clipmap origin: phi_i - omega_i t + k_i . x0 at the
 * slot's tick time, formed in f64 by sim-world's one phase convention and reduced with remainder (never % on 2 pi) so the
 * f32 upload keeps its precision in [-pi, pi]. `scratch` holds the f64 phases and must have the component count.
 */
export const surfacePhases = (
  sea: SeaDescription,
  tick: number,
  origin: readonly [number, number],
  scratch: Float64Array,
  out: Float32Array,
): void => {
  bandPhases(sea, tick, scratch)
  const { count, kx, ky } = sea.components
  for (let i = 0; i < count; i += 1) {
    out[i] = remainder((scratch[i] ?? 0) + (kx[i] ?? 0) * origin[0] + (ky[i] ?? 0) * origin[1], TWO_PI)
  }
}

/**
 * How much of each tail cascade each ring displaces, a vec4 per ring, cascade 0 first; `longest` is each cascade's
 * longest wavelength in m. ADR 0011's rule for cascades: a cascade displaces where its longest wave spans at least eight
 * spacings, here over the band's smoothstep family stretched one doubling upwards from eight, so it emerges only past
 * the threshold and the light sea's cascade 1 (about six spacings on the innermost ring) stays flat as the decision
 * states. Waves shorter than a ring resolves inside a displacing cascade are filtered by the texture's mips.
 */
export const cascadeWeights = (longest: readonly number[], clipmap: Clipmap, out: Float32Array): void => {
  out.fill(0)
  clipmap.rings.forEach((ring, slot) => {
    longest.forEach((wavelength, c) => {
      out[slot * 4 + c] = ring.carry * smoothstep(8, 16, wavelength / ring.spacing)
    })
  })
}
