# Coarse cloth and lines are CPU authoritative under small-steps XPBD, and bending spars get a direct rod solve

The aero chapter costs the sail simulation at 1 to 2 ms per tick on the GPU while the separation chapter keeps a coarse 6 by 6 cloth per sail on the CPU, and True Wind reported that XPBD with one Gauss-Seidel sweep per substep could not carry a static load across a stiff sheet. A throwaway Node prototype of the whole rig (cloth, running lines as one constraint each through their blocks, pretensioned standing rigging, Cosserat spars, per-triangle aero) measured both claims. We decided: the coarse cloth and every line stay CPU authoritative, solved by small-steps XPBD with one sweep per substep and multipliers reset every substep, at 16 substeps per tick by default; spars are rigid bodies unless they bend, and a bending spar is solved as one direct banded system per rod inside the substep rather than segment by segment, because an 8-segment Cosserat chain under Gauss-Seidel cannot hold standing-rigging pretension at any affordable substep count while a rigid mast converges at 8 to 16.

Decided by the rig solver cost prototype ticket ([#13](https://github.com/nipatiitti/luovi/issues/13)) on 2026-10-22. The prototype and its figures are linked from that ticket; nothing from it is in the repo.

## Measurements behind the decision

Node 26 on an Apple M1 Pro, one thread, aero evaluated every substep, median of 300 to 600 ticks.

- H-boat with two 6 by 6 sails, 31 lines and an 8-segment mast: 0.16 ms per tick at 16 substeps, 0.32 ms at 32. At 8 by 12 nodes per sail: 0.41 ms and 0.83 ms.
- Full-rigged ship stand-in with 30 sails of 6 by 6, 246 lines and 192 Cosserat yard and topmast segments: 1.24 ms at 8 substeps, 2.46 ms at 16; without the bending constraints 1.09 ms and 2.19 ms.
- A 6 by 6 Dacron sheet hung from its head under 1 kN settles at 138% of the converged stretch at 8 substeps, 110% at 16, 102% at 32; an 8 by 12 sheet needs twice the substeps for the same error. At 1 to 4 substeps the sheet is 2.4 to 19 times too stretchy, which is True Wind's failure; small steps remove it without any warm start.
- A line through its blocks with a hung mass is exact at every substep count: one constraint, one exact solve.
- A masthead held by four pretensioned wires on an 8-segment Cosserat mast of aluminium stiffness reaches 7% of the converged forestay tension at 32 substeps, 29% at 64 and 90% at 256; softening the mast axially only lets it swallow the pretension. The same masthead on a rigid mast reaches 92% at 8 substeps and 98% at 16.
- Aero evaluated once per tick, with the triangle's own velocity in the apparent wind, drove flapping nodes to overflow at 16 substeps and above; evaluated every substep it is stable and is included in every cost above.

## Considered options

- Authoritative cloth on the GPU (the aero chapter): breaks the determinism contract and the server run, for a saving the CPU cost does not need.
- Simplifying the authoritative cloth below 6 by 6: nothing forces it; the hero rig uses a third of its budget at 16 substeps.
- Many Gauss-Seidel iterations per tick instead of substeps: the standard XPBD trade; small steps converge faster per unit of work on stiff chains and need no multiplier warm start.
- Projective dynamics with a prefactored matrix for the cloth (True Wind's cure): solves a problem small steps already solve at 16 to 32 substeps.
- Cosserat spars under the same sweep as everything else (the rigging chapter): converges too slowly to carry pretension, which is the tuning layer the chapter relies on.
- Softer spars: hide the problem by absorbing the pretension in spar compression, which changes forestay sag for a numerical reason.

## Consequences

- The substep count is a simulation setting, in the scenario, never in a ship definition; the default is 16 per tick, and the polar benchmark may raise the hero rig to 32 at 0.32 ms.
- The coarse cloth carries structural and shear constraints only; the bending constraints are a third of the cloth work and change nothing at sailcloth stiffness. A sail's cloth constants are warp and fill stiffness, shear stiffness and areal mass, by value, cited.
- Standing rigging is a two-node line with pretension as a shortened rest length; no line of any kind pushes.
- The direct rod solve (Deul et al. 2018 is the reference) is the one piece of `sim-rig` that is not a plain constraint projection. Tallship masts, yards, booms and poles are rigid bodies as the rigging chapter already says.
- A rig benchmark in `tool-validate` checks that a tuning's shroud and stay tensions at rest are reproduced within 5% of the tuning table; it is the check that the direct rod solve converges the masthead the way the rigid mast did in the prototype.
- The ship state carries, per cloth node, position and velocity; per rod segment, orientation and angular velocity plus its end particles; no multipliers, since they reset every substep; lines carry no state beyond their rest-length controls.
- The full-rigged ship stand-in meets the 2 ms budget at 8 to 12 substeps and exceeds it at 16 on an M1 Pro; the step 6 effort chooses between the lower count and a faster sweep.
- The aero chapter's GPU costing and cloth resolution, and the rigging chapter's "well under 1 ms" and Cosserat-under-Gauss-Seidel claims, are corrections for the design doc corrections ticket.

## Amendment, 2026-10-24

The 1 ms and 2 ms budgets this ADR measures against are dropped by `docs/adr/0013`; the decision and its measured costs stand. The full-rigged ship's substep count is chosen by profiling at step 6, not against 2 ms.
