# W1: can the geometry-only wave sum be repaired for all three boats?

## 1. Verdict

**Killed.** No repair, with one global setting, puts every hull within 1.5 of the tank from Froude 0.25 to 0.5. The best passes 4 of 36 yacht hulls. The most physical one fixes the ship form and keeps the Wigley hull, but leaves heavy yacht hulls 2 to 4 times high below Froude 0.35.

## 2. What was run

- **Hulls:** Wigley (reference as H3); 36 Delft hulls from the real CAD lines against 4TU bare-hull runs; Series 60, block 0.60, offsets and tank table from Kim & Jenkins 1981 (rebuilt block 0.597; residuary = total minus friction line).
- **Before:** Michell sum, H3 code unchanged.
- **R1a:** bow-stern interference × exp(−0.0095/Fn⁵), Gotman's turbulent-viscosity factor, her mid value as one number.
- **R1b:** afterbody sources × 0.6, Havelock-type boundary-layer factor; value assumed, original not retrieved.
- **R2:** hull re-cut under its own thin-ship wave, one pass, so overhangs wet. No constant.
- **R3:** the skin further aft must block the orbital flow of waves made further forward; blocking sources found in one bow-to-stern sweep. No constant. **R3b:** same, counting only sources more than U²/g ahead. Added after R3 broke Wigley; one value.

## 3. Numbers (model ÷ tank)

| 36 Delft hulls, range (median) | 0.25           | 0.30          | 0.40          | 0.50          | pass |
| ------------------------------ | -------------- | ------------- | ------------- | ------------- | ---- |
| Before                         | 0.5–10.6 (2.8) | 0.6–8.6 (3.8) | 1.7–4.8 (3.4) | 1.2–2.2 (1.7) | 0    |
| R1a                            | 0.5–11.9 (3.6) | 1.1–9.8 (5.0) | 1.4–4.2 (3.0) | 1.1–2.0 (1.6) | 0    |
| R1b                            | 0.2–3.9 (1.4)  | 0.2–3.2 (1.7) | 0.9–2.9 (2.1) | 0.7–1.2 (1.0) | 4    |
| R2, six hulls                  | 2.9–28         | 4.0–26        | 2.5–6.5       | 1.8–3.1       | 0    |
| R3                             | 0.3–9.8 (2.1)  | 0.3–5.3 (1.8) | 0.3–1.7 (0.8) | 0.3–0.9 (0.6) | 0    |
| R3b                            | 1.0–23 (3.7)   | 1.2–8.1 (3.4) | 0.6–2.1 (1.0) | 0.7–1.8 (1.3) | 0    |

|                                                                                   | Before                    | R1b                       | R3                        | R3b                       |
| --------------------------------------------------------------------------------- | ------------------------- | ------------------------- | ------------------------- | ------------------------- |
| Wigley ×10³, Froude 0.25 / 0.289 / 0.316 (tank 0.88–1.15 / 1.22–1.37 / 1.79–2.00) | 1.06 / 1.99 / 1.83        | 0.73 / 1.31 / 1.25        | 0.59 / 0.57 / 0.67        | 0.95 / 1.41 / 1.61        |
| Series 60 ÷ tank, 0.25 / 0.28 / 0.30 / 0.35                                       | 1.20 / 2.29 / 1.61 / 1.20 | 0.52 / 1.29 / 0.94 / 0.79 | 0.26 / 0.52 / 0.58 / 0.54 | 0.74 / 0.90 / 0.97 / 0.82 |

Before, Froude 0.30–0.40: most slender hull (39) 2.3–2.4; narrow deep (27) 3.1–4.0; beamiest (22) 2.9–5.5; shallowest (38) 1.5–1.9. The miss correlates with length ÷ cube root of volume (−0.71) more than with length ÷ beam (−0.44).

## 4. GIFs

- `w1_plain_sum_three_hulls.gif`: light yacht hull, heavy yacht hull and ship with predicted waves; drag curves drawing against tank points.
- `w1_repairs_before_after.gif`: four hulls side by side, before, R1b and R3b against the 1.5 band.
- `w1_all_hulls_heavy_to_light.gif`: 36 hulls as dots, heavy to light, as speed rises; before and after.

## 5. Surprises, fallback, next

- Beam is not the culprit. The lightest, shallowest hulls are nearly right unrepaired; heavy hulls are worst whatever their beam. By my rough estimate an H-boat and a J-class sit in the worst zone.
- Blocking is real and large on yachts (0.2 of the plain sum at Froude 0.4, insensitive to the cut-off) and removes the ship's false hump, but overshoots shallow hulls at low speed. Done properly it is a free-surface panel solve.
- **Least bad fallback:** Delft regression for H-boat and J-class; Holtrop or Series 60 charts for the full-rigger, which stays below Froude 0.3. Keep the section-stack sum for differences only (heel, a hull lifting, catamaran spacing), scaled to the regression upright. The bake-time alternative is a nonlinear panel solver, 4 to 11 hours per hull by H3b's sizing, unvalidated.
- Next: R3b with the local flow included, on a second ship form.

## 6. Caveats

- R3b's cut-off was chosen after seeing R3 fail.
- Tank residuary includes viscous pressure drag, a larger share on light hulls and the ship (its wave-pattern drag is 0.3–0.7 of residuary).
- One ship form, to Froude 0.35; two Series 60 tanks differ by 10–18 %.
- Literature thinner than asked: 27 lookups, many scans unreadable. Havelock, Wigley, Milgram, Maruo, Faltinsen, Doctors not obtained.

## Derivation check

- The H3 form (prefactor 4ρg²/πU², weight sec³θ, depth factor exp(k₀z sec²θ), phase k₀x secθ, half-breadth slope on the centreplane) matches Gotman's equations 1–5 term by term, Tuck's description, and my own far-field energy derivation.
- **Our error:** `wave_field` has the wave height sign inverted (a source makes a crest). H3 and H3b pictures show crests as troughs; drag is unaffected.
- H3b's waterline-term sign could not be confirmed. Both signs run: 11–17 and 14–22 times high on hull 1 at Froude 0.25–0.35, so "worse" stands.
- Gotman's viscous factor is not dimensionless as printed.
- The single-integral wave part of a source is not a wave within U²/g of it; R3 double-counts local flow there.
- Tuck: Michell errs 50–100 % at Froude 0.2–0.35 and its beam-squared scaling fails experimentally.

## Sources

In part: Gotman 2020 (J. Mar. Sci. Eng. 8:400); Tuck 1989 (J. Austral. Math. Soc. B 30); Kim & Jenkins 1981 (DTIC ADA105972); Karafiath 1977 (ADA051322); Weymouth 2026 (arXiv 2603.14945); Wilson et al. 2011 (ADA556776). Abstract only: SJTU Neumann-Michell comparison. Not obtained: Noblesse 1983.
