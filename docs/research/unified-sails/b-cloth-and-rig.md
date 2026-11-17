# B. Cloth and rig: one implicit tension structure with the air's mass in it

Angle: the structure. Labels used below: **[E]** established in a source I opened, **[I]** my inference, **[S]** speculation.

## 1. The idea

Treat the whole rig as a pretensioned tension structure, like a tent, in which threads, ropes and wires only pull, spars bend, and nothing stretches visibly. Engineers do not solve such structures one knot at a time, as XPBD does; they write one stiffness matrix and solve it exactly. The sails here are small enough (a hundred or so knots each) that the exact solve costs about the same as the nudging, and it does not care how stiff the sheet is or how hard the shrouds are wound. Each sail is a net of threads laid along warp and fill, cut to its moulded shape, bent onto a mast made of real beam elements, with battens as beams and every rope as one tension-only line through its blocks. Two things are added that the current plan lacks: the air's reaction to the cloth's own motion sits inside the solve (so nothing blows up at a normal time step), and the air that must move with the cloth is given mass. That second item is the small physical ingredient that decides when and how fast a sail luffs and flogs.

## 2. Formulation

**State.** Per cloth node: position, velocity. Per beam node (mast, battens, bending yards): position, quaternion, linear and angular velocity. Per rigid spar: the usual 13 numbers. Lines carry only their rest length (the controls). No multipliers, no modes, no active-set memory.

**Elements, all of one kind: an energy with a force and a tangent.**

- _Thread net._ A quad grid whose edges follow warp and fill (or the load paths of a radial or laminated sail). Each edge is a tension-only fibre, `f = max(0, EA·ε)`, with EA the cloth's line stiffness times the tributary width. Each quad has a weak shear (bias) spring. Rest lengths are measured on the moulded 3D shape, so luff curve and broadseam are in the metric, and mast bend flattens the sail because the boundary moves, with no camber parameter. A small residual stiffness is kept in compression; Zhang and Kiendl show that this is what keeps a tension-field membrane solvable in slack states **[E]**. This is the wrinkling model real sail FEM uses: Durand's ARA code uses constant-strain triangles, cancels compressive stress instead of resolving wrinkles, and assumes strains under 1% with a constant material matrix **[E]**.
- _Why a thread net and not triangles._ English and Bridson show that an inextensible conforming triangle or bilinear quad mesh locks: n triangles keep only about √n bending freedoms **[E]**. A net with v nodes has 3v freedoms and about 2v thread constraints, leaving v free (a Chebyshev net), and the tension-only law removes the compressive half of what remains **[I]**. Woven cloth really is this; a film laminate is not, and gets an extra in-plane term that is affordable only because its strain from the moulded shape is small.
- _Lines._ One element per rope over its whole path, `C = Σ|segment| − L`, tension-only, with the rope's real EA/L. Standing rigging is the two-node case. Sheet stretch (polyester against Dyneema) is then a feel parameter, not a numerical one.
- _Beams._ Co-rotational beam elements, 8 to 12 for a yacht mast, 3 to 5 per batten. Luff slides and hanks are nodes constrained to the beam curve, as ARA does for luff on mast, foot on boom and batten in pocket **[E]**.
- _Air._ The aero model (whichever the coordinator picks) returns nodal force F(x, v), and must also return two operators: the damping D = −∂F/∂v (for a pressure law, ½ρ|V|·∂Cp/∂α·A·nnᵀ per panel) and an added-mass matrix M_a acting along the normal. Lumped form **[I]**: m_a = 2ρ·√(d_luff·d_leech) per unit area, the flat-plate result, which gives ρπc²/4 per unit span; for a 3 m chord that is up to 3.6 kg/m² against 0.3 kg/m² of Dacron. If the aero model is an unsteady panel method, M_a is its ∂φ/∂t term and must not be counted twice.

