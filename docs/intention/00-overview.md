# Overview

Oct 20, 2026 · @Niilo

## What this is

A web-based, physics-first sailing engine: a real-time ocean, wind and wave model coupled to time-domain 6-DOF boats with cloth sails and constraint-based rigging, running on WebGPU in the browser with a deterministic CPU core that also runs on a server. It is a passion project and a showcase first; games (online regattas, realistic sims, trading, tall-ship battles) are abstractions built on top of it later, never inside it.

The fleet it is designed around spans a dinghy and an H-boat, gaff schooners (Linden, Svanhild), the full-rigged Suomen Joutsen rebuilt from her Forum Marinum yard drawings, a J-Class, and a non-foiling Volvo Open 70. The world is a procedural Baltic.

## Design principles

- **Emergent, not scripted.** No sail has a mode, no hull has a special case. Aback, in irons, sternway, box-hauling, broaching and lying ahull are what the equations do.
- **One 2D world-state.** Waves, wakes, wind, depth, foam and hull footprints live in one tiled field; the 3D surface is a vertex shader reading it.
- **One modular force sum.** Every boat is the same MMG-style assembly of hull, appendage, aero, wave, wake and moving-mass modules; only the coefficients are class-specific, and they come from the hull geometry and published regressions, with offline CFD reserved for hulls no regression has seen.
- **Authoritative CPU, visual GPU.** Anything that makes a force runs deterministically on CPU on client and server; the GPU only upsamples what was already decided.
- **Benchmarks are tests.** Every behaviour claim in these tabs is a headless scenario; nothing is done until it passes.
- **Regressions before CFD, theory before tuning, geometry before coefficients.**

## Where this sits

Shipping sailing games either look up a polar (Virtual Regatta), simplify the forces (Sailaway, eSail), or script sail states around arcade hydro (Naval Action, Sea of Thieves). Professional tools (ORC VPP, bridge simulators) have the force models but are steady-state or 3-DOF, desktop, and have no sea to look at. This engine takes the pro force models into a 6-DOF time-domain sim with a real heightfield and real cloth, in a browser. Realism and physical interaction are the point; polish follows.

## How to read the tabs

| Tab                    | Holds                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ocean                  | The 2D field, FFT background, dispersive patch, islands and harbours, wind, physics coupling, deck water, browser constraints                                         |
| Hull                   | Hull hydrodynamics: force modules, resistance by regression family, side force (VLM and cross-flow), rigid body, wake, multihulls, emergent cases, validation targets |
| Aero                   | Sail aerodynamics: cloth plus per-panel polars, rig classes, wind input and sail interaction, benchmarks                                                              |
| Rigging                | Rigging: running lines as single constraints through blocks, standing rigging, spars, solver                                                                          |
| Separation of concerns | Separation of concerns: the CPU/GPU seam, the five public contracts, determinism, the pnpm package map                                                                |

Each tab ends with its own validation targets and sources; the engine-wide scope follows below.

## Scope: what v1 is, what is deferred, what was cut

The physics core defined across these tabs is ahead of any shipping sailing game and matches the pro tools' force models; the gaps are engine systems, not research, and every one of them plugs into the 2D field and the force sum already defined. v1 is the engine and the showcase client; games start when the validation suite is green.

**v1 build order** (each step runs headless in `tool-validate` before the next starts)

1. FFT ocean with foam, LOD and filtered shading; analytic CPU sampling of the same spectrum.
2. Hull hydrostatics from mesh at heel, regression resistance, panel buoyancy; H-boat floats and drifts correctly.
3. Rig constraint graph and coarse cloth with polars; H-boat sails a polar within 5%.
4. VLM and cross-flow blend; sternway and lying-ahull tests pass.
5. Wind field for the player's region, gust layer, turbulence-scaled polars.
6. Suomen Joutsen: square-sail polars from VLM, yard bracing, box-hauling and tacking tests.
7. Dispersive patch, pressure-patch wake, harbour reflection (visual layer).
8. Deck water and spray for the player's boat; broach test.
9. One schooner; gaff polars; scenario client with full parameter UI and replays.

**Engine systems not yet designed** (needed by regattas, trading and battles; each is a system on top of existing contracts)

- Networking: server-authoritative simulation with client prediction; the simulation stays unaware of it. Determinism rules are in Separation of concerns.
- Physics level of detail for fleets: hero (everything), near (regression hull, polar aero, rigid sails), far (polar plus kinematics). A regatta of 50 boats or a battle of 10 ships does not run 50 VLMs.
- Contacts: hull–hull, hull–quay, grounding against the depth layer, anchoring and mooring lines (mooring lines are rig constraints already).
- Damage and flooding: shot removing cloth constraints, rig failure by tension threshold (already there), hull flooding as internal water mass against panel buoyancy, which the rigid body already supports.
- Large-scale weather: fronts, diurnal cycle, fetch-limited sea state from wind history, Baltic currents in sounds.
- Crew and control: a tallship is sailed by orders with execution time; the rate limits on rest-length changes are that model and need stating as a contract.
- Cargo and trim: displacement and trim changes feed the hydrostatics-at-heel path; one data field, no new physics.

**Deferred to v2** (right idea, too early)

- Hamiltonian (η, ψ) seam blending between patch and background; v1 uses a damped blend band.
- Runtime wind solve across the whole Baltic; v1 solves the player's region.
- Canting-keel and water-ballast maxis, and the J-Class; v1 fleet is H-boat, Suomen Joutsen, one schooner.
- Multihulls.
- Wake of one boat felt by another; v1 wakes are visual only.

**Cut from the design** (over-engineered for the purpose)

- A third wake system (wave particles); dispersive patch near, analytic texture far.
- Cosserat rods anywhere except yacht masts and gaffs.
- Deck water and spray on non-player boats.
- Double-body CFD for the drift problem; VLM plus cross-flow covers it, and CFD stays reserved for the planing maxi and the long-keel classic.
- Rendering polish (SSR, subsurface scattering, baked breaker meshes) before the physics benchmarks pass.
