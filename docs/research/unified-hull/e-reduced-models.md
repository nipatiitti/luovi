# E. Solve once offline, run a compact dynamic model live

Labels: **[E]** established, **[I]** my inference, **[S]** speculation.

## 1. The idea

Every hull, whatever it is, goes through the same automatic "compile" step: its geometry is put in a numerical towing tank on a PC and dragged through a few thousand combinations of speed, leeway, heel, trim, sinkage, turning rate and rudder angle, plus a few dozen wiggly manoeuvres. What we keep is not a table of forces but a small dynamic model of the water around that hull: how much circulation (grip) the keel, rudder and hull body carry, how fast that grip builds and dies as the boat moves through the water, how much momentum the surrounding water holds, and what the water's wave memory is. At run time the boat carries about a hundred such "water states" alongside its own position and velocity, and they evolve by simple equations. A long keel and a fin keel end up with different numbers in the same equations, produced by the same code with no human in the loop. It is a model per boat as a tank test is per boat, never a method per boat.

## 2. Formulation

### 2.1 What the literature allows

- Black-box linear ROMs (Hankel-DMD with control) reproduce ship motions well around **one** operating condition (one speed, heading, sea state), and some hyperparameter choices give unstable eigenvalues. Transient manoeuvres are future work. [E] Not a tack model.
- In aircraft work, four ROM types were compared on CFD manoeuvres: Volterra kernels only handle weak nonlinearity and are tied to their training signal, RBF networks depend heavily on the training manoeuvre, and **nonlinear indicial (step-response) models parameterised by operating point** were best. [E] An indicial sail model (Persson et al.) got lift within 2 percent but drag and thrust amplitude off by 38 to 69 percent. [E]
- Radiation memory as a small stable state-space model is routine (Perez and Fossen: order 2 to 5 per coupling; zero at s=0, relative degree 1, positive real). [E]
- Quadratic models (SINDy, operator inference) can be parameterised so that stability or boundedness holds by construction. [E, abstract only]
- POD-Galerkin of the flow field is a poor fit [I]: the wetted domain changes with heel and waves, and wakes are advection dominated.

Conclusion [I]: do not learn `force = f(history)` generically. Fix a structure from mechanics in which each learned piece carries a sign or symmetry constraint.

### 2.2 State

Per closed body (hull with integral keel, fin, rudder, each demihull):

- rigid-body pose and velocity `ν` (6);
- **circulation states** `Γ` (about 4 to 16 per body): amplitudes of the leading modes of bound circulation, taken by POD from the offline solver's own doublet strengths, not fitted to forces;
- **wave-memory states** `ζ` (about 20 to 40 per vessel);

Inputs each step: wetted configuration `c` = (sinkage, heel, trim relative to the local wave surface, control angles); local relative flow `w` = body velocity minus the sea's orbital velocity sampled at about 8 to 16 stations per body, non-dimensionalised.

### 2.3 Equations

```
(M_rb + M_A(c)) ν' = F_hs + F_FK                   live, panel pressure on actual geometry
                   - C_A(c,ν) ν - (dM_A/dt) ν      Kirchhoff terms incl. Munk moment
                   + Σ_i Γ_i S_i(c) (ν_rel + W(c) Γ)   lift; ν·S_i ν = 0, so it does no work
                   - D(c,w) ν_rel                  D = LᵀL ⪰ 0: friction, form, cross-flow, steady wave drag
                   - C_ζ ζ
Γ' = (|U_rel|/ℓ) Λ(c) (Γ*(c,w) - Γ)                Λ has eigenvalues with positive real part
ζ' = A_ζ(Fn,c) ζ + B_ζ ν                           passive by construction
```

