# sailing-test-v3: H-boat from the class offsets

`model.js` identical to v2; Folkboat unchanged.

## Swapped (old → real)

- **Hull:** formula → 129 sections lofted from the offsets at sailing flotation; still ellipses (real waterline beam and area).
- **Keel:** 2.35–4.15 m from the bow → 1.68–3.75.
- **Skeg:** 0.6 m deep → deadwood 3–9 cm below the hull.
- **Rudder:** 5.92–6.30, 0.95 deep → 5.55–6.10, 1.11 deep.
- **Mass** 1869 → 1777 kg; **GM** 0.77 → 0.67; **gyradii** yaw 2.07 → 1.44, roll 1.0 → 1.31.
- **Rig:** mast 1.92 → heel 1.95, upright at 2.23 to carry the rake; J 2.47 → 2.42; boom 1.60 → 1.63.

Not representable: aft-raked trailing edges (made upright); rudder balance; the rudder–hull gap (counts as blade); GZ 8% under GM·sin at 30°.

## Geometry check (stack / derived.json)

Waterline 6.386 / 6.386 m. Canoe volume 1.595 / 1.592 m³. Wetted 13.38 / 13.10 m². Keel 0.898 / 0.898 m². Rudder 0.308 / 0.305 m² (0.414 with the gap).

## Helmsman

On the real boat the scripted helmsman flipped the rudder 0.5° every sub-step and sculled her to 7.7 knots. Scripts and hold-course now feel turn rate over 0.2 s; old numbers barely move.

## Numbers

|                                | Old                    | Real                          |
| ------------------------------ | ---------------------- | ----------------------------- |
| Close-hauled 8…24 kn: speed    | 5.6/6.5/6.9/6.8/6.2    | 5.5/6.4/6.6/6.5/6.2           |
| leeway °                       | 3.3/4.0/4.7/5.5/7.1    | 2.6/2.6/2.2/2.7/4.0           |
| heel °                         | 4/20/34/40/43          | 5/23/37/43/49                 |
| helm ° (+ weather)             | −3.0/−0.7/4.8/9.7/18.5 | −0.3/3.1/7.9/11.5/15.4        |
| ORC beat 8, 16 kn (4.55, 5.42) | 5.40, 6.61             | 5.28, 6.48                    |
| Hands off 15 s, centred        | bears away 3°          | luffs 16°                     |
| let go                         | holds                  | rudder to 43°, bears away 40° |
| Tack 20/35° helm, s            | 8.2/6.0                | 7.1/5.1                       |
| 5 kn, 30/45/60°: turn °/s      | 13.5/15.6/14.9         | 18.2/25.6/33.0                |
| Puff 22/28/32 held: helm °     | 17/35/35               | 16/35/35                      |
| off course °                   | 11/44/58               | 10/22/36                      |
| Bear away pinned 20/24         | refuses both           | goes / refuses                |
| Steady 24 kn reach             | 36° helm, lost         | 21° helm, held                |

## Better

- Lee helm at 8 knots gone (−3.0 → −0.3°).
- Broach later: 24-knot reach holdable, round-up halved, bears away at 20 knots; easing still saves her.
- 60° out-turns 45°.

## Worse or wrong

- Weather helm climbs too fast: 3° at 12 knots, 8° at 16 (18% more tender).
- Leeway 2–3° too little; negative on the 24-knot reach.
- Still a knot over ORC.
- Let go, the tiller swings hard over.
- Rudder barely stalls at 60°.

Sensitivity: mast at its heel, 1° less helm; real-depth ellipses, 1° more.

## Page, GIF

Page: stand-ins note and hold-course changed only; headless test PASS, desktop and phone. `g1-old-vs-real.gif`.
