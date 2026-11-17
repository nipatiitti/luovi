# Where the air force comes from: one vortex sheet per sail, shedding from every edge

Angle A of three. Labels: **[E]** established in literature I opened, **[M]** established as far as I know but from memory (source not opened, see section 8), **[I]** my inference, **[S]** speculation, **[N]** my own numeric check in a throwaway script.

## 1. The idea

A sail makes force because it bends the air, and the bend is a sheet of spin (vorticity) lying on the cloth. Put that sheet on the cloth itself: a small grid of vortex rings whose strengths are solved every flow step so that no air passes through the cloth, wherever the cloth is and however it moves. Spin leaves the sail at its edges and drifts downwind as a wake that every other sail feels. At the leech, head and foot it always leaves smoothly. At the luff it leaves only when the air is asked to turn too sharply round the edge, which is what a lifting telltale shows. Luff holding: a wing. Luff shedding to leeward: stalled, and at ninety degrees it sheds from all edges and is a parachute. Luff shedding to windward: the front of the sail is backwinded and the cloth lifts. There is no polar and no sail class. The slot, the jib backwinding the main, a yard braced round, a blanketed spinnaker and thirty sails in each other's wakes are all the same solve.

## 2. Formulation

**State carried.** Per sail: ring circulations Γ from the previous flow step (for ∂Γ/∂t). Per boat: a list of wake elements (position, vector strength, core radius, age). Nothing else, and no flags.

**Reading the cloth.** Fit a smooth interpolant (Catmull-Rom or bicubic) through the cloth nodes and resample an aero lattice of Nc by Ns rings, cosine-bunched toward the luff. Bound segment at each panel's quarter chord, collocation point at three-quarter chord, and the normal taken from the interpolant at that point, not from the facet. This matters more than resolution **[N]**: on a 10% camber section, facet normals lose 11% of lift at 6 chordwise panels and under-read a draft shift from 50% to 35% by 30%; interpolated normals are within 1% from 3 panels up and read the draft shift within 2%. So the aero lattice can be coarse if the cloth beneath carries the shape.

**Each flow step** (20 to 30 Hz; a chord transit is 0.3 to 1 s, so this resolves the flow):

