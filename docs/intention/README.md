# Design plan

Exported 2026-10-20 from the Claude doc "ship sim: the plan" (https://claude.ai/code/artifact/4f057fc1-6e93-406a-a2d1-c0e719d3eaa9). The doc is the source of truth for intent; these files are a snapshot so the plan lives next to the code. Re-export when the doc changes. The three diagrams the markdown export dropped were redrawn as Mermaid from the original widget source.

| File                                                         | Holds                                                                                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| [00-overview.md](00-overview.md)                             | What the engine is, design principles, v1 build order, what is deferred and cut                                                     |
| [01-ocean.md](01-ocean.md)                                   | The unified 2D field, FFT background, dispersive patch, wind, physics coupling, deck water, browser constraints                     |
| [02-hull.md](02-hull.md)                                     | Force modules, resistance by regression family, VLM and cross-flow side force, rigid body, wake, emergent cases, validation targets |
| [03-aero.md](03-aero.md)                                     | Cloth sails with per-triangle polars, rig classes, sail interaction, benchmarks                                                     |
| [04-rigging.md](04-rigging.md)                               | Running lines as single constraints, standing rigging, spars, XPBD solver                                                           |
| [05-separation-of-concerns.md](05-separation-of-concerns.md) | CPU/GPU seam, the five contracts, determinism, package map, repository rules                                                        |
