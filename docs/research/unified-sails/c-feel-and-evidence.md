# C. Feel and evidence: what the sails and rig must get right

This report proposes no model. It says what any candidate must reproduce for a sailor to recognise the boat, with the evidence, and proposes tests to judge candidates by.

Labels: **[E]** established in a source I opened; **[B]** standard knowledge not re-opened this session (the shared page-fetch budget ran out, so treat as unverified); **[I]** my inference; **[S]** speculation.

## 1. What feel is made of on the sail side

A sailor never feels a lift coefficient. He feels four things:

1. **Where the sail's force is and which way it points**, felt as heel, helm load and acceleration. Trim mostly moves and redirects the force, and changes its size less. On the dynamometer boat Fujin, going from 4.5° to 24.9° of mainsail twist at fixed apparent wind changed thrust by about 18% and side force by about 20%, with thrust peaking near 15° of twist [E, Tahara et al.].
2. **How the force builds and dies in time**: the puff, the lull, the tack, the wave. Sail forces lag the apparent wind and form a hysteresis loop under pitching at periods of 1.5 to 6 s; a flexible rig gives a bigger loop than a rigid one with the same shape [E, Augier et al.]. Quasi-steady coefficients fed the instantaneous apparent wind grossly over-predict the lift swing in a pitching 3D case, where the real swing is about 5 to 10% [E, Persson et al.].
3. **What the cloth shows**: luff lifting, telltales, leech opening, spinnaker luff curling, the jib backing. These are the trim instruments, and measured pressures match them: with the jib eased until the telltales lifted, the leading-edge pressure difference went negative (sail about to collapse); sheeted until they streamed, a strong leading-edge suction peak appeared with separated flow over the last 40% of the mid-height section [E, Viola and Flay].
4. **Loads in the hand**: sheet and tiller. Spinnaker sheet load has a local maximum just after the luff starts to curl [E, Aubin et al.].

Requirement [I]: judge a candidate on how force direction, centre of effort and visible shape respond to each control and to time. One that matches a polar but answers trim through a single "power" knob fails, however accurate its speeds.

## 2. Effects ranked by how much a sailor notices them

The ranking is my inference: I could not read the simulator and coaching studies on perception (fetch budget), which is this report's weakest point. The owner is the available instrument; section 7 is built around that.

