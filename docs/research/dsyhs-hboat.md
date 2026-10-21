# DSYHS coefficients and the H-boat's fit in the series

Research for issue #6, 2026-10-21. Question: which Delft Systematic Yacht Hull Series (DSYHS) regressions apply to the H-boat (bare hull upright residuary, heel correction, appendage residuary and viscous, induced resistance, added resistance due to heel), the coefficient tables with their source and Froude number range, the hydrostatic inputs each needs and whether the ship definition contract decided in issue #14 supplies them, the friction line and form factor convention, and whether the H-boat sits inside the series bounds on every parameter.

## Answer in brief

- **Upright hull: Keuning and Katgert (2008).** Residuary resistance is Rr/(∇c·ρ·g) = a0 + (a1·LCBfpp/LWL + a2·Cp + a3·∇c^(2/3)/Aw + a4·BWL/LWL + a5·LCBfpp/LCFfpp + a6·BWL/Tc + a7·Cm)·∇c^(1/3)/LWL. The eight coefficients are tabulated at 13 Froude numbers from 0.15 to 0.75 in steps of 0.05 (§2.1). The H-boat's benchmark points sit at Fn 0.23 to 0.53, inside that range.
- **Heel, appendages and induced drag: Keuning and Sonnenberg (1998).** K&K 2008 is upright only. The 1998 paper supplies the change in hull residuary resistance at 20 degrees of heel, scaled by 6·φ^1.7 (Fn 0.25 to 0.55). It also supplies the keel residuary resistance (Fn 0.20 to 0.60) and its change with heel, the appendage viscous form factor 1 + 2(t/c) + 60(t/c)^4, the heeled wetted area (5 to 35 degrees), and a side force and effective span model for induced resistance. Issue #14 replaced that induced-resistance model with the VLM, so it is a cross-check only. DSYHS has no rudder residuary term.
- **Friction line and form factor.** Use ITTC-57, CF = 0.075/(log10 Re − 2)² [ITTC 7.5-02-02-01], with **Re taken on 0.7·LWL and a form factor (1 + k) of 1**, applied to the canoe body's wetted area at rest. The form drag is inside the regressed residuary. A real hull form factor used together with the DSYHS residuary would count it twice. The primary papers were not reachable, so this convention is sourced from three secondary sources that agree (§3).
- **The H-boat is inside the series bounds on every parameter but one.** At the sailing condition the canoe body has LWL/BWL 3.47, BWL/Tc 4.02, LWL/∇c^(1/3) 5.46, Cp 0.534, LCB 1.1 % aft and LCF 3.2 % aft of mid-LWL, and Aw/∇c^(2/3) 5.75, all inside. **Its midship coefficient Cm is 0.54 to 0.56, against a series minimum of 0.646**, because it has slack V sections that close onto a narrow keel stub. Recommendation: feed the actual Cm. K&K 2008 dropped every higher-order term so that the fit stays robust outside its range. Carry the clamped value (0.646) as the uncertainty bracket. Clamping raises upright residuary resistance by 10 to 12 % at Fn 0.40 to 0.45, about 5 to 6 % of total upright resistance (§6).
- **Contract supply.** Every geometric input comes from the baked solids and the mass items, computed at load for the scenario's load condition. Nothing needs storing, which fits "derived values are never stored". There are four gaps:
  - The definition cannot say which appendage solids form the DSYHS "keel" (fin plus stub, not rudder or skeg).
  - The hydro block's single "form factor" field also needs the 0.7 Reynolds length fraction.
  - Kinematic viscosity has to come from the environment.
  - Sternway and Fn below 0.15 are outside every table.
- **Design doc conflict.** The design doc says the regression's hydrostatics are "recomputed from the hull mesh at the current heel, trim and sinkage every tick" [02-hull, Resistance]. That conflicts with how DSYHS is defined. Its inputs are upright values at rest; heel enters only through the separate ΔRrh term; and dynamic sinkage and trim are already inside the measured residuary. The regression inputs should be frozen at load. Only the friction wetted area should follow heel from geometry. This is an open question for the coordinator, because changing either the design doc or the code is not this ticket's call (§4.2).
- **Not verified against the primary papers.** TU Delft's servers (repository.tudelft.nl, dsyhs.tudelft.nl, data.4tu.nl) refused every connection from this environment on 2026-10-21. No open copy of K&K 2008 or K&S 1998 was found elsewhere. The tables here are cross-checked transcriptions from three independent theses and one paper; §2 lists where they disagree. The disagreements include the overall scale of the heel-delta table (a factor of 1000) and the meaning of the keel term Zcbk. Someone with the papers must check them before the tables land in `data-hboat` with a citation to the primary.

## Sources read

Primary:

- **[ITTC]** ITTC Recommended Procedures and Guidelines 7.5-02-02-01, Resistance Test, Revision 04, effective 2017, §2.1 and §3.6.1. https://www.ittc.info/media/8001/75-02-02-01.pdf

Secondary sources that transcribe the DSYHS papers, read in full or in the parts cited:

