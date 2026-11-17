# r2-broach: heel, helm balance and the broach

## 1. Verdict

**Partly survived.** With heeled geometry in, the H-boat loads up with weather helm, the rudder runs out, sucks air and she rounds up, with no mode or flag; easing the main prevents it. But it comes too late (about 50° of heel, puffs of 30 knots), and below 20° of heel the lee helm remains.

## 2. What was run

Both boats' data unchanged. "Before" is the sailing-test model, "after" adds the terms listed below. Helmsman: h4 stand-in, 35° limit.

Constants, global: suction share of a section's loading 2/3 (thin-aerofoil rule of thumb, not opened); pressure-release factor 4/π² and aired plate drag 2π/(4+π) (exact); topsides straight to the deck edge (assumed).

Placement: class rules confirm the mast (J 2.42 m) but show the keel only on plans I could not obtain. Nothing changed. Moving the keel 0.40 m forward adds only 1.2° of weather helm at 12 knots.

## 3. Numbers (H-boat)

Turning moments towed at 6.5 knots, 4° leeway (N m):

| Heel                                | 10°          | 20°         | 30°         | 40°         |
| ----------------------------------- | ------------ | ----------- | ----------- | ----------- |
| Drive 600 N × leeward lever         | 520          | 1030        | 1500        | 1930        |
| Heeled hull (new)                   | 60           | 420         | 840         | 1230        |
| Rudder per 10° helm, before / after | 3900 / 3620  | 3650 / 3400 | 3260 / 2850 | 2750 / 2350 |
| Rudder maximum, before / after      | 10400 / 9000 | 9900 / 8600 | 9200 / 8100 | 8100 / 6800 |

Steady weather helm in degrees (negative is lee helm), before / after:

| Wind, knots       | 8           | 12          | 16        | 20        | 24         |
| ----------------- | ----------- | ----------- | --------- | --------- | ---------- |
| Close-hauled heel | 4°          | 20°         | 34°       | 41°       | 46°        |
| Rudder            | −2.9 / −2.9 | −1.8 / −0.7 | 0.7 / 4.1 | 3.7 / 8.2 | 5.7 / 13.8 |
| Beam reach heel   | −5°         | 5°          | 16°       | 28°       | 37°        |
| Rudder            | −1.4 / −1.4 | −0.4 / −0.5 | 2.1 / 2.3 | 5.4 / 7.9 | 8.6 / 13.3 |

Published (Perry): 2 to 4° is best, over 8° too much. The model reaches 4° only at 34° of heel.

| Manoeuvre                                | Before       | After                                   |
| ---------------------------------------- | ------------ | --------------------------------------- |
| Beam reach puff 12 to 22 kn, course held | helm 8°      | 11°                                     |
| Puff to 28                               | 15°          | 28°, 16° off course                     |
| Puff to 32                               | 20°, 11° off | hard over, grip 25%, 95% aired, 35° off |
| Same, main eased after 1.5 s             | 12°          | 19°, holds                              |
| Close-hauled puff to 22, tiller let go   | luffs 20°    | rounds up through the wind              |
| Bear away, main pinned, 24 kn            | bears away   | refuses, luffs 21°, grip 3%             |
| Same at 20 kn, or main eased             | bears away   | bears away                              |

Folkboat: rudder root 0.28 m under the hull, never aired; it runs out of angle instead.

## 4. GIFs

- `g1-puff-broach.gif`: 32-knot puff on a beam reach, before and after.
- `g2-bear-away-pinned.gif`: 24 knots, helm up, main pinned: before bears away, after refuses.
- `g3-ease-main.gif`: new model, main held against main eased.

## 5. Surprises, next

- The drive lever was already in the model. The rudder simply had four times the moment needed.
- The heeled hull is second, about half the lever.
- Next: fix boat speed and the stalled rudder's load, then repeat; keel position from class plan A1.3; mast rake.

## 6. Caveats

- Reaching speed is 9.5 knots (real about 7), and the stalled rudder's load keeps rising to 35°. Both delay the broach.
- 4/π² is the slender limit and overstates the loss for this rudder.
- The heeled-hull moment relies on the after body shedding, not recovering. Keuning's formula (garbled scan) gives about 1200 N m; mine 420 at 20°.
- Ventilation unchecked against measurements. No waves, trim, spinnaker.

## Change to the model

In `model.js`, marked `r2`; exact text in `code/model-r2.diff`.

1. `heelGeometry()`: per heel angle, the rise h keeping displaced volume; per station the canoe body's immersed depth and lateral centre yc.
2. Entrained water `A_upright × (D/T)²`, with `D = max(canoe depth, T cos φ − h)`; was `cos² φ`.
3. Cross-flow gains `u · dyc/dx` times the canoe share `(π/2) depth² / A`.
4. Rudder term `u sin δ / cos φ`; `Fx = Fn sin δ / cos φ`.
5. Fore-and-aft forces act at their lateral position: blade `−(z + h) tan φ`, canoe `yc`.
6. Air, per station, lagged like attachment: `Fa = clamp((head − cover) / span)`, `head = (2/3) · ratio · CLmax · ut² / 2g`. Then `A × (1 − (1 − 4/π²) Fa)`; re-attachment capped at `1 − Fa`; cross-flow drag `× (1 − Fa (1 − 0.88 / CD_SHARP))`.

## Sources

- Keuning and Vermeulen, yaw balance upright and heeled: in part.
- Harwood, Young, Ceccio 2016, JFM: abstract only.
- H-Boat class rules 2022: in part.
- Good Old Boat, "The rudiments of rudders": in full.
- boats.com, "Broaching causes and cures": in full.