| #   | Effect                                                                                             | Mechanism                                                                                                                                                                                                                                                     | Minimum a model needs                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Puff response: heel, then helm, then speed                                                         | Wind speed rises before the boat accelerates, so apparent wind grows and swings aft (H-boat, 5 to 7 m/s puff: 27° to 30°, dynamic pressure up 60% [I, computed]); force rises with a short lag, the top of the sail is hit first and hardest                  | Force follows local wind over height; centre of effort height is an output; a build-up lag of a few chord-lengths of travel (about 0.5 to 1 s on an H-boat [I])                      |
| 2   | Easing the sheet depowers smoothly, then the sail luffs from the front                             | Angle of attack falls; pressure difference at the luff reverses first [E, Viola and Flay]                                                                                                                                                                     | Force must depend on where along the chord the flow is, not only on a whole-sail angle; luff must go before the leech                                                                |
| 3   | Twist controls (mainsheet tension, vang, traveller) change heel more than speed                    | Head opens, upper sail unloads, centre of effort drops [E, Fujin: 20% side force for 20° twist]                                                                                                                                                               | Vertical load distribution resolved in at least 4 to 6 bands; leech tension as a real load path                                                                                      |
| 4   | The tack: jib luffs, flogs, backs and pushes the bow, main swings and refills, speed loss          | A backed headsail gives no more drag than a flogging one but a much larger turning moment; mainsail added mass matters in roll, measured at 76% of strip theory [E, Gerhardt et al. abstract]                                                                 | Valid forces from 0° to 30° apparent on both sides; sail inertia including air added mass; refill time not instant                                                                   |
| 5   | Main and jib as one system: jib sheeted in backwinds the main luff; pointing limit set by the pair | Each sail sits in the other's flow field; main suction is much lower than the jib's because of jib downwash [E, Viola and Flay]; the jib sits in the main's upwash [B, Gentry]                                                                                | Mutual influence on local flow angle, both directions, depending on slot width. A one-way wake deficit cannot do it                                                                  |
| 6   | Overtrim stalls quietly: boat feels dead, heels, goes slow, leech telltales hide                   | Trailing-edge separation; force rotates aft, drag rises                                                                                                                                                                                                       | Stall that grows from the leech and is gradual on cambered soft sails, with some hysteresis [B]                                                                                      |
| 7   | Depth controls (outhaul, backstay, cunningham, halyard): gears                                     | Fujin held draft near 10% and varied twist; depth sensitivity itself I did not get numbers for                                                                                                                                                                | Camber and draft position must enter the aero, and mast bend and forestay sag must change them                                                                                       |
| 8   | Spinnaker: luff curl as the trim signal, collapse and refill                                       | Curling at reduced frequency f·√S/U ≈ 0.4; drive peaks up to 10% higher just past curl onset; drive fluctuation doubles from about 2.5% to 6%; overtrimming costs more than overeasing; the useful window is about 23 cm of sheet on a J/80 [E, Aubin et al.] | Luff region free to fold; leading-edge suction that appears only when the luff is right. For an H-boat spinnaker of about 36 m² in 5 m/s apparent this is a curl about every 3 s [I] |
| 9   | Flogging: noise, shaking, drag, no drive                                                           | Flutter; frequency rises with wind speed, falls with sail size [B]                                                                                                                                                                                            | Mean drag and near-zero drive right; a plausible frequency                                                                                                                           |
| 10  | Apparent wind twist with height                                                                    | Slower true wind low down. Upwind 2 to 4° foot to head, running 10 to 30°, fast catamaran reaching 8 to 15° [I, computed]                                                                                                                                     | Per-height apparent wind; second order upwind                                                                                                                                        |
| 11  | Mast and rigging drag                                                                              | Windage is a separate term even in handicap models [E, ORC]; bubble behind a fixed mast [B]                                                                                                                                                                   | A drag term per spar; a degraded main luff unless the mast rotates                                                                                                                   |

The current plan against this [I]: a per-triangle polar gives rows 1, 9, 10 and 11 and part of row 3. It cannot give rows 2, 5 and 8, since a triangle's pressure knows neither its chordwise position nor its neighbours, and it gives row 4 without lag.

## 3. The five rigs: what each must do

**H-boat (fractional sloop, spinnaker).** Backstay must bend the mast, flatten the main, open the upper leech and tighten the forestay at once; this is the sharpest single test. The main dominates, so mainsheet and traveller carry the helm balance. The spinnaker must rotate to windward of the main as the pole comes aft, curl at the luff, and collapse when sailed too high or by the lee.

**Gaff schooner.** The gaff sags to leeward, so the main twists hard unless peak halyard and vang resist. Three or four sails stand in line, each in the others' upwash and downwash, so sail-to-sail influence is the whole character. Pointing is visibly worse than a sloop's.

**Beach cat (rotating mast, full battens).** The boat is faster than the wind on a reach, so apparent wind stays 25 to 45° forward on nearly every heading [I, computed]. A puff swings the apparent wind aft; the sailor bears away, accelerates and it comes forward again (6 to 8 m/s puff at 110° true: 43°, 55°, back to 44°). Mainsheet tension works as a twist throttle. The battened sail does not luff softly: it holds its shape, snaps across in a tack, and stalls without warning. The rotated mast cleans the leading edge. This feel needs low-drag attached flow modelled well.

**Class40 (asymmetric sails).** The same apparent-wind logic downwind. The asymmetric must curl at the luff, collapse when the boat bears away into the main's blanket, refill, and blow through a gybe with no script. The broach is spinnaker heeling moment rising as apparent wind swings forward.

