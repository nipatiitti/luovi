# Luovi

A physics-first sailing engine: a deterministic CPU simulation of ships, sea, wind and rigging, with a WebGPU visual layer that only upsamples what the simulation decided.

## Language

**Ship**:
Any simulated vessel, from a dinghy to a full-rigged ship. The word the contracts use.
_Avoid_: Boat, vessel, yacht (as a generic term)

**Hull**:
The wetted structure of a ship that the hydrodynamic force modules act on. Not the whole ship and not the rigid body.
_Avoid_: Boat, body

**Scenario**:
A start state for the simulation: ships and their definitions, positions and velocities, sea state, wind, bathymetry and time. Carries no expected outcome.
_Avoid_: Test, setup, case

**Benchmark**:
A scenario paired with a numeric target and tolerance, run headless to prove a behaviour claim.
_Avoid_: Test, validation target, validation test

**Performance polar**:
A ship's steady speed as a function of true wind angle and true wind speed.
_Avoid_: Polar (bare), VPP curve

**Sail polar**:
A sail class's pressure coefficient as a function of local angle of attack across the full ±180°.
_Avoid_: Polar (bare), Cp curve, aero curve
