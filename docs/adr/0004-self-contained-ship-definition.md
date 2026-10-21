# Ship definitions are self-contained; derived data stays outside the contract

A ship definition carries by value everything the simulation reads: regression coefficient tables, sail polars, cloth constants, added mass and damping, each cited or flagged as an estimate. Sharing across ships (one Bermudan main polar for every yacht) happens in the data layer with TypeScript imports at bake time, so `sim-world` receives one validated object and resolves no ids against a registry. In the other direction, nothing derived is contract content: the baked section stacks are the only geometry, and the VLM lattice and influence inverses are computed from them (at load or by a bake cache) from settings the definition carries, never shipped inside it. The alternative of referencing shared data by id was rejected because it puts a resolver and a second schema between the contract and the simulation, and embedding inverses was rejected because they are megabytes per heel bin and a hash of the geometry already determines them.

## Consequences

- Adding a shared polar or coefficient set is a change in `data-*`, never in `core` or `sim-*`.
- Two definitions may carry identical tables; that duplication is in committed data, not in code, and is what keeps the loader trivial.
- If a derived artefact ever needs to ship with a definition, that is a version bump of the contract, not a side channel.

## Amendment, 2026-10-22

Decided by the bake pipeline ticket ([#10](https://github.com/nipatiitti/luovi/issues/10)), recorded in [ADR 0009](0009-baked-ship-data-from-tool-bake-in-one-data-package.md). All ships live in one `data` package that exports a static record of definitions keyed by id. That record is a TypeScript import, not the registry this decision rejected: there is no resolver, no second schema, and `sim-world` still receives one validated object. The "bake time" at which shared tables are imported is the run of `tool-bake`.
