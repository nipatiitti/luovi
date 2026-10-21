# Deterministic transcendentals in TypeScript, not Wasm

The authoritative simulation must produce identical state on every JavaScript engine and on the server. IEEE f64 add, subtract, multiply, divide and sqrt are already bit-identical across engines; only transcendentals (sin, cos, exp, pow, atan2 and friends) differ. `core` ships its own deterministic f64 implementations of those, every `sim-*` package uses them, and a lint rule bans the corresponding `Math.*` calls in `core` and `sim-*`. Compiling the hot core to Wasm from one source was the alternative; it is deferred until profiling demands it, because it adds a toolchain and a language boundary to solve a problem a few hundred lines of math already solve.

## Consequences

- A cross-engine determinism benchmark (same scenario and seed, identical state hash on Node and in the browser) is part of tool-validate.
- Any new transcendental a model needs is added to `core`, never pulled from `Math`.
- The `**` operator is specified like `Math.pow` and is engine-dependent, so the lint rule bans it alongside `Math.hypot`. `Math.sqrt`, `Math.fround` and `%` are exactly rounded by the specification and stay.
- Polynomial coefficients inside the ported transcendentals are algorithm constants and live in `core`; the "no magic coefficients" rule is about physical data, not libm internals.

## Amendment, 2026-10-21

Decided by the Deterministic math in core ticket ([#7](https://github.com/nipatiitti/luovi/issues/7)), after the transcendentals research ([#3](https://github.com/nipatiitti/luovi/issues/3)).

- The lineage is FDLIBM 5.3 from netlib, transliterated into `core` the way Java defines `StrictMath`. The correctness criterion is bit-exactness against a C build of the same sources compiled without FMA contraction; the sub-1-ulp accuracy bound is cited from FDLIBM's analysis, not re-measured. Committed golden vectors from that build are the oracle, so CI needs no C toolchain.
- The module is a seed set grown on demand: sin, cos, sincos, tan, asin, acos, atan, atan2, exp, expm1, log, log1p, log10, pow, powInt, sinh, cosh, tanh, two-argument hypot, cbrt, remainder and rem_pio2, with scalbn as a helper. Integer exponents use powInt, which is checked against exact arithmetic; pow is for non-integer exponents; a formula never mixes the two.
- The seeded RNG is part of deterministic math: xoshiro128** on 32-bit state, seeded through splitmix32 from the scenario's unsigned 32-bit seed, with named forks so one consumer's draws never shift another's. Gaussian draws use Box-Muller through the deterministic log and sincos.
- The cross-engine benchmark is a live comparison with no committed expected value: one scenario, a fixed tick count, the state buffer hashed with FNV-1a over 32-bit words after NaN canonicalisation, in Node and in Chromium, WebKit and Firefox. It passes when every engine agrees. Golden vectors are checked in every engine too.
- Why not correctly rounded: CORE-MATH and LLVM libc need FMA and 128-bit integers that JavaScript lacks, at several times the port and runtime cost, and the simulation gains nothing from the last 0.3 ulp. Revisit only if a spec ever requires correctly rounded `Math`.
