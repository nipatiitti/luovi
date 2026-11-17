# r1-rudder: the rudder, from tank data and experiment

## 1. Verdict

**Partly fixed.** The rudder now stalls and brakes like tank foils, and "tiller let go" is a free blade. Four marks fail: at 5 knots 60° no longer out-turns 45°; at 1 knot 60° still out-turns 30°; the Folkboat tracks no better; keel wash is unchanged and too strong.

## 2. What was run

Sailing-test model, upright, flat water. "Before" is that model exactly (`C.R1 = false`). Nothing was tuned to a pass mark.

Constants: plate force 1.2 with Hoerner's angle law sin/(0.56 + 0.44 sin) (memory; as on the sail side); tiller inertia 1.5 kg m² (assumed).

## 3. Numbers (H-boat unless stated; before → after)

|                                                                 | Before               | After                          | Reference                                                        |
| --------------------------------------------------------------- | -------------------- | ------------------------------ | ---------------------------------------------------------------- |
| Boat held straight, 5 kn: peak rudder lift number               | 2.04 at 30°          | 0.94 at 17°                    | 1.25 to 1.33 big foils; 0.57 to 0.76 at 14 to 19° yacht models   |
| Same, normal force at 60°                                       | 2.37                 | 0.87                           | plate law 1.10                                                   |
| Free fins, aspect 3 / 2 / 1: peak lift                          | 1.02 / 1.03 / 1.00   | 1.13 / 1.17 / 1.03             | 1.25 / 1.33 / 1.24                                               |
| 5 kn, hard over 30 / 45 / 60°: peak turn rate, °/s              | 14.5 / 19.4 / 21.2   | 13.8 / 16.1 / 15.4             | owner: more is faster                                            |
| 1 kn: heading after 8 s                                         | 18 / 25 / 27°        | 20 / 25 / 27°                  | owner: 60° mostly a brake                                        |
| 1 kn, 60°: boat stopped after turning                           | 67°                  | 71° (30° still moving at 100°) |                                                                  |
| Peak rudder load (0.25 s mean), slam to 60° at 120 / 60 / 30°/s | 2830 / 2410 / 1890 N | 2120 / 1610 / 1340 N           | as lift number 1.9 / 1.45 / 1.2; tank dynamic peaks 0.93 to 1.54 |
| Keel wash removed at the rudder                                 | 86%                  | 87%                            | 18 to 33%, about 50%, 36 to 60%                                  |
| Same 1500 N m yaw push, off course after 10 s: lashed / let go  | 5° / 5°              | 5° / 14°                       |                                                                  |
| Folkboat, same                                                  | 11° / 11°            | 11° / 18°                      | owner: steadier                                                  |
| Close-hauled, hands off 15 s: H-boat / Folkboat                 | 12° / 14°            | 10° / 4°                       |                                                                  |
| Tack, Folkboat against H-boat, 20 / 35° helm                    | 1.12 / 1.11 slower   | 1.36 / 1.28 slower             | owner: about 1.2                                                 |

## 4. GIFs

- `r1-force-curve.gif`: rudder force against angle, old and new, with tank values.
- `r1-hard-over-5kn.gif`, `r1-hard-over-1kn.gif`: 30, 45, 60°, old above new.
- `r1-tiller-let-go.gif`: both boats shoved, rudder centred against trailing.

## 5. Surprises, next

- The old excess had two causes: the skeg's run was credited to the rudder, and a let-go blade was charged twice (Kirchhoff quarter plus cross-flow drag).
- The H-boat's fixed rudder is a large tail fin; trailing free, she wanders 2.7 times further. The Folkboat is still worse. At 60° the Folkboat still turns faster (19.6 against 15.4°/s).
- Next: wash. Tanks give 0.4 to 0.8 of the lifting-line value, falling with speed: probably the free surface. A factor 0.65 gives 67% and doubles the H-boat's steady rudder angle; not adopted, being no physics.

## 6. Caveats

- Stall is still 5° early and peak lift 10 to 25% low; this counts against 60°.
- Hinge moment unverified: 96 N tiller pull at 10°, 5 kn.
- Keel-hung flap effectiveness not checked against data.
- Hull hold-out (h1b) not rerun; changes 1 and 5 act wherever attachment is below 1.

## 7. Sources

- Keuning, Katgert, Vermeulen 2006, Keel-rudder interaction (Delft 1492-P): in part, no tables.
- Zamora-Rodríguez and others, Sailing yacht rudder behaviour (Madrid): in part.
- Miller 2007, Dynamic lift coefficients for spade rudders: in part.
- Yasukawa, Yoshimura 2015, MMG: in part.
- Whicker, Fehlner 1958: not obtained; slope via Keuning, stall points as h1b recalled. Hoerner, Beddoes-Leishman: memory.

## 8. Change to the model (`code/model.js`, under `R1`)

1. **Plate law.** `kirch(X) = (((1+√X)/2)² − ¼)/¾`. Cross-flow term becomes `kf·fcf + (1−kf)·½·1.2·grown·T·V·wrel/(0.56 + 0.44·|wrel|/V)`, `V = hypot(wrel, ut)`.
2. **Hinge starts a new foil.** Per slice: `runT += dx·fr` while `fr > 0`, otherwise `runT = 0, Ph = Plin`. Stall ratio = larger of the old one and `added / (½·|ut|·CL_MAX·Teff·max(runT/fr, d/2))`; `added = |Plin| − |Ph|` (not below 0) for equal signs, otherwise `|Plin|`.
3. **Blade's turning rate.** `w += deltaDot·hW`, `hW = cumAt(cR, xm)` where `fr > 0`; also in the rudder-moved jump.
4. **Free tiller.** `ctl.tillerFree`: `deltaDot += hingeM/hingeI·dt`, with `hingeM = Σ Fn·hW`, `hingeI = 1.5 + Σ ρ·d·G·hW²/fr`.
5. **Smoothness.** Attachment read by interpolation between station centres.
6. **`gen_hulls.mjs`.** Turning share × blade depth / section depth.
