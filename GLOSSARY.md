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

**Golden vector**:
A reference input and output pair from the oracle build of the deterministic math that the port must reproduce bit for bit.
_Avoid_: Test vector, fixture, reference value

**State hash**:
The integer digest of a state buffer after a run, used to prove that two engines produced the same simulation.
_Avoid_: Checksum, fingerprint, snapshot

**Environment query**:
The batched interface the simulation reads water, wind and depth through: points and a tick in, values out. The CPU implementation is authoritative; the GPU one is for looks.
_Avoid_: Sampler, ocean API, world query

**Wave component**:
One travelling cosine of the band: a wave vector, a frequency, an amplitude and a phase.
_Avoid_: Gerstner wave, bin, term

**Band**:
The authoritative part of the sea, every wave longer than the cut, held as wave components. Hulls feel it and the renderer draws it.
_Avoid_: Low band, CPU sea, swell (as a generic term)

**Tail**:
The visual part of the sea, every wave shorter than the cut, drawn by the renderer and felt by nothing.
_Avoid_: FFT sea, detail, high band

**Cut wavenumber**:
The single wavenumber that separates band from tail. One value per scenario, shared by both.
_Avoid_: Split, cutoff, k_s (in prose)

**Sea description**:
The static sea data the simulation hands the renderer: the wave components, the cut wavenumber, the effective choppiness and the tail's initial spectrum.
_Avoid_: Ocean state, spectrum (for the whole), wave data

**Rest hydrostatics**:
The canoe body's upright hydrostatics at a load condition's static equilibrium, computed once at load, that a resistance regression reads. Heel and running trim never change them.
_Avoid_: Regression inputs, static hydrostatics, design hydrostatics

**Stall weight**:
A lifting surface's share of its attached-flow lift, one below its stall onset angle and zero past its stall end angle, on the local inflow angle. Lift and cross-flow are summed, never switched.
_Avoid_: Blend weight, VLM weight, lift fraction

**Appendage polar**:
A lifting surface's normal-force coefficient over the full 0 to 90 degrees of local inflow angle, indexed by effective aspect ratio, carrying the separated range that attached-flow lift cannot.
_Avoid_: Plate law, bluff-plate coefficient, stall polar

**Carry-over**:
The continuation of a fin's lattice through the canoe body up to the waterline, so the hull carries the fin's root circulation.
_Avoid_: Hull lattice (for a fin keel), extended keel, hull lift

**Heel bin**:
One heel angle at which a ship's lattice is built and solved at load; a tick blends the two neighbouring bins.
_Avoid_: Heel step, heel sample, roll bin

**Basis solution**:
The strip forces of a lattice for one unit kinematic input, precomputed at load, so a tick's force is a weighted sum of basis solutions instead of a solve.
_Avoid_: Mode, influence vector, unit response

**Coarse cloth**:
The authoritative sail mesh the simulation integrates, a handful of nodes per sail, whose corners are rig nodes. Everything a sail does to the ship comes from it.
_Avoid_: Sail mesh, cloth sim, physics cloth

**Fine cloth**:
The visual sail surface the renderer upsamples from the coarse cloth. It touches nothing in the simulation.
_Avoid_: Render cloth, detail cloth, high-res sail

**Running line**:
A line whose length a control sets, such as a sheet, brace, halyard or guy, running from a rig node through its blocks to its belay. One line is one constraint over its whole path, slack allowed, never pushing.
_Avoid_: Rope, sheet (as a generic term), rope chain

**Standing rigging**:
A pretensioned line between two rig nodes that a tuning sets and no control moves, such as a shroud, stay or runner. It holds a spar and never pushes.
_Avoid_: Wire, stay (as a generic term), fixed rigging

**Spar**:
A mast, yard, boom, gaff or pole that rig nodes sit on. Rigid unless its bending is a sailing effect, as a yacht mast's is.
_Avoid_: Stick, beam, rod

**Substep**:
One of the equal solver steps a tick is divided into for the rig; the count is a scenario setting.
_Avoid_: Iteration, inner step, sub-tick

**Pressure relief**:
The free-surface correction that removes the side force a rigid-wall image over-predicts near the waterline, applied per strip by depth and chord.
_Avoid_: Free-surface factor, image correction, waterline loss