- **Lift is gyroscopic.** A Kutta-Joukowski force is perpendicular to the relative flow, so `S_i` is constrained to do no work. Induced drag and wave drag due to side force enter through `W Γ`, the downwash and wave field of the circulation itself, so they exist only when side force exists and need no separate owner. [I]
- **Drag is positive semi-definite**, parameterised as `LᵀL` with `L` a small smooth function of `(c, w)`.
- **Γ relaxes in distance travelled, not in seconds**: `|U_rel|/ℓ` is the convective rate. With two poles per mode this is a Wagner/Jones lag. [E for foils; I for a whole hull] `Γ*` is the steady circulation from the sweep; it saturates and falls at large inflow angle, and that is the stall. It is defined on the full 360 degrees of drift, so sternway is the same map with the trailing edge leading.
- **Hydrostatics and Froude-Krylov stay live** on the triangulated hull. Righting moment is never learned.
- **Passivity is the anti-blow-up rule.** Still water cannot give a hull energy. With storage `½ν·M_Aν + ½|ζ|² + ½|Γ|²`, a workless `S`, `D ⪰ 0` and stable `Λ`, `A_ζ`, the hydrodynamic block can only absorb or return what it stored. Outside the sweep, `Γ*`, `L` and `M_A` are clamped in their non-dimensional arguments, so the model degrades to speed-squared drag with saturated lift, which is the right far-field behaviour. [I]

### 2.4 Offline solver: no single affordable method is honest everywhere

| Solver                                                                          | Honest for                                                                                                                                                                                         | Dishonest for                                                                                                                                                                                                      | Cost per point                                                                                                                                                                |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free-surface RANS (VOF)                                                         | everything in principle; resistance within about 1 to 5 % at 0.6 to 3.5 M cells; at leeway 10 to 17 % on side force and yaw moment even at 3 to 9 M cells, appended hulls mostly not validated [E] | still struggles with large separated wakes                                                                                                                                                                         | about 0.1 to 2.3 GPU-hours on an L40S for calm water [E]; 30 h on 100 cores for a yacht at leeway per the repo's citation. A 2,000-point sweep is 10 to 100 times over budget |
| Lattice Boltzmann, GPU                                                          | bluff separated flow, violent free surface, 500 M node updates/s [E]                                                                                                                               | friction and thin foils: FluidX3D has no wall model or refinement, and its author expects drag about 2 times too high on an Ahmed body [E]. A 0.1 m thick keel on an 8 m hull cannot be resolved on a uniform grid | minutes                                                                                                                                                                       |
| SPH                                                                             | slamming, spray                                                                                                                                                                                    | friction, small-angle lift, noisy forces; slower than OpenFOAM in the one comparison read [E]                                                                                                                      | hours                                                                                                                                                                         |
| Free-surface panel method with shed vortex sheets, plus integral boundary layer | wave making, lift, induced and wave drag of side force, demihull interference, added mass, radiation; geometry only                                                                                | separation from round bilges, deep stall, spray, ventilation                                                                                                                                                       | seconds on GPU; my timing: 8,000-unknown dense matvec 6 ms and kernel assembly 2 s on 4 CPU cores                                                                             |

Proposal [I]: one pipeline with two solvers, selected by **flow regime, never by hull type**. (a) The panel method does the dense sweep, about 2,000 quasi-random steady points and about 50 random smooth manoeuvres. It supplies `M_A`, `S_i`, `W`, `Γ*`, `Λ`, the wave part of `D`, and `ζ` via vector fitting. (b) A fixed set of about 20 separated-flow anchor runs, the same non-dimensional points for every hull (drift 20 to 160 degrees at low Froude number, pure yaw), fixes the cross-flow part of `D` and the fall of `Γ*` past stall. Run them as coarse double-body RANS or GPU lattice Boltzmann; separation off a keel edge or hard bilge is geometry-fixed and Reynolds-insensitive, which is the one place lattice Boltzmann is honest [I]. Friction is an integral boundary layer on the panel solution.

Seven inputs cannot be gridded. Two things keep it tractable [I]: quasi-random points and trajectories instead of a grid, and making `Γ*` and `L` functions of **local** inflow at stations rather than of global `(β, r)`, which collapses drift and yaw rate into one local variable per station.

### 2.5 One model across many hulls

