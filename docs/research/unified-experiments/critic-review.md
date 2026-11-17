# Critic's review of the kill experiments

Reruns are in scratch copies; my scripts are in `code/`. "Reproduced" means I ran the experimenter's code and got the same number. Four web lookups gave no usable reference, so literature statements are from memory and marked so.

## 1. Each verdict against its own numbers

| Experiment | My verdict on the stated verdict | Reproduced |
| --- | --- | --- |
| h1-h2 | H1 kill is real in the code but rests on an invented tanker shape. H2 survived only by changing the rule (lifting line dropped). | Tanker centre −0.158 against 0.068 of length at 2°; plates +2 to +6% |
| h1b | Fair. "Survived" is on per-hull means; 37 of 396 runs miss by over 15%. Drag due to side force, 23% low, is left out of the verdict and matters upwind. | 32 of 35 hulls rerun, all match |
| h3 | Kill sound (section 3). The Wigley "pass" hides a 45 to 60% overshoot at Froude 0.289. | Wigley 1.83 at 0.316 |
| h3b | Kill sound. The panel solve failing its own check is a failed tool, not evidence. | Not rerun |
| h4 | "Survived" is too generous: it means stable and monotonic. Nothing was compared with a boat and four surprises are model defects (section 2). Call it untested. | 5.6 s, 50%; 6.6 s, 71% |
| s1 | Fair. | Not rerun |
| s1b | Generous. Deep-sail lift at 0° is twice the measurement and drag past 16° is 35% low; reference read by eye from rigid round-nosed sections. | Not rerun |
| s2-s3 | Fair. The quoted air mass 8.88 is the 32-panel value; at the 16 panels used it is 9.05 (+4.5%). | 9.05 and 8.88 |
| s2b | Fair. | Not rerun |
| s4 | Kill sound (plate square to the wind is textbook). "Survived attached" is weak: induced drag is 0.85 then 0.73 of the theoretical minimum, which is impossible and worsens with refinement; Fujin drive is 80% high with guessed sheets; no drive peak with twist. | Lift 0.366, drag ratio 0.851 |

Other faults:

- **From memory:** ORC sail table (s4), fin stall points (h1b), class weights and wave stand-in (h4), separation constants (s1). The h4 wave stand-in (1.2% of weight at Froude 0.35) is about twice h3's tank value (about 0.6%).
- **Chosen after seeing the answer:** shed fraction 1 (then held out, the right repair); the fin attachment number (not held out); vortex decay of 10 chords, picked to bring square-on drag into the band.
- **GIFs** show what the captions say, and failures are in the captions. What could mislead a sailor: `h4_rudder_rates_fin.gif` varies rudder speed only, every tack going to 30°, so it does not test "use less helm"; the s2 and s2b "flapping" is a 5 to 12 cm ripple on a boomed section, not flogging; `s4-twist.gif` and `s4-slot.gif` interpolate between computed cases without saying so on screen; the body plan in `h3b_three_sums_five_hulls.gif` shows straight V sections for a round-bilged hull (hydrostatics agree, so probably coarse drawing).

## 2. The tack

I split the surge impulse from helm-over to minimum speed by source (`crit_tack.mjs`). Fin boat: lost sail drive −1040 N s, reduced friction and wave drag +640, rigid-body turning term −470, entrained water swung round −1180; total −1990, which is 50% of the boat's momentum. The result's "1650 of 1970" lumps the last two.

