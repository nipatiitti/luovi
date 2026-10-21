# Baked ship data comes from `tool-bake` out of authored sources in one `data` package, is committed, and re-bakes to no diff

The simulation reads only baked ship definitions, and a baked definition is produced by one Node tool, `tool-bake`, from authored sources that are hand-typed TypeScript modules recording what a drawing, certificate or tuning guide prints, point by point with provenance. Every ship is a directory under `packages/data/src/ships/<id>/` with an `authored/` folder and a bake-written `baked.ts`; the bake discovers ships by directory, writes the ships index itself, and embeds the shared tables under `packages/data/src/shared/` by value through ordinary imports. The baked module is committed, and CI re-bakes and fails on any diff, which is what makes the bake reproducible: it runs on `core`'s deterministic math, serialises canonically, and its provenance record carries a tool version and a hash of the authored input but never a timestamp or a commit. The alternatives were baking at load (rejected because the loft and its checks then run on every client, and the physics resolution would no longer be a visible committed choice) and one package per ship (rejected because each ship then brings a package, a barrel and a dependency entry, and invites ship-level branches in code).

Decided by the bake pipeline ticket ([#10](https://github.com/nipatiitti/luovi/issues/10)) on 2026-10-22.

## Consequences

- Nothing in `tool-bake` branches on a ship id. A ship that needs a different bake behaviour gets a new authored field with a default every other ship inherits.
- The baked form is section stacks only. One function in `core` triangulates a stack, and `sim-hull` and `render-ship` both call it, so there is never a baked mesh and the physics and the picture integrate the same triangles.
- The bake carries no cache: VLM inverses, static equilibrium and rest hydrostatics stay load-time derivations ([ADR 0006](0006-rest-hydrostatics-feed-the-resistance-regression.md), [ADR 0007](0007-additive-side-force-with-basis-superposition.md)).
- A bake check compares a lofted figure with the printed one it must reproduce (displacement, length overall, maximum beam at the drawing's construction waterline) within an authored tolerance and fails the bake on a miss; computed values such as the ORC rule 109.1 rated mainsail area and the lofted wetted surface are recorded in the provenance for benchmarks to log.
- The body frame is placed by the bake at the drawing's construction waterline (x = 0 at its midpoint, z = 0 on it), with no hydrostatic solve.
- Loos gauge readings stay raw in the authored tunings and are converted to newtons by the bake against the cited gauge chart in the shared tables.
- One hash function in `core`, FNV-1a over a canonical serialisation, serves both the provenance's source hash and the definition hash a recorded state header carries.
- The authored schema is a Valibot schema in `core` beside the contract, unversioned: the bake and the authored data move together in one commit.
- The `data` package imports `core` as types only; nothing else. The lint rule's simulation file set extends to `tool-bake` so it cannot reach `Math`.
- A scenario names a ship by id alone.