1. Right-hand side at each collocation point: `b_i = -(W(x_i) - v_cloth,i + u_wake(x_i)) · n_i`, with W from the wind field (height profile and gusts included) and v_cloth the cloth's own velocity (boat motion, heel rate, flogging).
2. Solve `A Γ = b`, where A holds the Biot-Savart influence of every ring on every collocation point, plus mirror images below the water plane (taken in world frame, so heel opens the gap under the boom correctly). Solved as dense per-sail blocks with two or three block Gauss-Seidel sweeps across sails, warm-started from the last step; sails further than about two chords see each other as a few lumped horseshoes.
3. Luff suction per spanwise strip: `S = Γ_first / (V c √(Δx_first/c))`, the lattice form of the leading-edge suction parameter **[M]** (Ramesh and Gopalarathnam's LESP). If |S| exceeds S_crit, shed a luff vortex element of the sign and strength that brings S back to S_crit. S_crit is a property of the luff, not of the sail: near zero for a wire luff or bolt rope, larger behind a round mast, largest on a rotating wing mast.
4. Shed at leech, head and foot: the change of the edge ring's circulation becomes a new wake element (Kutta condition).
5. Move the wake: each element drifts with wind plus the velocity induced by all lattices and by nearby elements; cores grow with age; elements merge beyond about three chords and are dropped beyond the boat's far field.
6. Pressure jump on each panel from unsteady Bernoulli **[M]** (Katz and Plotkin): `Δp = ρ [ U_t · ∇_s Γ + ∂Γ/∂t ]`, with U_t the tangential relative velocity. Add a luff suction force along the luff (it loads the forestay or mast, not the cloth panel) and a tangential skin-friction drag with one global coefficient.

**Returning pressure to the cloth between flow steps.** The cloth runs many substeps per flow step. Hold Γ's spatial pattern, and give the cloth the part of the pressure that depends on its own motion right now: `Δp(t) = Δp_0 - ρ (A⁻¹ a_n) - c_d δv_n`. The middle term is the air's added mass, which falls out of the same matrix: a normal acceleration a_n needs Γ to change by `-A⁻¹ a_n`, and ρ ∂Γ/∂t is a pressure. Lumped to a diagonal it is extra node mass along the normal. This is not a refinement **[I]**: for a 3 m chord the air's added mass is about ρπc/4 ≈ 2.8 kg/m² against 0.25 to 0.4 kg/m² of Dacron, so the air is roughly ten times the cloth. A model with no added mass will flog several times too fast and is exposed to the known added-mass instability of explicitly coupled light structures **[M]**.

**Precomputed.** Per rig: nothing. Globally, once: S_crit for three or four luff types as a function of mast diameter over chord (a 2D study of a few hundred cases, or tunnel data), one skin-friction coefficient, wake core growth and decay constants. These are calibrated against the ORC H-boat benchmark, then frozen for the fleet. A new rig brings geometry and luff types, never a coefficient curve.

Angle of attack is never computed. Aback is b changing sign. A square sail has two luffs; the leading one is whichever has the suction.

## 3. The rigs

**H-boat (fractional sloop, spinnaker).** Works: the jib's circulation heads the flow at the main's luff and lowers its S, so the main can be sheeted further in without stalling, while the main lifts the jib **[M]** (Gentry's explanation of the slot, here emergent). Oversheet the jib and the main's luff S goes negative, vorticity sheds to windward and the front of the main bubbles: backwinding with no rule. Vang, backstay and mast bend change twist, depth and entry; the lattice reads them given about twelve spanwise strips. Missing: trailing-edge separation along the upper leech (see section 6), so an over-vanged, hooked leech will stall later than it should. The spinnaker is two free luffs and a free foot shedding at once; it fills, and collapses when S on the luff reverses. A stable leading-edge vortex on an asymmetric spinnaker carries more than 10% of the lift in flume tests at Re about 10⁴ **[E]** (Viola group); the model has the mechanism, but whether a coarse lattice holds that vortex in place is unproven **[S]**.

**Gaff schooner.** Works: four-sided sails need no change (head sheds like a leech; a gaff sagging to leeward twists the head and its strips unload). Fore and main interact through wake and circulation. Wrong: the mast ahead of each sail makes a thick separated luff the model sees only through S_crit and a drag term.

**Beach cat, rotating mast, full battens.** Works well: the mast is the first lattice panel with a high S_crit, so rotating it sets the entry angle and over- or under-rotation shows up as early luff shedding. Missing: laminar bubbles and the real maximum lift of a wing-mast section, which S_crit only summarises.

**Class40 with asymmetrics.** Works: main and gennaker as a slotted pair, the main blanketing the gennaker as the boat bears away, collapse when the luff curls past S = 0, refill. Risk: these sails live near maximum lift with a reattaching luff vortex, the least certain regime.

**Full-rigged ship.** Works in principle: square sails stacked on a mast share circulation (the gaps between them leak, emergent from separate lattices), each mast's sails sit in the wake of the mast ahead, bracing the yards changes b and nothing else, and headsails backed in a tack simply produce reversed force. Interaction is not a detail **[E]**: for four wing sails at 30° apparent wind, ignoring interaction gave a 40% driving-force error against 3D RANS, a lifting-line interaction model 6% (Malmek et al.). Wrong or thin: at 4 by 6 panels per sail the clew and leech detail is gone; running square before the wind is thirty bluff plates in each other's wakes, the regime where vortex methods are noisiest.

## 4. Feel

- **Trimming.** Sheet in and force rises until the luff S crosses S_crit, then lift falls and drag rises progressively from the head down or the foot up, depending on twist. Easing past the other limit lifts the luff first, the top first if the sail is twisted. Draft forward, draft aft and entry angle all move the point where this happens, because S reads the first panel. The telltale is literally a state of the model and could be drawn from it.
- **A puff.** Apparent wind swings aft and S rises with height (the gust has more speed aloft). If nothing is eased the upper luff sheds to leeward and the boat heels without accelerating, which is the over-trimmed feeling. Force also lags the gust by a few chord lengths of travel **[M]** (Wagner lag, from the shed wake), so a short puff hits softer than its speed suggests.
- **Tack.** As the bow comes up the jib's S reverses, the luff lifts, then the whole sail flogs as a flag: an inviscid vortex sheet shed from the trailing edge is enough to make a sheet flutter above a critical speed, with periodic, snapping and chaotic regimes **[E]** (Alben and Shelley), so no noise term is needed, and added mass sets the frequency. Held aback, the jib pushes the bow round. A recent membrane study finds that whether a sail flips to its mirror shape depends on pretension, stretch stiffness and final angle, and that slack sails are harder to flip **[E, abstract]**: the light-air main that will not pop through should emerge.
- **Gybe.** The spinnaker falls into the main's wake, collapses, and refills when it clears.
- **Going wrong.** Stall is hysteretic (shed luff vorticity must wash away before reattachment). A boat to windward sheds a wake you sail through, so covering comes from the same elements.

## 5. Cost and determinism

Measured in unoptimised Node, one thread **[N]**: building and LU-factoring a dense 100-panel system takes 1.1 ms, 300 panels 31 ms (LU dominates, hence per-sail blocks); evaluating 10,000 wake elements at 1,080 points takes 43 ms, about 4 ns per kernel.

- **H-boat**, three sails at 6 by 12: three 72-panel blocks plus cross terms, about 4 to 6 ms; 2,000 wake elements on 216 points, 2 ms; wake self-advection, 16 ms if brute force, a few ms with self-induction limited to the near wake. Roughly 10 ms per flow step, at 20 to 30 Hz: 20 to 30% of one core **[I]**.
- **Ship**, thirty sails at 4 by 6: blocks are trivial, cross-sail terms with far-field lumping about 5 to 10 ms, 3,000 wake elements 10 to 15 ms. Feasible at 10 Hz flow rate, with the added-mass operator carrying the cloth between solves **[I]**.

**Determinism.** The kernels need only add, multiply, divide and square root, all correctly rounded under IEEE 754, so a CPU implementation through `core` math with fixed summation order is bit-reproducible and fits the existing contract. A GPU wake (tens of thousands of elements, free interaction) would look richer but WGSL does not promise correctly rounded results across vendors as far as I know **[M]**; it would have to be visual only, or replays would record per-tick sail loads. I recommend CPU.

## 6. Where it breaks

1. **No boundary layer.** Trailing-edge separation, the gradual stall that leech telltales show and that dominates a mainsail behind a mast, is not in the model. The honest patch is one extra state per strip (a separation point relaxing toward a value set by the lattice's own pressure recovery, Kirchhoff-style), which is semi-empirical. Malmek's equivalent correction is admitted by its authors to be poorly founded and calibrated in 2D only **[E]**.
2. **Luff shedding on a coarse 3D lattice is unproven at this resolution [S].** Published 3D work uses far finer meshes **[M]**. If the stalled force is noisy or depends on panel count, the central claim fails. The fallback is to keep the lattice for circulation and interaction and replace luff shedding with a per-strip separation state blending toward a separated-plate normal force. Note the warning from kites **[E]**: a lifting line coupled to 2D polars has multiple solutions past stall and "usually fails" there (Cayon et al.), so the fallback must carry a state with a time constant, not look up a polar.
3. **Bluff-body drag level.** Discrete vortex models of a plate normal to the flow tend to over-predict drag unless shed circulation is decayed **[M]**; the decay constant is a global tuning knob that could turn into a per-rig knob if I am wrong.
4. **Wake striking sails.** Elements passing through a downstream lattice give force spikes unless cores are at least a panel wide, which blurs exactly the fine interaction wanted. On the ship this is constant.
5. **Mast, hull, deck and crew** are images and drag terms, not flow bodies. The deck seal under a jib is only as good as the image plane.
6. **Chaos.** Flogging and separated wakes are chaotic; replays stay exact, but benchmarks must be statistical.
7. **Real-time lattice Boltzmann** is the rival for separated flow. My judgement, no source opened **[I]**: a real-time grid has 10 to 20 cm cells around an H-boat, a few cells across the slot, so attached-flow lift and trim response would be set by numerical viscosity, and it is not reproducible across GPUs. Not the authority.

## 7. The cheapest experiment

One day, one Node script, two dimensions.

- Morning: a cambered plate of 8 lumped vortices with trailing-edge shedding and the luff rule, swept through ±180° at cambers of 0, 10 and 20%. Pass: lift slope near 2π before stall, one S_crit giving maximum lift and stall angle in the measured range for all three cambers, time-averaged CD at 90° between 1.6 and 2.4, mirror symmetry aback, and force noise under 20% RMS after a half-second average. Fail on any of these with no single global constant set and the luff-shedding claim is dead; fall back to item 2 of section 6.
- Afternoon: replace the plate with a tensioned chain of 8 masses pinned at the luff and sheeted at the leech, add the added-mass term, and ease the sheet. Pass: steady camber when loaded, the luff lifting first as S reverses, self-starting flutter when eased with no noise injected, frequency falling as added mass is included and rising with tension. Then add a second plate ahead as a jib: it should raise the main's stall angle and be able to backwind it.

## 8. Sources

The shared page-fetch budget ran out early, so the opened list is short.

Opened:

- [Malmek et al., Rapid aerodynamic method for predicting the performance of interacting wing sails](https://research.chalmers.se/publication/540253/file/540253_Fulltext.pdf), read in part (method, validation, limits).
- [Cayon, Gaunaa, Schmehl, Fast aero-structural model of a leading-edge inflatable kite, Energies 2023](https://research.tudelft.nl/files/149869036/energies_16_03061_v2.pdf), read in part (vortex step method, post-stall failure).
- [Alben and Shelley 2008, Flapping states of a flag in an inviscid fluid](https://math.nyu.edu/~shelley/papers/AS2008.pdf), read in part.
- [Sail dynamics during tacking maneuvers, arXiv 2410.04966](https://arxiv.org/abs/2410.04966), abstract only.
- [The leading-edge vortex of yacht sails (Arredondo-Galeana and Viola)](https://strathprints.strath.ac.uk/73623/), abstract only.
- Repo: `docs/intention/03-aero.md`, `docs/adr/0008`, read in full.

Found by search but not opened, so not cited as evidence (every **[M]** above rests on my memory of these or of textbooks):

- [Ramesh et al. 2014, LESP shedding criterion](https://www.doi.org/10.1017/JFM.2014.297)
- [LEV initiation on finite wings, AIAA 2015-0546](https://www.mae.ncsu.edu/apa/wp-content/uploads/sites/2/2016/08/AIAA_Paper_2015-0546_wing_lev_initiation_revised.pdf)
- [Parenteau 2021, nonlinear unsteady vortex lattice](https://publications.polymtl.ca/6629/1/2021_MatthieuParenteau.pdf)
- [Augier, Bot et al. 2012, sail FSI at full scale (French group)](https://hal.archives-ouvertes.fr/hal-01071567/file/IRENAV_JWEIA_2012_BOT.pdf)
- [Tacking simulation (Japanese series)](https://nippon.zaidan.info/seikabutsu/2003/00574/contents/0424.htm)
- [Alvarez and Ning, reformulated vortex particle method](https://arxiv.org/abs/2206.03658)
- [Stable partitioned FSI for shells (added mass)](https://arxiv.org/abs/1308.5913)
