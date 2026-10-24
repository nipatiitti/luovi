import type { SeaDescription } from '@luovi/core'
import { defaultRenderOceanSettings, type RenderOceanSettings } from '@luovi/render-ocean'
import { reworkedBreakingThreshold } from '@luovi/sim-world'

// PROTOTYPE (#41, Foam rework visual prototype): throwaway, on the prototype/foam-rework branch only, never merged.
// Five whitecap variants on the scenario tool's own page, switched by ?foam= and the bar at the bottom: step 1's build
// as the baseline, then Foam rework design (#40) at each breaking cutoff candidate of Breaking cutoff: the shortest wave
// that whitecaps (#42).

export interface FoamVariant {
  readonly key: string
  readonly label: string
  /** m; 0 weighs every wave 1. */
  readonly cutoff: number
  readonly rework: boolean
}

export const FOAM_VARIANTS: readonly FoamVariant[] = [
  { key: 'build', label: 'Step 1 build, near buffer with 3 s persistence', cutoff: 0, rework: false },
  { key: '0.14', label: 'Cutoff 0.14 m, air entrainment floor (Deike 2015)', cutoff: 0.14, rework: true },
  { key: '1', label: 'Cutoff 1 m, whitecaps evident (Melville 1996)', cutoff: 1, rework: true },
  { key: '2.55', label: 'Cutoff 2.55 m, c of 2 m/s (Sutherland 2015)', cutoff: 2.55, rework: true },
  { key: '3.99', label: 'Cutoff 3.99 m, 2 m/s as front speed (Matusov 2002)', cutoff: 3.99, rework: true },
]

export const variantNamed = (key: string | null): FoamVariant =>
  FOAM_VARIANTS.find((variant) => variant.key === key) ?? (FOAM_VARIANTS[0] as FoamVariant)

/** What the bar shows of the drawn foam: the coverage the threshold was solved for and the threshold itself. */
export interface FoamReadout {
  readonly targetCoverage: number
  readonly threshold: number | null
}

// A threshold no linearised Jacobian reaches: the rework's no-foam below the law's offset.
const NEVER = -1e3

/** The sea and render settings a variant draws: its cutoff in the tail and its own threshold. */
export const seaForVariant = (
  sea: SeaDescription | null,
  variant: FoamVariant,
): { sea: SeaDescription | null; settings: RenderOceanSettings; readout: FoamReadout | null } => {
  const settings = {
    ...defaultRenderOceanSettings(sea),
    breakingCutoff: variant.cutoff,
    whitecapRework: variant.rework,
  }
  if (sea === null) return { sea, settings, readout: null }
  if (!variant.rework) {
    return {
      sea,
      settings,
      readout: { targetCoverage: sea.targetCoverage, threshold: sea.breakingThreshold },
    }
  }
  const solved = reworkedBreakingThreshold(sea, variant.cutoff)
  return {
    sea: { ...sea, breakingThreshold: solved?.breakingThreshold ?? NEVER },
    settings,
    readout: { targetCoverage: solved?.targetCoverage ?? 0, threshold: solved?.breakingThreshold ?? null },
  }
}