**Full-rigged ship.** Square sails fill no closer than six points (67.5°) off the wind and most ships sailed at seven to eight; leeway is about one point (11°), half that for a good frigate; yards are limited forward by the forestay and aft by the lee shrouds [E, Willis]. Tacking: bear away for speed, spanker amidships and headsails dropped to luff her, "mainsail haul" at the right moment, then headsail sheets hauled to windward to push the bow off; hauled too early she hangs in irons. Wearing takes about four ship lengths even in the best frigates and turns through 20 points. Backing the mizzen topsail is the brake; heaving to is one mast aback, one full; sternway is real but loads the forestays and bobstay [E, Willis]. The barque Tenacious carried 5 to 10° of weather helm, and observed speeds never beat predictions [E, Deakin]. A vortex lattice matched tunnel lift for a deep, low-aspect square sail up to 30° apparent, and drag once 0.15 of friction drag was added, in a Japanese study made to simulate tacking a square-rigged ship [E, Kyushu tunnel paper]. So the ship needs brace angles with hard stops, valid aback forces, sails blanketing sails down a line of masts, and turning moment from fore-and-aft imbalance. It does not need fine draft control.

## 4. Feel: what should be recognisable

Each control has its own signature (section 2, rows 2, 3, 7); if two feel the same, the model is wrong. In a puff: heel first, weather helm second, speed third. In a tack the jib backs briefly and helps the bow; with too little speed an H-boat still tacks, a schooner hesitates, a square-rigger stops. In a gybe the boom arrives with momentum. Going wrong means oversheeted and slow, pinching until the jib luff lifts, a spinnaker broach, or being caught aback.

## 5. How far the evidence can be trusted (replaces cost and determinism)

Cost and replay belong to the candidates. Every test in section 7 is a scripted input, so tests are replays.

- **ORC coefficients.** By its own documentation the sail model is a maximum-lift and parasitic-drag envelope against apparent wind angle; the sail characteristics "were derived empirically", "have been adjusted and modified a number of times in order to follow the sail performance development", last in 2016; depowering is two scalars, flat (minimum 0.42, from tunnel tests) and reef, chosen by an optimiser [E, ORC VPP 2023]. For a Laser, ORC-based total drag came out 0.20 against about 0.27 measured, yet upwind speeds matched trials well [E, Day]. Judgement [I]: trust an ORC certificate for the speed of a well-trimmed boat to a few percent, because rating fairness tuned the whole chain. Do not trust the coefficients as aerodynamic truth (errors of 20 to 30% in a component can cancel against the hull model), and they say nothing about a wrongly trimmed sail, transients, or angles below where a sail fills. A 5% polar gate proves the sum, not the sails.
- **Open data to check against.** Fujin: four fully tabulated cases with flying shape coordinates, conditions and coefficients, plus the twist series [E]. Aubin et al.: J/80 spinnaker drive, side force and sheet load against sheet length at three wind angles [E]. Viola and Flay: pressure distributions, in figures only [E]. Unsteady experimental data are scarce [E, Persson].
- **Not found:** measured shroud, stay and sheet loads; gaff data; flogging loads.

## 6. Where this angle breaks

- The ranking in section 2 is reasoning, not measurement. The owner should correct it before it is used as a yardstick.
- Most numbers come from 24 to 34 ft sloops. For the gaff schooner and the catamaran the requirements are mechanisms, not measurements.

## 7. Proposed "good enough" tests

Each is a scripted scenario with an expected outcome and, where data exist, a loose band. Verdicts are agreed jointly, not gated.

