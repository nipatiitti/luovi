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

**Gate**:
The comparison of one measured number with a benchmark's target and tolerance that decides pass or fail. A number a benchmark reports without comparing is logged, not gated.
_Avoid_: Assertion, check (bare), threshold

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
Derived ship data that the bake tool produces from authored sources and that is committed, such as the uniform section stacks the simulation reads. The simulation reads nothing else.
_Avoid_: Compiled, lofted, generated

**Authored source**:
The hand-typed record of what a drawing, certificate or tuning guide prints, point by point with provenance, that the bake reads. The simulation never reads it.
_Avoid_: Raw data, input file, model data, offsets (for the whole)

**Provenance record**:
The part of a baked ship definition that says how it was produced: the loft rules, the bake tool version, the hash of the authored input, the source ids and the bake check values.
_Avoid_: Metadata, build info, manifest

**Bake check**:
A comparison the bake makes between a figure it lofted and the printed figure that figure must reproduce, within an authored tolerance. A miss fails the bake; it is not a benchmark.
_Avoid_: Validation, sanity check, test

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

**State buffer**:
The flat array of doubles that is a simulation's complete integrator state at one tick: a header, then every ship's rigid body, controls, lag states, particles, rod segments and coarse cloth. Resuming from it and the effective scenario continues the simulation identically.
_Avoid_: State vector, world state, sim state

**Derived buffer**:
The flat array the simulation fills each tick with what it computed from state and never feeds back, such as module forces, line tensions and sail pressures. Renderers and benchmarks read it; nothing resumes from it.
_Avoid_: Telemetry, debug buffer, outputs

**Input**:
A control target or an environment edit stamped with the tick it was applied at. The recorded sequence of inputs replayed over a scenario reproduces a simulation.
_Avoid_: Command, event, action, message

**Snapshot**:
The effective scenario, the tick and the state buffer together: everything needed to resume a simulation mid-run.
_Avoid_: Save, checkpoint, dump

**Effective scenario**:
The scenario as it stands after every environment edit applied so far. A fresh run starts from the authored scenario; a resumed run starts from the effective one.
_Avoid_: Live scenario, current settings, world parameters

**Particle**:
A rig node that moves relative to the hull and is not a cloth node, such as a spar end, a rod segment end or a block in a running line. Fixed hull nodes are definition data, never state.
_Avoid_: Point mass, vertex, free node

**Driver**:
The part of a benchmark that produces inputs during a run, such as a rudder controller holding a wind angle or a search over sheet lengths. It lives in tooling and is deterministic, so a run with a driver replays the same on every engine.
_Avoid_: Autopilot, controller (for the whole), optimiser

**Load report**:
What the simulation computed about a ship once at load and exposes for reading: rest hydrostatics, regression inputs against their bounds, derivatives, sizes and check values. Benchmarks and tools read it; nothing feeds back from it.
_Avoid_: Debug output, load log, diagnostics

**Recording**:
An authored scenario and its input stream in one file. Replaying a recording reproduces the run it came from.
_Avoid_: Replay file, log, session

**Reference sea**:
One of the three named sea states, light, moderate and storm, that ocean benchmarks and cost figures are stated on.
_Avoid_: Test sea, sea preset, sample sea

**Steady-state window**:
The span of ticks over which a benchmark averages a measurement after the run has settled. A window whose halves disagree is unsettled and its gate fails.
_Avoid_: Averaging period, sample window, measurement interval

**Host**:
The code that owns the simulation Worker, the shared slots and the input channel on behalf of a tool or game. It paces the simulation and never computes a force.
_Avoid_: Runtime, engine loop, bridge, glue

**Slot**:
One tick's state buffer and derived buffer side by side in the shared array. The simulation writes one slot while the renderer reads the other.
_Avoid_: Frame, page, back buffer

**Cascade**:
One FFT tile of the tail that holds the wavenumbers of one annulus, from a sixth of its tile length down to a sixth of the next cascade's. Cascades partition the tail; nothing is counted twice.
_Avoid_: Band (for a cascade), layer, octave, FFT level

**Ring**:
One level of the camera-centred clipmap mesh the sea is drawn on, at twice the spacing of the ring inside it, snapped to its own world grid.
_Avoid_: LOD level, tier, shell

**Render setting**:
A parameter of a renderer that changes the picture and nothing the simulation computes, such as a cascade tile or a ring count. It never enters a scenario or a state hash.
_Avoid_: Quality setting, graphics option, config

**Foam buffer**:
The camera-centred texture of hull contact foam near the camera, carried by the water it was made on and fading at a cited rate. Breaking never fills it.
_Avoid_: Foam map, whitecap texture, turbulence buffer

**Breaking threshold**:
The value of the breaking Jacobian below which a point is a whitecap, solved at sea-state build so the mean whitecap coverage matches a cited coverage law; a sea below the law's onset wind has none.
_Avoid_: Foam threshold, epsilon, magic number

**Breaking cutoff**:
The shortest wavelength that breaks with air entrainment; only waves at least this long count towards the breaking Jacobian.
_Avoid_: Foam cutoff, whitecap filter

**Whitecap coverage**:
The fraction of a pixel's footprint that is whitecap, filtered from the breaking Jacobian's statistics at every distance rather than tracked.
_Avoid_: Far-field coverage, whitecap fraction, foam percentage