ShipNet is the current state of this: 420 inviscid panel runs of two parent yacht hulls, three speeds, R² 0.98 on pressure and 0.91 on wave field for held-out variants, with no drift, heel or appendages. [E, abstract] My judgement [I]: not trustworthy for the owner's purpose. The H-boat and Folkboat differ in topology (rudder on keel) and in second-order quantities (stall onset, yaw damping), and a network trained across hulls smooths exactly those toward the mean hull. Its error on an unseen topology is unknowable without running the solver. Use it only as an instant preview before a hull's compile finishes and as an outlier alarm. A cross-hull operator at **section** level (2D section shape to sectional added mass and cross-flow drag) is more defensible, since all boats' sections live in one small shape space. [S]

## 3. The five boats

- **H-boat.** Fin and rudder are separate bodies with steep `Γ*` slopes and early saturation; hull body carries little circulation. Rudder sees keel downwash through `W`. Missing: rudder ventilation at heel.
- **Folkboat.** One body. The panel solver sheds from the keel's bottom edge and the rudder trailing edge, so the leading modes are a low-aspect lifting body with a flap: shallow `Γ*` slope, late and soft saturation, extra nonlinear lift from the keel-edge vortex, large sway and yaw added mass, and yaw damping spread along the length. Rudder angle changes the whole keel's circulation, automatically. Risk: the edge-vortex lift is the least certain part of the panel solver.
- **Suomen Joutsen.** The hull is the lifting body with a tiny `Γ*` slope; almost everything at sailing leeway is in `D` from the anchor runs, plus very large `M_A`. Convective scale is 96 m, so the lag is tens of seconds, and she loses way before circulation rebuilds: tacking badly is emergent. Risk: round-bilge separation at 5 to 15 degrees of leeway is where both solvers are weakest, and the literature read shows 17 % RANS error there.
- **Beach catamaran.** Each demihull is a body with its own `c`. The windward hull's sinkage goes to zero and every one of its terms vanishes continuously; hydrostatics are live. Interference is present in the sweep only for the level two-hull configuration; with independent sinkage it is an extra sweep dimension, so I would drop interference above a threshold of differential immersion.
- **Class40.** Dynamic lift and trim come from the sweep's dependence on Froude number, trim and sinkage: the panel solver with a dry-transom condition gives pressure lift, but not spray or wetted-length jumps. Surfing comes from live Froude-Krylov on the wave slope plus orbital velocity in `w`. Twin rudders and a canting keel are separate bodies; cant angle is a control dimension of the keel body's `c`. Canting is cheap, not free; water ballast is free (mass only).

Foiling is not precluded: a foil is a body with `Γ` states.

## 4. Feel

- **Tack.** Circulation lags in distance. Jones's two-pole Wagner approximation reaches 90 % of step lift after about 6 chords in 2D [E]; for a 0.9 m fin that is under 6 m, about 2 s at 2.5 m/s but 5 to 6 s at 1 m/s [I]. A boat that comes out slow has a keel that takes longer in time to bite, makes leeway meanwhile, and that leeway loads `D`.
- **H-boat versus Folkboat.** The H-boat has small yaw added inertia and damping, so it spins fast and carries way, but its fin overshoots `Γ*` saturation if sheeted in early. The Folkboat has large yaw damping and added mass, turns slowly and steadily, cannot be stalled abruptly, and pays in wetted-surface drag in light air, while its soft stall and directional stability are why it hangs on in a blow.
- **Puff.** Heel changes `c`, which moves the centre of `S` and `D` (weather helm); `ζ` gives roll and heave memory; sway added mass delays leeway.
- **Broach.** Roll-yaw coupling through `c`, rudder area loss with heel if large heel is in the sweep, rudder `Γ*` saturation. Ventilation is missing, so the rudder lets go later and more gently than reality.
- **Sternway.** Same equations with `w` reversed; `Γ*` covers 360 degrees, so the rudder works backwards and weakly without a branch.

## 5. Cost and determinism

- **Run time.** About 100 states, a few small dense products and some smooth function evaluations per body: microseconds. Live hydrostatics on a few thousand triangles dominates. All of it is plain CPU arithmetic in the existing deterministic worker, so replays are bit-exact and a whole fleet can be fully simulated.
- **Compile, per hull** [I, order of magnitude]: 2,000 steady panel solves at 5 to 20 s plus 50 trajectories of about 2,000 steps on a rented GPU is 5 to 15 GPU-hours, roughly 5 to 15 euros; on a 16-core PC one to two days, which is over the brief's "hours". Twenty anchor runs: 5 to 15 euros more. Total is inside 20 to 30 euros only if the panel solver is GPU-accelerated and robust without supervision.

