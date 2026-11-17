# S4: rigid sails in 3D, vortex-ring lattice with luff shedding

## 1. Verdict

**Killed** for separated flow (luff shedding on a coarse lattice). **Survived** for attached flow and the slot. The fallback is smooth and keeps the slot, but its stall onset moves with panel count.

## 2. What was run

Fujin mainsail (33.2 m², chords from Tahara et al. 2012), 10% camber, 12° twist, mirrored in the water plane, wind profile exponent 0.10. Main plus 130% jib (59.3 m²) for the Fujin and slot tests; sheet angles are guesses, because the paper's shape tables are images.

Unsteady ring lattice, cosine-bunched to the luff, normals from the analytic shape, flow step 0.05 s. Sweep trim: boom 20° inside the wind until it reaches 85°, so the sail stalls only past 105°.

One constant set: critical suction 0.5 (a priori); wake cores one panel wide; wake self-induction over its first chord; no decay. Fallback: separation from suction 0.5 to 1.0, lag 1.5 chord transits, separated normal force 1.2·s/(0.56+0.44·s).

References: Helmbold and lifting-line closed forms; Fujin as published; ORC mainsail table **quoted from memory**, so loose; flat plate 1.2.

## 3. Numbers

| Attached flow | model | reference |
|---|---|---|
| Elliptic wing, aspect 4, lift at 5° (6×12, 8×16) | 0.366, 0.354 | 0.343 Helmbold |
| Induced drag over ideal | 0.85, 0.73 | 1.0 |
| Twist 5→25°: side force | 1.91→1.53 | 1.39→1.16 |
| drive | 0.67→0.57, no peak | 0.33 to 0.39, peak near 15° |
| centre of effort height | 6.92→6.48 m | falls |
| Lift, 20→38° (sheets fixed; eased half) | 1.24→2.34; 1.24→1.79 | 0.91→1.58 |
| Jib side force, alone; with main | 0.57; 0.79 | rises |
| Main front pressure, alone; with jib | 3.4 q; 0.8 q | falls |
| Main luff suction low down, jib at 14°; 6° | −0.07; −0.36 (alone +0.49) | negative |

| Stalled, boom 85° | 4×8 | 6×12 | 8×16 | reference |
|---|---|---|---|---|
| 120°: lift, drag | 2.88, 1.72 | 2.36, 1.24 | 2.27, 1.10 | 0.84, 0.97 |
| 150°: lift, drag | 1.56, 2.71 | 1.40, 2.31 | 1.32, 2.11 | 0.30, 1.32 |
| 180°: drag | 2.97 | 2.60 | 2.40 | 1.2 to 1.35 |
| noise after 0.5 s | 3 to 4% | 2 to 9% | 2 to 9% | limit 20% |
| fallback 180°: drag | 1.17 | 1.17 | 1.17 | 1.2 to 1.35 |
| fallback 120°: drive | 0.95 | 1.08 | 1.14 | |

Time per flow step (plain Node, loaded machine): main attached 62 ms, main stalled 118 ms, main plus jib 213 ms.

## 4. GIFs

- `s4-sweep.gif`: sail and wake, 30° to 180°, lift and drag against ORC and the fallback.
- `s4-res.gif`: three panel counts past stall, with force traces.
- `s4-twist.gif`: twist sweep, centre of effort falling.
- `s4-slot.gif`: main alone, then the jib sheeted in until the main luff backwinds.

## 5. Surprises, and next

- The stalled force is quiet but about twice too large, and falls 20% from 4×8 to 8×16 without converging.
- Wake constants set the level. Self-induction over two chords gave dead-run drag 1.27 with 26% noise. Cores 0.1 panel at birth diverged at 120° and 135° on 6×12 and 8×16.
- Ring wakes store potential, which grows without limit behind a bluff sail, so decay cannot be applied to them.
- Next: the fallback past stall with the jib up, and a suction measure less dependent on panel count.

## 6. Caveats

- Guessed sheet angles: Fujin levels (side force 35% high, drive 80% high) test little; only the trends count. No viscous drag.
- Fallback drag at 180° is put in by hand.
- Critical suction was not varied; attached lift near 1.9 says 0.5 is generous.
- Stalled runs last 8 s and the force is still drifting down slowly.
- Twist and slot GIFs interpolate between computed cases.
