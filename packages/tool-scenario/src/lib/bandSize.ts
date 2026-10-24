// PROTOTYPE (band size, #43): throwaway, on the prototype/band-size branch only, never merged. Four band variants on the
// scenario tool's own page, switched by ?band= and the bar at the bottom, so the owner can choose N by the look of the sea
// and its frame rate: main's N = 32 linear band, then N = 32, 64 and 128 with second-order bound waves.

export interface BandVariant {
  readonly key: string
  readonly label: string
  readonly strips: number
  readonly sectors: number
  readonly boundWaves: 'none' | 'pairs' | 'factorised'
  readonly amplitudes?: 'fixed' | 'rayleigh'
  /** Lambda before the clamp per scenario seed (each band-size sea has its own); absent keeps the document's. */
  readonly choppiness?: Readonly<Record<number, number>>
}

/**
 * The effective lambda the N = 128 build ends at on each band-size sea (seed 2 Helsinki, 3 Gulf of Finland, 4 Bothnian
 * Sea), where the contraction clamp binds: printed from that build, so n64-softer's crests are n128's softness.
 */
const N128_LAMBDA: Readonly<Record<number, number>> = {
  2: 0.7472292746326573,
  3: 0.7155704705422623,
  4: 0.6576150139534096,
}

export const BAND_VARIANTS: readonly BandVariant[] = [
  { key: 'today', label: 'N 32, linear, as main is now', strips: 8, sectors: 4, boundWaves: 'none' },
  { key: 'n32', label: 'N 32 with bound waves by the exact pair sum', strips: 8, sectors: 4, boundWaves: 'pairs' },
  {
    key: 'n32c',
    label: 'N 32 with bound waves by the calibrated factorised form',
    strips: 8,
    sectors: 4,
    boundWaves: 'factorised',
  },
  {
    key: 'n64',
    label: 'N 64 with bound waves by the calibrated factorised form',
    strips: 16,
    sectors: 4,
    boundWaves: 'factorised',
  },
  {
    key: 'n64-softer',
    label: 'N 64, calibrated factorised form, lambda forced to the N 128 value',
    strips: 16,
    sectors: 4,
    boundWaves: 'factorised',
    choppiness: N128_LAMBDA,
  },
  {
    key: 'n64-rayleigh',
    label: 'N 64, calibrated factorised form, Rayleigh amplitudes',
    strips: 16,
    sectors: 4,
    boundWaves: 'factorised',
    amplitudes: 'rayleigh',
  },
  {
    key: 'n96',
    label: 'N 96 with bound waves by the calibrated factorised form',
    strips: 24,
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
  const amplitudes = variant.amplitudes ?? 'fixed'
  const forced = typeof document.seed === 'number' ? variant.choppiness?.[document.seed] : undefined
  const sea = { ...document.environment.sea, strips, sectors, boundWaves, amplitudes }
  return {
    ...document,
    environment: { ...document.environment, sea: forced === undefined ? sea : { ...sea, choppiness: forced } },
  }
}