## 6. Where it breaks

1. **We must write and trust the offline solver.** An unsupervised nonlinear free-surface lifting panel code with vortex shedding that never diverges on arbitrary geometry is a research-grade artefact. The largest risk by far.
2. **Seven-dimensional sweep.** Sparse sampling means between-sample error; the structure limits the damage but does not remove it.
3. **Separation off smooth surfaces** is anchored by 20 runs, not resolved. The Joutsen's working regime sits there.
4. **Waves reach the hull dynamics only through station samples and live Froude-Krylov.** Diffraction, short-wave added resistance and slamming are not in the reduced model.
5. **Drag accuracy.** The sail indicial work shows lift lags are easy and drag-side dynamics are not; speed loss through a tack depends on the hard part.
6. **Ventilation, spray, cavitation, hull-flying interference**: absent.
7. **Passivity is asserted for calm water.** With orbital velocity in `w` the storage argument is only approximate.
8. It is still a model per boat. If the compile step ever needs a human to rescue it for one hull, the owner's worry has come true.

## 7. Cheapest experiment

One day, no free surface. Write a small unsteady vortex-lattice code and run two double-body keel planforms, a 0.9 m fin of aspect ratio about 2.5 and a 4 m long keel of aspect ratio about 0.3 with a flap. Generate 30 random smooth trajectories in speed, drift (to ±40 degrees) and yaw rate; fit `S`, `W`, `Γ*`, `Λ`, `D` on 20 with zero per-planform settings; test on 10 plus a scripted tack with speed falling to 30 %. **Kill** if any of: a quasi-steady table of the same data predicts the tack force history as well as the state model (then states buy nothing and this angle collapses to lookup); test error above 15 % of peak side force or 30 % of drag; the fit needs different settings for the two planforms; or integrating outside the swept envelope ever gains energy.

## 8. Sources

- Palma, Serani, Diez et al., Hankel-DMDc for ships in waves, https://arxiv.org/html/2502.15782v1 (read in part)
- Ghoreyshi, Cummings, Da Ronch, Badcock, X-31 load ROM comparison, https://eprints.soton.ac.uk/353422/1/PublishedVersion.pdf (read in part)
- Persson, Larsson, Finnsgård, indicial sail model, https://research.chalmers.se/publication/540485/file/540485_Fulltext.pdf (read in part)
- Perez and Fossen, FDI toolbox, https://www.mic-journal.no/PDF/2009/MIC-2009-1-1.pdf (read in part)
- Goyal and Benner, guaranteed stable quadratic models, https://arxiv.org/abs/2308.13819 (abstract only)
- ShipNet, https://arxiv.org/abs/2606.15356 (abstract only)
- FluidX3D issue 127, ship resistance, wall model, https://githubrp.bychv-a.workers.dev/ProjectPhysX/FluidX3D/issues/127 (read in full, mirror)
- Janßen et al., ELBE validation, https://www.mdpi.com/2079-3197/3/3/354 (read in part)
- GPU calm-water resistance timings, https://volupe.com/simcenter-star-ccm/gpu-accelerated-calm-water-resistance-in-simcenter-star-ccm-2602/ (read in part)
- Vasilev et al., RANS resistance at 0.6 to 3.5 M cells, https://www.mas.bg.ac.rs/_media/istrazivanje/fme/vol54/2/5_m._vasilev_et_al.pdf (read in part)
- RANS validation for a ship at leeway, TU Delft, https://repository.tudelft.nl/record/uuid:7f69d839-38b5-4b05-a1f9-d50d45444ce8 (abstract only)
- DualSPHysics versus OpenFOAM hull resistance, https://www.mdpi.com/2311-5521/9/11/266 (abstract only)

Not opened, textbook from memory: Wagner/Jones lift, Kirchhoff equations, Cummins equation. The 30 h on 100 cores figure is quoted from `docs/intention/02-hull.md`, not from its source. Japanese and German searches gave nothing citable.
