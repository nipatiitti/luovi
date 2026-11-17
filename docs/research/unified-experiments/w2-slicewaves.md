# W2: wave drag from the waves each water slice is left with

## 1. Verdict

**Killed, with a useful partial pass.** No slice model puts every hull within 1.5 of the tank from Froude 0.25 to 0.5 (best: 4 of 36). But the body-exact slice removes most of Michell's over-prediction with no constant (median 1.0 to 1.7 instead of 2.8 to 3.8), and a hybrid passes 25 of 36 hulls from Froude 0.40 to 0.60. Wigley is kept; Series 60 improves.

## 2. What was run

- **Hulls, tank data:** as w1 (36 Delft hulls, Wigley, Series 60), static attitude.
- **Level (i), thin linear slice:** each slice mode k obeys H″ + gkH = ∂²F/∂t². Checked against the closed form (4 digits).
- **Level (ii), body-exact slice:** 2D boundary elements marched in time, exact section and waterline width, linear free surface. On Wigley it matches level (i), and energy left equals work done within 5 %.
- **Waterline rule ("conserve"):** water standing above calm level where the waterline sweeps is pushed outward as the section widens and spread inward as it narrows. Chosen because it conserves volume, after two simpler rules failed the energy check.
- **A:** Michell's weighting with the body-exact slice amplitude at k = k₀sec²θ. **B:** Michell plus the body-exact correction matched on sideways wavenumber. **C:** A for waves beyond the Kelvin cusp direction (35.3°), w1's R3b blocking march for the following waves. Smoothing 0.004, spreading over 3 panels and cut-off kL = 150 are numerical.
- **Cost:** about 1 s per hull and speed, one core.

## 3. Numbers (model ÷ tank, 36 Delft hulls, range (median))

| Froude  | 0.25           | 0.30           | 0.40          | 0.50           | 0.60          | pass 0.25–0.5 | pass 0.4–0.6 |
| ------- | -------------- | -------------- | ------------- | -------------- | ------------- | ------------- | ------------ |
| Michell | 0.5–10.6 (2.8) | 0.6–8.6 (3.8)  | 1.7–4.8 (3.4) | 1.2–2.2 (1.7)  | 1.1–1.6 (1.3) | 0             | 0            |
| w1 R1b  | 0.2–3.9 (1.4)  | 0.2–3.2 (1.7)  | 0.9–2.9 (2.1) | 0.7–1.2 (1.0)  | 0.6–0.9 (0.8) | 4             | 7            |
| w1 R3b  | 1.0–23 (3.7)   | 1.2–8.1 (3.4)  | 0.6–2.1 (1.0) | 0.7–1.8 (1.3)  | 1.0–1.8 (1.4) | 0             | 14           |
| A       | 0.2–2.3 (1.0)  | 0.2–3.3 (1.25) | 0.7–2.2 (1.7) | 0.5–1.0 (0.85) | 0.4–0.8 (0.7) | 0             | 0            |
| C       | 0.7–12 (2.4)   | 0.7–5.1 (1.9)  | 0.4–1.7 (0.9) | 0.5–1.4 (0.9)  | 0.5–1.0 (0.9) | 4             | 25           |

- Heavy hulls (20, length ÷ cube root of volume below 5.2), A medians: 1.2 / 1.8 / 1.8 / 0.9 / 0.7 against Michell 2.8 / 4.0 / 3.7 / 1.7 / 1.3. Lightest hull (31), A: 0.21 / 0.16 / 0.81 / 0.55 / 0.42.
- A at the tank's measured sinkage and trim, eight hulls: 0.5–2.4 at Froude 0.35–0.45; 0.6–1.7 at 0.50; 1.0–1.7 at 0.60.
- Wigley ×10³ at 0.25 / 0.289 / 0.316 (tank 0.88–1.15 / 1.22–1.37 / 1.79–2.00): Michell 1.06 / 1.99 / 1.83; A 1.16 / 1.86 / 1.82; C 1.05 / 1.48 / 1.70.
- Series 60 ÷ tank, Froude 0.22–0.35: Michell 0.85–2.29; R3b 0.62–0.97; A 0.59–1.35; C 0.61–1.05.
- Pure 2D+t (no re-weighting), median: 20 at Froude 0.25, 2.1 at 0.40, 0.66 at 0.50. B: 13 at 0.25, 0.7 at 0.50; passes none.

## 4. GIFs

- `w2_one_slice_cross_section.gif`: one slice from astern as the heavy hull passes; energy accumulating.
- `w2_hull_from_above_slice_waves.gif`: the slices' waves laid out along the wake at two speeds; the V appears, following waves do not.
- `w2_drag_curves_old_new.gif`: light yacht, heavy yacht, ship; Michell, R3b, A and C against tank points.

## 5. Surprises, next

- The answer hinges on the moving waterline. On hull 6 at Froude 0.25: uncovered water born at contact height gives 36 times the tank (twice the energy the hull put in); at calm level 0.95; conserving volume 1.12.
- The remaining miss still follows weight for length (correlation −0.8 to −0.9): heavy hulls high at Froude 0.30–0.45, light ones low.
- **Three boats (inference):** H-boat and J-class are heavy and sail at Froude 0.25–0.42, where A runs 1.2 to 1.9 high and C worse below 0.35; wetting overhangs was not modelled. Keep the Delft regression; C is usable above 0.4. For the full-rigger (below 0.3), A is 0.80–1.35 and C 0.62–1.05 on the one ship form from Froude 0.22 to 0.30: better than Michell, but a ship chart remains safer.
- Next: nonlinear slice march with real topsides; an oblique-wave slice problem instead of R3b.

## 6. Caveats

- "Conserve" was chosen after seeing three hulls under the other rules.
- Numerical settings move A by 5–14 %; energy left is 0–20 % below work done.
- Finite wave slope and breaking were not reached.
- C inherits R3b's cut-off, chosen in w1 after a failure. One ship form. Tank residuary includes viscous pressure drag.

## What is new here

- **Established:** linear 2D+t is the high-speed limit of Michell.
- **Derived, checked numerically:** Michell's amplitude function is exactly the thin slice's mode amplitude at k = k₀sec²θ; the two differ only in how modes are counted. So any better slice solution drops into Michell's sum (model A).
- **Speculative, tested:** the volume-conserving waterline rule; the cusp split in C.

## Sources

No web lookups. From memory: Michell 1898; Faltinsen & Zhao 1991; Fontaine & Tulin 2001. Data and R3b: w1.
