- No redundant comments: Avoid unnecessary comments that do not add value to the code. Comments should explain why something is done, not what is done, as the code itself should be self-explanatory.

- Not a single — or • anywhere in the UI: This is just lazy and can be replaced with better UI design or sentence structure.

- No unnecessary tests: Trust your code, tests should be e2e, not unit level. And absolutely no 1+1=2, except for the most core math functions and units, if they are custom rolled.

- Well typed TS: any is banned, unkwnown only if it comes from external sources and no extra type assertions. Use type guards and type narrowing instead of type assertions.

- Follow DRY, KISS and SOLID principles: Avoid code duplication, keep it simple, and adhere to SOLID principles for maintainable and scalable code.

- Use async/await: Always use async/await for asynchronous code instead of callbacks or .then()/.catch() chains for better readability and error handling.

- Write modern JavaScript/TypeScript: Use ES6+ features and syntax, such as arrow functions, template literals, destructuring, and modules. Avoid outdated patterns and practices.

- Use functional programming where appropriate: Prefer pure functions, immutability, and higher-order functions to improve code readability and maintainability.

- No unnecessary markdown: Do not add README, CHANGELOG, CONTRIBUTING, per-package docs, plan or notes `.md` files unless explicitly asked. They bloat the repo and go stale. The design doc lives in `docs/intention` and is exported from its source, not written by hand.

## Project rules (luovi)

- Simulation packages (`sim-*`, `core`) are pure: no DOM, no WebGPU, no timers, no `Date.now`, no `Math.random`. They run in Node for validation and on the server. Randomness comes from the seeded RNG in `core`; time is the integer tick.

- Determinism is a contract: anything that feeds simulation state uses `core`'s deterministic math, never `Math.sin`/`cos`/`exp`/`pow` directly. GPU results never enter authoritative state. If you cannot make a step deterministic, it belongs in a `render-*` package.

- Dependency direction is one way: data → core → sim-ocean/hull/rig → sim-world → render-_ → tool-_/game-\*. A package never imports from a layer below... [sic: above] it in this list. Games and renderers import `sim-world` only, never a model package.

- Ship data is one `data` package, a directory per ship under `src/ships/<id>/` with `authored/` sources and a bake-written `baked.ts`, shared tables under `src/shared/`. Only `tool-bake` writes a baked file, CI re-bakes and fails on a diff, and nothing in the bake branches on a ship id: a ship that needs different bake behaviour gets a new authored field with a default. See `docs/adr/0009`.

- No special cases for sailing states. There is no "aback", "in irons", "luffing", "broaching" or "sternway" flag anywhere. If a behaviour needs a branch to appear, the force model is wrong; fix the model.

- No magic coefficients. Every empirical constant (polar, regression coefficient, damping, cloth property) lives in the `data` package with a source citation in the data file, not in code. Code receives coefficients through the ship definition.

- Units and frames: SI everywhere, angles in radians, wind and water velocities as vectors (never speed + direction) outside the UI layer. World frame is right-handed, z up, x east, y north; body frame is x forward, y port, z up; heel is positive to starboard, leeway positive when drifting to leeward. Convert at the boundary, never inside a model.

- The five contracts (ship definition, ship state, ship controls, environment query, scenario) are versioned schemas. A breaking change bumps the version and ships a migration for existing scenarios and ship definitions.

- Tests are scenarios. A behaviour claim is proven by a scenario in `tool-validate` with a numeric target (polar within 5%, sternway 1–2 kn, drift speed, broach sequence), run headless. No tests of internals; the exceptions are `core` math and unit conversions.

- Physics before pixels. A change to `render-*` is never a reason to touch `sim-*`. If a visual needs state the simulation does not expose, extend the ship state contract rather than reading internals.

- Performance budgets are requirements: 60 Hz fixed tick, hero boat under 1 ms CPU, full-rigged ship rig and sails under 2 ms, renderer under 5 ms GPU at 1440p on an RTX 4060 class card. Profile before optimising, and never trade determinism for speed in `sim-*`.

- The design doc is the source of truth for intent; code is the source of truth for behaviour. When they disagree, open the question rather than silently changing either. Once the question is decided, the source doc is corrected and re-exported naming the ADR that decided it; only schedule deviations are recorded on the wayfinder map.

- All and every user facing questions should be asked with available "ask user a question" tools or some other relvant tool.

## Grilling rounds

A grilling session (`/grilling`, a wayfinder ticket, any design decision put to Niilo) runs in rounds. Niilo's input is the scarce resource: spend it on decisions, and on nothing a lookup could settle.

1. Settle every fact first. A question that waits on the filesystem, a paper or a web page goes to a subagent; only decisions reach Niilo.
2. Ask the whole frontier in one round as numbered questions in the chat, each with a recommended answer, worded so "yes" takes the recommendation. Nothing is left silently assumed: a decision that goes unasked is a decision the agent made.
3. Collect the answers with one "ask user a question" call: the first question asks whether the recommendations stand, with "Yes to all" first and "Yes with exceptions, named by number" second. Add a separate question in the same call only for a genuine fork, the one or two decisions whose answer reshapes the work, with the recommended option first.
4. An exception is the answer to that question. A second round happens only when an exception reshapes the frontier; otherwise record and act.

## Agentic workflow

- Work is cut into small slices. A slice brief says "this file needs something like this", never code. The agent that takes a slice has implementation authority within it.

- An agent ends its slice with context under 200k tokens. If a slice will not fit, split it before starting.

- An agent never writes tests for code it wrote itself.

- An agent never verifies code it wrote itself. It runs `pnpm check` to see that the tree compiles and lints, nothing more.

- `pnpm validate` is the quick benchmark tier and is run once per batch by the sweeper, never by a slice agent. `pnpm validate --full` is run by the coordinator's final sweep or by CI on main.

- One agent writes one slice.

- After a few slices land, a separate sweeper reads the diffs and reports problems. A separate fixer fixes them. At most two sweep-and-fix rounds per batch.

- The coordinator spends no context on sweeping or fixing; it delegates both and reads only the reports.

- The coordinator ends with one final sweep of all changes against the plan and leaves the tree ready for hand-off to a fresh designer and coordinator pair.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on nipatiitti/luovi, driven with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels, unchanged: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the root and ADRs under `docs/adr/`. Both are created lazily by `/domain-modeling`, so their absence is normal. See `docs/agents/domain.md`.
