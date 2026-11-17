# C. Simulate the water near the hull

Labels: **[E]** established in the literature, **[I]** my inference, **[S]** speculation.

## 1. The idea

Carry a box of water along with the boat, about three boat lengths long and half a length deep, and solve the actual equations of motion of that water sixty times a second: it cannot pass through the hull, it cannot be compressed, it has a free surface that gravity pulls flat, and the surrounding sea flows in through the edges of the box. The hull is dropped into the box as its true shape. Whatever pressure the water then puts on the hull is the force: buoyancy, wave-making drag, the extra drag when heeled or making leeway, the way the bow wave of another boat shoves you, the lift under a flat run when the boat starts to plane, the push of a wave face when it surfs, the sluggishness of a heavy hull that has to drag water along when it turns. None of those is a formula; they are all the same pressure. The box is too coarse to see a thin fin or the skin of slow water on the hull, so those two things only are handled by sub-grid rules that read the local flow from the box and push back on it. Same solver, same two rules, every boat.

## 2. Formulation

**Which solver.** I priced the candidates for a hull-following box at a cell size of L/96 (8.6 cm for the H-boat, 1 m for the Suomen Joutsen).

| Method                                                                                                              | Verdict                | Why                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2D dispersive height field with the hull as a moving pressure (Boussinesq, Jeschke and Wojtan)                      | Not enough alone       | Waves and wave drag, cheaply, but no lateral force, so keel and leeway need a second model. Jeschke's boats are one way: point disturbances under the boat, no force computed **[E]**.                                                                                                                                                                                                                       |
| Free-surface lattice Boltzmann (FluidX3D, elbe)                                                                     | Reject for the browser | Runs hulls offline: 55 million nodes for one ship in elbe, 160 million on 32 GPUs for Watanabe's ice channel, no resistance validation in either **[E]**. Uniform grid only. Sound speed must sit well above sqrt(gH), so about 500 steps/s for the H-boat box at any boat speed **[I]**: 0.7 billion cell updates/s against 2.1 billion for an RTX 3060 in the bare benchmark without free surface **[E]**. |
| SPH, FLIP, MPM                                                                                                      | Reject                 | Particle pressure noise ruins a force integral; DualSPHysics hull work is offline **[E]**. Spray visuals only.                                                                                                                                                                                                                                                                                               |
| **Incompressible projection on a stretched Cartesian grid with a height-function free surface and cut-cell bodies** | **Chosen**             | Time step limited by flow speed, not sound: 60 to 120 steps/s. Stretching puts cells where the hull is. Real-time precedent since 2011 **[E]**.                                                                                                                                                                                                                                                              |

**State carried (GPU, or a CPU twin, see section 5).** A grid of roughly 192 x 80 x 24 cells (about 370,000), uniform at L/96 around the hull and stretched outward and downward, translating with the boat and aligned to its heading. Per cell: velocity u, pressure p. Per column: surface height eta. Per body: a baked signed distance field. Per fin strip: one separation state f.

**Each step.**

1. _Ambient sea._ In a margin of about 12 cells, relax eta and u toward the spectral sea's analytic values. Waves enter, the boat's own waves leave without reflecting.
2. _Advect_ u and eta in the moving frame (subtract grid velocity and yaw rate; MacCormack or BFECC to keep numerical viscosity down).
3. _Bodies._ Sample each body's signed distance field under its current 6-DOF pose to get cell volume fractions and face apertures. Heel, a canted keel or a second hull are just poses.
4. _Sub-grid forces_ (below) are added to u as body forces, with the equal and opposite force accumulated on the body.
5. _Projection._ Solve for p such that the velocity is divergence free through the open apertures, with p = 0 on the free surface and the rigid-body velocities as unknowns in the same solve (monolithic coupling), so added mass is implicit and a light hull is stable **[E, graphics practice]**. Under the hull the column is "pressurised": the surface is capped by the hull and p there is free, the unified pressurised and free-surface treatment used for ships in non-hydrostatic wave models **[E, Rijnsdorp]**. One inequality goes with it: **p >= 0 on wetted hull**. Where the solve wants suction below atmospheric the water lets go and that patch becomes free surface.
6. _Force on each body_ = sum over cut faces of p times aperture area vector, plus the sub-grid forces. Fed to the rigid body together with rig forces.

