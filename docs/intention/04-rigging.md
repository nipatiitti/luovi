# Rigging

Oct 20, 2026 · @Niilo

## Bottom line

The rig is a constraint graph solved with substepped XPBD. A running line is one constraint over its whole path through its blocks, not a chain of ropes; standing rigging is stiff pretensioned constraints; spars are rigid bodies or short Cosserat chains. Winching, belaying, bracing and mast tuning are all changes to constraint rest lengths. For a full-rigged ship this is a few hundred constraints and a few hundred spar segments, well under 1 ms per tick.

## Rope model

| Element                                                                            | Model                                                                                                                                                  | Why                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Running rigging (sheets, braces, halyards, tacks, lifts)                           | One XPBD length constraint over an ordered polyline through its fairleads and blocks: Σ segment lengths ≤ L, slack allowed, zero compressive stiffness | Tension is equal along the line, blocks redirect force, a winch or a hand is a change of L. A four-block brace is one constraint, not four ropes. This is how Sea of Thieves' GPU rope-and-pulley system works |
| Standing rigging (shrouds, stays, backstay, runners)                               | Stiff XPBD distance constraints with pretension                                                                                                        | Pretension is the tuning layer; it bends the mast and sets forestay sag                                                                                                                                        |
| Lines whose bent shape carries load (wire, a coiled line, a gaff vang under twist) | Cosserat-rod XPBD (bend and twist)                                                                                                                     | Needed only where bending shape is visible and loaded; a 2025 refinement with rotation vectors matches ADAMS accuracy at real-time cost                                                                        |
| Belayed lines, pins, cleats                                                        | Optional capstan friction at the lead point                                                                                                            | Lets a belayed line creep under load instead of holding absolutely                                                                                                                                             |

Rope is stiff, so the solver uses small-steps XPBD (many substeps, one iteration each) rather than many iterations per step; that is what keeps a yard from jittering against taut braces.

## Spars

- Yards and gaffs are rigid bodies on parrel or truss constraints to their mast; bracing rotates a yard until the opposite brace goes taut, with no animation.
- Tallship masts are rigid; yacht masts are 5–10 Cosserat segments so backstay and runner tension bend them and flatten the main.
- Bowsprits, booms and spinnaker poles are rigid bodies with their own guys and lifts as constraints.
- Spar and rig failure is a tension threshold per constraint; optional, but it comes for free.

## Coupling and rendering

The rig is solved in the ship's local frame and reports net force and moment to the hull rigid body. Sail corners attach to rig constraints, so cloth tension and rope tension share one solver. Each line segment between lead points is rendered as a catenary from its tension and slack, which gives the slack-sheet luffing cue without extra logic.

## Sources

- [The Technical Art of Sea of Thieves (GPU rope-and-pulley system)](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf)
- [Cosserat rod constraint functions for XPBD, 2025](https://lxxb.cstam.org.cn/en/article/doi/10.6052/0459-1879-25-234)
- [Compliant position-based dynamics for rope-like objects (arXiv)](https://arxiv.org/abs/2202.09714v1)
- Still to pull: Macklin et al., Small Steps in Physics Simulation (2019); Kugelstadt & Schömer, Position and Orientation Based Cosserat Rods (2016)
