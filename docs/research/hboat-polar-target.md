# H-boat performance polar target

Research for issue #5, 2026-10-21. Question: which citable published performance polar or ORC certificate gives the H-boat's steady speed at 60, 90 and 120 degrees true wind angle at 8 and 16 knots true wind, and VMG upwind and downwind; which sail configuration and loading each number assumes; and what tolerance the benchmark should use.

## Answer in brief

- **Recommended target: the ORC 2026 club certificate polar of the standard H-boat**, as printed for SUI 174 "Memory" (RefNo 03080004SKP, issued 2026-06-09). NED 94, NOR 76, NOR 81 and NOR 94 carry identical inputs and identical numbers, so the polar is effectively the class's reference under the current VPP [C26]. NOR 76 also holds an ORC **non-spinnaker** certificate from the same VPP (RefNo 03440004NF7) [N26]. That certificate gives a main-and-jib-only polar for a first benchmark that runs without the spinnaker.
- **Numbers (knots, VPP 2026):**

  | Point | 8 kn TWS | 16 kn TWS | Sails the VPP chose |
  | --- | --- | --- | --- |
  | Beat VMG (angle) | 3.37 (42.2°) | 4.26 (38.2°) | main + jib |
  | 60° TWA | 5.25 | 6.19 | main + jib |
  | 90° TWA | 5.61 | 6.64 | spinnaker at 8 kn; at 16 kn the two sets are within 0.5 % |
  | 120° TWA | 5.49 | 7.26 | spinnaker |
  | Run VMG (angle) | 3.85 (152.1°) | 6.11 (177.2°) | spinnaker |

  The same points without a spinnaker [N26]: 90° 5.33 and 6.67, 120° 4.83 and 6.59, run VMG 3.38 and 5.80. Beat and 60° are unchanged.
- **Cross-check: the ORC 2020 One Design certificate** that issue #2 found [OD20]: beat VMG 3.32 and 4.28, 60° 5.35 and 6.28, 90° 5.75 and 6.80, 120° 5.66 and 7.41, run VMG 3.88 and 6.22. It differs from the 2026 polar by at most 3.1 % at these ten points. Across VPP 2017 to 2026 the spread is at most 3.7 % (§3).
- **Loading.** Lightship 1,454 kg. The declared maximum crew weight is 300 kg, which is the class's World Championship crew limit [CR22 4.1]. The ORC feed reports a sailing displacement of 1,869 kg [C26]. The VPP hikes the crew 0.5 m outside the sheerline (CEXT 0.50) and optimises the crew's transverse position at every point [VPP26 §4.4.3]. The 2020 certificate is the same boat with 1,456 kg lightship, a 338 kg default crew and the same 300 kg maximum [OD20].
- **Environment the numbers assume.** TWS is measured at 10 m with a log profile of roughness z0 = 0.005 m [VPP26 §7.1]. The sea is not flat: the VPP adds resistance in waves for a wave spectrum whose energy grows with TWS [VPP26 §6.8]. Printed speeds also carry a dynamic allowance and an age allowance, each below 0.5 % (§2.4). **The benchmark scenario has to reproduce the wind profile**, or the sails see about 9 % more wind than the VPP assumed.
- **Tolerance: keep 5 % on boat speed at each fixed-TWA point and on both VMGs.** 5 % is wider than the ORC VPP's own drift across versions for this boat (at most 3.7 %), so a correct model does not fail on the choice of VPP year. It is narrower than the VPP-to-reality scatter that published comparisons show, which is acceptable because the benchmark compares one model with another, not with sailing data. Beat and gybe angles should be logged but not gated. §4 has the reasoning and its limits: 5 % in speed is a loose check on forces at the 16 kn reaching points.
- **Open questions:** whether to sail the benchmark in flat water or in the ORC wave spectrum; how the feed's 1,869 kg sailing displacement splits between crew, gear and sails; and whether the H-boat definition's sail areas follow the 2026 certificate (main 15.85 m²) or the 2020 one (15.55 m²). §5 has these.