- **[DN14]** Day, A. H. and Nixon, E. (2014). Measurement and prediction of the resistance of a Laser sailing dinghy. International Journal of Small Craft Technology. §5.1 reproduces the K&K 2008 equation and the series parameter bounds (Table 3 and text). https://strathprints.strath.ac.uk/46407/7/Day_Nixon_IJSCT_2014_Measurement_and_prediction_of_the_resistance_of_a_laser_sailing.pdf
- **[UCT]** Kilpin, G. Modelling and design of an autonomous sailboat for ocean observation. MSc thesis, University of Cape Town. §3 and Appendix C: K&K 2008 and K&S 1998 equations and tables C.4 to C.9. https://open.uct.ac.za/server/api/core/bitstreams/93ef7aea-e24a-44c0-ac44-b8caf3428baf/content
- **[LABI]** Borba Labi, G. (2019). Velocity prediction program development for hydrofoil-assisted monohulled yachts. EMSHIP MSc thesis, University of Rostock. §5.1 to 5.5, tables 9 to 16. https://matheo.uliege.be/bitstream/2268.2/8502/1/BORBA%20LABI%20%20Gaetan%20(Solent)%20-%20URO.pdf
- **[TEIX]** Teixeira, P. Development of a velocity prediction program for sailing yachts. MSc thesis, Instituto Superior Técnico, Lisbon. §4 and Appendix IV, tables IV-1 to IV-5. https://fenix.tecnico.ulisboa.pt/downloadFile/3378094857519920/Thesis_Pedro_Teixeira_104081_V3.pdf
- **[REM]** Remmlinger, U. (2014, revised 2016). Bare hull upright resistance prediction based on the Delft Systematic Yacht Hull Series. §2 (the Delft friction convention), §3.1 and §6. http://www.remmlinger.com/Regression%20DSYHS.pdf
- **[SL15]** Slooff, J. W. (2015). The Aero- and Hydromechanics of Keel Yachts. Springer. §6.5.2 (viscous resistance, eq. 6.5.3), §6.5.4 (pp. 243 to 247), §6.7.4, Appendix H (eq. H.62) and Appendix J (heel). This is from the supplied folder.
- **[KMP19]** Karczewski, A., Malinowska, K. and Pruszko, H. (2019). Revision of an approximate method of the prediction of the bare hull resistance under heel. Mechanik 1/2019, 42 to 45, DOI 10.17814/mechanik.2019.1.7. https://www.mechanik.media.pl/pliki/do_pobrania/artykuly/22/2019_01_s0042.pdf
- **[BDN]** Two boatdesign.net threads. "Delft series resistance equations variety" (2011) states that the friction line uses 70 % of LWL. "Added resistance in waves" (2021) reports errors in the DSYHS added-resistance-in-waves coefficient file. https://www.boatdesign.net/threads/delft-series-resistance-equations-variety.39154/ and https://www.boatdesign.net/threads/added-resistance-in-waves.49546/

Project and model:

- **[HB]** H-boat model artifact, version 1792502085-f25d: `dist/hboat.js` (run in Node for the hydrostatics in §5), `src/hboat/hull.ts`, `src/hboat/hydro.ts`, `src/hboat/model.ts`, `src/hboat/data/offsets.ts`, `docs/decisions.md` (D5 to D7), `model/derived.json`. https://claude.ai/artifact/8GXU2RTYXeE4CezLk3YRGb
- **[I14]** The issue #14 resolution comment, `docs/adr/0004-self-contained-ship-definition.md`, `docs/intention/02-hull.md`, issue #1 (the map), and the earlier findings `docs/research/ship-definition-shape.md` on `research/ship-definition-shape`.

Supplied folder `~/Downloads/hydro-research/`. Every file's contents or title was checked:

- Slooff (2015) is the only one with DSYHS resistance material. It is used above.
- The CFD book (Demirel, ed., MDPI) is about merchant ships. Its ITTC-57 uses are the same line as [ITTC], and it has no yacht form factor material.
- Engineering Mathematics in Ship Design (MDPI) uses ITTC-57 only for planing hulls. It has nothing on DSYHS or form factors.
- The transient-lift paper (Sysser-26 validation) and the course-keeping paper cite the DSYHS reports without coefficients.
- The rest are outside this question: the 30-foot yacht force measurement papers, the panel and wave-making papers, the large-heel GAN paper, the restricted-water interaction papers, the tall-ship rig paper, the rudder failure paper, and the `waves/` folder.

**Not read**, because no copy was reachable. TU Delft hosts refused every connection; the research portal pages load but carry no full text:

