# v1-seaway: heave and pitch from the slice law

## 1. Verdict

**Killed as written, on (b).** Stable at 1/240 s, no separate vertical model needed, but with no wave-making (radiation) damping she hobby-horses four to five times too much at resonance and under sail never settles, even on flat water. One extra per-section damping term repairs it; its time-domain form is untested.

## 2. What was run

- **Boat:** class H-boat. 83 real sections every 0.1 m over the whole 8.25 m (overhangs, topsides), each tabulated against water level: breadth, immersed area, vertical added mass (Lewis form through real breadth, area, draft; impact limit). Upright tables used at all heel angles.
- **Sea:** wind 7 m/s, fetch 15 km, JONSWAP γ 1, Donelan spreading, 140 components, the build's fetch laws (baltic-wave-shape note): **Hs 0.42 m, Tp 2.9 s, wavelength 12.8 m**. (The note's 8 m/s Helsinki sea: 0.47 m, 3.0 s, 14 m.)
- **Reference:** the same sections with classical 2D radiation damping at the encounter frequency, b = ρg²Ā²/ω³, Ā = 2 sin(ω²B/2g) exp(−ω²T/g) (Jensen, Mansour, Olsen 2004): ordinary strip theory, with Gerritsma and Beukelman's added resistance. Weaker than an independent code (added mass shared). Four lookups for Delft series numbers returned none.
- **Constants:** vertical cross-flow drag 0.6 (the lateral law's CD_ROUND); pitch gyradius 1.79 m (artifact); Ochi slam threshold 0.093√(gL). Case B freezes the radiation term at the boat's own heave frequency, 3.69 rad/s.

## 3. Numbers

|                                             | Slice law as proposed  | Reference / with damping                       |
| ------------------------------------------- | ---------------------- | ---------------------------------------------- |
| Heave, pitch period, flat water             | 1.70, 1.68 s           | hydrostatic 1.70, 1.68 s                       |
| Damping ratio at rest                       | 1.6% (drag only)       | 36%                                            |
| Long waves; short waves (both speeds)       | 1.0; 0                 | 1.0; 0                                         |
| At rest, peak heave (λ/L 0.7)               | 2.8                    | 0.15                                           |
| 5 kn, λ/L 1.5: heave, pitch                 | 4.4, 3.9               | 0.88, 0.73                                     |
| 5 kn, λ/L 1.3: added resistance coefficient | 0.46 (10 at resonance) | model's own force 2.2; Gerritsma-Beukelman 2.9 |
| Close-hauled, flat water: pitch rms         | 3.7° (never settles)   | 0°                                             |
| Close-hauled in the sea: pitch, heave rms   | 6.2°, 0.24 m           | 1.7°, 0.09 m                                   |
| heel                                        | 22 ± 4.5°              | 27.5 ± 2.1°                                    |
| peak acceleration bow, cockpit              | 5.8 g, 2.9 g           | 1.0 g, 0.45 g                                  |
| slams, stem buried, per minute              | 26, 5                  | 2, 0                                           |
| speed lost                                  | 0.53 kn                | 0.17 kn (6.55 to 6.39)                         |
| Reach: pitch rms, slams, speed lost         | 7.9°, 17, 0.18 kn      | 1.4°, 0, 0.13 kn                               |

Coefficient = R/(ρg·amplitude²·B²/L). No blow-up at 1/240 or 1/120 s (towed: 1/60 too). Cost per step: 57 µs (v3), 59 µs with heave and pitch, 370 µs with the sea summed naively.

## 4. GIFs

- `seaway-side-closehauled.gif`: 22 s real time; A (as proposed) throws her bow about, B (damped) is the one to compare with video.
- `seaway-astern-closehauled.gif`: same sail from astern, heel and roll.
- `response-curves.gif`: red law spikes at resonance, black reference.

## 5. Surprises, next

- Under sail the undamped law sustains 4 to 6° of pitching on flat water; towed, it decays. Switching off either suspected feedback alone did not stop it.
- With damping, the model's own surge force gives 75 to 85% of Gerritsma-Beukelman.
- Next: per-slice radiation with memory, then the response curves with no frequency supplied.

## 6. Caveats

- Case B's single frozen frequency is a stand-in, not a result.
- She sails at 6.4 knots, not 5: v3 is a knot fast.
- At 1/120 s sailing speed changes by about a knot; not traced.
- No published yacht data obtained.
- The lateral law still uses flat-water immersion; keel and rudder never leave the water.

## Change to the model

`model.js` (exact edits in `patch.py`; `C.SEA = false` gives v3 back):

1. State: heave, pitch, their rates, the water's vertical impulse.
2. Per section: added mass, breadth, area at the local wave height; w = heave rate + arm × pitch rate − U sin(pitch) − orbital velocity (Smith-attenuated).
3. Forces: ρg × (area under the attenuated wave − still-water area); −½ρ·0.6·B·|w|w; −U dP/ds, P = ρ·a33·w.
4. Total momentum: (M + Σρa33) × new rates + explicit part = old boat momentum + stored water impulse + F·dt. Slamming comes from a33 changing.
5. Old motions: wave pressure gives sway force and yaw moment, righting about the wave slope, orbital velocity in the lateral slices, wave-slope surge force, sail drive as pitch moment, rig feels pitch rate.
6. `C.RADIATION`: reference damping, off by default.