| Reported | Cause | Test (fin boat) |
| --- | --- | --- |
| Half the speed lost | **Slender-theory limit, not a bug.** The fill rule that gives the right lift also sets the water that turns with the boat; for a tall fin it tends to twice the true plate value (2470 kg here against about 1300 to 1500 kg from a 3D plate estimate). The coupling term itself is correct. | Entrained water halved: 50 → 39%, 5.6 → 5.2 s. Coupling off: 28%. Long keel 71 → 54%. |
| Slamming costs nothing | (1) Only rudder speed was varied. (2) Full leading-edge suction is kept at any angle, so the rudder's own drag cancels exactly. (3) The boat answers within a second and unloads the rudder. | Hard-over 10°, 20°, 30°, 35°: 12.3, 7.7, 5.6, 4.9 s; loss 46, 45, 50, 53%. With suction fading as loading saturates: 35° slammed 58%, 10° 47%. The slow tack loses as much because the placeholder sails give no drive for longer. |
| Long keel 1.2 times slower | **By construction:** the keel-hung rudder is a fully effective flap on a big keel, and the boat has the H-boat's weight. The morph with a separate rudder gives 13.4 s. Untested, not wrong. | Ratio stays 1.2 under every change here. |
| Wash removes 93% | **Slender far-wake limit.** Real figure about 50 to 80% (Delft keel and rudder work, from memory). Overstated, not absurd. | Wash × 0.6: steady rudder −0.9° → +0.1°, tack 6.5 s. |
| Spiky surge force | **Numerical:** a marker crossing an edge delivers about 1 N s in one sub-step. | Jump 272, 135, 51 N at spacing 0.05, 0.025, 0.0125 m. Spread each marker over its cell. |

All three changes together: fin 6.3 s and 39%, long keel 7.7 s and 53%. My factors are tests, not constants to adopt; the fix is a 3D added-mass rule and the reference is a logged H-boat tack.

## 3. Wave-making

**The kill is sound.** The reduction (ITTC-57 at 0.7 × waterline, no form factor) is the Delft series' own. Viscous pressure drag left in the tank number makes the true ratio worse. Independent check: the thin-ship sum for hull 1 at Froude 0.35 is 8.0 N, more than the measured total resistance of the same model with keel and rudder, 6.95 N (`michell_sys1.py`). A factor near 4 is large but in the known direction for beamy shallow hulls (from memory; no citable number found).

| Option | Cost | Gives | Risk |
| --- | --- | --- | --- |
| Delft regression (Keuning and Katgert) | About a day | Steady drag within series scatter | One surrogate; nothing for odd hulls |
| Nonlinear panel solver in the bake | Weeks to months; 4 to 11 h per hull | Any hull, in principle | High; still a steady table |
| Live wave field | Largest; not CPU-only | Visible wake | Coarse fields give poor drag |

**My choice:** the regression as anchor, the section-stack sum kept for ratios only (heel, trim, a hull lifting, two hulls interfering), where it did well. To stop surrogates multiplying, make the correction one continuous function of slenderness: the Wigley hull (length over cube root of volume about 7) needs a factor near 1, the Delft hulls (4.3 to 5.1) need 3.9. Smallest next experiment: run the existing sum on the slenderer Delft hulls already downloaded and see whether the factor falls smoothly. In transients a sailor will not feel a 20% error in wave drag.

## 4. Sails

**Supported model:** a steady 3D lattice for attached loading and interaction (slot, twist, aback), with one lagged separation state per strip fading the load into a flat-plate law. No free luff shedding in 3D. Dynamic cloth only with the lattice air-mass matrix inside an implicit solve at four passes or 480 steps a second and more. Flapping as long waves with grid-scaled bending, or as a visual effect.

| Open | Smallest next experiment |
| --- | --- |
| Stall onset moves with panel count (drive 0.95, 1.08, 1.14 at 120°) | Use s1b's series-fitted suction (panel-independent to three decimals); three resolutions; onset within 1° |
| Induced drag below the minimum | Elliptic wing, far-wake force against panel force |
| Cambered lift, early stall, low drag | Strip state against one soft-sail dataset with tabulated shape |
| Downwind level | Look up the ORC table; main and jib with blanketing |
| Flapping | Treat as cosmetic; keep only luffing onset, which s2 got right (1.67 to 1.68 against 1.67 to 1.70 m of sheet) |
| Mast, stays, 3D cloth | Never run: one mast, forestay and backstay, static, against a hand calculation |

## 5. Scoreboard