- **[KK08]** Keuning, J. A. and Katgert, M. (2008). A bare hull resistance prediction method derived from the results of the Delft Systematic Yacht Hull Series extended to higher speeds. Proc. Int. Conf. Innovation in High Performance Sailing Yachts, Lorient, RINA, 13 to 21. https://research.tudelft.nl/en/publications/a-bare-hull-resistance-prediction-method-derived-from-the-results
- **[KS98]** Keuning, J. A. and Sonnenberg, U. B. (1998). Approximation of the hydrodynamic forces on a sailing yacht based on the "Delft Systematic Yacht Hull Series". 15th Int. HISWA Symposium on Yacht Design and Yacht Construction, Amsterdam, 99 to 152. https://research.tudelft.nl/en/publications/approximation-of-the-hydrodynamic-forces-on-a-sailing-yacht-based/
- Keuning, J. A. and Katgert, M. (2010). The influence of heel on the bare hull resistance of a sailing yacht. TU Delft Ship Hydromechanics Laboratory, cited by [KMP19]. This is the only 2010 Keuning and Katgert item found. I found no Keuning and Katgert appendage paper from 2010. The appendage work in DSYHS is [KS98] and Keuning and Verwerft (2009), and the latter covers side force, not resistance.
- The DSYHS website and data (http://dsyhs.tudelft.nl), the 4TU dataset of Walker et al. (2024), and Kleijweg (2016), A bare hull upright trimmed resistance prediction for high performance sailing yachts, TU Delft MSc thesis.

## 1. Which regression covers which component

The DSYHS decomposition (after [SL15] §6.5.1, [LABI] eq. 91 and [TEIX] §4.3 to 4.5):

R_total = R_f,hull(φ) + R_r,hull + ΔR_r,hull(φ) + R_v,keel + R_v,rudder + R_r,keel + ΔR_r,keel(φ) + R_induced

| Component | Source | Form | Valid range | Use in Luovi |
| --- | --- | --- | --- | --- |
| Hull friction | [KK08], [KS98], via [DN14] and [REM] | ½ρV²·Sc(φ)·CF, ITTC-57 with Re = V·0.7·LWL/ν, (1 + k) = 1 | Any Re | Yes. Sc(φ) comes from the geometry at the current heel (§4.2). |
| Upright hull residuary | [KK08] via [DN14], [UCT], [LABI], [TEIX] | §2.1 | Fn 0.15 to 0.75 | Yes. This is the main term. |
| Heeled wetted area | [KS98] via [LABI], [TEIX] | Sc(φ) = Sc(0)·[1 + (s0 + s1·BWL/Tc + s2·(BWL/Tc)² + s3·Cm)/100] | 5 to 35 degrees | No. The geometry supplies it. The regression agrees with the geometry to within 3 % up to 30 degrees for the H-boat (§5.3) and serves as a cross-check. |
| Hull residuary change with heel | [KS98] via [UCT], [LABI], [TEIX] | ΔRrh(φ) = ΔRrh(20°)·6·φ^1.7, φ in rad; ΔRrh(20°) in §2.2 | Fn 0.25 to 0.55; fitted at 20 degrees only | Yes, but the scale factor is unresolved (§2.2). |
| Keel residuary | [KS98] via [UCT], [LABI], [TEIX] | §2.3 | Fn 0.20 to 0.60 | Yes. The definition of Zcbk is unresolved. |
| Keel residuary change with heel | [KS98] via [UCT], [LABI], [TEIX] | ΔRrk(φ) = Ch·Fn²·φ·∇k·ρ·g | Not stated | Yes. One term of Ch is unresolved. |
| Appendage viscous | [KS98] via [UCT], [LABI] | ½ρV²·S_app·CF(Re on mean chord)·(1 + 2t/c + 60(t/c)⁴) | Any Re | Yes, for the keel fin, stub, rudder and skeg (§4.1). |
| Rudder residuary | none | none | none | DSYHS has no term [UCT §3]. |
| Induced resistance | [KS98] via [UCT], [LABI], [TEIX] | Ri = Fh²/(π·Te²·½ρV²), with side force Fh and effective span Te as heel-dependent regressions (§2.4) | Heel 0 to 30 degrees | No. Issue #14 replaced it with the VLM. The tables in §2.4 are a cross-check for the VLM ticket. |
| Residuary change with bow-down trim | [KS98] via [DN14] | ΔRr from coefficients T0 to T5 against LWL/BWL, BWL/Tc, Aw/∇c^(2/3), LCB and LCF | Fn 0.25 to 0.60 | Not in the first slice. Its coefficients were not transcribed in any source read. |
| Added resistance in waves | Keuning (2006) | DSYHS spreadsheet | | No. The design doc gives waves to the panel method. [BDN] also reports at least two duplicated coefficient sets in the published file, which TU Delft could not correct. |

Two clarifications for the design doc's table, which lists "DSYHS (Keuning & Katgert 2008) with heel correction" for fin-keel yachts [02-hull]:

- The K&K 2008 paper is upright only. Its heel correction and every appendage term come from K&S 1998 [UCT §3; TEIX §4.1; LABI §5]. A Keuning and Katgert 2010 report revisits heel [KMP19], but it could not be read.
- K&K 2008 replaced the K&S 1998 upright formula. It uses one data set over the whole speed range and adds the LCB/LCF term for trim at speed [TEIX §4.3].

## 2. Coefficient tables

All tables below are transcriptions. Each cell was checked across the sources named, and every disagreement is listed. In `data-hboat` the citation must name the primary paper, with page and table, once someone checks it.

### 2.1 Upright bare-hull residuary resistance [KK08]

Rr,h/(∇c·ρ·g) = a0 + (a1·LCBfpp/LWL + a2·Cp + a3·∇c^(2/3)/Aw + a4·BWL/LWL + a5·LCBfpp/LCFfpp + a6·BWL/Tc + a7·Cm)·∇c^(1/3)/LWL

The equation form, with a0 outside the bracket, is as typeset in [DN14] eq. 2 (rendered page checked) and as given in [UCT] eq. 3.30 and [LABI] eq. 77. Putting a0 inside the bracket gives a non-physical drop of 80 % at Fn 0.75 for the H-boat, while the form above stays smooth. Fn = V/√(g·LWL). LCBfpp and LCFfpp are measured aft from the forward end of LWL. Fn runs from 0.15 to 0.75 [DN14 §5.1; UCT Table C.4; LABI Table 10].

| Fn | a0 | a1 | a2 | a3 | a4 | a5 | a6 | a7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.15 | -0.0005 | 0.0023 | -0.0086 | -0.0015 | 0.0061 | 0.0010 | 0.0001 | 0.0052 |
| 0.20 | -0.0003 | 0.0059 | -0.0064 | 0.0070 | 0.0014 | 0.0013 | 0.0005 | -0.0020 |
| 0.25 | -0.0002 | -0.0156 | 0.0031 | -0.0021 | -0.0070 | 0.0148 | 0.0010 | -0.0043 |
| 0.30 | -0.0009 | 0.0016 | 0.0337 | -0.0285 | -0.0367 | 0.0218 | 0.0015 | -0.0172 |
| 0.35 | -0.0026 | -0.0567 | 0.0446 | -0.1091 | -0.0707 | 0.0914 | 0.0021 | -0.0078 |
| 0.40 | -0.0064 | -0.4034 | -0.1250 | 0.0273 | -0.1341 | 0.3578 | 0.0045 | 0.1115 |
| 0.45 | -0.0218 | -0.5261 | -0.2945 | 0.2485 | -0.2428 | 0.6293 | 0.0081 | 0.2086 |
| 0.50 | -0.0388 | -0.5986 | -0.3038 | 0.6033 | -0.0430 | 0.8332 | 0.0106 | 0.1336 |
| 0.55 | -0.0347 | -0.4764 | -0.2361 | 0.8726 | 0.4219 | 0.8990 | 0.0096 | -0.2272 |
| 0.60 | -0.0361 | 0.0037 | -0.2960 | 0.9661 | 0.6123 | 0.7534 | 0.0100 | -0.3352 |
| 0.65 | 0.0008 | 0.3728 | -0.3667 | 1.3957 | 1.0343 | 0.3230 | 0.0072 | -0.4632 |
| 0.70 | 0.0108 | -0.1238 | -0.2026 | 1.1282 | 1.1836 | 0.4973 | 0.0038 | -0.4477 |
| 0.75 | 0.1023 | 0.7726 | 0.5040 | 1.7867 | 2.1934 | -1.5479 | -0.0115 | -0.0977 |

Disagreements:

- **a3 at Fn 0.55:** [UCT] and [LABI] give 0.8726 and [TEIX] gives 0.8762. The majority value is shown.
- **Froude labels in [TEIX]:** its Table IV-1 labels the same 13 columns Fn 0.10 to 0.70, one step low. [DN14], [UCT] and [LABI] all give 0.15 to 0.75.
- **Below Fn 0.15:** [UCT] sets every coefficient to zero at Fn 0 so that Rr goes to zero at rest. That is the thesis author's choice, not the paper's. In `data-hboat` it would be a flagged estimate.

### 2.2 Change in hull residuary resistance at 20 degrees of heel [KS98]

ΔRrh(20°)/(∇c·ρ·g) = u0 + u1·LWL/BWL + u2·BWL/Tc + u3·(BWL/Tc)² + u4·LCB + u5·LCB², and then ΔRrh(φ) = ΔRrh(20°)·6·φ^1.7 with φ in radians [UCT eq. 3.31 and 3.32; LABI eq. 80 and 81; TEIX eq. 17 and 18]. The factor 6·φ^1.7 equals 1.003 at 20 degrees.

The table below is as printed in [LABI] Table 12 and [TEIX] Table IV-4. [UCT] Table C.5 prints every value 1000 times larger.

| Fn | u0 | u1 | u2 | u3 | u4 | u5 |
| --- | --- | --- | --- | --- | --- | --- |
| 0.25 | -0.0268 | -0.0014 | -0.0057 | 0.0016 | -0.0070 | -0.0017 |
| 0.30 | 0.6628 | -0.0632 | -0.0699 | 0.0069 | 0.0459 | -0.0004 |
| 0.35 | 1.6433 | -0.2144 | -0.1640 | 0.0199 | -0.0540 | -0.0268 |
| 0.40 | -0.8659 | -0.0354 | 0.2226 | 0.0188 | -0.5800 | -0.1133 |
| 0.45 | -3.2715 | 0.1372 | 0.5547 | 0.0268 | -1.0064 | -0.2026 |
| 0.50 | -0.1976 | -0.1480 | -0.6593 | 0.1862 | -0.7489 | -0.1648 |
| 0.55 | 1.5873 | -0.3749 | -0.7105 | 0.2146 | -0.4818 | -0.1174 |

Unresolved, and these must be checked against [KS98] before use:

- **Scale.** [UCT] quotes the source as saying the "coefficients are multiplied by 1000", and divides its printed values by 1000, which gives the table above. Evaluated as printed above, for the H-boat (§5) the right-hand side is 0.22 to 1.4. That would make the heel increment 14 to 100 times the upright residuary resistance, which is non-physical. With a further factor of 10⁻³, the increment is 7 to 10 % of upright Rr at Fn 0.30 to 0.35 and 0.5 to 2.2 % at Fn 0.45 to 0.55, which is plausible. My reading is that the true coefficients are the values above times 10⁻³. This rests on a plausibility check, not on a source.
- **LCB.** [LABI] and [TEIX] write LCB, which I read as percent of LWL from mid-LWL, aft negative. That is the unit of the series range table (§5). [UCT] writes LCBfpp.
- **u4 at Fn 0.45:** [LABI] gives -1.0064, [UCT] gives -1006.4, the same number at its scale, and [TEIX] gives -0.1006. The majority value is shown.

### 2.3 Keel residuary resistance and its change with heel [KS98]

Rr,k/(∇k·ρ·g) = A0 + A1·T/BWL + A2·(Tc + Zcbk)³/∇k + A3·∇c/∇k [UCT eq. 3.33; LABI eq. 85; TEIX eq. 15]. T is the total draft, ∇k the keel volume, and Zcbk the vertical position of the keel's centre of buoyancy.

| Fn | A0 | A1 | A2 | A3 |
| --- | --- | --- | --- | --- |
| 0.20 | -0.00104 | 0.00172 | 0.00117 | -0.00008 |
| 0.25 | -0.00550 | 0.00597 | 0.00390 | -0.00009 |
| 0.30 | -0.01100 | 0.01421 | 0.00069 | 0.00021 |
| 0.35 | -0.00713 | 0.02632 | -0.00232 | 0.00039 |
| 0.40 | -0.03581 | 0.08649 | 0.00999 | 0.00017 |
| 0.45 | -0.00470 | 0.11592 | -0.00064 | 0.00035 |
| 0.50 | 0.00553 | 0.07371 | 0.05991 | -0.00114 |
| 0.55 | 0.04822 | 0.00660 | 0.07048 | -0.00035 |
| 0.60 | 0.01021 | 0.14173 | 0.06409 | -0.00192 |

[UCT] Table C.6, [LABI] Table 13 and [TEIX] Table IV-2 agree on every cell.

ΔRr,k(φ) = Ch·Fn²·φ·∇k·ρ·g, with Ch = H1·Tc/T + H2·BWL/Tc + H3·BWL/T + H4·LWL/∇^(1/3), and H1 = -3.5837, H2 = -0.0518, H3 = 0.5958, H4 = 0.2055 [UCT Table C.7; LABI Table 14; TEIX eq. 20]. [UCT] writes the third term as (Tc/T)·(BWL/Tc), which is the same quantity.

Unresolved:

- **Zcbk.** [LABI] defines Zcbk as measured from the free surface. [UCT] says it "assumed" that Zcbk is measured from the waterline, positive downward. Read that way, (Tc + Zcbk) double-counts the canoe draft. For the H-boat the two readings differ by up to a factor of 3.3 in Rr,k between Fn 0.40 and 0.60 (§7). The reading I would test first is that Tc + Zcbk is the depth of the keel's centre of buoyancy below the waterline, with Zcbk measured from the canoe-body bottom.
- **The ∇ in the H4 term:** [UCT] uses ∇c and [LABI] uses ∇k. At 20 degrees and Fn 0.40, the H-boat's ΔRr,k is 36 N or 142 N depending on which.

### 2.4 Side force and effective span [KS98], for the VLM cross-check only

The side force Fh is β·½ρV²·Sc/cos φ times a polynomial in T²/Sc and Tc/T with coefficients b1 to b4, where β is the leeway in radians [LABI eq. 88; UCT §3].

Te/T = (A1·Tc/T + A2·(Tc/T)² + A3·BWL/Tc + A4·TR)·(B0 + B1·Fn), where TR is the keel taper ratio [LABI eq. 90; TEIX eq. 22].

| Heel | b1 | b2 | b3 | b4 | A1 | A2 | A3 | A4 | B0 | B1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0° | 2.025 | 9.551 | 0.631 | -6.575 | 3.7455 | -3.6246 | 0.0589 | -0.0296 | 1.2306 | -0.7256 |
| 10° | 1.989 | 6.729 | 0.494 | -4.745 | 4.4892 | -4.8454 | 0.0294 | -0.0176 | 1.4231 | -1.2971 |
| 20° | 1.980 | 0.633 | 0.194 | -0.792 | 3.9592 | -3.9804 | 0.0283 | -0.0075 | 1.5450 | -1.5622 |
| 30° | 1.762 | -4.957 | -0.087 | 2.766 | 3.4891 | -2.9577 | 0.0250 | -0.0272 | 1.4744 | -1.3499 |

[UCT] Tables C.8 and C.9, [LABI] Tables 15 and 16 and [TEIX] Table IV-5 agree. The exact grouping of the b1 to b4 terms was garbled in every text extraction, so it needs the primary before use.

### 2.5 Heeled wetted area [KS98], for the geometry cross-check

| Heel | 5° | 10° | 15° | 20° | 25° | 30° | 35° |
| --- | --- | --- | --- | --- | --- | --- | --- |
| s0 | -4.112 | -4.522 | -3.291 | 1.850 | 6.510 | 12.334 | 14.648 |
| s1 | 0.054 | -0.132 | -0.389 | -1.200 | -2.305 | -3.911 | -5.182 |
| s2 | -0.027 | -0.077 | -0.118 | -0.109 | -0.066 | 0.024 | 0.102 |
| s3 | 6.329 | 8.738 | 8.949 | 5.364 | 3.443 | 1.767 | 3.497 |

[LABI] Table 11 and [TEIX] Table IV-3 agree. The companion upright estimate is Sc = (1.97 + 0.171·BWL/Tc)·(0.65/Cm)^(1/3)·(∇c·LWL)^(1/2) [LABI eq. 76; SL15 eq. H.62].

## 3. Friction line and form factor

- **ITTC-57 line.** CF = 0.075/(log10 Re − 2)², with Re = VL/ν [ITTC §2.1]. The procedure notes that the line "already contains a form factor correction" of about 12 % over the Hughes flat-plate line, 0.075 = (1 + 0.1194)·0.067 [ITTC §3.6]. Its reporting list asks for the form factor "even if (1+k)=1.0 is applied" [ITTC, reporting requirements].
- **DSYHS convention, hull: Re on 0.7·LWL and no form factor.** Three sources say this independently:
  - [REM] §2, eq. 2: "The Delft-method tries to compensate for that by using only 70% of LWL0 in the determination of the Reynolds number … The Delft-method does not use a form factor. The viscous form drag is therefore part of the residuary resistance."
  - [SL15] p. 245, on K&S 1998: "the frictional resistance is estimated on the basis of Eq. (6.5.3) [ITTC-57] without the use of a form factor. However, the Reynolds number is based on 70 % rather than 100 % of the length of the waterline." Slooff adds that this works out at about 10 % more friction, roughly k ≈ 0.1 on a full-LWL Reynolds number.
  - [DN14] §5.1, on K&K 2008: "the only non-standard feature being the utilisation of 70% of the waterline length in the calculation of the Reynolds Number." [BDN] (2011) agrees: "the ITTC-line with 70% of waterline length (Delft definition)".
- **Wetted area.** The area is that of the canoe body at rest, without appendages: "Sc: wetted area of the hull at zero speed" [UCT nomenclature; LABI eq. 73]. Under heel, K&S replace Sc with Sc(φ) in the same friction formula [LABI §5.3; TEIX §4.4.1].
- **Froude and Reynolds lengths.** Both use LWL at rest, not the wetted length at speed [REM §2, which keeps the at-rest definition on purpose]. [REM] calls it LWL0, the design waterline length, in the Reynolds number.
- **Appendages.** Re is taken on the mean chord and multiplied by (1 + k) = 1 + 2(t/c) + 60(t/c)⁴ [UCT eq. 3.26 to 3.29; LABI eq. 82 and 83]. For a bulb, [LABI] eq. 84 gives 1 + 1.5(t/c)^(3/2) + 7(t/c)³, which the H-boat does not need.
- **No correlation allowance.** None of the sources read applies CA or a roughness allowance on top of the line.

Consequence for the ship definition: for the `dsyhs` family the hull form factor is 1 by definition. The design doc's "ITTC-57 friction with a form factor" [02-hull, Resistance] holds only with k = 0 and the 0.7 length factor. A form factor from elsewhere, used together with the DSYHS residuary, would count form drag twice [REM §2; SL15 p. 245].

## 4. Inputs, and how the contract supplies them

### 4.1 Input table

The contract terms are from issue #14: baked solids with roles `hull`, `appendage` and `void`; lifting surfaces with chord stacks and thickness; mass items and load conditions; and "derived values ... are never stored; they are recomputed".

| Input | Used by | Definition in DSYHS | Supplied by the contract |
| --- | --- | --- | --- |
| LWL, BWL, Tc, ∇c, Aw, Ax, LCB, LCF | Upright residuary, heel delta, keel terms, Fn | Canoe body only, upright, at rest at the loading's equilibrium [REM §3.1; UCT; LABI] | Computed at load from the `hull` solids. The attitude is the load condition's static equilibrium, solved from its mass items with free trim. Same pass as the per-tick hydrostatics. |
| Cp = ∇c/(Ax·LWL), Cm = Ax/(BWL·Tc) | Upright residuary, Sc(φ) | Maximum-area section; BWL and Tc are maxima [REM §3.1] | Computed at load from the station structure of the baked stack (sectional area curve). |
| LCBfpp, LCFfpp | Upright residuary | Measured aft from the forward end of LWL | Computed at load. The body-frame origin is mid-LWL, so this is a shift by LWL/2. |
| LCB in % of LWL | Heel delta | From mid-LWL, aft negative (§2.2) | Computed at load. |
| Sc(φ) | Friction | Canoe body wetted area at heel | Computed from geometry. It can follow heel every tick, at about 55 µs per tick by the earlier costing. |
| T, ∇k, Zcbk | Keel residuary and its heel delta | Total draft; volume and centre of buoyancy of the keel (fin plus any stub or fillet below the canoe body) | **Gap.** The geometry gives T. ∇k and Zcbk need the set of solids that make up the "keel". The roles only say `appendage`, and the stub has no lifting surface. |
| Appendage S, mean chord, t/c | Appendage viscous | Per appendage | Fin and rudder come from the lifting-surface chord stacks and thickness distribution. The stub and skeg have no lifting surface, so their chord and t/c come from the solid's extent and become estimates. |
| Keel taper ratio TR | Te cross-check | Tip chord over root chord | From the fin chord stack. |
| ν, ρ | Friction, residuary weight | Water properties | **Not ship data.** They come from the environment query (water density and kinematic viscosity at the ship). The environment contract should carry ν. |
| Coefficient tables a, u, A, H, s, b | All of the above | §2 | Embedded by value in the hydro block's `dsyhs` family, cited. This matches the ADR 0004 self-contained rule. |
| Form factor 1, Reynolds length factor 0.7, heel law 6·φ^1.7, form-factor law 1 + 2t/c + 60(t/c)⁴ | Friction, heel delta, appendages | §2 and §3 | The contract names a "form factor" field only. **The 0.7 factor, the heel-law constants and the appendage form-factor constants are empirical constants too**, so under "no magic coefficients" they belong in the cited family block, not in code. |

### 4.2 Static inputs, against the design doc's per-tick hydrostatics

The design doc says the regression's hydrostatics "are not read once from the drawing but recomputed from the hull mesh at the current heel, trim and sinkage every tick" [02-hull, Resistance]. Three facts about how DSYHS is built argue against doing that for the residuary terms:

1. **The regression's parameters are upright values at rest.** The heel effect is a separate term, ΔRrh(φ), fitted as the difference between the 20-degree and the upright runs of the same models [TEIX §4.4.2]. Heeled LWL, BWL, Tc, Cm and LCB fed into the upright formula, with ΔRrh then added, would count heel twice. Heeled values are also asymmetric hulls that the regression never saw.
2. **Dynamic sinkage and trim are already inside the residuary.** The models ran free to heave and pitch, and the fitted curves "are representative for a situation in which ... the yacht is free to adopt the appropriate sinkage and pitch attitude" [SL15 p. 245]. The regression's parameters are the hydrostatics of each model at rest, a convention Remmlinger keeps in his re-analysis [REM §2, §3.1]. Recomputing them at the running attitude would count the effect twice again.
3. **Fn uses LWL at rest** [REM §2]. For the H-boat the heeled waterline is shorter, not longer: 6.38 m upright, 6.19 m at 20 degrees and 6.08 m at 30 degrees in the sailing condition (§5.3). So the J-Class motivation, a sailing length that grows with heel, does not arise for this hull. That case belongs to the long-keel family, where the design doc already expects reformulation [02-hull, table].

Recommendation:

- Compute the residuary inputs **once at load**, per load condition, at the upright static equilibrium.
- Let only the **friction wetted area follow the current heel** from geometry. That is K&S's own substitution with an exact Sc(φ), and the per-tick hydrostatics pass already produces it.
- Treat the K&S trim delta (§1) as the DSYHS way to account for aero bow-down trim if the polar benchmark needs it.

This conflicts with the design doc wording and should go to the coordinator as an open question, not be changed silently.

### 4.3 Outside every table

- **Fn below 0.15.** Residuary resistance is small here: at Fn 0.15 the table gives about 5 % of friction for the H-boat, with negative sign. Tapering to zero at Fn 0, as [UCT] does, is an estimate. Friction alone is well defined.
- **Sternway.** No DSYHS table covers negative surge. The design doc wants resistance in both surge directions [02-hull]. The defensible content is ITTC friction on |V| with the at-rest Sc, plus residuary set to zero as a flagged estimate. Sternway speeds of 1 to 2 kn are Fn 0.10 to 0.21, where residuary is small anyway. The cross-flow module carries the rest.

## 5. The H-boat against the series bounds

### 5.1 H-boat canoe-body hydrostatics

Computed by running the H-boat model's own `hullHydrostatics` (240-slice integration, here at 600 slices) on its loft [HB `src/hboat/hull.ts`]. The attitudes are the model's equilibria in `model/derived.json`: measurement 1456 kg (ORC certificate displacement) and sailing 1777 kg (weighed boat, sails, gear and three crew at 100 kg), both in sea water at ρ = 1025. The canoe body closes on the upper keel-line values. The keel stub, skeg, fin and rudder are separate solids [HB D6], so the canoe body here is exactly the contract's `hull` role.

| Quantity | Measurement 1456 kg | Sailing 1777 kg |
| --- | --- | --- |
| LWL (m) | 6.051 | 6.381 |
| BWL (m) | 1.745 | 1.840 |
| Tc (m) | 0.421 | 0.457 |
| ∇c (m³) | 1.281 | 1.594 |
| Sc (m²) | 7.885 | 8.895 |
| Sc from the K&S formula (m²) | 7.954 | 8.932 |
| Aw (m²) | 6.989 | 7.854 |
| Ax (m²) | 0.394 | 0.468 |
| LCB, LCF from mid-LWL (% LWL) | -1.12, -3.50 | -1.09, -3.24 |
| Cp | 0.538 | 0.534 |
| Cm = Ax/(BWL·Tc) | 0.536 | 0.556 |
| Cm at the max section, Ax/(Bx·Tx) | 0.548 | 0.564 |
| Static trim (bow up) | 0.66° | 1.49° |
| Fin + stub: ∇k (m³), CB depth below WL (m) | 0.1288, 0.800 | 0.1288, 0.837 |
| Total draft T (m) | 1.263 | 1.312 |

Cross-check: the K&S Sc formula is within 0.9 % of the geometry. The model's all-bodies figures (LWL 6.058 m, BWL 1.743 m, total wetted area 12.08 m²) match `derived.json` [HB].

### 5.2 Bounds

Bounds of the K&K 2008 regression, as tabulated by [DN14] Table 3 and text, "Delft Series Min/Max":

| Parameter | Series min | Series max | H-boat measurement | H-boat sailing | Inside? |
| --- | --- | --- | --- | --- | --- |
| LCBfpp/LWL | 0.500 | 0.579 | 0.511 | 0.511 | Yes |
| Cp | 0.521 | 0.580 | 0.538 | 0.534 | Yes |
| ∇c^(2/3)/Aw | 0.079 | 0.265 | 0.169 | 0.174 | Yes |
| BWL/LWL | 0.170 | 0.366 | 0.288 | 0.288 | Yes |
| LCBfpp/LCFfpp | 0.930 | 1.002 | 0.955 | 0.960 | Yes |
| BWL/Tc | 2.460 | 19.380 | 4.15 | 4.02 | Yes |
| **Cm** | **0.646** | **0.790** | **0.536** | **0.556** | **No, 14 to 17 % below** |
| ∇c^(1/3)/LWL | 0.120 | 0.230 | 0.179 | 0.183 | Yes |

Bounds of the K&S 1998 hull set, as tabulated by [TEIX] Table 1 and [LABI] Table 9, which agree. These are the bounds behind the heel, keel and side-force terms:

| Parameter | Series min | Series max | H-boat measurement | H-boat sailing | Inside? |
| --- | --- | --- | --- | --- | --- |
| LWL/BWL | 2.73 | 5.00 | 3.47 | 3.47 | Yes |
| BWL/Tc | 2.46 | 19.38 | 4.15 | 4.02 | Yes |
| LWL/∇c^(1/3) | 4.34 | 8.50 | 5.57 | 5.46 | Yes |
| LCB (% LWL from mid, aft negative) | -8.2 | 0.0 | -1.12 | -1.09 | Yes |
| LCF (% LWL from mid, aft negative) | -9.5 | -1.8 | -3.50 | -3.24 | Yes |
| Cp | 0.52 | 0.60 | 0.538 | 0.534 | Yes |
| **Cm** | **0.65** | **0.78** | **0.536** | **0.556** | **No** |
| Aw/∇c^(2/3) | 3.78 | 12.67 | 5.93 | 5.75 | Yes |

The two tables agree on their shared parameters. The newer set extends BWL/LWL down to 0.170, so LWL/BWL reaches 5.9. No published range was found for the keel parameters (T/BWL, ∇c/∇k, keel CB depth). The keel regression draws on the Delft Systematic Keel Series and Various Keel Series [UCT §3], whose ranges were not read. For the H-boat, T/BWL is 0.71 and ∇c/∇k is 12.4.

Froude numbers of the benchmark points, using the sailing LWL of 6.381 m: the ORC certificate's speeds [ship-definition-shape §4.1] run from 3.54 kn (TWA 150°, 6 kn true) to 8.21 kn (TWA 120°, 20 kn true), which is **Fn 0.23 to 0.53**. The design doc points are TWA 60°, 90° and 120° at 8 and 16 kn true, plus upwind, where boat speed is about VMG/cos(beat angle). They fall at Fn 0.29 to 0.48. All are inside the K&K 2008 range. All but the slowest downwind point are inside the 0.25 to 0.55 range of the heel delta, and that point sails with little heel.

### 5.3 Heeled wetted area, geometry against [KS98]

Ratio Sc(φ)/Sc(0), H-boat at equilibrium with free trim:

| Heel | K&S regression, sailing | Geometry, sailing | K&S regression, measurement | Geometry, measurement |
| --- | --- | --- | --- | --- |
| 10° | 0.986 | 0.987 | 0.983 | 0.990 |
| 20° | 0.982 | 0.966 | 0.979 | 0.973 |
| 30° | 0.980 | 0.953 | 0.975 | 0.962 |

Heeled LWL in the sailing condition is 6.31, 6.19 and 6.08 m at 10, 20 and 30 degrees.

## 6. What to do about Cm

Why it is out of bounds: the H-boat's midship section is a slack V that closes onto a narrow flat at the keel line, about 160 mm wide at station 5, where the stub starts [HB offsets, D6]. The DSYHS parents are round-bilge forms with a faired bottom. The low Cm is a real feature of the hull, not an artefact of where the canoe body is cut. Including the stub in the canoe body would deepen Tc and lower Cm further.

Where Cm enters:

- **K&K 2008, as a7·Cm·∇c^(1/3)/LWL.** a7 is small below Fn 0.35 and largest at Fn 0.40 to 0.60.
- **The K&S Sc formula and the Sc(φ) regression.** The geometry replaces both, so Cm does not matter there.
- **Not the heel delta or the keel terms.**

Sensitivity, sailing condition. Upright hull residuary with the actual Cm (0.556) against Cm clamped to the series minimum (0.646):

| Fn | Speed (kn) | Rr, actual Cm (N) | Rr, clamped Cm (N) | Change |
| --- | --- | --- | --- | --- |
| 0.30 | 4.61 | 46 | 42 | -10 % |
| 0.35 | 5.38 | 97 | 95 | -2 % |
| 0.40 | 6.15 | 240 | 269 | +12 % |
| 0.45 | 6.92 | 529 | 585 | +10 % |
| 0.50 | 7.69 | 965 | 1000 | +4 % |
| 0.55 | 8.46 | 1436 | 1376 | -4 % |

Against total upright resistance (§7), the bracket is about 5 to 6 % at Fn 0.40 to 0.45, which is where the 16-knot reaching points sit. That is the same size as the polar benchmark's 5 % tolerance, so it is worth recording, but it does not rule the regression out.

Recommendation:

1. Feed the actual Cm. K&K 2008 "deleted all higher order terms in their regression because ... these terms weakened the robustness and stability if the prediction has to be made outside of the parameter range" [REM §6, citing KK08]. Linear extrapolation 14 to 17 % past one bound, with every other parameter inside, is the use the authors designed for.
2. In `data-hboat`, record the clamped value as a flagged sensitivity bracket, not as a second model.
3. If the polar benchmark misses at Fn 0.40 to 0.45 by more than the bracket explains, the next step is the design doc's own: a few calm-water CFD runs to calibrate the upright curve, which must then agree with the regression within about 10 % inside its range [02-hull, Validation targets]. Do not tune Cm.

## 7. H-boat upright resistance from these tables (plausibility check)

Sailing condition, 1777 kg, ρ = 1025, ν = 1.188e-6 m²/s. The table uses the a0-outside equation form and Tc + Zcbk read as the keel CB depth below the waterline.

Appendage viscous resistance is a rough estimate: fin plus stub 3.03 m², mean chord 1.25 m, t/c 0.12; rudder 0.645 m², chord 0.372 m, t/c 0.054; skeg 0.471 m², chord 0.9 m, t/c 0.10. These chords and t/c values are my estimates from [HB] `derived.json`, not cited values.

| Fn | kn | Hull friction (N) | Hull residuary (N) | Keel residuary (N) | Appendage viscous (N) |
| --- | --- | --- | --- | --- | --- |
| 0.20 | 3.08 | 38 | 5 | 6 | 29 |
| 0.30 | 4.61 | 79 | 46 | 6 | 60 |
| 0.35 | 5.38 | 104 | 97 | 8 | 79 |
| 0.40 | 6.15 | 133 | 240 | 95 | 100 |
| 0.45 | 6.92 | 165 | 529 | 103 | 124 |
| 0.50 | 7.69 | 200 | 965 | 410 | 150 |
| 0.55 | 8.46 | 238 | 1436 | 478 | 178 |

With the other Zcbk reading (Zcbk as the CB depth, so that Tc is added on top), keel residuary becomes 254, 93, 1363 and 1599 N at Fn 0.40, 0.45, 0.50 and 0.55. That reading also goes negative at Fn 0.35 (-29 N). Resolving Zcbk matters above Fn 0.45.

The curve shape is as expected: residuary resistance overtakes friction at about Fn 0.36 (5.5 kn) and grows steeply past Fn 0.40 (6.15 kn).

## 8. Open questions

1. **Primary verification.** Someone with access to K&K 2008 and K&S 1998, through the TU Delft repository, the DSYHS site or the HISWA and RINA proceedings, needs to check these items before the tables land:
   - a3 at Fn 0.55;
   - the scale of the u table;
   - the LCB unit in the heel delta;
   - the ∇ in the H4 term;
   - the definition and sign of Zcbk;
   - the side-force grouping.

   Until then, every coefficient in `data-hboat` would carry `estimate` with a pointer to this note, not `src` to the paper. Can the coordinator fetch these, or should the user?
2. **Design doc wording** (§4.2). Should the residuary inputs be frozen at load per load condition, with only Sc following heel? The design doc currently says to recompute them every tick at heel, trim and sinkage.
3. **Keel solids in the hydro block.** The DSYHS keel terms need to know which solids make up the "keel" (fin plus stub). Should the `dsyhs` family block name those solid ids, or should a lifting-surface binding imply them?
4. **Constants beyond "form factor".** The 0.7 Reynolds length factor, the 6·φ^1.7 heel law and the 1 + 2t/c + 60(t/c)⁴ appendage law are empirical constants. Do they join the cited `dsyhs` block?
5. **Cm out of bounds** (§6). Is linear extrapolation with a recorded bracket acceptable for the polar benchmark, or should the benchmark tolerance absorb it explicitly?
6. **Reference loading for the polar benchmark.** The ORC VPP runs at 1456 kg plus a 338 kg default crew [ship-definition-shape §4.1], about 1794 kg. The model's sailing condition is 1777 kg. The regression inputs above barely move between the two. The load condition still has to match the certificate.
7. **K&S trim delta.** Should the bow-down trim correction be added, given that the regression's at-rest inputs do not see aero trim? Its coefficients were not transcribed in any source read.
8. **Kinematic viscosity** in the environment query contract (§4.1).

## Sources

- [ITTC 7.5-02-02-01 Resistance Test, Rev. 04, 2017](https://www.ittc.info/media/8001/75-02-02-01.pdf)
- [Keuning and Katgert 2008, research portal record (full text not reachable)](https://research.tudelft.nl/en/publications/a-bare-hull-resistance-prediction-method-derived-from-the-results)
- [Keuning and Sonnenberg 1998, research portal record (full text not reachable)](https://research.tudelft.nl/en/publications/approximation-of-the-hydrodynamic-forces-on-a-sailing-yacht-based/)
- [Day and Nixon 2014, Laser resistance, IJSCT](https://strathprints.strath.ac.uk/46407/7/Day_Nixon_IJSCT_2014_Measurement_and_prediction_of_the_resistance_of_a_laser_sailing.pdf)
- [Kilpin, UCT MSc thesis](https://open.uct.ac.za/server/api/core/bitstreams/93ef7aea-e24a-44c0-ac44-b8caf3428baf/content)
- [Borba Labi 2019, EMSHIP MSc thesis](https://matheo.uliege.be/bitstream/2268.2/8502/1/BORBA%20LABI%20%20Gaetan%20(Solent)%20-%20URO.pdf)
- [Teixeira, IST Lisbon MSc thesis](https://fenix.tecnico.ulisboa.pt/downloadFile/3378094857519920/Thesis_Pedro_Teixeira_104081_V3.pdf)
- [Remmlinger 2016, regression of the DSYHS data](http://www.remmlinger.com/Regression%20DSYHS.pdf)
- [Karczewski, Malinowska and Pruszko 2019, Mechanik](https://www.mechanik.media.pl/pliki/do_pobrania/artykuly/22/2019_01_s0042.pdf)
- [boatdesign.net, Delft series resistance equations variety](https://www.boatdesign.net/threads/delft-series-resistance-equations-variety.39154/)
- [boatdesign.net, Added resistance in waves](https://www.boatdesign.net/threads/added-resistance-in-waves.49546/)
- [H-boat model artifact](https://claude.ai/artifact/8GXU2RTYXeE4CezLk3YRGb)
- Slooff, J. W. (2015). The Aero- and Hydromechanics of Keel Yachts. Springer. DOI 10.1007/978-3-319-13275-4 (supplied copy, not committed).
