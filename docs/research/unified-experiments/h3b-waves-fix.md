# H3b: is the miss the theory or the hull shapes?

## 1. Verdict

**Killed, as far as I could run it.** With the real Delft lines the thin-ship sum misses by the same factor of 3 to 4, so the generated hulls are cleared and the theory is at fault. Two cheap geometry-only improvements make it worse. My own bake-time panel solve failed its Wigley check, so that branch is untested, not disproved.

## 2. What was run

- **Real geometry:** Delft CAD surfaces (4TU, DOI 10.4121/21501330), read with a small IGES reader and cut into 81 sections. They reproduce the published hydrostatics (DOI 10.4121/21501375): waterline length +0.5 %, volume within 1.2 %, wetted area within 1 %. Tank data and reduction as in H3, now with published wetted area and volume.
- **Thin ship (Michell)** at even keel, and at each run's measured sinkage and trim.
- **Hogner:** the same sources placed on the real hull skin.
- **Noblesse's zeroth-order slender-ship sum:** Hogner plus the waterline integral, with the sign derived by me. This is the starting point of the Neumann-Michell theory, not the full theory.
- **Panel solve:** linear free surface, exact hull condition, raised Rankine sources, 1,500 to 3,700 unknowns.
- No physical constants in any of them.

## 3. Numbers (model ÷ tank, range over hulls 1, 2, 3, 6, 7)

| Froude                               | 0.25    | 0.30    | 0.35    | 0.40    | 0.45    | 0.50    | 0.60    |
| ------------------------------------ | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
| Thin ship, real lines                | 2.2–3.1 | 3.2–4.2 | 3.4–4.2 | 3.4–4.2 | 2.3–2.8 | 1.6–1.9 | 1.1–1.4 |
| Thin ship, generated lines (H3)      | 2.8–3.7 | 3.7–5.0 | 3.4–4.1 | 3.2–4.0 | 2.2–2.8 | 1.5–1.8 | 1.0–1.3 |
| Thin ship, measured sinkage and trim | 2.2–3.2 | 3.6–4.8 | 3.5–4.2 | 3.9–4.8 | 3.0–4.0 | 2.3–3.1 | 1.7–2.5 |
| Hogner                               | 3.7–4.8 | 4.3–5.5 | 3.7–4.8 | 3.4–4.1 | 2.2–2.5 | 1.4–1.6 | 0.8–1.0 |
| Noblesse zeroth order                | 10–17   | 7–13    | 7–11    | 3.6–5.5 | 1.6–2.7 | 0.9–1.4 | 0.3–0.9 |

- Cost: 0.1 to 0.3 s per speed point (numpy, one core) for the three sums.
- Panel solve: 2 to 5 s per point, but on the Wigley hull at Froude 0.316 it gave 0.62, 1.28, then 6.9 (×10⁻³) on three finer grids against 1.8 to 2.0 measured. Not converged, no result claimed.
- One fitted speed curve for the family (3.9 at Froude 0.3 to 0.4, 1.25 at 0.6), tested leave-one-out: 0.76 to 1.16.

## 4. GIFs

- `h3b_generated_vs_real_lines.gif`: hull 1 from generated and from real lines, wakes and drag curves running together above the tank points.
- `h3b_three_sums_five_hulls.gif`: model ÷ tank for the three sums on five hulls against a ±1.5 band, with the real body plan and wake.

## 5. Surprises, fallback, next

- The real lines changed almost nothing; five form numbers were enough to reproduce the thin-ship answer.
- Sinkage and trim make it worse, and an immersed transom at high speed breaks the closed-hull assumption.
- **Honest fallback:** keep the section-stack sum for what it gets right (hull ranking, catamaran interference, a hull lifting out, the low-speed limit) and multiply by one fitted speed curve per hull family: the curve above for keelboat canoe bodies, 1 for slender hulls. Equivalent: use the Delft regression for keelboats. Either way the claim "no regression per hull family" is lost for wave drag; it becomes one curve per family, not per hull.
- **Bake-time solve (inference, not measured):** a MARIN abstract reports linear Dawson results on a yacht clearly poorer than the nonlinear RAPID method with dynamic trim, so the bake would need a nonlinear solver, a research-grade tool. Sizing it at 12 speeds × 4 heels × 3 leeways × 3 sinkages × 3 trims ≈ 1,300 points at 10 to 30 s each gives 4 to 11 hours per hull before side force is added, at the edge of the budget.
- Next: validate one trusted linear panel code on hull 1 before building anything.

## 6. Caveats

- I did not run the full Neumann-Michell theory; its first step going the wrong way is discouraging but not proof.
- My waterline-term sign is my own derivation; on the Wigley hull it lowers drag by 20 %, which is plausible.
- The trim sign (negative = bow up) is inferred from the data.
