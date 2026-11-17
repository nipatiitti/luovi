# S1: two-dimensional vortex sail section with luff shedding

## 1. Verdict

**Killed as written, for cambered sails.** No single constant set passes every condition. Luff shedding alone gets the flat plate and everything fully stalled, but over-predicts maximum lift by about 25% at 10% camber and 80% at 20%. The leech state repairs maximum lift and breaks the curve below it. Six panels fail near the stall.

## 2. What was run

Circular-arc sections, 3 m chord, 8 m/s, cambers 0, 10, 20%, at 6, 12, 24 panels. Step-change runs at fixed angles round the circle, plus slow sweeps. Force from vortex impulse, cross-checked against panel pressures (within 5%). Luff suction is Ramesh's A0 as a weighted sum of wash through the cloth, tested as `S·V` against `S_crit·V`, with no division by wind speed.

Constants, one value throughout:

- `S_crit` 0.10, from the flat plate's break near 6°.
- Core radius 0.025 chord (chosen).
- Shed circulation decays over 10 chords of travel, chosen to bring drag square to the wind into the band.
- Flow step 1/30 s.
- Leech state: separation where lee-side pressure recovery exceeds 0.5 (rule of thumb, from memory); lag 1.5 chord transits (Beddoes-Leishman, from memory); cloth aft of it set square to the wind; reset when the luff sheds.

References: thin-aerofoil theory; Fage and Johansen 1927 flat plate (opened); Marchaj's 10% plate (second hand); Bot et al. 22.3% arc (text values only). Milgram's and Collie's curves were unreadable, so the cambered comparison is weak.

## 3. Numbers (12 and 24 panels unless stated)

| Quantity                            | Model                                       | Reference                 |
| ----------------------------------- | ------------------------------------------- | ------------------------- |
| Lift slope before stall             | 0.99 to 1.00 of 2π                          | 2π                        |
| Flat plate at 30°, lift / drag      | 1.25 / 0.72                                 | 1.12 / 0.65               |
| Drag square to the wind             | 2.07 to 2.29 (2.7 with no decay)            | 1.6 to 2.4                |
| Maximum lift, 10% camber, luff only | 2.2 at 10°                                  | 1.75 at 13°               |
| Maximum lift, 20% camber, luff only | 3.9 at 14°                                  | about 2.2 near 20° to 24° |
| Same, with leech state              | 1.9 at 12° to 14°; 2.1 to 2.5 at 24° to 26° | as above                  |
| Aback (mirrored sail and wind)      | identical to four decimals                  | mirror                    |
| Noise after half-second average     | at most 0.10                                | under 0.20                |
| Stalled force, 6 against 24 panels  | within 5%                                   | equal                     |
| 6 panels near stall, 20% camber     | lift to 5.8, negative drag                  | fails                     |

**Jib ahead of the main: helps.** The main's luff sheds from 12° alone and not at all up to 30° with the jib. Jib lift at 10° is 1.77 against 0.82 alone. Sheeting the jib in from 22° to 4° takes pressure on the front 8% of the main from +2.0 to -1.8.

**Leech state: hurts as built.** Lift sags as angle rises, then jumps by 0.7 to 1.9 when the luff takes over, at an angle that moves with panel count.

## 4. GIFs

- `g1.gif`: 10% sail, wind swung through the full circle, lift and drag against measurements.
- `g2.gif`: 6, 12, 24 panels side by side; stalled they agree, near the stall 6 panels does not.
- `g3.gif`: jib sheeted in; pressure arrows on the front of the main turn red.
- `g4.gif`: through head to wind, aback, and back; the return retraces the mirror image.

## 5. Surprises, and next

Camber's lift is limited by the leech, not the luff, so leech separation is not optional. Next: a leech state that alters the leech Kutta condition and carries drag, tested against Milgram's curves.

## 6. Caveats

Core size is a hidden constant: at one-sixth chord (a panel of six, as the critic asked) lift just past stall rises 50 to 90% and drag square to the wind reaches 2.6. Flow step moves stalled lift about 10%. Decay suppresses vortex-street shedding, which is why noise passes.