**Step.** Fixed h = 1/240 s (four per tick) with a second-order, low-dissipation implicit rule (implicit midpoint or generalised-α). Backward Euler is ruled out: at 60 Hz it removes 11% of a 5 Hz flog's amplitude per step **[I]**, and English and Bridson report the same disease in constrained cloth and cure it with a second-order integrator **[E]**. Per substep, one Newton iteration:

```
[ M + M_a + γh·D + βh²·K(x) ] Δv = h·( f_int(x) + F_aero(x,v) + f_gravity )
```

K holds material and geometric stiffness. For tension-only elements the geometric part (T/L)(I − ddᵀ) is positive semidefinite, so the matrix is positive definite without tricks; a mast in compression contributes a negative term, which is real buckling physics and stays safe while h is small **[I]**. Slack or taut is read from the current strain each iteration; nothing is remembered. The shape-dependent, non-symmetric part of the air load (the part that feeds flutter) stays explicit; its limit is |V|h/Δx < 1, about 0.3 at 20 m/s on a 0.3 m panel.

**Solve.** Block LDLᵀ in a baked elimination order: each sail's interior first (banded along its short side), condensed onto its luff, corners and battens; then mast, lines and spars, a few hundred unknowns. Sails are independent until the last stage. Cheap variant: factor once per tick, back-substitute per substep with a fresh residual.

**Precomputed per rig.** The mesh from the sail's design shape, the elimination order, the lumped added mass, and a dock-tune static solve that turns turnbuckle settings into rest lengths. Seconds.

**Why not the alternatives.**

| Family                                    | Verdict for a sail                                                                                                                                                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small-steps XPBD (repo)                   | Works, but convergence is tied to resolution and stiffness (ADR 0008: 8×12 needs twice the substeps; a Cosserat mast holds 7% of pretension at 32). The Stable Cosserat Rods authors report XPBD failing on stiff rods even at 1/20 step **[E]**.                    |
| Projective dynamics, Chebyshev, ADMM      | Constant prefactored matrix is tempting for a fixed mesh, and exact for stretch, but the matrix has no geometric stiffness, so large rotations (flogging, bracing) converge slowly and look damped at low iteration counts **[I]**.                                  |
| VBD                                       | Its authors note notably slower convergence with stiff materials **[E]**; Macklin et al. show primal descent is sensitive to stiffness ratio, dual to mass ratio **[E]**. A sail has both.                                                                           |
| AVBD                                      | Fixes hard constraints and stiffness ratios with an augmented Lagrangian, shown on GPU for millions of objects **[E]**. Still local sweeps: load needs iterations proportional to path length to travel head to clew. Best fallback if the direct solve disappoints. |
| GPU Newton, multigrid, Schwarz            | Built for 10⁵ unknowns and up. A rig is 10² to 10⁴. No gain, and determinism lost.                                                                                                                                                                                   |
| Stable Cosserat Rods                      | Four iterations for very stiff rods **[E]**; unnecessary for 12 beam elements already in a direct solve.                                                                                                                                                             |
| Reduced or modal sail (stripe parameters) | Good as _output_ (depth, draft, twist per stripe for telemetry, for the aero model and for the visual upsample). As _state_ it cannot luff, flog or collapse without becoming a mode switch. Rejected.                                                               |

**Resolution.** A sailmaker reads four numbers per stripe (depth, draft position, entry, exit angle): a cubic, so at least 5 nodes across, clustered at the luff where the bubble forms. Spanwise the mesh must carry twist, mast bend and the battens. **[I]** Hero main 9×13, jib 7×11, spinnaker 9×9; ship sails 5×5 to 6×6 (a square sail is a bag hung from a yard with two clews). The direct solve removes the coupling between resolution and convergence, so this is a cost choice only.

