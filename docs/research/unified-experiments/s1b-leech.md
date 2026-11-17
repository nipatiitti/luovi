# S1b: leech separation located from the model's own flow, second shear layer shed there

## 1. Verdict

**Inconclusive, close to surviving.** The sag and the jump are gone and the 25 to 80% lift errors are now 6 to 13%. By the letter of the kill condition it still fails narrowly: maximum lift comes 3° to 6° early, and results move 10 to 20% with panel count and core size.

## 2. What was run

As S1, with cambers 0, 10, 20% at 8, 12, 24 panels, plus 12% and 18% to match the measurements.

- **Separation point:** lee-side edge speed from a thin-aerofoil series fitted to the wash the lattice is cancelling (panel-independent to three decimals), then Stratford's turbulent criterion from the suction peak aft. It lags by 1.5 chord transits.
- **Second shear layer:** a vortex released each step at that point, strength `K·u²/2·dt` from the edge speed there (Katz 1981). Leech and luff rules are unchanged; no handover switch.

Constants, one value throughout: `S_crit` 0.10; `K` 0.6 (Katz; Fage and Johansen); Stratford 0.39 with air's viscosity; boundary layer started at 10% chord; lag 1.5 transits (Beddoes-Leishman); core radius 0.3 of a panel length; decay over 10 chords. None was adjusted after the first run.

References: Milgram 1971 (NACA 65 mean line, 12% and 18% camber), figures 6 and 8 read by eye from the page images, error about 0.05 in lift, 0.02 in drag. His sections have a 3.4% thick rounded nose, unlike cloth on a wire.

## 3. Numbers (12 panels unless stated)

| Quantity                                     | Model                      | Measured               |
| -------------------------------------------- | -------------------------- | ---------------------- |
| 12% camber, maximum lift                     | 2.29 at 12°                | 2.03 at 17°            |
| 12% camber, drag at 0°, 8°, 16°, 24°         | 0.04, 0.07, 0.24, 0.49     | 0.05, 0.09, 0.37, 0.78 |
| 18% camber, maximum lift                     | 2.64 at 16°                | 2.5 at 22°             |
| 18% camber, lift at 0°                       | 1.78                       | 0.85                   |
| 18% camber, drag at 0°, 8°, 16°, 24°         | 0.07, 0.11, 0.16, 0.50     | 0.10, 0.15, 0.22, 0.82 |
| Drag square to the wind, 8 to 24 panels      | 1.98 to 2.30               | 1.6 to 2.4             |
| Maximum lift, 10% camber, 8 / 12 / 24 panels | 1.85 / 2.02 / 1.91         | equal                  |
| Maximum lift, 20% camber, 8 / 12 / 24 panels | 2.83 / 2.76 / 2.57         | equal                  |
| Aback (mirrored)                             | identical to four decimals | mirror                 |

Stalled drag at 30° spreads 20% across panel counts. Core 0.15 to 0.6 of a panel moves maximum lift 1.80 to 2.07 (10% camber). Drag square to the wind is 2.37 with no decay, 2.06 at 10 chords, 2.46 at 5.

**Oversheeted main, alone (wind 22° off the bow):** drive peaks at 77 N/m at sheet 12°, then falls steadily to 26 at 0° while heeling force stays between 189 and 216. Eased, it recovers about a second behind.

**Behind the jib:** the main's luff never sheds; drive fades from 29 to 0 between sheet 14° and -2°, but heeling force rises from 129 to 223 and the separation point stays near 77% chord.

## 4. GIFs

- `g1-oversheet-main.gif`: main sheeted in and eased; separation point and all three shear layers; drive and heel loops.
- `g2-round-the-circle.gif`: flat, 12%, 18% camber round the circle against the digitised points.
- `g3-main-behind-jib.gif`: the same oversheeting behind a jib.

## 5. Surprises, and next

Deep sails at small angles are the remaining large miss (lift twice the measured): the measured sections separate on the windward side of the luff there and the model does not. Next: test whether `S_crit` rising with nose radius moves maximum lift later, as Milgram's rounded noses suggest.

## 6. Caveats

Measured sections are rigid with rounded noses, so the early stall may partly be the reference. Drag past 16° reads 35% low. The separation state is off with wind from astern of the chord.

If this is judged killed: keep the lattice and luff rule, carry one lagged separation state per strip, and accept about 10% error past stall. That costs seven global constants, still none per rig.