## Sources read

- **[C26]** ORC public data feed, 2026 club certificates of individual H-boats, fetched 2026-10-21 as JSON (`Allowances` in seconds per mile, converted here as 3600/TA). SUI 174 "Memory", RefNo 03080004SKP: https://data.orc.org/public/WPub.dll?action=DownBoatRMS&RefNo=03080004SKP&ext=json (certificate viewer: https://sas.orc.org/open.html?kind=cc&id=03080004SKP). The identical certificates are NED 94 (04310004SJF), NOR 76 (03440004NA1), NOR 81 and NOR 94. Also read: SUI 159 (heavier, 1,532 kg) and G-989 (338 kg crew). Country lists: https://data.orc.org/public/WPub.dll?action=DownRMS&CountryId=NOR&ext=json, and the same for SUI, NED, ITA and others.
- **[N26]** ORC 2026 non-spinnaker club certificate, NOR 76 "Lille My", RefNo 03440004NF7, issued 2026-04-28: https://data.orc.org/public/WPub.dll?action=DownBoatRMS&RefNo=03440004NF7&ext=json. NOR 94 has an identical one.
- **[OD20]** ORC Club One Design Certificate, H-boat 2020, No. 21590, issued 10/01/2020, VPP 2020 1.00: https://data.orc.org/public/od/2020/hboat.od.pdf. Both pages were read.
- **[OD17–19]** The same reference certificate for earlier VPP years, read for version drift: https://data.orc.org/public/od/2017/hboat.od.pdf (VPP 2017 1.00), https://data.orc.org/public/od/2018/hboat.od.pdf (2018 1.00) and https://data.orc.org/public/od/2019/hboat.od.pdf (2019 1.01). The 2016 file (https://data.orc.org/public/od/2016/hboat.od.pdf) has no speed table in its extractable text. None exists after 2020 at that path.
- **[VPP26]** ORC VPP Documentation 2026: https://orc.org/uploads/files/Rules-Regulations/2026/ORC-VPP-Documentation-2026.pdf. Read: §3.1 (solution and optimisation), §3.6 (dynamic allowance), §4.2.2 (sailing trim, crew and gear weight), §4.4.3 (crew righting moment), §5.2 (sail crossover, no-spinnaker sail set), §6.8 (added resistance in waves), §7.1 and §7.2 (wind triangle, wind profile, sail selection) and §8.1 (printed velocity predictions). The 2023 edition cited by the design doc says the same in every passage used here: https://orc2.orc.org/rules/ORC%20VPP%20Documentation%202023.pdf
- **[RS26]** ORC Rating Systems 2026, rules 102 (crew weight) and 107.5 (crew arm extension): https://orc.org/uploads/files/Rules-Regulations/2026/ORC-Rating-Systems-2026.pdf
- **[CR22]** International H-Boat Class Rules, effective 17 August 2022: https://h-boat.org/files/data/documents-rules/hbt_cr_20220805.pdf. Read: 3.7 (weight of boat), 3.8.4 (hiking) and 4.1 (crew).
- **[SG]** ORC Speed Guide Explanation (ORC, hosted by US Sailing, 2018): https://www.ussailing.org/wp-content/uploads/2018/01/Speed-Guide-Explanation.pdf
- **[B21]** Byrne, C., Dickson, T., Lauber, M., Cairoli, C. and Weymouth, G. (2021). Using machine learning to model yacht performance. MARINE 2021: https://journals.ed.ac.uk/MARINE2021/article/download/6837/9034/
- **[D17]** Day, A. H. (2017). Performance prediction for sailing dinghies. Ocean Engineering 136, author's accepted version: https://pureportal.strath.ac.uk/files-asset/64217569/Day_OE_2017_Performance_prediction_for_sailing_dinghies.pdf
- **[I2]** Issue #2 findings, §4.1: `docs/research/ship-definition-shape.md` on `research/ship-definition-shape`. **[I14]** Issue #14 resolution comment (ship definition contract v1).

