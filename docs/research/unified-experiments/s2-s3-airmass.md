# S2 the air has mass, S3 sheet snatch

## 1. Verdict

**S2 killed on two of three clauses; S3 survived for a sheet, killed for a cloth thread.** Air mass inside the solve is stable where explicit coupling explodes, and the sail fills, lifts its luff first and starts flapping by itself. But two Newton passes blow up when slack cloth first comes taut, and the flapping has no step-independent frequency.

## 2. What was run

2D section, 3 m chord, 8 m/s, 16 panels: tension-only chain, lumped-vortex lattice, leech vortex shed each step, wake carried by the wind, generalised-alpha integrator (spectral radius 1 is midpoint).

Two forced departures. A stiff boom, 2% shorter than the cloth: with a sheet alone the eased sail became a kite-like bag, then crumpled. Cloth velocity and force taken at the panel middle: the quarter/three-quarter rule gave negative air damping at panel scale.

Constants: air 1.225 kg/m3; cloth 0.3 kg/m2, 330 kN/m (critic 1); slack stiffness 0.001 of taut, boom-end mass 0.5 kg/m, polar 1.3 tanh(4.5 sin a / 1.3) (all assumed); sheet 150 kN (8 mm polyester); skin friction 0.008; vortex cut-off a quarter panel.

References: Tiomkin and Raveh as quoted by Mavroyiakoumou and Alben (opened); my model at 1920 Hz, 6 passes, 16 and 32 panels, which is good for onset and not for frequency.

## 3. Numbers

| Check                        | Model                                                        | Reference                          |
| ---------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| Lattice air mass             | 8.88 kg/m                                                    | 8.66                               |
| Flat membrane unstable below | 0.82 to 0.86 rho U2 chord                                    | 0.865, 0.89                        |
| (a) explicit, 240 Hz         | blows up at 0.05 s                                           | critic 1 agrees                    |
| (b) (c) (d), 2 passes        | blow up by 0.28 s                                            | 4 passes fill: 88 N/m, 8.8% camber |
| Luff inverts before aft half | (b) (c) 0.84 s earlier; (d) no                               | 0.84 to 0.93 s                     |
| Onset sheet length           | (b) 1.68, (c) 1.67, (d) 1.15 m                               | 1.67, 1.70                         |
| Sheet tension before onset   | (b) 47, (c) 49, (d) 18 N/m                                   | 42, 38                             |
| Flapping, radius 0.7         | all blow up within 1.7 s                                     | resolved blows up too              |
| Flapping, radius 0.3, 10 s   | (c) 3.0 Hz, (b) 1.2 Hz, (d) 17 Hz                            | 68 Hz (16 panels), 38 Hz (32)      |
| (c) at 480 Hz                | 19.6 Hz                                                      | as above                           |
| Snatch, 2 kg on sheet        | damped 2 passes +7% (240 Hz), -4% (480); midpoint -23%, +17% | 4.6 kN                             |
| Snatch, 0.1 kg on thread     | best +86% (240), +153% (480)                                 | 15.1 kN, 6% uncertain              |

## 4. GIFs

- `couplings_side_by_side.gif`: four couplings, same ease; (a) explodes, (b) and (c) fill, luff and ripple, (d) lets go early and buzzes.
- `fill_luff_flog_sheet_in.gif`: coupling (c) through fill, luff, flapping with live frequency, sheeting in.
- `sheet_snatch.gif`: line slack and taut, each method against the resolved tension.

## 5. Surprises, next tests

- The notes' 1.73 rho U2 L uses the half chord: the threshold is about 200 N/m, not 400, and it describes a sail filling. Luffing came from the luff pressure reversing at a boom angle of -7 degrees.
- A slack membrane in ideal flow is most unstable at the shortest wavelength, so flapping is whatever damping and panel size allow. Next: cloth bending stiffness and luff shedding, then repeat; a line search for two passes.

## 6. Caveats

- Flapping survives only at spectral radius 0.3, heavy numerical damping; nothing between 0.3 and 0.7 was scanned.
- Sheet snatch inside the flogging sail was not measured: the sheet stayed slack in every surviving run.
- Boom, 2D, no luff shedding, wind-carried wake; frozen flow steps untested.