| Claim | Status | Number |
| --- | --- | --- |
| Hull side force from section momentum | Survived, changed rule | 35 hulls, mean −7 to +13% |
| One sharpness number for shedding and drag | Killed (on a caricature) | Tanker centre 0.23 length off |
| Fins as lifting-line strips | Changed rule, stall open | Plates +2 to +6%; foil fins +15 to 23% |
| Wave drag from the slices, keelboats | Killed | 3.4 to 4.2 times high |
| Same, slender hulls and interference | Survived, weak references | Wigley 1.83 against 1.79 to 2.00 |
| Time-domain manoeuvring | Untested against a boat | Stable at entrained water 14 times mass |
| Keel wake on rudder | Untested, overstated | 93% against 50 to 80% |
| Luff shedding, flat and stalled 2D | Survived | Square-on drag 2.07 to 2.29 |
| Same, cambered 2D | Changed rule (leech separation) | Maximum lift 6 to 13% high |
| Same, separated 3D | Killed | Dead-run drag 2.4 to 3.0 against 1.2 to 1.35 |
| Attached 3D and slot | Survived on trends only | Lift +3 to +7% |
| Air mass inside the implicit solve | Survived | Explicit blows up at 0.05 s |
| Two passes at 240 steps a second | Killed | Blows up by 0.28 s |
| Resolution-independent flapping | Killed at real-time size | 21 Hz against 2.8 Hz |
| Sheet snatch | Sheet survived, thread killed | +7%; +86% |
| Rig as one tension structure | Untested | none |

**Water, revised.** Each section trades sideways momentum with water slices the hull slides over; every section keeps all it lets go. Sharpness exp(−(radius/draft)/0.1) sets cross-flow drag only, 2.0 sharp to 0.6 round, growing over 1 draft of sideways travel (Delany and Sorensen, Hoerner, Sarpkaya). Slices fill over a quarter of the local span (derived from the 2D slope); loading is limited to 1.1 (thin foil), with one attachment number per slice run for stall (chosen once, not held out). Changes in time act through entrained water in the mass matrix, needing a 3D reduction for fins (open, about 0.5). Friction ITTC-57; surge entrained water 5% (assumed); wave drag from the Delft regression.

**Air, revised.** A steady lattice gives attached loads. Each strip's separation state runs between suction 0.5 and 1.0 (a priori, never varied), lags 1.5 chord transits (Beddoes-Leishman, from memory), with separated normal force 1.2·s/(0.56+0.44·s) and dead-run drag 1.17 put in by hand. The 2D support uses luff suction 0.10 (flat-plate break near 6°), Stratford 0.39, shear-layer strength 0.6 (Katz), boundary layer from 10% chord, core 0.3 panel, decay 10 chords (chosen). Cloth 0.3 kg/m², 330 kN/m; bending 5e-4 N m and loss factor 0.1 are estimates.

## 6. The visual sailing test

**Minimum honest version:** the h4 hull model (surge, sway, yaw, heel) with three fixes: markers spread over their cell, suction fading with loading, the fin attachment number. Rigid sail shapes set by mainsheet, jib sheet and a stated twist rule, forces from a table precomputed with lattice plus strip state (the live lattice takes 62 to 213 ms a step, too slow to steer). Controls: tiller, both sheets, crew weight. Views from above and from astern, with force arrows, a stall light per sail, speed, leeway, rudder angle and load.

**Placeholders, in a fixed strip on screen, their arrows dashed:** "wave drag: Delft table, not the model"; "sails: rigid, no cloth, no flapping, plate law past stall"; "water carried round in a turn: slender estimate × 0.5, unverified"; "keel wash on rudder: likely too strong"; "flat water, steady wind".

**Manoeuvres:**

1. A tack at 10°, 20° and 35° of helm: speed lost, distance lost to windward, time back to speed.
2. A puff close-hauled three ways: hold everything, ease the main, let the tiller go.
3. Bearing away to a broad reach with the main pinned, then eased: the boat should refuse until the sheet goes.
4. Stop and start: luff and coast, sternway with reversed helm, back the jib, sheet in and accelerate.