Searched for but not found in an open copy: a published full-scale comparison that states a VPP-to-measured boat speed error in percent for a keelboat under steady conditions. A JST 2021 paper that compares a CFD-VPP with the ORC VPP on the SYRF 14 m yacht (https://onepetro.org/JST/article-pdf/6/01/133/2478355/sname-jst-2021-08.pdf) was behind a block. The Fujin full-scale work (Masuyama, Ocean Engineering 2014) was abstract-only.

## 1. The target polar

### 1.1 Which certificate

Two kinds of ORC certificate carry an H-boat speed table:

- The **One Design reference certificate** at `data.orc.org/public/od/<year>/hboat.od.pdf`. It is a static PDF stamped "Invalid for Racing", built from the class offset file `HBoat.od` [OD20]. ORC published it for 2016 to 2020 only (§Sources).
- **Club certificates of individual boats**, served by the ORC data feed [C26]. In the 2026 lists, five H-boats in three countries carry identical inputs: lightship 1,454 kg, IMSL 6.461 m, WSS 12.11 m², main 15.85 m², jib 10.48 m², symmetric spinnaker 32.12 m², declared crew 300 kg. Their speed tables are identical to the hundredth of a knot. The only H-boats that differ are SUI 159, measured 78 kg heavier, and G-989, with 338 kg crew.

The 2026 polar is recommended as the target for four reasons:

1. It is the **current VPP**, which matters because ORC changed the wind profile roughness from 0.001 to 0.005 m in 2022 [VPP26 §7.1, footnote 1]. The 2020 certificate predates that change.
2. Five boats' certificates agree on it to the hundredth of a knot, so it describes the class, not one hull.
3. It has a **matching non-spinnaker certificate** from the same VPP and the same boat [N26]. Comparing the two shows which sail set the VPP chose at each point (§1.3). It also gives a full set of main-and-jib targets, so the first benchmark does not have to wait for the spinnaker.
4. Its declared crew of 300 kg is the class's own crew limit [CR22 4.1], which a load condition can cite directly.

The cost is citation stability. Club certificates are reissued every year and the feed serves only current ones. The `data-hboat` source file should therefore carry the numbers by value, with RefNo, issue date and retrieval date. Per [I14], every number in the definition and scenario is cited by value anyway. The 2020 PDF stays as a stable cross-check.

### 1.2 Numbers at the benchmark points

Speeds in knots; angles are the VPP's optimum beat and gybe angles.

| Point | 2026 club [C26] 8 kn | 2026 club 16 kn | 2026 non-spin [N26] 8 kn | 2026 non-spin 16 kn | 2020 OD [OD20] 8 kn | 2020 OD 16 kn |
| --- | --- | --- | --- | --- | --- | --- |
| Beat angle | 42.2° | 38.2° | 42.2° | 38.2° | 42.8° | 39.0° |
| Beat VMG | 3.37 | 4.26 | 3.37 | 4.26 | 3.32 | 4.28 |
| 60° | 5.25 | 6.19 | 5.25 | 6.19 | 5.35 | 6.28 |
| 90° | 5.61 | 6.64 | 5.33 | 6.67 | 5.75 | 6.80 |
| 120° | 5.49 | 7.26 | 4.83 | 6.59 | 5.66 | 7.41 |
| Run VMG | 3.85 | 6.11 | 3.38 | 5.80 | 3.88 | 6.22 |
| Gybe angle | 152.1° | 177.2° | 158.6° | 179.3° | 152.0° | 180.0° |

The full 2026 table (TWS 4 to 24 kn, TWA 52 to 150° plus VMG) is in the feed and should be carried whole in `data-hboat`, so later benchmarks can add points without new research. For reference, the 2026 club polar at the other printed angles:

| TWA | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 20 | 24 kn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Beat VMG | 1.91 | 2.76 | 3.37 | 3.81 | 4.08 | 4.20 | 4.26 | 4.29 | 4.22 |
| 52° | 3.00 | 4.21 | 5.05 | 5.53 | 5.79 | 5.93 | 6.00 | 6.06 | 6.06 |
| 60° | 3.23 | 4.44 | 5.25 | 5.70 | 5.95 | 6.10 | 6.19 | 6.27 | 6.29 |
| 75° | 3.37 | 4.58 | 5.38 | 5.84 | 6.11 | 6.31 | 6.48 | 6.66 | 6.75 |
| 90° | 3.42 | 4.74 | 5.61 | 6.04 | 6.29 | 6.43 | 6.64 | 7.07 | 7.31 |
| 110° | 3.43 | 4.76 | 5.64 | 6.12 | 6.49 | 6.84 | 7.16 | 7.55 | 7.89 |
| 120° | 3.27 | 4.57 | 5.49 | 6.03 | 6.43 | 6.83 | 7.26 | 8.02 | 8.70 |
| 135° | 2.83 | 4.07 | 5.03 | 5.76 | 6.19 | 6.57 | 7.00 | 8.06 | 9.94 |
| 150° | 2.33 | 3.47 | 4.44 | 5.26 | 5.85 | 6.24 | 6.60 | 7.48 | 8.75 |
| Run VMG | 2.02 | 3.00 | 3.85 | 4.58 | 5.25 | 5.73 | 6.11 | 6.79 | 7.63 |

### 1.3 Sail configuration behind each number

- **What the VPP sails with.** The largest main, the largest headsail and each declared largest off-wind sail. At every point the program keeps the sail combination that gives the best speed [VPP26 §7.2, §8.1]. For the H-boat that is main 15.85 m² (15.55 m² in 2020), jib 10.48 m² and a symmetric spinnaker of 32.12 m² on a pole. There is no asymmetric and no flying headsail, and the cloth is woven polyester [C26; OD20]. Sail trim (the VPP's flat and reef parameters) and the crew's transverse position are optimised at every point [VPP26 §3.1].
- **What the non-spinnaker certificate adds.** It sails main and jib, plus a "jib downwind" set that uses the asymmetric-on-centreline coefficients at 1.064 times the jib area, from 60 to 180° TWA, and keeps the faster of the two [VPP26 §5.2, "No spinnaker configuration"].
- **Which set won, read from [C26] against [N26]:**
  - Beat VMG and 60° are the same in both certificates at 8 and 16 kn: main and jib.
  - 90° at 8 kn: 5.61 with spinnaker against 5.33 without, 5.3 % faster, so the spinnaker is the chosen set.
  - 90° at 16 kn: 6.64 against 6.67. The two sets are within 0.5 %, and the published data cannot say which one the club certificate used. The non-spinnaker certificate is 4 kg lighter (sailing displacement 1,865 kg against 1,869 kg), so a small difference in the jib's number is expected even if the jib is chosen.
  - 120°: 5.49 against 4.83 at 8 kn (+13.7 %) and 7.26 against 6.59 at 16 kn (+10.2 %): spinnaker.
  - Run VMG: spinnaker at both speeds.
- **Consequence for the benchmark.** Of the design doc's points, the main-and-jib set is enough for beat VMG and both 60° points. The 90° point at 8 kn and both 120° points need the spinnaker to reach the club-certificate number. [I14] put the spinnaker, pole and gear in the v1 H-boat definition and left to this ticket whether the first polar benchmark flies it. The recommendation is two benchmarks:
  1. **Main and jib**, against the non-spinnaker certificate [N26] at all ten points.
  2. **With spinnaker**, against the club certificate [C26] at 90° in 8 kn, 120° in 8 and 16 kn and run VMG.

  The first can pass at build step 3 without spinnaker handling in the driver.

## 2. Loading and environment the numbers assume

### 2.1 Mass

| Item | 2026 club [C26] | 2020 OD [OD20] | Source of the rule |
| --- | --- | --- | --- |
| Lightship (measurement trim) | 1,454 kg | 1,456 kg | Class minimum 1,450 kg [CR22 3.7.1] |
| Crew weight used for righting moment | 300 kg declared | Maximum 300 kg, default 338 kg | Declared maximum per [RS26 102.1]; class Worlds limit 300 kg in underwear [CR22 4.1] |
| Default crew weight (for sailing trim) | 25.8·LSM0^1.4262 ≈ 338 kg | 338 kg | [VPP26 eq. 4.1], LSM0 6.077 m [OD20] |
| Gear | 0.16 × default crew ≈ 54 kg, capped at 5 % of lightship | same | [VPP26 eq. 4.5] |
| Sails | Formula in the sail areas and righting moment | same | [VPP26 eq. 4.6] |
| Sailing displacement as reported | 1,869 kg | not printed | [C26] field `Dspl_Sailing` |

The VPP documentation says the declared crew weight gives the righting moment while the default crew weight sets the sailing-trim displacement [VPP26 §4.2.2]. With a default of 338 kg and gear of 54 kg, 1,454 + 338 + 54 = 1,846 kg, which leaves about 23 kg for sails. That reconciles with 1,869 kg. G-989 declares 338 kg and reports 1,911 kg, though, 42 kg more for an otherwise near-identical boat, which suggests the feed's figure moves with the declared crew. The exact split is an open question (§5). It changes the target by much less than the tolerance: 42 kg is 2.2 % of displacement.

**Recommended benchmark load condition:** total mass 1,869 kg, made of the lightship items, a 300 kg crew item on the windward rail and the rest (about 115 kg) as gear and sails near the centre of gravity. The H-boat model's existing "sailing" condition (1,777 kg, three crew at 100 kg plus sails and gear) is 92 kg lighter [I2 §4.1] and should not be reused for this benchmark.

### 2.2 Crew position

- The certificate carries **Crew Arm Ex 0.50** [OD20], the crew arm extension of [RS26 107.5]. With no trapeze and no racks it works out to 0.5, which means the hiking crew's centre of gravity is 0.5 m outside the sheerline [VPP26 §4.4.3].
- For LSM above 4.9 m the VPP counts crew as weight / 89 kg. It puts all but two of them on the rail, with the two others (helm and main trimmer) at 70 % of the maximum half-beam [VPP26 eq. 4.30]. For 300 kg that is about 1.4 crew-equivalents hiking plus two inboard.
- Since 2019 the crew's transverse moment is an optimisation variable, anywhere between full leeward and full windward [VPP26 §4.4.3]. In light air on a reach the VPP may therefore keep the crew partly inboard or to leeward.
- [I14] fixes the H-boat crew in v1 at the ORC hiking position for each load condition. That matches the VPP wherever full hiking is optimal, which is upwind in 16 kn. Elsewhere a fixed crew is slightly conservative on heel and slightly optimistic on righting moment. This is a known approximation, not a reason to change the contract.

### 2.3 Wind and sea

- **Wind height.** TWS is defined at z_ref = 10 m with a log profile V(z) = V(10)·ln(z/z0)/ln(10/z0). Since 2022 z0 = 0.005 m; before 2022 it was 0.001 m [VPP26 §7.1]. At the height of the sail plan's centre of effort, roughly 4 to 6 m above water, the 2026 profile gives 0.88 to 0.93 of the 10 m wind (0.909 at 5 m). The 2020 profile gives 0.90 to 0.95. The design doc's wind already has a log height profile [design doc: 03-aero, "Aero per triangle"]. **The benchmark scenario must set the 10 m reference and z0 = 0.005 m.** A uniform wind at the nominal TWS would overpower the rig by about 10 %, which is larger than the tolerance.
- **Heel in the wind triangle.** The VPP scales the cross-flow component of true wind by cos(heel) [VPP26 eq. 7.2 and 7.3]. Luovi's per-triangle apparent wind does this implicitly, so the scenario needs nothing extra.
- **Sea state.** The VPP includes added resistance in waves for a single "venue" spectrum: modal period 5 s, energy scaling with TWS through f(Vt), with baselines at 25, 45 and 75 ft. For the 25 ft baseline f(Vt) is 2.87 at 8 kn and 15.98 at 16 kn, against 20 at 20 kn [VPP26 §6.8.1, Fig. 6.14]. The H-boat, at 8.28 m LOA, sits just above the 25 ft baseline. A flat-water benchmark is therefore biased fast against the certificate, most at 16 kn upwind. The size of that bias was not quantified here.
- **Allowances.** Printed speeds are the equilibrium speeds divided by the dynamic allowance credit [VPP26 §3.6.2]. That credit averages 0.29 % for the 2026 boats and 0.288 % in 2020. They also carry the age allowance, 0.487 % for the 2020 certificate [OD20]. Raw VPP equilibrium speeds are therefore about 0.5 to 0.8 % above the printed ones. This bias is small and one-signed, and the tolerance absorbs it.

## 3. How much the target itself moves

ORC re-tunes the VPP every year. The H-boat reference certificate through four VPP versions, against the 2026 club polar:

| Point | 2017 | 2018 | 2019 | 2020 | 2026 | Spread, % of mean |
| --- | --- | --- | --- | --- | --- | --- |
| Beat VMG, 8 kn | 3.25 | 3.27 | 3.33 | 3.32 | 3.37 | 3.6 |
| 60°, 8 kn | 5.28 | 5.23 | 5.35 | 5.35 | 5.25 | 2.3 |
| 90°, 8 kn | 5.71 | 5.72 | 5.75 | 5.75 | 5.61 | 2.5 |
| 120°, 8 kn | 5.60 | 5.63 | 5.65 | 5.66 | 5.49 | 3.0 |
| Run VMG, 8 kn | 3.84 | 3.87 | 3.87 | 3.88 | 3.85 | 1.0 |
| Beat VMG, 16 kn | 4.33 | 4.35 | 4.30 | 4.28 | 4.26 | 2.1 |
| 60°, 16 kn | 6.42 | 6.36 | 6.29 | 6.28 | 6.19 | 3.6 |
| 90°, 16 kn | 6.88 | 6.83 | 6.79 | 6.80 | 6.64 | 3.5 |
| 120°, 16 kn | 7.32 | 7.41 | 7.39 | 7.41 | 7.26 | 2.0 |
| Run VMG, 16 kn | 6.18 | 6.21 | 6.21 | 6.22 | 6.11 | 1.8 |

Sources: [OD17–19], [OD20], [C26]. The largest difference from 2026 is 3.7 % (2017, 60° in 16 kn). Against 2020 it is 3.1 % (120° in 8 kn). Part of the 2020-to-2026 step comes from the inputs rather than the VPP: the main is 0.30 m² larger in 2026, and the reported wetted surface differs (12.11 against 10.64 m²), which points to a changed definition or offset file. The rest is VPP change, including the wind profile roughness.

## 4. Tolerance

**Recommendation: 5 % on boat speed at each fixed-TWA point and on beat and run VMG, against the certificate the benchmark names.** Beat and gybe angles should be logged and reported, but not gated. The VPP's own optimum beat angle moves by about 1° across versions (42.2 to 42.8° at 8 kn, 38.2 to 39.3° at 16 kn) [§3]. VMG near its optimum is flat in angle, so an angle gate adds noise without adding information.

Reasons:

- **It is a model-to-model comparison.** The benchmark asks whether luovi's force models, given the same boat, loading and wind, land where the ORC VPP lands. The ORC VPP moves by up to 3.7 % at these points between its own versions (§3), and ORC treats each version as valid. A gate tighter than about 4 % would fail a correct model because of which VPP year was chosen. 5 % leaves about 1 % for the loading and allowance differences in §2.
- **VPP-to-reality scatter is larger than 5 %, and that is not what the gate measures.**
  - ORC itself says that sailors comparing measured with predicted speeds should find some conditions "within a tenth or two of a knot", that is 2 to 4 % at H-boat speeds, and others with "more deviation" [SG Appendix C].
  - Against 1 Hz racing logs of a TP52, the ORC-based VPP had an upwind boat speed RMSE of 1.23 kn and tended to overestimate upwind speed and heel [B21 §6.2, Table 2]. That is raw racing data, not steady state, so it is an upper bound on scatter rather than a VPP error.
  - A dinghy VPP built on ORC sail coefficients matched measured upwind data well but under-predicted downwind speed [D17].
  - No open source was found that states a steady-state VPP-to-full-scale error in percent for a keelboat. 5 % should therefore not be read as "within 5 % of reality".
- **Limits of 5 %, stated so nobody over-reads a pass:**
  - Resistance near hull speed rises steeply with speed. The 16 kn reaching points sit at Froude numbers of 0.43 to 0.48 (6.64 to 7.41 kn on IMSL 6.46 m). There, 5 % in speed corresponds to a much larger error in drive or drag, perhaps 15 to 25 % if resistance goes as roughly V⁴ there. That exponent is an estimate, not a cited value.
  - The beat at 8 kn (Fn about 0.29) is the most force-sensitive point in the set.
  - So the 8 kn points are the real test of the force balance. The 16 kn reaching points mostly test that the boat does not exceed the wave-making wall.
- **Per-point tightening is not justified yet.** The spread in §3 is similar at every point (1.0 to 3.6 %), so the data supports no per-point tolerance. The design doc's single ~5 % stands.

How a time-domain run should be compared, for the benchmark ticket: the VPP number is a steady state with optimised trim. The runner should therefore let the driver search the major controls (sheets, traveller, rudder for course) as [I14] provides, then average boat speed over a settled window. Without that, cloth flutter and wave motion inflate the variance.

## 5. Open questions

1. **Flat water or ORC sea state.** The certificate includes added resistance in waves for a TWS-scaled spectrum with a 5 s modal period [VPP26 §6.8]. A flat-water benchmark is biased fast, most at 16 kn. A benchmark in that spectrum also tests luovi's wave response, which is not this benchmark's job. The recommendation leans to flat water with the bias noted, but the size of the bias is unknown. Either reproduce the ORC spectrum in the scenario, or quantify RAW for the H-boat from eq. 6.65 and 6.66 in a later ticket.
2. **Sailing displacement split.** The feed reports 1,869 kg at 300 kg declared crew and 1,911 kg for G-989 at 338 kg. The documentation says the default crew sets the displacement [VPP26 §4.2.2]. Which crew, gear and sail masses make up 1,869 kg in VPP 2026 is unconfirmed.
3. **Main area.** 15.85 m² in 2026 against 15.55 m² in 2020. The H-boat definition should take the area of the certificate it is benchmarked against. Which one matches the class rule maximum and the model's main outline is not checked here.
4. **Crew position at light-air reaching points.** The VPP optimises the crew's transverse position; the v1 contract fixes it [I14]. If the 8 kn reaching points miss by a few percent while the beat matches, this is the first place to look.

## 6. Where this disagrees with the design doc

- The design doc says to "match ORC-style polars ... within ~5 %" [design doc: 02-hull, Validation targets; 03-aero, Benchmarks]. That stands. It does not say that **three of its six fixed-TWA points (90° at 8 kn and 120° at both speeds) are spinnaker points** in the ORC polar. Build step 3 ("H-boat sails a polar within 5 %") therefore either needs the spinnaker or a non-spinnaker target, as §1.3 proposes.
- The design doc does not say what wind profile and sea state a benchmark should use. The certificate assumes a 10 m reference with z0 = 0.005 m and a TWS-scaled wave spectrum (§2.3). The wind profile alone moves the result by more than the tolerance, so the scenario must specify both.
