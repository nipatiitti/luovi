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

- No special cases for sailing states. There is no "aback", "in irons", "luffing", "broaching" or "sternway" flag anywhere. If a behaviour needs a branch to appear, the force model is wrong; fix the model.

- No magic coefficients. Every empirical constant (polar, regression coefficient, damping, cloth property) lives in `data-*` with a source citation in the data file, not in code. Code receives coefficients through the ship definition.

- Units and frames: SI everywhere, angles in radians, wind and water velocities as vectors (never speed + direction) outside the UI layer. World frame is right-handed, z up, x east, y north; body frame is x forward, y port, z up; heel is positive to starboard, leeway positive when drifting to leeward. Convert at the boundary, never inside a model.

- The five contracts (ship definition, ship state, ship controls, environment query, scenario) are versioned schemas. A breaking change bumps the version and ships a migration for existing scenarios and ship definitions.

- Tests are scenarios. A behaviour claim is proven by a scenario in `tool-validate` with a numeric target (polar within 5%, sternway 1–2 kn, drift speed, broach sequence), run headless. No tests of internals; the exceptions are `core` math and unit conversions.

- Physics before pixels. A change to `render-*` is never a reason to touch `sim-*`. If a visual needs state the simulation does not expose, extend the ship state contract rather than reading internals.

- Performance budgets are requirements: 60 Hz fixed tick, hero boat under 1 ms CPU, full-rigged ship rig and sails under 2 ms, renderer under 5 ms GPU at 1440p on an RTX 4060 class card. Profile before optimising, and never trade determinism for speed in `sim-*`.

- The design doc is the source of truth for intent; code is the source of truth for behaviour. When they disagree, open the question rather than silently changing either.