**Does luffing fall out?** Partly today, fully with the added mass. For a taut strip in a stream with a local pressure polar, linearising gives `m·y_tt + a·(y_t + U·y_x) = T·y_xx`, unstable when U > √(T/m) **[I, hand derivation]**. So the repo's per-triangle polar does flutter on its own, but with cloth mass only the onset at 8 m/s is T < 19 N/m. Inviscid membrane theory puts the onset at T ≈ 1.73 to 1.78·ρU²L (Tiomkin and Raveh as quoted by Mavroyiakoumou and Alben, and their own result) **[E]**, about 400 N/m for a 3 m chord: twenty times higher. The same paper finds that a membrane fixed at both ends settles into a steady single hump (a sail filling) and one with a free trailing edge flutters, with small amplitude and high frequency at low cloth mass ratio **[E]**; a sail's ratio is about 0.08. Argentina and Mahadevan likewise put added mass at the centre of flag flutter **[E]**. Conclusion **[I]**: without air mass a sail luffs too late, too fast and too finely; with M_a, and its convected form `−m_a(∂t + U∂s)²y` when the aero model is quasi-steady, onset and frequency come out at the right scale. The aero chapter's noise term is unnecessary; gusts seed the instability.

## 3. The rigs

- **H-boat sloop with spinnaker.** Strongest case. Backstay bends a beam mast, the luff boundary moves, the main flattens and the forestay sags less; all one solve. Missing: sail against rig contact (jib on mast and shrouds in a tack, main on spreaders, spinnaker round the forestay) needs node against capsule tension-free contact elements, not designed here. A 9×9 spinnaker fills and collapses but its folds are smoothed away.
- **Gaff schooner.** Gaff as a rigid or beam spar on jaws, peak and throat halyards as lines; gaff sag and head twist are structural consequences. Mast hoops are sliding nodes.
- **Beach cat.** Rotating mast is a beam with a free rotation at the step; full battens are beams whose compression against the mast sets camber, and their snap-through when tacking is real buckling carried by the negative geometric stiffness. Risk: snap-through is where one Newton iteration is least trustworthy.
- **Class40.** Laminate sails need the film term; furling stays and a top-down furler are outside the model; asymmetric on a sprit is the spinnaker case with a tensioned luff, easier.
- **Full-rigged ship.** Thirty 5×5 or 6×6 sails, rigid yards, about 250 lines. Works by the same elements; clewing up, reefing and furling (cloth gathered on a yard) need contact and are not covered.

## 4. Feel

Trimming: sheet and vang load paths are exact every step, so easing the vang opens the leech at once and the sheet load drops in proportion; mast bend and forestay sag respond to backstay with no lag from solver convergence. A puff: the mast tip falls off, the leech opens and the rig sheds load through structural give that is the rig's own stiffness, not solver softness. A tack: the jib luffs from the front edge back, flogs at a few hertz with the sheet snatching (rope stretch and added mass set the snatch), goes aback against the weather sheet, fills on the new side. A gybe: the boom's swing is slowed by the air it has to move. Things going wrong: a slack leeward shroud, a pumping mast, a flogging jib shaking the forestay and so the whole rig, because they share one matrix.

## 5. Cost and determinism

Measured here (Node 22, one thread, container CPU; banded Cholesky factor plus solve, synthetic matrix of the right sparsity): 6×6 nodes 41 µs, 8×12 197 µs, 10×16 484 µs, 12×20 946 µs. Assembly is roughly as much again **[I]**. Hero boat (9×13 and 7×11) at four full factorisations per tick: about 2 to 3 ms per 60 Hz tick; with one factorisation per tick and four back-substitutions, about 1 ms **[I]**. Ship: 30 sails at 6×6 with two solves per tick, about 5 ms, or under 2 ms spread over workers, since sails are independent until the rig stage. That is one to three times the measured XPBD cost, for exact stiffness and free resolution. CPU only: the systems are too small for a GPU to help.

Determinism survives intact: f64 addition, multiplication, division and square root in a fixed order with a fixed iteration count are bit-identical on every engine; slack tests are comparisons. Parallel sails stay deterministic because each condensation is self-contained and the rig stage sums in baked order. If the aero forces come from a GPU, that breaks it, not this.

## 6. Where it breaks

