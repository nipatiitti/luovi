import {
  ContractError,
  type EffectiveScenario,
  type EffectiveSeaBlock,
  type Scenario,
  type SeaBlock,
} from '@luovi/core'
import { balticWater, jonswap, openSeaRoughnessLength, standardAir } from '@luovi/data'

// The empirical defaults and ranges a scenario may leave out (coordinator answer 2, ADR 0010): core's schema checks shape
// only, so every measured default and bound is applied here from data, and the effective scenario says what was simulated.

const effectiveSeaBlock = (sea: SeaBlock): EffectiveSeaBlock => {
  const gamma = sea.gamma ?? jonswap.gammaDefault.value
  const low = jonswap.gammaMin.value
  const high = jonswap.gammaMax.value
  if (!(gamma >= low && gamma <= high)) {
    throw new ContractError(
      'scenario',
      'environment.sea.gamma',
      `Expected the JONSWAP peak enhancement in [${String(low)}, ${String(high)}], got ${String(gamma)}`,
    )
  }
  return { ...sea, gamma }
}

/** Fills water, air, the roughness length and gamma from data where the scenario gives none, and range-checks gamma. */
export const effectiveScenario = (scenario: Scenario): EffectiveScenario => {
  const { environment } = scenario
  const { sea, water, air, wind, ...rest } = environment
  return {
    ...scenario,
    environment: {
      ...rest,
      wind: { ...wind, z0: wind.z0 ?? openSeaRoughnessLength },
      ...(sea === undefined ? {} : { sea: effectiveSeaBlock(sea) }),
      water: water ?? { density: balticWater.density, kinematicViscosity: balticWater.kinematicViscosity },
      air: air ?? { density: standardAir.density },
    },
  }
}
