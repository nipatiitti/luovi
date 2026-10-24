import { type CascadeRule, DEFAULT_CASCADE_RULE, defaultCascadeLayout, type SeaDescription } from '@luovi/sim-world'

/**
 * Render settings of the sea (ADR 0011): they change the picture and nothing the simulation computes, so the host owns
 * them, may override any field, and they never enter a scenario or a state hash.
 */
export interface RenderOceanSettings {
  /** How the tail's cascade tiles derive from the cut wavenumber: count bounds, lattice side, periods per tile, ratio, floor. */
  readonly cascadeRule: CascadeRule
  /** Per-cascade lambda for the tail's GPU evolution, cascade 0 first; the scenario's unclamped lambda by default. */
  readonly cascadeChoppiness: readonly number[]
  /** Rings of the clipmap that carry displacement. */
  readonly ringCount: number
  /** Cells along a ring's side, a multiple of four so the inner ring fills a ring's hole on its own grid. */
  readonly ringCells: number
  /** m, the cell size of ring 0; ring r has innerSpacing 2^r. */
  readonly innerSpacing: number
  /** Texels along the side of the near-field foam buffer. */
  readonly foamBufferSize: number
  /** m per foam buffer texel. */
  readonly foamSpacing: number
  /** PROTOTYPE (tail repetition, #44): hex-tile cascade 0 (shared.ts hexWgsl); absent is off. */
  readonly hexCascade0?: boolean | 'linear'
}

/** What the debug panel can switch off or overlay; not render settings, since they show the machinery, not the sea. */
export interface OceanDebug {
  /** Draw the band; off with one cascade on shows that cascade alone. */
  readonly band: boolean
  /** Draw tail cascade c, cascade 0 first; a missing entry draws it. */
  readonly cascades: readonly boolean[]
  /** Overlay every ring's cells, tinted by ring, so the snapping and the morph can be watched. */
  readonly wireframe: boolean
  /**
   * Draw foam, near buffer and far coverage both. Foam always reads the band and every cascade whatever the toggles
   * above draw, since its threshold was solved for the whole sea.
   */
  readonly foam: boolean
}

export const NO_DEBUG: OceanDebug = { band: true, cascades: [], wireframe: false, foam: true }

/**
 * The spec's defaults (#26 "render-ocean", decided by #23): eight rings of 128 cells from 0.25 m, a 1024^2 foam buffer
 * at 0.5 m, and the cascades the default rule derives from the sea's cut wavenumber. Flat water, and a sea whose cut
 * tile the rule cannot lay out, keep the rule's minimum count at zero choppiness.
 */
export const defaultRenderOceanSettings = (sea: SeaDescription | null): RenderOceanSettings => ({
  cascadeRule: DEFAULT_CASCADE_RULE,
  cascadeChoppiness:
    (sea === null ? undefined : defaultCascadeLayout(sea, DEFAULT_CASCADE_RULE)?.choppiness) ??
    Array.from({ length: DEFAULT_CASCADE_RULE.minCascades }, () => 0),
  ringCount: 8,
  ringCells: 128,
  innerSpacing: 0.25,
  foamBufferSize: 1024,
  foamSpacing: 0.5,
})
