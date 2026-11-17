# sailing-test-v2: r1 (rudder) and r2 (heel, air) merged

## What merged

One `model.js` with r1's six and r2's six changes, switches `C.R1`, `C.R2` (comparison only). Nothing tuned, nothing blew up. Over a 70 s mixed run, both boats: both off = sailing-test, R1 only = r1, R2 only = r2, **bit for bit** (so 14.5/19.4/21.2 °/s; r1 13.8/16.1/15.4, tack ratio 1.36/1.28; r2 helm −2.9…13.8°, 32-knot puff 35° off, all reproduce).

## Where they met (marked `m1`)

1. r1's blade turning rate and hinge moment act about r2's heeled stock (1/cos heel).
2. r1's hinge-run limit uses r2's true blade depth; r2's suction head takes the stall ratio, now r1's larger hinge ratio. **Least certain:** air comes earlier.
3. Aired share of r1's plate force is 0.88 absolute, not 1.2 × r2's 0.44.

## Numbers (H-boat; base → merged)

|                                        | Base                   | Merged                  |
| -------------------------------------- | ---------------------- | ----------------------- |
| 5 kn, 30/45/60°: peak turn °/s         | 14.5/19.4/21.2         | 13.5/15.6/14.9          |
| speed lost in 4 s %                    | 36/53/68               | 34/51/60                |
| peak load N                            | 1650/2360/2900         | 1640/1800/1970          |
| 1 kn: peak turn °/s                    | 3.0/3.9/4.2            | 3.0/3.7/3.6             |
| heading after 8 s                      | 18/25/27°              | 20/25/27°               |
| Tack 20/35° helm, s                    | 7.8/5.3                | 8.1/6.0                 |
| Folkboat, s (ratio)                    | 8.7/5.9 (1.12/1.11)    | 10.6/7.1 (1.31/1.18)    |
| Hands off 15 s, bears away, H/Folkboat | 12°/14°                | 3°/6°                   |
| Close-hauled helm, 8…24 kn             | −2.9/−1.8/0.7/3.7/5.7° | −3.0/−0.7/4.8/9.7/18.5° |
| heel                                   | 4/20/35/45/50°         | 4/20/34/40/43°          |
| Reach puff 22/28/32, held: helm        | 8/15/20°               | 17/35/35° (hard over)   |
| off course                             | 5/9/11°                | 11/44/58°               |
| main eased: helm                       | 4/9/12°                | 5/15/26°, holds         |
| Bear away pinned, 20/24 kn             | bears away             | refuses both            |

## Better

- Hard turns brake less; peak load down a third; at 1 knot 60° adds no turn rate.
- Tack on the owner's 7 to 8 s; Folkboat 1.2 to 1.3 times slower.
- Hands off she holds course; lee helm at 12 knots halved.
- She broaches in a puff and refuses to bear away pinned; easing the main saves both.

## Worse, or looks wrong

- At 5 knots 60° turns slower than 45°; at 1 knot 60° still gains most heading.
- Broach probably too early: a steady 24-knot beam reach cannot be held (helm 34°, 23° off; r2 alone 13°). Refusing at 20 knots is new.
- Folkboat rudder now airs (50 to 76%); in r2 alone never. From point 2.
- Lee helm under 12 knots remains; Folkboat worse (−7° at 8).
- Still 9 knots reaching.

## Page, GIFs

Published form kept (no doctype/head/body, viewport meta, safe-area padding, tiller reversed, drag inverted, arrow keys as before). Tiller bar 56 px, stays put. From astern: blade grey/amber/purple, "% in water"; fourth light "aired". Headless test PASS at desktop and phone (host-style wrapper; phone drag reversed): no errors, no requests, 0.2 ms per frame.

`m1-puff-broach.gif` (base against merged), `m1-hard-over.gif` (merged).