Multigrid with red-black Gauss-Seidel and a fixed cycle count, as in Chentanez and Müller **[E]**.

**The two sub-grid rules.**

_Skin friction (wall model)._ A 9 cm cell cannot see a 1 cm boundary layer. Each wetted triangle reads the grid velocity just outside it, takes the tangential part u_t and a running length s measured from wherever the flow first meets the body (so it flips by itself in sternway), and applies tau = 0.5 rho C_f(Re_s) |u_t| u_t with a standard turbulent flat-plate line. The same force is removed from the adjacent water, so the hull trails a real momentum deficit that the rudder sits in.

_Thin fins (actuator strips)._ A keel 9 cm thick is one cell. Coarse grids get the lift of such a thing wrong, and wind energy solved the same problem: the actuator line. Each fin is cut at bake into spanwise strips. A strip samples the grid velocity at its quarter chord (which already contains hull displacement flow, wave orbital motion, the keel's downwash at the rudder, another boat's wake), forms its own angle of attack, and evaluates one sectional law valid through 360 degrees: attached-flow lift blended to flat-plate normal force by a separation state f that relaxes toward its static value over a few chord lengths of travel (a Kirchhoff or Leishman-Beddoes form). The force is spread into the grid with a Gaussian of about two cells. Because the grid then carries the trailing vortices, induced drag, keel to rudder interaction, the hull's end-plate effect and the free-surface pressure relief above the root all emerge. Smeared forces overpredict loads near tips on coarse grids; the filtered lifting-line correction addresses this **[E, abstract only]**. Strips above the local water surface carry no force, so a lifted rudder unloads by itself.

Which parts are fins is decided at bake by local thickness in cells, with a smooth weight between one and three cells: a resolution rule, not a boat family.

**Precomputed per hull.** Signed distance fields, fin strips, mass and inertia. Minutes; no regression, CFD sweep or surrogate.

## 3. The five boats

**H-boat.** Canoe body 25 cells across. As it heels the overhangs immerse and the wave system lengthens because the geometry in the box changed. Fin keel and rudder are strips under a resolved hull. _Wrong:_ wave drag probably within 15 to 30 percent at this resolution **[I]**; keel profile drag is the sectional law.

**International Folkboat.** The long keel is 40 cells long and two cells thick, so it is mostly resolved. It drags a large mass of water sideways and in yaw (emergent added mass and yaw damping); its slender-body lift comes from vorticity shed along the keel edge and sternpost. _Wrong:_ the weakest case. Lift on a two-cell-thick body relies on numerical viscosity standing in for the Kutta condition, and the rudder working as a flap needs the grid to pass its circulation onto the keel. I expect the right trend and an error of tens of percent **[I]**.

**Suomen Joutsen.** One-metre cells, 12 across the beam: the cheapest boat. The full hull at leeway sheds at bilge and keel; huge added mass makes it carry way and refuse to turn. _Wrong:_ where flow separates on a rounded bilge is a boundary-layer question the grid cannot answer, so cross-flow drag is likely too high **[I]**.

**Beach catamaran.** Two poses of one distance field. Interference is the actual wave field between the hulls. The windward hull leaves the water and its cells empty; p >= 0 handles exit and re-entry. _Wrong:_ a 0.3 m hull is five cells wide and 10 m/s needs 120 to 240 steps/s; it wants L/160.

**Class40.** Flat run, 35 cells across. As speed rises, pressure under the run rises, the p >= 0 rule dries the transom, the bow lifts, wetted area falls. On a wave face the ambient slope and orbital flow do the rest. No planing flag exists. _Wrong:_ the spray root is far below the grid, so the pressure peak is smeared and lift is likely underpredicted near onset **[I]**.

