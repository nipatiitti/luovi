# S2b: can physical additions make flapping well posed and the solver robust?

## 1. Verdict

**Killed for real-time use; flapping itself is no longer ill posed.** With bending stiffness and hysteresis, 32 and 64 panels agree on 2.8 to 3.0 Hz. But 16 panels do not, 240 Hz never survives with two passes, and the safe step shrinks with wind speed.

## 2. What was run

Same 2D boomed section as S2 (3 m chord, 8 m/s), plus:

- Bending stiffness 5e-4 N m per metre width for firm 250 g Dacron. Estimate: one search found no measurement; solid-sheet bound is 2.5e-3. Spinnaker nylon would be near 1e-6 (not run).
- Hysteresis: loss factor 0.1 at 5 Hz as a stiffness-proportional damper (estimate).
- Crimp: thread stiffness ramps up over 0.2% strain (from memory).
- Line search on the step's energy; forces-at-end-of-step integrator also tried.
- Luff shedding: S1's rule in first-panel form (0.4, equal to its 0.10).

Manoeuvres: sheet ease, a tack (wind swung across the centreline; boom crosses and fetches up on the sheet, no mast contact), head-to-wind flogging. Reference: 32 and 64 panels at 960 and 1920 Hz. Integrator radius 0.8 unless stated.

## 3. Numbers

| Case | Flapping | Note |
| --- | --- | --- |
| 32 panels, 960 / 1920 Hz | 2.8 / 3.0 Hz, 10.7 / 9.5 cm | reference |
| 64 panels, 960 Hz | 2.8 Hz, 10.2 cm | reference |
| Same, bending 2.5e-3 | 2.8 to 3.0 Hz, 10 to 12 cm | insensitive |
| 16 panels, 480 to 1920 Hz | 21 Hz, 1.8 cm | panel-scale ripple |
| 16 panels, 1920 Hz, 6 passes | 2.8 Hz peak, 3 cm | mixed |
| 32 or 64 panels, 240 or 480 Hz | blow up by 1.2 s | |
| 32 panels, no hysteresis / no bending | blow up at 0.7 s / 3.9 s | both needed |
| Wind 4 m/s; cloth half as heavy | 1.2 Hz; 2.8 Hz | rate follows wind, not cloth mass |
| (b) lumped air mass, 32 panels | 1.2 Hz, 12 cm | 2.3 times too slow |
| (d) polar only | blows up, or 28 Hz ripple | |
| 16 panels, bending 100 times real, 480 Hz | 2.2 Hz, 11.6 cm | within 21% and 15% |

Rate times chord over wind is 1.05; Mavroyiakoumou and Alben report 0.6 to 0.7 per half chord for light membranes, so about 1.2 to 1.4 if their rate is in cycles (weak comparison).

Solver, 16 panels, all three manoeuvres:

| Setting | Solves per second | Result |
| --- | --- | --- |
| 240 Hz, 2 passes, any damping, any addition | 480 | fails |
| 480 Hz, 2 passes, crimp and line search | 960 | survives at 8 m/s; fails at 12 and 16 |
| 720 Hz at 12 m/s; 960 Hz at 16 m/s | 1440; 1920 | survive |
| 240 Hz, 4 passes, radius 0.3 | 960 | survives at 8 m/s |

Sheet snatch in the flogging sail: (b) gave 15 snatches, peak 2.0 kN/m; (c) and the 1920 Hz run gave none; 32 panels at 960 Hz blew up. No agreed value.

## 4. GIFs

- `resolutions_side_by_side.gif`: 32 and 64 panels flap alike; 16 panels buzz; stiffened 16 panels flap nearly alike.
- `tack_aback_refill.gif`: sail empties, goes aback, boom crosses, refills on the mirror tack with the same sheet load.
- `sheet_tension_flogging.gif`: three versions hauled in while flogging; only the lumped one snatches.

## 5. Surprises, next

- Hysteresis does more than bending to stop the blow-up (both are needed); crimp is what lets two passes survive first fill.
- The crude luff-shedding rule blew up within 1.6 s on a full sail, because shed vortices ride along the cloth. Not a fair test.
- Honest fallback: resolve long waves only (16 panels with grid-scaled bending stiffness, about 60 steps per second per m/s of wind), fine flutter as a statistical load and a visual effect. Cost in feel: flapping about 20% slow, no leech buzz, sheet snatch not predicted.

## 6. Caveats

- Bending, loss and crimp values are estimates, not measurements.
- The stiffened fallback blew up once while hauling in; it is not yet robust.
- Line search adds residual evaluations not counted as solves.
- 2D, boom, wind-carried wake, 10 s windows.
