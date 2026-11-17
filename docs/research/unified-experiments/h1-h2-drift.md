# H1 round-bilge rule and H2 what counts as a body

## 1. Verdict

**H1: killed as proposed.** One sharpness number cannot set both the shed fraction and the cross-flow drag: on the tanker the centre of lateral resistance is 0.23 of the length off at 2° leeway (limit 0.10). **H2: survived**, but only after the lifting-line branch was dropped for a slice rule that needs no body.

## 2. What was run

Steady slice law in total-impulse form, rigid lid, added mass from my own 2D boundary-element solve (checked within 2%). Leeway 0 to 30°.

Bodies: fin keel with separate rudder (H-boat-like); long keel of the same length (Folkboat-like); Delft Sysser 1 tank model with keel and rudder; a KVLCC2-like tanker.

References: Delft measurements (DOI 10.4121/21501402, upright, yawed, 3.4 to 9.2°, side force on two posts so the centre is measured). KVLCC2 captive-test fit of Yasukawa and Yoshimura 2015, quoted from memory. Plates: Helmbold.

Constants, one value for everything, fixed before any comparison:

| Constant | Value | Source |
| --- | --- | --- |
| sharpness = exp(−(r/T)/K) | K = 0.1 | rounded square bars, Delany and Sorensen |
| shed fraction | = sharpness | the proposal |
| cross-flow drag, sharp to round | 2.0 to 0.6 | plate; between sub and supercritical cylinder |
| travel before a round section separates | 1 draft | impulsive-start cylinder |
| slice loading length | span/4 | derived from the 2D slope 2π |
| largest section loading | 1.1 | thin foil |

## 3. Numbers

| H1, model against measurement | Rule as proposed | Every slice keeps all |
| --- | --- | --- |
| Delft side force, Fn 0.20 | −2, −7, −8% | +9, +3, +1% |
| Delft side force, Fn 0.35 | −10 to −12% | 0 to −2% |
| Delft centre, worst error | 0.04 L | 0.04 L |
| Delft drag due to side force | −22 to −53% | −4 to −42% |
| Tanker side force, 2° to 20° | −19% to +7% | +3% to +17% |
| Tanker centre, worst error | **0.23 L** (2°), 0.12 L (6°) | 0.05 L |
| Tanker yaw damping (ref 0.049) | 0.044 | 0.054 |

Raising K to 0.3 mends the tanker's centre (0.07 L) but its side force goes 27% high. Both hulls want shed fraction 1; the drag wants K near 0.1.

| H2 | Result |
| --- | --- |
| Plates, aspect ratio 0.2 to 4, against Helmbold | +2% to +6%, no bump |
| Switch rule (slice law below 1, lifting line above) | 38% jump at 1 |
| Morph, side-force slope | 0.492 to 0.604, every step up |
| Morph, yaw damping | 0.036 to 0.053, every step up |
| Morph, side force at 30° over linear | 0.93 to 1.32, every step up |
| Morph, centre at 5° | 46.4, 45.9, 47.0% L: smooth, shallow dip of 0.5% L |

## 4. GIFs

- `h1_drift_hulls.gif`: four hulls from above, water darkening with the push it kept, side-force arrow, curves against tank points. The solid tanker centre line misses the squares at small leeway: the kill.
- `h2a_plate_sweep.gif`: a plate stretched from long keel to tall fin, slices filling, slope against Helmbold; the red switch rule jumps.
- `h2b_keel_morph.gif`: keel growing to the rudder in ten steps, curves moving smoothly.

## 5. Surprises, and next

- The repair is simpler than the proposal: no section hands momentum back; sharpness only sets drag.
- Fins needed no lifting line. Letting each slice fill over a quarter span gives Helmbold within 6% and removes the body seam.
- The long keel has less steady yaw damping (0.018) than the fin boat (0.036), whose rudder sits further aft. Its slowness in a tack must come from added inertia.
- Next: the repaired rule on an unseen hull (Delft Sysser 60 to 62 reach 23°), and real KVLCC2 lines.

## 6. Caveats

- The repair was found on the same two hulls. It is a hypothesis.
- Tanker shape is a caricature from main particulars; its reference is from memory. The kill rests on it.
- One measured yacht, to 9°; canoe bodies are elliptical guesses. Neither keelboat has data.
- No fin stalls with a drop below 30°: letting go is soft. Stall shape is untested.
- Drag due to side force is low: ideal span loading, no wave drag.
