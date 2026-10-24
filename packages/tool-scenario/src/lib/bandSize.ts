// PROTOTYPE (band size, #43): throwaway, on the prototype/band-size branch only, never merged. Four band variants on the
// scenario tool's own page, switched by ?band= and the bar at the bottom, so the owner can choose N by the look of the sea
// and its frame rate: main's N = 32 linear band, then N = 32, 64 and 128 with second-order bound waves.

export interface BandVariant {
  readonly key: string
  readonly label: string
  readonly strips: number
  readonly sectors: number
  readonly boundWaves: 'none' | 'pairs' | 'factorised'
}

export const BAND_VARIANTS: readonly BandVariant[] = [
  { key: 'today', label: 'N 32, linear, as main is now', strips: 8, sectors: 4, boundWaves: 'none' },
  { key: 'n32', label: 'N 32 with bound waves by the exact pair sum', strips: 8, sectors: 4, boundWaves: 'pairs' },
  {
    key: 'n64',
    label: 'N 64 with bound waves by the calibrated factorised form',
    strips: 16,
    sectors: 4,
    boundWaves: 'factorised',
  },
  {
    key: 'n128',
    label: 'N 128 with bound waves by the calibrated factorised form',
    strips: 32,
    sectors: 4,
    boundWaves: 'factorised',
  },
]

const [TODAY] = BAND_VARIANTS

export const bandVariantNamed = (key: string | null): BandVariant => {
  const named = BAND_VARIANTS.find((variant) => variant.key === key) ?? TODAY
  if (named === undefined) throw new Error('no band variants')
  return named
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** The scenario document with the variant's layout and bound-wave form in its sea block; a document without one as is. */
export const withBandVariant = (document: unknown, variant: BandVariant): unknown => {
  if (!isRecord(document) || !isRecord(document.environment) || !isRecord(document.environment.sea)) return document
  const { strips, sectors, boundWaves } = variant
  return {
    ...document,
    environment: { ...document.environment, sea: { ...document.environment.sea, strips, sectors, boundWaves } },
  }
}
