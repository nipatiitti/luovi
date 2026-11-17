# H4 the tack: slice law in the time domain

## 1. Verdict

**Survived.** The two boats differ in turn time, speed lost and course keeping for reasons of geometry, the keel morph is monotonic, and the step of 1/240 s is stable with entrained water 14 times the boat's mass. Several things look wrong to a sailor (section 5).

## 2. What was run

Surge, sway, yaw and heel, flat water. Repaired slice rule of H1/H2, constants unchanged, on water-fixed slices 0.05 m apart. Towed at fixed drift it returns the steady law's side force within 2%.

One new closure: a change of sideways speed in time is answered at once by the water each slice has filled, inside the mass matrix (total-momentum form); a change met by travelling along the hull follows the steady rule.

Boats: the fin-keel and long-keel stacks of H1/H2. Both 1450 kg, 24 m² sail, metacentric height 1.0 m, gyradii 1.9 m yaw and 1.0 m roll. No external reference: note F found no measured tack data.

Constants, one value for all boats: ITTC 1957 friction on wetted area; wave stand-in weight × 0.012 × (Fn/0.35)⁶ (Delft residuary values from memory); surge entrained water 5% of mass; sail lift 1.5 sin 2α, drag 0.05 + sin²α, sheeted 15°, centre 4 m up; windage 1.2 m²; helmsman 1.5° rudder per degree of error and per degree a second, 30° limit; rudder rates 8, 25, 120 degrees a second.

## 3. Numbers (12 knots true, 45° off the wind)

| | Fin | Long |
| --- | --- | --- |
| Speed, leeway, rudder | 5.07 kn, 2.6°, 0.9° | 5.03 kn, 3.0°, 0.3° |
| Entrained water, sway | 2470 kg | 3520 kg |
| Through 90° (gentle, normal, slammed) | 6.6, 5.6, 5.6 s | 7.6, 6.7, 6.4 s |
| Speed lost | 50, 50, 50% | 68, 71, 72% |
| Lost to windward | 6.0, 6.1, 6.4 m | 9.7, 11.0, 11.6 m |
| Peak leeway after, normal | 6.1° | 10.8° |
| Back to 90% speed, normal | 13.4 s | 16.6 s |
| Coast to half speed from 5 kn | 4.2 lengths | 4.0 lengths |
| Puff, time to half change: heel, rudder load, speed | 0.7, 1.0, 2.9 s | 0.7, 1.8, 2.9 s |
| Tiller let go, heading error after 10 s | 29° (rounds up) | 6° |
| Tiller lashed, shoved: peak turn rate | 3.5°/s | 4.0°/s |
| Sternway, rudder +20°: turn rate after 3 s | −3.3°/s (reversed) | −2.3°/s (reversed) |
| Keel wash reaching rudder | 0.9 s late, load 460 to 34 N | 0.2 s |

Morph, fin to long keel in five steps: through 90° in 5.6, 6.1, 7.4, 10.4, 13.4 s; speed lost 50, 54, 60, 65, 73%; tiller-free error 29, 16, 10, 6, 4°. Every measure monotonic.

Step size, long keel made light (slammed tack): entrained 2.4, 5.9, 14 times mass, all bounded at 1/60, 1/240, 1/960 s. Turn time agrees within 0.5% between 1/240 and 1/960 s for the first two.

Class weights from memory (IF 2150 kg, 26 m²): 6.6 s against 5.6 s; coasting 5.5 against 4.2 lengths.

## 4. GIFs

- `h4_tack_two_boats.gif`: both boats tacking, slices darkening with push, wake, force arrows, traces.
- `h4_rudder_rates_fin.gif`: fin boat at three rudder rates; little difference.
- `h4_puff.gif`: 10 to 15 knots; heel, then rudder load, then speed.
- `h4_sternway.gif`: backing off head to wind; bow swings against the helm.

## 5. What surprised me and looks wrong

- Nearly all speed lost in the tack (1650 of 1970 N s, fin) is entrained water being swung round. Half the speed gone looks too much for an H-boat; slender sections overstate a fin's entrained water.
- Slamming the rudder costs almost nothing. No stall drop exists; none was added.
- The long keel turns only 1.2 times slower (note F expected 1.3 to 2).
- Lashed, the long keel is shoved off course more easily; its advantage appears only with the tiller free.
- In steady leeway the keel's wash removes 93% of the fin boat's rudder load.
- Slice surge force jumps up to half its range between sub-steps (about 1 N s each), and the fin's rudder load ripples a few percent: the helm would buzz.
- Sideways slide kinks as the sail changes sides. Sternway builds to 3 knots in 13 s.

Next: a fin's entrained water against a 3D value; a logged H-boat tack.

## 6. Caveats

Placeholder sails drive every number. Heel only scales section added mass by cos². Shed wake is not rotated as the boat turns. The keel-hung rudder is fully effective by construction.
