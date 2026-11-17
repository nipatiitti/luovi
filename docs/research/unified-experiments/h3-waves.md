# H3: wave-making from the section stack

## 1. Verdict

**Killed for keelboat hulls, survived for slender hulls.** On five Delft series hulls the model is 3 to 5 times above the tank from Froude 0.25 to 0.45, and no single physically argued correction fixes it. The low-speed limit, the Wigley check and the catamaran behaviour pass.

## 2. What was run

- **Model:** Michell thin-ship integral; each section's depth integral and each station segment's phase integrated analytically. Constants: wave-angle cutoff sec θ = 14, phase step 0.25 rad.
- **Wigley hull** against the 1983 Japanese cooperative experiment (pressure-integrated, four tanks, read from an OCR table).
- **Delft hulls 1, 2 (narrow), 3 (beamy, shallow), 6 (heavy), 7 (light)** against raw bare-hull runs from 4TU (DOI 10.4121/21501402). Residuary resistance reduced by me: ITTC-57 friction at 0.7 × waterline length, Keuning's wetted-area formula, no form factor.
- **The stacks are not the real lines.** They are generated from the five published form parameters: area curve matching prismatic coefficient and centre of buoyancy, assumed waterplane coefficient 0.69, one section family, pointed ends, no overhangs.
- **Catamaran:** two Wigley demihulls, length/beam 10. Reference is weak: Insel's thesis summary only.
- **Side force:** 1500 N on an H-boat-like keel (waterline 6.3 m, draft 1.3 m, chord 0.9 m), the wake's lateral impulse as a dipole sheet.

## 3. Numbers

| Case                                                            | Model                                              | Reference                                     |
| --------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| Wigley, coefficient ×10³ at Froude 0.25 / 0.267 / 0.289 / 0.316 | 1.06 / 0.98 / 1.99 / 1.83                          | 0.88–1.15 / 0.83–0.98 / 1.22–1.37 / 1.79–2.00 |
| Wigley, ×10³ at Froude 0.05 / 0.10 / 0.12                       | 0.006 / 0.10 / 0.18, same at 41 to 161 stations    | falls smoothly to zero                        |
| Delft, model ÷ tank at Froude 0.25 / 0.30 / 0.35 / 0.40         | 2.8–3.7 / 3.7–5.0 / 3.4–4.1 / 3.2–4.0              | 1                                             |
| Delft, model ÷ tank at Froude 0.45 / 0.50 / 0.60                | 2.2–2.8 / 1.5–1.8 / 1.0–1.3                        | 1                                             |
| Delft, main hump (drag ÷ speed²)                                | Froude 0.47                                        | Froude 0.55                                   |
| Delft, stern sources halved                                     | 1.2–2.1 at 0.25–0.40, 0.6–0.7 at 0.60              | 1                                             |
| Catamaran peak, spacing 0.2 / 0.3 / 0.4 / 0.5 of length         | 1.67 / 1.57 / 1.42 / 1.30, at Froude 0.45 to 0.375 | adverse near 0.5                              |
| Catamaran, spacing 0.3, Froude 0.33                             | 0.65                                               | favourable near 0.33                          |
| One hull lifted clear                                           | one hull's drag, reached smoothly                  | by definition                                 |
| Side-force wave drag ÷ induced drag, Froude 0.35                | 26 % to 87 %                                       | 10–35 %                                       |

## 4. GIFs

- `h3_wake_and_drag_curve.gif`: hull 1 speeding up with its computed wake; model curve drawing itself above the tank points.
- `h3_three_series_hulls.gif`: narrow, beamy and heavy hull side by side, the same miss on all three.
- `h3_catamaran_interference.gif`: two wakes crossing as spacing opens, then drag falling to one hull's as the windward hull lifts.

## 5. Surprises, next test

- The miss is nearly identical on every hull: a speed-dependent factor learned on hull 1 puts the other four within 0.77 to 1.04. The model ranks hulls correctly, but that factor is a fitted curve and the Wigley hull needs none, so it is a regression per hull family after all.
- Removing the stern wave system entirely is about right at Froude 0.4 and 2.5 times too low at 0.6.
- From Froude 0.4 up, the result moves under 6 % when the assumed waterline entrance goes from 15° to 44°.
- Side-force wave drag changes threefold with how the keel's loading is assumed to reach the waterline.
- Next: real offsets with overhangs for one Delft hull, at measured sinkage and trim.

## 6. Caveats

- All five stacks come from one generator; a shared geometric error cannot be excluded without real offsets. A wide flat stern ending made it far worse.
- Sinkage and trim were not run; I infer they raise model drag, the wrong direction.
- Tank residuary resistance includes viscous pressure drag, small here.
- Catamaran and side-force comparisons have no digitised measurements behind them.
