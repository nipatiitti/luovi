# Deterministic transcendentals in TypeScript, not Wasm

The authoritative simulation must produce identical state on every JavaScript engine and on the server. IEEE f64 add, subtract, multiply, divide and sqrt are already bit-identical across engines; only transcendentals (sin, cos, exp, pow, atan2 and friends) differ. `core` ships its own deterministic f64 implementations of those, every `sim-*` package uses them, and a lint rule bans the corresponding `Math.*` calls in `core` and `sim-*`. Compiling the hot core to Wasm from one source was the alternative; it is deferred until profiling demands it, because it adds a toolchain and a language boundary to solve a problem a few hundred lines of math already solve.

## Consequences

- A cross-engine determinism benchmark (same scenario and seed, identical state hash on Node and in the browser) is part of tool-validate.
- Any new transcendental a model needs is added to `core`, never pulled from `Math`.
- The `**` operator is specified like `Math.pow` and is engine-dependent, so the lint rule bans it alongside `Math.hypot`. `Math.sqrt`, `Math.fround` and `%` are exactly rounded by the specification and stay.
- Polynomial coefficients inside the ported transcendentals are algorithm constants and live in `core`; the "no magic coefficients" rule is about physical data, not libm internals.
