# v2-radiation: per-section wave-making force with memory

## 1. Verdict

**Inconclusive: killed to the letter on (a) and (b), survived (c), (d), (e).** The memory term is passive and cheap, and pitching under sail dies out. It misses v1's black curves at 5 knots for wave lengths 1 to 1.5 boat lengths because a causal memory also lowers the added mass near resonance, which v1's reference left out. Against the same reference with that matching added mass, 28 of 32 points are within 15%.

## 2. What was run

- **Form.** Each section carries two spring-damper-mass blocks in series (4 states), K(s) = Σ κ s/(s² + a s + ω0²), driven by the section's vertical velocity relative to the water. K(0) = 0: steady trim gives no force. K(∞) = 0: the impact-limit added mass stays in the momentum term, nothing double counted. Stored energy is ½Σx², so it is passive for any positive parameters, also while they change with immersion.
- **Fit.** Target: v1's formula b = ρg²Ā²/ω³, one curve family in mean draft/breadth, fitted at load (0.75 s) on 25 ratios; rms error 7 to 16%. Sections look up their instantaneous breadth and draft. No per-boat constant.
- **Speed.** Blocks ride with the hull sections; speed enters through the relative velocity (Gerritsma-Beukelman form, as v1's reference).
- **References.** (1) v1's black curves: damping at the encounter frequency, constant added mass. (2) New: the same plus the added mass that damping implies (Kramers-Kronig). Both share the model's sections; no published data.

## 3. Numbers

|                                           | Reference 1 / frozen B | Reference 2 | Memory                     |
| ----------------------------------------- | ---------------------- | ----------- | -------------------------- |
| Memory's worst error at rest, λ/L ≥ 1     | 5%                     | 9%          |                            |
| 5 kn λ/L 1.15: heave, pitch               | 0.29, 0.34             | 0.87, 0.68  | 0.82, 0.77                 |
| Memory's worst error, 5 kn, λ/L ≥ 1.75    | 6%                     | 4%          |                            |
| Memory's points outside 15% (of 32)       | 7                      | 4           |                            |
| Decay at rest, damping ratio heave, pitch | 39%, 36%               |             | 27%, 25% (factor 1.4, 1.5) |
| Close-hauled flat water, pitch rms        | 0                      |             | 0 (dies in under 20 s)     |
| Close-hauled sea: pitch, heave rms; heel  | 1.7°, 0.09 m; 27.5°    |             | 2.4°, 0.10 m; 27.1°        |
| peak acceleration bow, cockpit            | 1.0, 0.45 g            |             | 1.6, 0.9 g                 |
| slams per minute; speed lost              | 2; 0.17 kn             |             | 4; 0.17 kn                 |
| Reach: pitch rms, slams, speed lost       | 1.4°, 0, 0.13 kn       |             | 2.1°, 0, 0.11 kn           |
| Cost per step, flat water                 | 59 µs                  |             | 75 µs                      |

Stable at 1/240 and 1/120 s.

**The energy source (task 3).** Not the sails. A towed, upright hull given the sail drive's constant bow-down moment (2500 N m) pitches 8° peak to peak forever; a bow-up moment decays at once; so does added mass frozen at the still waterline. Cause: the steady cross-flow from trim (speed × sin trim) times the change of section added mass with immersion, a negative damper when bow-down, about −2.5% of critical at sailing trim (inferred; measured budget: momentum terms +56 W, drag −52 W). Energy comes from the tow rope or drive. A property of the ideal law, left in. One real defect fixed: v1's rig felt pitch rate with the wrong sign.

## 4. GIFs

- `side-closehauled-memory.gif`: 23 s real time, close-hauled, new term.
- `response-curves-memory.gif`: old law, frozen stand-in and memory drawn against both references.

## 5. Surprises, next

- The formula implies an added-mass dip of about 75% of a semicircle's; from memory the true dip is nearer 40%, so the truth probably lies between the references. Next: bake b(ω) per section with a 2D boundary-element solve, fit the same blocks, compare with published yacht curves.

## 6. Caveats

- Reference 2 is my own and shares everything but the memory with the model; which reference is right near resonance is unsettled.
- Water-fixed memory was not tried. Heave at rest below λ/L 1 differs from both references (values under 0.3).
- At 1/120 s she still sails a knot faster (v1's untraced fault).

## Change to the model

`code/model.js` is authoritative (`patch2.py` holds the memory edits):

1. Load: `fitRadiation(2)` builds the table of (κ, a, ω0) against draft/breadth.
2. State: 4 numbers per section.
3. Per section, per step: scale the blocks by instantaneous breadth; force −Σ√κ·x1 at the step's midpoint, linear in the new vertical velocity, so its coefficient joins the implicit 2×2 heave-pitch solve; states advance by the trapezoid rule.
4. `C.MEMORY` (true), `C.RADIATION` stays reference-only, `C.RADIATION_KK` adds reference 2's added mass.
5. Rig apparent wind: `+ q·hCE` (was minus).