- Contact and self-contact (sail on rig, spinnaker wraps, furled cloth) are absent and are the largest unpriced item.
- Wrinkles and folds are averaged out by design; a collapsing spinnaker will look too smooth, and a hard-flogging sail is under-resolved at 9×9.
- One Newton iteration per substep with inextensible threads and fast rotation leaves a stretch error; flogging is the worst case and may force 480 Hz or a second iteration.
- The lumped added mass is a long-wave estimate; it overstates the mass of short ripples and ignores neighbouring sails. The convected form with a quasi-steady polar may double count camber lift **[S]**.
- More code than XPBD: sparse LDLᵀ, beams, a tangent per element.
- Thread-net shear stiffness for real cloths needs data I did not find in an opened source.

## 7. The cheapest experiment

One day, throwaway Node script, one 8×12 mainsail on a 10-element beam mast with forestay, backstay and shrouds:

1. Repeat ADR 0008's two tests (sheet hung under 1 kN; masthead pretension) at 1, 2 and 4 solves per tick. Pass: within 2% at one solve.
2. Ease the sheet in a steady 8 m/s stream with the repo's per-triangle polar, with and without M_a. Record the chordwise tension at flutter onset and the frequency. Pass: onset near 1.75·ρU²L with M_a and far below it without, flogging sustained for 10 s and not damped out, no blow-up at 240 Hz.

Kill: flogging unstable or dead within a second at 240 Hz and two iterations, or cost above three times XPBD at equal trim error.

## 8. Sources

The shared page-fetch budget ran out early; papers were downloaded and read as extracted text.

- [Giles, Diaz, Yuksel 2025, Augmented Vertex Block Descent](https://graphics.cs.utah.edu/research/projects/avbd/Augmented_VBD-SIGGRAPH25.pdf), read in part
- [Hsu, Wang, Wu, Yuksel 2025, Stable Cosserat Rods](https://graphics.cs.utah.edu/research/projects/stable-cosserat-rods/Stable_Cosserat_Rods-SIGGRAPH25.pdf), read in part
- [Chen, Liu, Yang, Yuksel 2024, Vertex Block Descent](https://arxiv.org/pdf/2403.06321), read in part
- [Macklin et al. 2020, Primal/Dual Descent Methods for Dynamics](https://mmacklin.com/primaldual.pdf), read in part
- [Zhang, Kiendl 2025, variationally consistent membrane wrinkling model](https://arxiv.org/pdf/2504.03400), read in part
- [English, Bridson 2008, Animating Developable Surfaces using Nonconforming Elements](https://www.cs.ubc.ca/~rbridson/docs/english-siggraph08-cloth.pdf), read in part
- [Coltraro et al. 2021, An Inextensible Model for Robotic Simulations of Textiles](https://arxiv.org/pdf/2103.09586), read in part
- [Durand, Hauville, Mounoury, Roux, Journées de l'Hydrodynamique 11, modèle aéroélastique appliqué à la déformation d'un gréement](https://actesjh.ec-nantes.fr/images/11JH/Annexe/Papier28.pdf) (French; ARA structure model), read in part
- [Mavroyiakoumou, Alben 2019, Large-amplitude membrane flutter in inviscid flow](https://arxiv.org/pdf/1907.07002), read in part
- [Argentina, Mahadevan 2004, Flutter of a Flag](https://arxiv.org/pdf/physics/0403001), read in part
- [Aubin et al. 2017, model spinnakers in the Auckland twisted-flow tunnel (curling)](https://sam.ensam.eu/bitstream/10985/14919/3/IRENAV_INNOVSAIL_2017_AUBIN.pdf), read in part
- [Zhang et al. 2025, flying shape of a full-scale windsurf sail](https://arxiv.org/pdf/2501.13254), abstract only
- [Kan, Peng, Chen 2018, complementarity approach for sliding cables with friction](https://arxiv.org/pdf/1809.05652), abstract only
- Repo: `docs/adr/0008`, `docs/intention/03-aero.md`, `docs/intention/04-rigging.md`, read in full

Found by search but not opened, so not relied on: Italian theses, Trimarchi's thesis on sail wrinkling, Membrain and SMAR Azure material, Augier's and Deparday's papers.
