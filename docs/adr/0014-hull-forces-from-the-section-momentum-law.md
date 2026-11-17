# Hull, keel and rudder forces come from one section momentum law on the actual geometry

Hull, keel and rudder are each a stack of transverse sections cut from the boat's real lines. Every section trades momentum with the slice of water it is passing through, and that slice is fixed in the water, not in the boat: the water a keel has turned is still turning when the rudder reaches it. Side force, yaw moment, the rudder's grip and stall, weather helm growing with heel, the rudder airing, heave and pitch on waves and slamming all come from that one law, evaluated per section on the immersed geometry at the current attitude. The hull family is data, never a code path: there are no modes, no flags, no speed or angle thresholds and no per-family regression, and every behaviour listed is what the law does. Upright wave-making drag comes, for now, from the slice wave method: each water slice is left with the waves the passing body-exact sections made, summed in Michell's weighting with no constant. The previous outline is retired: the resistance regression per hull family (ADR 0006), the vortex lattice with heel bins and basis superposition, the cross-flow strip, per-surface stall weights and the constant 6x6 added mass with its Kirchhoff terms (ADR 0007).

Decided by the owner on 2026-11-17 at the end of the unified physics session. The evidence lives on the archive branch `claude/project-thread-mqnuze` (draft pull request [#49](https://github.com/nipatiitti/luovi/pull/49), kept for reference and never merged): the research notes in [docs/research/unified-hull/](https://github.com/nipatiitti/luovi/tree/claude/project-thread-mqnuze/docs/research/unified-hull/), the two rounds of kill experiment results in [docs/research/unified-experiments/](https://github.com/nipatiitti/luovi/tree/claude/project-thread-mqnuze/docs/research/unified-experiments/) and their scripts under [experiments/unified-physics/](https://github.com/nipatiitti/luovi/tree/claude/project-thread-mqnuze/experiments/unified-physics/). The throwaway JavaScript reference model the numbers below come from, with small smoke checks, is [experiments/unified-physics/reference-model/](https://github.com/nipatiitti/luovi/tree/claude/project-thread-mqnuze/experiments/unified-physics/reference-model/) on the same branch. Result notes named below by file name are in that experiments folder.

## What is validated, and how well

The owner judges "good enough" by feel and by order of magnitude together, not by a hard 5% gate: his impressions give direction and ordering, a remembered number of his is a rough band, tank measurements win over remembered figures, and a mismatch is raised only when it is about a factor of two or of the wrong kind. Against that:

- Side force of hull and keel, upright: held out on 35 Delft hulls the law had never seen (396 runs), per-hull means from 6% low to 13% high, all runs 3.7% high on average, centre of lateral resistance 0.03 of the length aft of the tank's (`c1-holdout-rerun.md`, `c2-sideforce-fix.md`).
- Rudder: stall and flat-plate behaviour from tank foils and a free tiller as a real hinge (`r1-rudder.md`). Two of the owner's marks are not met yet: at a crawl a hard-over rudder still turns more than it brakes, and on the real H-boat geometry a let-go tiller swings hard over instead of trailing. H-boat tack, close-hauled to close-hauled at 20 degrees of helm: 7.1 s, and 6.1 s with the side-force fix; the owner's band from race videos is 7 to 8 s.
- Heel, weather helm growing with heel, the rudder airing and the broach are emergent (`r2-broach.md`). On the real H-boat geometry from the class offsets the helm is about neutral at 4 m/s of wind, 3 degrees at 6 m/s, 7 at 8 m/s, 10 at 10 m/s and 15 at 12 m/s (`sailing-test-v3.md`, `c2-sideforce-fix.md`).
- Heave and pitch on waves come from the same law with a per-section wave-making memory term (four numbers per section, passive for any parameters). In the reference sea (wind 7 m/s, fetch 15 km, Hs 0.42 m, Tp 2.9 s) the H-boat close-hauled pitches 2.4 degrees rms, slams about 4 times a minute and loses 0.17 knots (`v1-seaway.md`, `v2-radiation.md`).
- Wave-making drag: Michell's thin-ship sum on the same sections is 2.8 to 3.8 times the tank on heavy yacht hulls; the slice wave method (model A of `w2-slicewaves.md`) brings the median to 1.0 to 1.7 from Froude 0.25 to 0.40 and 0.7 to 0.85 above, with no constant. For a typical heavy keelboat that makes her about 0.4 knots slow near 5 knots and within 10% above 7 knots; heavy hulls come out slow and light hulls fast. It is provisional, and its remaining error is tracked on its own issue.

## Time step

The reference model steps at 240 steps a second (1/240 s). It is stable there and at 1/120 s on waves, but at 1/120 s the sailing speed drifts by about a knot for a reason not yet traced. How the 240 Hz step relates to the 60 Hz fixed tick of ADR 0013 is under review; determinism for replays stays a requirement.

## Considered options

- The regression per hull family with a lattice, a cross-flow strip and stall weights (ADR 0006, ADR 0007): a puzzle of separately fitted pieces that meet at hand-set seams, with a code path per family. The hull families the owner wants (a 96 m full-rigged ship, a J-class with long overhangs) sit outside every regression's family, and the pieces disagreed with each other in the experiments.
- Potential-flow panels, a GPU fluid solve and other reduced models, each argued in its own note in the archive branch's [docs/research/unified-hull/](https://github.com/nipatiitti/luovi/tree/claude/project-thread-mqnuze/docs/research/unified-hull/) and weighed by the three critiques there; the section law was the one taken into experiments.
- Michell's thin-ship sum alone for wave drag: 2.8 to 3.8 times too high on heavy hulls (`w1-wavedrag.md`). The Delft regression as the anchor (the critic's and w1's fallback) works only inside its family; the owner chose the shape-driven slice method instead, with its error recorded.

## Consequences

- `sim-hull` becomes the section law. The port of the reference model into `packages/sim-hull` in TypeScript, with its smoke checks as regression tests, is the only way that code reaches main; it starts from the archive branch and comes before any sail work.
- The ship definition carries the section stacks of hull, keel and rudder from the real lines, mass items and the precomputed wave-drag table; no regression family block, no lattice settings, no stall angles. The precompute per hull takes about a second per speed on one core, inside the owner's limit of hours at most per hull.
- The ship state carries per-section water state (attachment, shed wake, the four wave-making memory numbers) instead of the Wagner and Küssner lag pairs of ADR 0003.
- The ship data contract and the H-boat transfer into the 3D sim wait until sail physics is settled, because the sail model will shape the contract. ADR 0004, 0009 and 0003's layouts are not rewritten before then.
- Order of work: the hull model solid, ported into `sim-hull` with its smoke checks, housekeeping, then sail physics, then the ship data contract and the H-boat transfer.
- Target fleet: the H-boat, the Suomen Joutsen and a J-class yacht. The International Folkboat is a comparison boat for tests on published dimensions; a beach catamaran and a Class40 must not be ruled out by the design but are not targets.

## Open

Each has a GitHub issue under the wayfinder map.

- Wave drag by the slice method: the remaining error follows weight for length, the waterline rule was chosen after seeing three hulls, steep waves, wetted overhangs, sinkage and trim are not modelled, and only one ship form was tested.
- Keel wash on the rudder: the law removes 95% of the rudder's share of steady side load on the H-boat, where tank tests give 20 to 60%. The lead is the free surface above the keel's wake; keel and hull are probably about 10% strong, hidden by the idle rudder.
- Heeled side force: median 9% high at 10 and 20 degrees of heel, and five very wide hulls 50 to 160% high at 20 degrees.
- Wave-making memory: damping at rest 25 to 27% against 36 to 39% classical, and a disagreement with the simple reference at 5 knots for waves 1 to 1.5 boat lengths long; needs measured seakeeping data and a per-section b(ω) from a 2D boundary-element solve.
- A bow-down trim feeds a little energy into pitching (about 2.5% negative damping), a property of the ideal law, left in.
- The speed drift at 1/120 s; the free tiller swinging hard over when let go; the stand-in sails being too powerful; the Folkboat's data being estimates; the Suomen Joutsen and a J-class not yet run through the model.
- Sail and rig physics is the next session's subject; nothing about it is accepted here.
