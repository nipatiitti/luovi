# Performance has no millisecond budget: the game is playable on a normal machine at whatever frame rate it reaches

Every millisecond budget is dropped, on the CPU and the GPU alike: the hero boat's 1 ms, the full-rigged ship rig and sails' 2 ms, the renderer's 5 ms at 1440p on an RTX 4060 class card, and the ocean's 2.0 ms split of that 5 ms with its per-pass figures. The requirement is that the game is playable on a normal GPU and CPU, at whatever frame rate they reach. Cost is profiled, and a task that costs too much for what it brings is addressed case by case. Two things stay: the 60 Hz fixed tick, which is the determinism clock rather than a budget, and the rule that `sim-*` never trades determinism for speed.

The budgets were set before any of the code they governed existed, against a card nobody on the project measures on: step 1's only GPU timings come from an M1 Pro under headless Chrome, whose timestamps were contention rather than measurements and once gave negative pass durations, so no gate could be read against the RTX 4060 figure. A budget that cannot be measured steers design by guesswork, and the per-pass split turned every pass into a quota to defend.

Decided by the owner on 2026-10-24 in the build step 1 retrospective ([#26](https://github.com/nipatiitti/luovi/issues/26)).

## Considered options

- Keeping the budgets and measuring them on the target card: needs that card in the loop for every change, and still fixes figures ahead of knowing what each task is worth.
- Keeping one frame-time target and dropping the per-system split: the same unmeasurable number at a coarser grain.

## Consequences

- Superseded: ADR 0001's "under a 5 ms GPU budget at 1440p on an RTX 4060 class card"; ADR 0007's comparison against the hero boat's 1 ms; ADR 0008's 2 ms rig budget and the step 6 choice framed against it; and the render-ocean v1 resolution's ocean 2.0 ms split (FFT with post and mips 0.6, surface 1.0, foam 0.2, margin 0.2, ships and scene 3 ms, sky and tone mapping 0.3) on [#23](https://github.com/nipatiitti/luovi/issues/23). ADR 0011 already measures nothing on the GPU and is unchanged. Each amended ADR carries a note pointing here.
- A benchmark that logs a cost keeps logging it; no benchmark gate fails on milliseconds.
- GPU timestamp queries stay in `tool-scenario` as a profiling aid.
- The design doc's budget passages are corrections for the design doc corrections work.