1. **Fujin twist sweep.** Rebuild the published sails; vary twist 5 to 25° at 30° apparent. Pass: side force changes about 20%, thrust less, thrust peaks at intermediate twist, centre of effort falls with twist.
2. **Fujin angle sweep.** 20 to 38° apparent: lift coefficient rising from about 0.9 to 1.6.
3. **Ease-to-luff.** Ease the jib slowly at fixed heading. Pass: luff lifts first, force falls smoothly, no jump, and pulling back in retraces nearly the same path.
4. **Slot.** Sheet the jib in with the main fixed: the main luff must backwind. Remove the jib: the main must need easing or stall. Fails by construction if sails only shadow each other.
5. **Step puff.** 5 to 7 m/s in 2 s. Pass: heel peaks before speed; helm load rises; force lags wind by a fraction of a second, not zero and not seconds.
6. **Pitching.** Force the mast to pitch at 2 to 5 s periods: a hysteresis loop exists, and the force swing is smaller than quasi-steady predicts.
7. **Tack.** Scripted helm at three turn rates on the H-boat: jib backs and adds turning moment; speed loss ordered by turn rate. The same script on the ship without backed headsails stalls in irons; with them it completes.
8. **Spinnaker curl.** Ease the sheet in steady wind: periodic curl begins, near f·√S/U ≈ 0.4; mean drive peaks just after onset; overtrimmed is worse than slightly overeased.
9. **Square rig limits.** Braced sharp, the ship holds six to seven points with about a point of leeway; mizzen topsail aback slows her; main yards aback and fore full holds her hove to.
10. **Cat puff.** Bearing away in a puff ends with apparent wind angle within a few degrees of where it started, at higher speed.
11. **Blind trim panel.** The owner sails two candidates with labels hidden and one control randomly disabled per run; he names the dead control and the better boat. This is the test that decides.

**Cheapest one-day experiment:** tests 1, 3 and 4 on a static rig with no hull. The current per-triangle polar is predicted to fail 3 and 4.

## 8. Sources

- [Tahara, Masuyama, Fukasawa, Katori 2012, Fujin dynamometer boat](https://core.ac.uk/download/322407421.pdf): read in part (machine summary of full text)
- [Viola and Flay 2011, sail pressures full scale, tunnel, numerical](https://www.pure.ed.ac.uk/ws/files/12967578/Viola_Flay_2011OE.pdf): read in part; figures not readable
- [Fossati et al., Lecco Sailing Yacht Lab](https://re.public.polimi.it/bitstream/11311/989927/1/PaperLIH_Fossati.pdf): read in part; method only, no data used
- [Aubin et al. 2017, spinnaker curling in the Auckland twisted flow tunnel](https://sam.ensam.eu/bitstream/10985/14919/3/IRENAV_INNOVSAIL_2017_AUBIN.pdf): read in part
- [Augier et al., flexible sail plan under pitching](https://sam.ensam.eu/bitstream/10985/12555/1/Augier-PhysicsofSports.pdf): read in part
- [Persson, Larsson, Finnsgård 2024, unsteady upwind sails by indicial response](https://research.chalmers.se/publication/540485/file/540485_Fulltext.pdf): read in part
- [Gerhardt et al. 2009, Tacking in the Wind Tunnel](https://www.sciencegate.app/document/10.5957/csys-2009-012): abstract only
- [Day 2017, performance prediction for sailing dinghies](https://strathprints.strath.ac.uk/59980/1/Day_OE_2017_Performance_prediction_for_sailing_dinghies.pdf): read in part
- [ORC VPP Documentation 2023](https://orc2.orc.org/rules/ORC%20VPP%20Documentation%202023.pdf): read in part (chapter 5 opening)
- [Willis 2003, sailing square sails](https://www.ancientportsantiques.com/wp-content/uploads/Documents/ETUDESarchivees/Navires/Kyrenia/SailingSquareSails-Willis2003.pdf): read in part
- [Deakin 2002, Tenacious model tests against full scale](https://wumtia.soton.ac.uk:443/sites/default/files/uploads/pages/RINA2002BD.pdf): read in part
- [Kyushu tunnel and vortex lattice for a square sail, tacking simulation (Nippon Foundation library)](https://nippon.zaidan.info/seikabutsu/2003/00574/contents/0422.htm): read in part (section 6 only)

Not opened, so not relied on: Gentry's slot-effect articles, the instrumented J/80 load papers, Deparday's full-scale spinnaker work, and every simulator perception study. A Russian-language search on tacking square-riggers returned only general pages.