Canting keel and water ballast: a pose and a mass. Foils: strips already work submerged; ventilation is crude.

## 4. Feel

- **Tack.** As the boat turns, the water it was dragging keeps going: radiation and added-mass memory, which the current design has no owner for. The H-boat pivots around a small fin; the Folkboat has to swing a 5 m plate through the water, so its yaw damping is several times larger and it turns slower. The difference comes from geometry in the box, the right reason.
- **Leeway as speed drops.** Strip angle grows, f relaxes toward separated, lift falls and the hull's cross-flow takes over, continuously.
- **Rudder.** It sees the keel's downwash and the hull's wake deficit; weather helm at heel comes from the immersed shape.
- **Puff.** Acceleration is limited by real added mass and the wave system rebuilding.
- **Broach.** Stern lifts on the face, upper rudder strips go dry, the heeled hull's asymmetric pressure yaws it.
- **Sternway.** No code path changes. The rudder becomes the leading fin and is unstable, as on the water.
- **Other boats.** A nearby hull's bow wave and wake are in the box.

## 5. Cost and determinism

**Per step [I].** About 20 fine-grid passes over 370,000 cells: 7 million cell updates, 0.45 to 0.9 billion per second at 60 to 120 Hz. Chentanez and Müller ran 270,000 to 557,000 entries at 27 to 33 ms a frame on a 2010 GTX 480 **[E]**; a mid-tier card today is five or more times faster, so expect 3 to 6 ms a step in WebGPU, a quarter to a half of the GPU. The box replaces the planned wake patch.

**Determinism.** WGSL does not fix the rounding direction of even a single float operation, some devices flush subnormals, and division is bounded only to 2.5 ULP **[E]**. GPU floats will not match across vendors. The repo's rule that GPU results never enter authoritative state would have to change, or be honoured by one of these:

| Option                                                                                                                           | Replay                                        | Cost                                                                                                                                                                                                               | Lost                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Recorded wrench.** The CPU rigid body stays deterministic; the water's force per body per tick is logged like a control input  | Bit-exact anywhere, no GPU needed for physics | About 1.5 kB/s per boat                                                                                                                                                                                            | A run can no longer be rebuilt from inputs alone; a server must trust or bound the client's water; validation in Node needs a GPU |
| **Deterministic CPU twin.** Same solver in f32 with `Math.fround`                                                                | Bit-exact from inputs                         | I measured 212 million red-black updates/s on one core in Node. That runs the box at L/48 at 60 Hz on one core, or L/96 with Wasm SIMD and threads (red-black is order independent, so threads stay deterministic) | Half the resolution, or a Wasm toolchain the project deferred                                                                     |
| **Integer solver on GPU.** WGSL 32-bit integer arithmetic is exact, so a fixed-point scheme is reproducible on GPU and CPU alike | Bit-exact from inputs                         | 2 to 3 times the arithmetic; fixed-point multigrid is a research project. Lehmann shows lattice Boltzmann tolerates 16-bit storage, which hints that a fixed-point lattice scheme is viable **[S]**                | Time, and risk                                                                                                                    |

Recommendation: make the CPU twin authoritative at L/48, and decide after the experiment whether the GPU's finer box is worth the recorded-wrench exception.

## 6. Where it breaks

1. **Lift on resolved bodies.** A grid has no Kutta condition, only numerical viscosity. Long keels, skegs and the full-rigger's hull are neither thin enough to be strips nor resolved enough to be right. This is the likeliest way the idea dies.
2. **Separation on smooth shapes.** Rounded bilges, the run aft. The grid's effective Reynolds number is around a thousand, so form and cross-flow drag will be biased high; the wall model does not fix that.
3. **Moving cut cells make force noise.** Cells that fill and empty as the hull pitches produce pressure spikes. Filtering them costs transient sharpness.
4. **Short waves, spray, breaking bow waves, fin ventilation.** Below Froude 0.15 the hull's waves are under six cells long; the surface is single-valued, with no air.
5. **The fin rule is still a seam.** Stall on a fin is the sectional law, not the fluid.
6. **Friction**, about half a yacht's drag in light air, comes from the wall model. Honestly put: pressure from the fluid, friction from a formula.
7. **Engineering weight.** Months to get a cut-cell free-surface solver with monolithic coupling quiet and stable; twice with a CPU twin.

