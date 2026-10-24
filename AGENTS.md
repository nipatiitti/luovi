- Not a single — or • anywhere in the UI: This is just lazy and can be replaced with better UI design or sentence structure.

- Code style and design judgement calls the reviewer enforces (comments say why, simplicity over cleverness, functional first, narrowing over assertions, no sailing-state special cases, no magic coefficients, units and frames, physics before pixels): `CODING_STANDARDS.md`. Mechanical rules (banned `Math` members, `any`, assertions, promise chains, timers and DOM in simulation packages, package layering) are enforced by `eslint.config.js` and `.dependency-cruiser.cjs`; read them before adding a dependency or a `Math` call.

- No unnecessary markdown: Do not add README, CHANGELOG, CONTRIBUTING, per-package docs, plan or notes `.md` files unless explicitly asked. They bloat the repo and go stale. The design doc lives in `docs/intention` and is exported from its source, not written by hand.

## Project rules (luovi)

- Simulation packages (`core`, `data`, `sim-*`) run in Node for validation and on the server. Randomness comes from the seeded RNG in `core`; time is the integer tick.

- Determinism is a contract: the same scenario and seed produce the same state buffer on every engine, so simulation math comes from `core`. GPU results never enter authoritative state. If a step cannot be made deterministic, it belongs in a `render-*` package.

- Ship data is one `data` package, a directory per ship under `src/ships/<id>/` with `authored/` sources and a bake-written `baked.ts`, shared tables under `src/shared/`. Only `tool-bake` writes a baked file, CI re-bakes and fails on a diff, and nothing in the bake branches on a ship id: a ship that needs different bake behaviour gets a new authored field with a default. See `docs/adr/0009`.

- The five contracts (ship definition, ship state, ship controls, environment query, scenario) are versioned schemas. A breaking change bumps the version and ships a migration for existing scenarios and ship definitions.

- Tests are scenarios. A behaviour claim is proven by a scenario in `tool-validate` with a numeric target (polar within 5%, sternway 1–2 kn, drift speed, broach sequence), run headless. The only unit-level tests are `core` math against golden vectors and unit conversions.

- Performance has no millisecond budget: the game is playable on a normal GPU and CPU, at whatever frame rate they reach. Profile it, and address a task that costs too much for what it brings case by case (`docs/adr/0013`). The 60 Hz fixed tick is the determinism clock, not a budget, and determinism is never traded for speed in `sim-*`.

- The design doc is the source of truth for intent; code is the source of truth for behaviour. When they disagree, open the question rather than silently changing either. Once the question is decided, the source doc is corrected and re-exported naming the ADR that decided it; only schedule deviations are recorded on the wayfinder map.

- Every user-facing question is asked with the "ask user a question" tool or another relevant tool.

- Agents drive browsers headless only (`pnpm shots`, headless Playwright), so nothing opens on Niilo's screen; this binds every subagent brief too. A frame rate that only a headed browser measures truly is approximated from headless GPU timings and labelled approximate.

## Grilling rounds

A grilling session (`/grilling`, a wayfinder ticket, any design decision put to Niilo) runs in rounds. Niilo's input is the scarce resource: spend it on decisions, and on nothing a lookup could settle.

1. Settle every fact first. A question that waits on the filesystem, a paper or a web page goes to a subagent; only decisions reach Niilo.
2. Ask the whole frontier in one round as numbered questions in the chat, each with a recommended answer, worded so "yes" takes the recommendation. Nothing is left silently assumed: a decision that goes unasked is a decision the agent made. State every option's trade-off as quality and frame rate: what the eye sees (screenshots side by side when the choice is visual) and the fps it costs, measured on this machine. Raw figures (µs, correlations, ratios) back those up and never stand alone.
3. Collect the answers with one "ask user a question" call: the first question asks whether the recommendations stand, with "Yes to all" first and "Yes with exceptions, named by number" second. Add a separate question in the same call only for a genuine fork, the one or two decisions whose answer reshapes the work, with the recommended option first.
4. An exception is the answer to that question. A second round happens only when an exception reshapes the frontier; otherwise record and act.
5. A question that reopens a closed decision ticket gets a round of its own, after research. It is never a seat in a close-out round.

## Agentic workflow

Coordinating a multi-slice build, or taking one of its slices as implementer, sweeper or fixer: read `docs/agents/workflow.md` first.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on nipatiitti/luovi, driven with the `gh` CLI. The build plan and every design decision live on the wayfinder map and its closed tickets; how to read them, and how to publish a batch of tickets, is in `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels, unchanged: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the root and ADRs under `docs/adr/`. Both are created lazily by `/domain-modeling`, so their absence is normal. See `docs/agents/domain.md`.
