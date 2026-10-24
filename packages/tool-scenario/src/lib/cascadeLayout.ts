// PROTOTYPE (tail repetition, #44): throwaway, never merged. The candidate cascade layouts, chosen by ?layout= on the
// page, so the owner can compare the tail's repetition lattice and its frame rate layout by layout.
import { defaultRenderOceanSettings, type RenderOceanSettings } from '@luovi/render-ocean'
import { type CascadeRule, DEFAULT_CASCADE_RULE, type SeaDescription } from '@luovi/sim-world'

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2
const GOLDEN_ANGLE = (137.508 * Math.PI) / 180

export interface LayoutVariant {
  readonly key: string
  readonly label: string
  readonly rule: CascadeRule
  /** Hex-tile cascade 0 (render-ocean shared.ts hexWgsl); 'linear' is the unnormalised check. */
  readonly hex?: boolean | 'linear'
}

export const LAYOUT_VARIANTS: readonly LayoutVariant[] = [
  { key: 'L0', label: 'L0 baseline: ratio 10, 6 periods per tile', rule: DEFAULT_CASCADE_RULE },
  {
    key: 'L1',
    label: 'L1 ratio 8 + phi (9.618), 6 periods per tile',
    rule: { ...DEFAULT_CASCADE_RULE, ratio: 8 + GOLDEN_RATIO },
  },
  {
    key: 'L2',
    label: 'L2 ratio 10, each cascade turned by the golden angle',
    rule: { ...DEFAULT_CASCADE_RULE, rotationStep: GOLDEN_ANGLE },
  },
  { key: 'L3', label: 'L3 ratio 10, 12 periods per tile', rule: { ...DEFAULT_CASCADE_RULE, periodsPerTile: 12 } },
  {
    key: 'L4',
    label: 'L4 ratio 8 + phi and the golden-angle turn',
    rule: { ...DEFAULT_CASCADE_RULE, ratio: 8 + GOLDEN_RATIO, rotationStep: GOLDEN_ANGLE },
  },
  { key: 'L5', label: 'L5 baseline with cascade 0 hex-tiled', rule: DEFAULT_CASCADE_RULE, hex: true },
  // A check, not a candidate: plain barycentric blending, whose contrast drop toward triangle centres validates the
  // contrast test's lattice mapping.
  { key: 'L5x', label: 'L5x check, unnormalised blend', rule: DEFAULT_CASCADE_RULE, hex: 'linear' },
  {
    key: 'L6',
    label: 'L6 cascade 0 hex-tiled and the golden-angle turn',
    rule: { ...DEFAULT_CASCADE_RULE, rotationStep: GOLDEN_ANGLE },
    hex: true,
  },
]

export const layoutVariantNamed = (key: string | null): LayoutVariant =>
  LAYOUT_VARIANTS.find((variant) => variant.key === key) ?? LAYOUT_VARIANTS[0] ?? { key: 'L0', label: 'L0', rule: DEFAULT_CASCADE_RULE }

/** The page's layout, from ?layout=; L0 without one. */
export const pageLayout = (): LayoutVariant => layoutVariantNamed(new URLSearchParams(location.search).get('layout'))

export const oceanSettingsFor = (sea: SeaDescription | null, variant: LayoutVariant): RenderOceanSettings => ({
  ...defaultRenderOceanSettings(sea),
  cascadeRule: variant.rule,
  hexCascade0: variant.hex ?? false,
})