## 7. The cheapest experiment

One day, NumPy or a single WebGPU page, no rigid-body motion.

- Morning: a Wigley hull fixed in a stream, Froude 0.2 to 0.45, against the published Wigley wave-drag curve. Kill if humps and hollows are misplaced or drag is off by more than 30 percent at L/96.
- Afternoon: add 5 degrees of leeway. (a) A rectangular plate of aspect ratio 2 as actuator strips against lifting-line theory; kill if more than 15 percent off after the tip correction. (b) The same hull with a long shallow keel resolved in the grid against slender-body theory, pi/2 x aspect ratio per radian; if it is off by more than 40 percent or does not converge with resolution, the Folkboat and the Joutsen cannot come from this model, and it should be demoted to the wave, inertia and interaction layer under another lifting model.
- Then pitch the hull sinusoidally and look at the force trace for cut-cell noise.

## 8. Sources

- [Jeschke and Wojtan 2023, Generalizing Shallow Water Simulations with Dispersive Surface Waves](https://research-explorer.ista.ac.at/download/14240/14725/2023_ACMToG_Jeschke.pdf): read in part
- [Chentanez and Müller 2011, Real-Time Eulerian Water Simulation Using a Restricted Tall Cell Grid](https://matthias-research.github.io/pages/publications/tallCells.pdf): read in part
- [Chentanez, Müller and Kim 2014, Coupling 3D Eulerian, Heightfield and Particle Methods](https://matthias-research.github.io/pages/publications/hybridsim_preprinted.pdf): read in part
- [Rijnsdorp et al. 2022, Non-hydrostatic modelling of the wave-induced response of moored floating structures](https://ar5iv.labs.arxiv.org/html/2204.04223): read in part
- [Wang et al. 2026, Hamiltonian Two-Way Coupling of Nonlinear Waves and 3D Flows](https://arxiv.org/abs/2608.25203): abstract only
- [Mierke, Janßen and Rung 2015, GPU-accelerated large-eddy simulation of ship-ice interactions (elbe)](https://core.ac.uk/download/343502532.pdf): read in part
- [Watanabe, Hu and Aoki 2023, lattice Boltzmann ship in a brash ice channel](https://catalog.lib.kyushu-u.ac.jp/opac_download_md/7183292/7183292.pdf): read in part
- [FluidX3D README, benchmark table (mirror)](https://github.com/kesperinc/FluidX3D_LBM): read in part
- [Lehmann et al. 2022, lattice Boltzmann with 64, 32 and 16-bit number formats](https://ar5iv.labs.arxiv.org/html/2112.08926): read in part
- [WebGPU conformance suite, floating point primer](https://kdab.searchfox.org/firefox-main/source/dom/webgpu/tests/cts/checkout/docs/fp_primer.md): read in part
- [Korb and Taschner 2025, comparing corrections for the actuator line model](https://repository.tudelft.nl/record/uuid:388a88f0-beee-4fc0-86b3-c7ef7bb60986): abstract only
- [Celeris-WebGPU, theory and source](https://celeris.discourse.group/t/celeris-webgpu-theory-source-code/26): read in full (ship waves "under development")
- [Tagliafierro et al. 2021, planing hull with DualSPHysics](https://www.mdpi.com/2077-1312/9/3/244): read in part (setup only)
- [基于自动网格方法的船舶非线性兴波模拟, nonlinear ship waves for KCS with a dry transom](https://ship-research.com/article/doi/10.19693/j.issn.1673-3185.03481): abstract only
