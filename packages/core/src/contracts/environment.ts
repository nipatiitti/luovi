/**
 * The batched environment query (docs/intention/05, #8). Points are xyz triplets in the world frame, z relative to the
 * mean water level; count = points.length / 3. Every method writes into the caller's out and allocates nothing, because
 * every force module calls it every tick. Each method throws RangeError when out.length is not count times its stride.
 * Results are a pure function of the effective environment, the tick and the points, never of call history; an
 * implementation may cache the band phases of the last tick it saw. The implementation is sim-ocean's.
 */
export interface EnvironmentQuery {
  /**
   * Stride 4 per point: surface height eta(x, y) after the inverse-displacement lookup, then the orbital velocity at the
   * point's depth by finite-depth decay plus the uniform current, east, north, up (m, m/s).
   */
  water(tick: number, points: Float64Array, out: Float64Array): void
  /** Stride 3 per point: the wind vector at height z by the logarithmic profile with the scenario's z0, zero at or below z0. */
  wind(tick: number, points: Float64Array, out: Float64Array): void
  /** Stride 1 per point: water depth, m (uniform in v1). */
  depth(points: Float64Array, out: Float64Array): void
  /** Per-scenario constants (ADR 0006 makes water density and viscosity scenario constants of the query). */
  readonly constants: EnvironmentConstants
}

export interface EnvironmentConstants {
  /** kg/m^3. */
  readonly waterDensity: number
  /** m^2/s. */
  readonly waterKinematicViscosity: number
  /** kg/m^3. */
  readonly airDensity: number
  /** m/s^2. */
  readonly gravity: number
}
