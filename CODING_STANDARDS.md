# Coding standards

Read during review, not implementation. Lint and the dependency cruiser cover the mechanical rules (banned `Math` members, `any`, type assertions, promise chains, timers and DOM in simulation packages, package layering); these are the judgement calls a reviewer checks on a diff. Project rules that shape the architecture stay in `AGENTS.md`.

## Comments say why

A comment explains a reason the code cannot: a cited equation, a convention chosen over another, a gotcha. A comment that restates the next line is removed. A citation beside a constant in `data` is the one comment every value carries.

## Simplicity over cleverness

One meaning lives in one place. A function does one thing and is named for it. An abstraction earns its place by removing duplication that already exists, never duplication that might. Prefer the plain loop to the clever reduce when the loop reads better.

## Functional first

Pure functions over methods with hidden state, immutable inputs over mutation, higher-order functions where they shorten the code. The exception is the hot path: a per-tick loop that writes into a caller-owned array is the project's own pattern (see the environment query) and is correct where allocation would show in the budget.

## Modern TypeScript, narrowed not asserted

ES modules, arrow functions, destructuring, template literals. `unknown` only at an external boundary (a parsed file, a message, a network reply), narrowed by a type guard or a schema parse before use. A type assertion is a review finding; the fix is a guard or a schema.

## Tests are scenarios

A behaviour claim is proven by a benchmark in `tool-validate` with a numeric gate. A unit test of a function's intermediate value is a finding, except for `core` math against golden vectors and unit conversions. A benchmark reads `sim-world`'s public surface only: the state buffer, the derived buffer, the load report, the sea description.

## No special cases for sailing states

There is no "aback", "in irons", "luffing", "broaching" or "sternway" flag anywhere. A branch that makes a sailing behaviour appear is a finding against the force model, not a fix to keep; the model is corrected so the behaviour emerges.

## No magic coefficients

Every empirical constant (a polar, a regression coefficient, a damping, a cloth property, a spectrum constant, an optical constant) lives in the `data` package with a source citation beside it, or is flagged there as an estimate. Code receives values through the ship definition, the scenario or an imported table and never holds one. Polynomial constants inside the ported transcendentals in `core` are algorithm constants, not data, and are exempt.

## Units and frames

SI everywhere, angles in radians, wind and water velocities as vectors (never speed and direction) outside the UI layer. World frame is right-handed, z up, x east, y north; body frame is x forward, y port, z up; heel is positive to starboard, leeway positive when drifting to leeward. Knots, degrees and compass headings are converted at the boundary (a panel, a benchmark module, a certificate table), never inside a model.

## Physics before pixels

A change to a `render-*` package is never a reason to touch a `sim-*` package. A visual that needs state the simulation does not expose extends the ship state or derived buffer contract rather than reading internals, and a renderer never recomputes a quantity the simulation owns (a wavenumber, a frequency, a phase convention).
