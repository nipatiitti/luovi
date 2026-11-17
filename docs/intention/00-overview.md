# Overview

Oct 22, 2026 · @Niilo

## What this is

A web-based, physics-first sailing engine: a real-time ocean, wind and wave model coupled to time-domain 6-DOF boats with cloth sails and constraint-based rigging, running on WebGPU in the browser with a deterministic CPU core that also runs on a server. It is a passion project and a showcase first; games (online regattas, realistic sims, trading, tall-ship battles) are abstractions built on top of it later, never inside it.

The fleet it is designed around spans a dinghy and an H-boat, gaff schooners (Linden, Svanhild), the full-rigged Suomen Joutsen rebuilt from her Forum Marinum yard drawings, a J-Class, and a non-foiling Volvo Open 70. The world is a procedural Baltic.

## Design principles

- **Emergent, not scripted.** No sail has a mode, no hull has a special case. Aback, in irons, sternway, box-hauling, broaching and lying ahull are what the equations do.
- **One 2D world-state.** Waves, wakes, wind, depth, foam and hull footprints live in one tiled field; the 3D surface is a vertex shader reading it.
- **One law per medium, geometry as data.** Hull, keel and rudder forces come from one section momentum law on each boat's real lines; the hull family is data, never a code path (ADR 0014). Aero, wave, wake and moving mass add their forces to the same rigid body.
- **Authoritative CPU, visual GPU.** Anything that makes a force runs deterministically on CPU on client and server; the GPU only upsamples what was already decided.
- **Benchmarks are tests.** Every behaviour claim in these tabs is a headless scenario; nothing is done until it passes.
- **Theory before tuning, geometry before coefficients.** Judged by feel and by order of magnitude together, with tank data winning over remembered figures.

## Where this sits

Shipping sailing games either look up a polar (Virtual Regatta), simplify the forces (Sailaway, eSail), or script sail states around arcade hydro (Naval Action, Sea of Thieves). Professional tools (ORC VPP, bridge simulators) have the force models but are steady-state or 3-DOF, desktop, and have no sea to look at. This engine takes the pro force models into a 6-DOF time-domain sim with a real heightfield and real cloth, in a browser. Realism and physical interaction are the point; polish follows.

## How to read the tabs

| Tab                    | Holds                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Ocean                  | The 2D field, FFT background, dispersive patch, islands and harbours, wind, physics coupling, deck water, browser constraints |
| Hull                   | Hull hydrodynamics: the section momentum law, what is data, what is validated and how well, what is open                      |
| Aero                   | Sail aerodynamics: cloth plus per-panel polars, rig classes, wind input and sail interaction, benchmarks                      |
| Rigging                | Rigging: running lines as single constraints through blocks, standing rigging, spars, solver                                  |
| Separation of concerns | Separation of concerns: the CPU/GPU seam, the five public contracts, determinism, the pnpm package map                        |

Each tab ends with its own validation targets and sources; the engine-wide scope follows below.

## Scope: what v1 is, what is deferred, what was cut

The physics core defined across these tabs is ahead of any shipping sailing game and matches the pro tools' force models; the gaps are engine systems, not research, and every one of them plugs into the 2D field and the force sum already defined. v1 is the engine and the showcase client; games start when the validation suite is green.

**v1 build order** (each step runs headless in `tool-validate` before the next starts)

1. A CPU band of equal-energy wave components below the cut wavenumber with the FFT tail above it, foam, LOD and filtered shading; the hull feels exactly the waves it sees (ADR 0005).
2. Hull hydrostatics from the baked section stacks at heel and the section momentum law for hull, keel and rudder, with the slice wave drag table; H-boat floats and drifts correctly (ADR 0014, ADR 0009).
3. Rig constraint graph and coarse cloth with polars; H-boat sails a polar within 5%.
4. Sternway and lying-ahull tests pass on the section momentum law (ADR 0014; the lattice and cross-flow of ADR 0007 are retired).
5. Wind field for the player's region, gust layer, turbulence-scaled polars.
6. Suomen Joutsen: square-sail polars from VLM, yard bracing, box-hauling and tacking tests.
7. Dispersive patch, pressure-patch wake, harbour reflection (visual layer).
8. Deck water and spray for the player's boat; broach test.
9. One schooner; gaff polars; scenario client with full parameter UI and replays.

**Status, 2026-11-17.** The unified physics session changed the order of work and the fleet (ADR 0014). From here: get the hull model solid and fold it into `sim-hull` with smoke checks, bring every doc, ADR and ticket in line, then sail physics, and only after that the ship data contract and the H-boat transfer into the 3D sim, because the sail model will shape the contract. The target fleet is the H-boat, the Suomen Joutsen and a J-class yacht; the International Folkboat is a comparison boat for tests; a beach catamaran and a Class40 are not targets but must not be ruled out. Step 3's 5% gate is replaced by judgement by feel and order of magnitude (ADR 0010 status note). Sail and rig design (steps 3 and 6) is under review. The numbered list above is the earlier record of intent.

**Benchmark convention** (decided on the H-boat polar benchmark and scenario contract tickets, ADR 0010): wind is the certificate's true wind speed at 10 m with the logarithmic profile and roughness length z0 = 0.005 m; flat water, so the polars run fast against ORC's added resistance in waves and that bias is stated, not tuned away; seawater at 1025.3 kg/m³ with ITTC viscosity and ISA air; the H-boat load condition is the certificate's 1,869 kg with 300 kg of crew fixed at the ORC hiking position. Validation runs in two tiers, the quick tier on every push and the full tier on main.

**Engine systems not yet designed** (needed by regattas, trading and battles; each is a system on top of existing contracts)

- Networking: server-authoritative simulation with client prediction; the simulation stays unaware of it. Determinism rules are in Separation of concerns.
- Physics level of detail for fleets: hero (everything), near (regression hull, polar aero, rigid sails), far (polar plus kinematics). A regatta of 50 boats or a battle of 10 ships does not run 50 full rigs.
- Contacts: hull–hull, hull–quay, grounding against the depth layer, anchoring and mooring lines (mooring lines are rig constraints already).
- Damage and flooding: shot removing cloth constraints, rig failure by tension threshold (already there), hull flooding as internal water mass against panel buoyancy, which the rigid body already supports.
- Large-scale weather: fronts, diurnal cycle, fetch-limited sea state from wind history, Baltic currents in sounds.
- Crew and control: a tallship is sailed by orders with execution time; the rate limits on rest-length changes are that model and need stating as a contract.
- Cargo and trim: displacement and trim changes feed the hydrostatics-at-heel path; one data field, no new physics.

**Deferred to v2** (right idea, too early)

- Hamiltonian (η, ψ) seam blending between patch and background; v1 uses a damped blend band.
- Runtime wind solve across the whole Baltic; v1 solves the player's region.
- Canting-keel and water-ballast maxis. The J-Class was deferred here and the v1 fleet was H-boat, Suomen Joutsen and one schooner; since 2026-11-17 the target fleet is the H-boat, the Suomen Joutsen and a J-class yacht (ADR 0014).
- Multihulls.
- Wake of one boat felt by another; v1 wakes are visual only.

**Cut from the design** (over-engineered for the purpose)

- A third wake system (wave particles); dispersive patch near, analytic texture far.
- Cosserat rods anywhere except yacht masts and gaffs.
- Deck water and spray on non-player boats.
- Double-body CFD for the drift problem; the section momentum law covers it (ADR 0014).
- Rendering polish (SSR, subsurface scattering, baked breaker meshes) before the physics benchmarks pass.
