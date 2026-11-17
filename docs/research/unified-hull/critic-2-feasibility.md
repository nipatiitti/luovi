# Critic 2: can it be built and run

Measurements are from throwaway Node 22 scripts, one thread, in `/tmp/claude-0/-home-user/005e1c2d-09e2-5a19-913c-f6e461918c91/scratchpad/critic2/`. Labels: **[M]** measured here, **[J]** my judgement.

## What I measured

| Script               | Question                                                                                                                                                                                | Result                                                                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a_couple.mjs`       | A's biggest risk: negative-image panel solve plus FFT wave field with a one-step explicit lag at dt = 1/60 s. Half spheroid (8 m by 2 m by 1 m), 384 panels, impulsive sway start, 10 s | **Stable, and it recovers the rigid lid.** Sway coefficient starts at 0.40 (negative image), overshoots to 1.13 at 1 s, settles at 0.87 to 0.89 against 0.880 rigid lid. Same at 64² (0.5 m cells) and 128²                        |
| same                 | A's per-step work the author did not count                                                                                                                                              | Depositing panel downwash on a 128² plane: 18.6 ms brute force. Reading the field back at 384 panels: 37.5 ms brute force, or about 17 FFTs (16 ms) through depth layers                                                           |
| `pf/bench.mjs` rerun | A's table                                                                                                                                                                               | Reproduced (768 panels: product 0.61 ms, LU 179 ms)                                                                                                                                                                                |
| `c_var.mjs`          | C's CPU twin with honest kernels                                                                                                                                                        | Author's constant-coefficient sweep: 215 M cells/s. With cut-cell face coefficients: 104 M/s. Trilinear advection: 73 M/s                                                                                                          |
| `michell_low.mjs`    | B's Michell sum at tack speeds                                                                                                                                                          | Fine from Fn 0.12 up. At Fn 0.10 C_w is 20 times too large, at Fn 0.08 it is 12 (not 12e-3): station aliasing                                                                                                                      |
| `slam.mjs`           | B and D: flat light section (375 kg/m, 4.5 m beam, 5° deadrise) entering at 2 m/s                                                                                                       | Neither form blows up at 1/60 s. Peak deceleration: true 5.9 g, momentum form 5.6 g, acceleration form 10.7 g. Rebound velocity after 2 s is wrong by 50 percent either way at 60 Hz, within 10 percent at 240 Hz in momentum form |
| `d_bs.mjs`           | D's wake cost                                                                                                                                                                           | 3e5 Biot-Savart evaluations: 1.8 ms. The author's figure holds                                                                                                                                                                     |

## A. Live panel solve plus wave field

**Cost is understated by a factor of two to three.** The table prices the solve only. Add: clipping and re-weighting the wet set, rebuilding both source and doublet image blocks (twice the measured 2 to 3 ms), deposit onto the plane, and the field read-back. At 384 panels and 128² I get 30 to 50 ms per step in plain JS once the deposit is done sensibly (near-field direct, far-field skipped). That is a 20 to 30 Hz hydro step for one boat, against report F's wish for 20 times real time headless. Wasm SIMD would help, and the project deferred Wasm.

**Stability is better than the author feared.** The lagged coupling held at 60 Hz and found the rigid-lid limit even on a coarse grid. The consequence he did not draw: only 45 percent of the low-frequency sway added mass is in the implicit `A∞` on the left-hand side; the rest arrives through the explicit field over about a second. I tested prescribed motion only. A free Folkboat, with added mass four times its own mass, closes that loop and is untested [J].

**Unpriced research items** [J]: the preconditioner (an inverse baked at reference attitudes is not an inverse of a matrix whose rows come and go at the waterline); the doublet lattice on thin fins is a first-kind system with none of the source formulation's good conditioning; wake sheets cutting the free surface and the rudder passing through the keel wake; partial-wet weighting versus force chatter. Determinism needs fixed iteration counts, so the worst-case count always runs.

**Size:** 5,000 to 8,000 lines, half research grade. No precompute problem.

## B. Section momentum

**Cost is honest** (well under a millisecond), which buys what A and C cannot: sub-stepping. The slam test says a flat run wants 240 Hz.

**Things skipped** [J]:

- The conveyor on a 40-station grid is first-order advection at a Courant number near 0.25. It will smear the keel's sidewash before it reaches the rudder. Carry slices as Lagrangian markers fixed in the water instead.
- Michell fails outright below Fn 0.12 [M]. Every tack goes there, and the Suomen Joutsen lives there. The cure is ordinary: integrate each station segment's phase analytically.
- Lags written per chord of travel have a rate of |U|/c, fine at zero speed, but anything in angle of attack or its rate is singular there. Write every law in velocity components.
- Integrate total momentum `p = (M + A(q))·v`, not acceleration. It is exact for entry, exit and a flying hull, and halves the slam peak error [M].
- Table derivatives `∂A/∂t` from linear interpolation are discontinuous; bake C1 tables or the helm will buzz in waves.

**Size:** 2,500 to 3,500 lines including a 2D section solver. Research risk sits in physics (the shed fraction), not numerics.

## C. Simulate the water

**The CPU twin does not fit.** With cut-cell coefficients and MacCormack advection, 370,000 cells cost about 70 ms of smoothing plus 35 ms of advection per step on one core [M]: six times over at 60 Hz. The fallback at L/48 fits (about 13 ms) but gives 17 cm cells, so an H-boat canoe body is two cells deep and a beach-cat hull one. Cut-cell force noise, the author's risk 3, then dominates [J].

**Also skipped** [J]: an explicit height-function surface needs a gravity-wave Courant limit (6 m/s over 8.6 cm is 73 per second, over 1 at 60 Hz) or an implicit surface term; point smoothers stall on stretched, anisotropic grids; twenty fixed passes leave divergence that shows up directly in the force; the `p >= 0` contact inequality makes the solve a complementarity problem, not a Poisson solve.

**Determinism** survives only through the recorded wrench, which breaks the repo's contract. **Size:** 8,000 to 12,000 lines, written twice, most of it research grade.

## D. Strip law with attachment state

Numerically the same as B with a real wake; the cost claim holds [M]. Skipped [J]: the reactive (Jones) term and the wake-induced downwash both carry finite-span effects, and nothing shows they do not double count between aspect ratio 0.5 and 2; Biot-Savart needs a core radius, a hidden tunable; no wave resistance at all, so a first version sails through hull speed. **Size:** 3,000 to 4,000 lines.

## E. Compile offline, run compact

Run time is trivial and fully deterministic. Everything hard moves offline and gets harder [J]: the offline solver is A's unsolved parts plus a nonlinear free surface, required to run 2,000 points unattended on arbitrary geometry. By the bench, an 8,000-unknown dense LU in JS is about four minutes; even iteratively, with free-surface iterations, a point is one to two minutes, so 30 to 60 hours on a PC. The fit (a smooth function of ten or more inputs from 2,000 samples, with passivity constraints) has no specified function class. Two research artefacts in series before anything sails. **Size:** 10,000 lines or more.

## Ranking: working first version within a few weeks

1. **B** (with D's fins). Smallest, cheapest, deterministic, sub-steppable, and it includes wave resistance.
2. **D**. Same core; loses a place for having no wave drag and one more untested interaction.
3. **A**. Feasible at 20 to 30 Hz and the coupling works, but twice the code and four open numerical questions.
4. **E**. Cannot start until most of A exists offline.
5. **C**. Not in weeks, and not deterministic at useful resolution.

## Cheapest staged path

1. **Skeleton.** Section clipping against the wave surface, hydrostatics and Froude-Krylov, momentum-form integrator with sub-steps. The boat floats and rolls.
2. **Baked section tables and the momentum law** (B and D share it), friction, cross-flow drag. Fins as lifting-line strips with one attachment state each, written in velocity components. It sails and tacks.
3. **Wave resistance** from the same section sources, with analytic segment integration.
4. **Lagrangian wake markers** replacing the Wagner states: keel-to-rudder lag, second hull.
5. **A's double-body panel solver, offline in the bake**, as the judge and corrector of the 2D tables (3D added mass, surge, end effects). This is E's compile step shrunk to something safe.
6. **Optional:** A's FFT patch live for radiation memory, driven by section sources; C's box only as a render-side wake.

## One experiment each, before committing

- **A:** rerun my coupling test with a free body whose mass is a quarter of its sway added mass, and with panels crossing the waterline in a 0.3 m swell. Pass: bounded, and force chatter under 2 percent of mean.
- **B:** drift sweep 0° to 30° of a fin hull, a long-keel hull and one tank-tested hull with one sharpness rule. Fail if the shed fraction differs per hull.
- **C:** before anything else, pitch a hull sinusoidally in the L/48 CPU twin and look at the force trace. If the noise exceeds 5 percent of buoyancy variation, stop.
- **D:** flat plates from aspect ratio 0.2 to 4 through the full model; lift slope must follow Helmbold within 15 percent with no dip or bump near 1.
- **E:** run the intended offline solver unattended on five unlike hulls at 50 random points each. One divergence that needs a human ends the idea.
