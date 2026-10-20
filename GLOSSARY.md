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

**Ship definition**:
The static, self-contained description of one ship that the simulation loads: hull, lifting surfaces, hydro coefficients, mass, rig, sails and controls, every empirical number cited or flagged as an estimate.
_Avoid_: Ship model, boat definition, ship spec

**Solid**:
One closed section stack of the hull, such as the canoe solid, the keel solid or the cockpit void. A ship's hull is a set of solids.
_Avoid_: Body, hull body, mesh, part

**Baked**:
Derived ship data produced offline from authored sources and committed, such as the uniform section stacks the simulation reads. The authored source is the drawing's own points with provenance.
_Avoid_: Compiled, lofted, generated

**Lifting surface**:
A planform the side-force model acts on: a fin, a rudder, or the submerged hull itself for an integral keel.
_Avoid_: Foil, appendage (as a synonym), wing

**Rig node**:
A named attach point in a ship's rig namespace: a fixed point on the hull or a spar, or a sail corner that moves with the cloth. Lines run between rig nodes.
_Avoid_: Attach point, anchor, vertex

**Control**:
A named endpoint of a ship definition that an input can set: a pivot angle, a running line's length, a slide position or a movable mass. Controls never describe a sailing state.
_Avoid_: Input (for the endpoint itself), command, actuator

**Load condition**:
A named selection of a ship's mass items with optional mass overrides, such as measurement trim or sailing trim with crew. A scenario names one.
_Avoid_: Loading, trim (bare), displacement condition

**Tuning**:
A named set of standing-rigging pretensions for a ship, such as a tuning guide's light-air or heavy-air settings. A scenario names one.
_Avoid_: Rig setup, preset, trim (bare)
