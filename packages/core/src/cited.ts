/**
 * The one cited-value shape, shared by scenarios, the data tables and later ship definitions, so a number never travels
 * without its source. An estimate says so in src, starting "Estimate:".
 */
export interface CitedValue<T = number> {
  readonly value: T
  readonly src: string
}
