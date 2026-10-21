# Cross-flow drag coefficients and manoeuvring derivatives for the H-boat

Research for issue #15. First pass 2026-10-20, second pass 2026-10-21. Question: which published rule gives the sectional cross-flow drag coefficient C_D(x) from section shape for a fin-keel yacht hull like the H-boat, what values it gives for the H-boat's sections and for its keel and rudder as bluff plates, which source gives the linear manoeuvring derivatives Y_v, N_v, Y_r and N_r and with which hull parameters, whether the ship definition from issue #14 supplies those parameters, and what drift-angle and speed range each source covers.

The second pass reran the question against the papers supplied in `~/Downloads/hydro-research/` (outside the repo, never committed) and against open primary sources found beyond them. Text from the first pass that still stands is kept. Superseded passages are marked **Superseded (second pass)** and the replacement follows.

## What changed from the first pass

1. **No yacht source gives a measured sectional cross-flow rule, so the canoe-body rule stands.** The yacht manoeuvring models in the folder take C_D from Hoerner's 2D shapes [AS17, AS19, AS21], and the most detailed of them [AS17] replaced Hoerner with a RANS-fitted _viscous-only_ C_D of 0.02 to 0.2. It assigns the pressure part to its ideal-fluid derivatives. That value is not usable as a bluff-body drag for the H-boat (section 1.5). The diamond-section rule from [DS53] times the finite-length factor remains the proposal.
2. **The canoe-body value now carries a cited uncertainty band**, C_D·A 1.05 to 1.26 m², instead of a single number. The finite-length factor is bracketed by two sources: 0.52 from the surface-piercing plate of [TK93] and 0.63 from Hoerner's deep plates at the same aspect ratio [SL15, VC82]. [DS53] itself warns that its values may read low because of end leakage (section 1.6).
3. **Keel and rudder plate values are re-cited to Hoerner's plate data as reproduced in [SL15]:** C_N90 ≈ 1.17 for aspect ratio 1 and ≈ 1.2 for aspect ratio below 5. That gives keel 1.17 (C_D·A 1.05 m²) and rudder 1.20 (0.37 m²), against 1.13 and 1.19 in the first pass. [VC82] stays as the cross-check. The total pure-sway C_D·A becomes about 2.5 m² (first pass 2.4).
4. **New: the plate law is not a sin²α cross-flow law at intermediate angles.** Hoerner's plate data [SL15 Fig. 7.4.33] show the normal force of a low-aspect-ratio plate rising to about 1.75 near 38° (AR 1) and staying at C_N90 from about 40 to 55° onward. A cross-flow term ½ρ·C_D·|v_n|·v_n gives only 0.29 at 30° and 0.59 at 45°. The appendages need a C_N(α) polar over 0 to 90°, not a v_n² law. This bears on the blend ticket (#16).
5. **New yacht-specific derivatives with tank data: [MF11].** Masuyama and Fukasawa (2011) tabulate oblique-tow derivatives for three fin-keel yachts, one of them H-boat sized (Sea Dragon: L_WL 5.30 m, draft 1.30 m, 1370 kg). Y'_V is 0.535 to 0.598 on ½ρV²·L_WL·D across all three. Their yaw-rate derivatives are computed from geometry (Inoue for the canoe body, lifting-surface theory for the fin), not measured. This replaces the first pass's "nothing citable for the H-boat" with a cited check band. The recommendation to derive the H-boat derivatives at load stands, now with yacht precedent (section 3.5).
6. **New: the cubic leeway fits stop at 14 to 18°.** [MF11]'s Y'_V·V' + Y'_VVV·V'³ fits peak at β = 13.9 to 18.4° and change sign at 24.7 to 33.2°. Their test range is about ±15°. This is direct yacht evidence for the blend's upper limit (section 5).
7. **New: Munk moment double counting.** [MF11] removes the added-mass Munk moment from its rigid-body equations because captive-test derivatives already contain it. The same applies to a VLM hull solution. If the 6-DOF body also applies the full added-mass Coriolis terms, the Munk moment is counted twice (section 3.6).
8. **Keuning and Vermeulen (2003) and Keuning, Vermeulen and de Ridder (2005) are still unread.** The TU Delft repository refused connections and OnePetro is paywalled. Two secondary statements were found. [SL15 App. G] reports that the 2003 paper uses a slender-body hull yaw moment form, and that its data correlate "only modestly" with Slooff's estimate. [MF11] states that the 2005 paper extends Masuyama's derivative model with DSYHS regressions. Hooft (1994) is also still unread.
9. **The first pass's coverage table gains the yacht sources**, and the supplied folder is triaged file by file (section "Sources read").

## Answer in brief

- **No published closed-form rule covers yacht sections, and no yacht paper measures one.** Kijima and Tanaka (1992) and Tanaka and Kijima (1993) cover merchant sections. The yacht manoeuvring models of Angelou and Spyrou [AS17, AS19, AS21] take a per-section C_D from Hoerner's 2D bodies, or from RANS runs of the viscous part alone. Neither gives a value usable for the H-boat at large drift.
- **Canoe-body rule (unchanged in form):** the 2D C_D of the sharp-apexed diamond family from [DS53] (1.5 at B/2T = 1, 1.1 at 2) times a finite-length factor. For the H-boat this gives **C_D 0.57 amidships and aft, rising to 0.78 at the bow, and C_D·A 1.05 m² with factor 0.52 [TK93], or 1.26 m² with factor 0.63 [SL15, VC82]**. The first is the recommended value and the second the upper bound.
- **Keel and rudder:** C_N90 from Hoerner's plate data [SL15], with the hull as a reflection plane. **Keel 1.17 (C_D·A 1.05 m²), rudder 1.20 (0.37 m²)**. Between stall and 40 to 55°, the plate normal force is far above C_N90·sin²α, so the appendages need a C_N(α) polar rather than the sectional cross-flow law.
- **Linear derivatives:** Kijima et al. (1990) and Yoshimura et al. (2009) do not fit the H-boat (first pass, unchanged). The one yacht source with tank data, [MF11], gives Y'_V 0.535 to 0.598 for three fin-keel yachts. Applied to the H-boat this is 4.1 to 4.6 m² per radian. Their Y_r and N_r are computed from geometry, not measured. **Recommendation: derive Y_v, N_v, Y_r and N_r from the VLM at load, and use the [MF11] band as a benchmark.** This still deviates from the design doc's "CFD grid or Kijima".
- **The ship definition supplies every parameter.** The gaps are unchanged: stub and skeg have no rule, and the derivative slot has nothing to hold if the VLM derives them. One new slot is needed: a cited appendage C_N(α) table, which fits the hydro block's "cross-flow section drag rule with coefficients".
- **For the blend (#16):** the yacht derivative fits are valid to about 15° of leeway [MF11, SY95]. The cross-flow coefficients are 90° values. Low-aspect-ratio plates reach their 90° normal force from about 40 to 55°. Between 15 and 40° there is no source for the canoe body, and the appendage polar must carry that range.

## Sources read

Primary sources read in full or in the parts cited. Tags marked † were added in the second pass.

- **[KT92]** Kijima, K. and Tanaka, S. (1992). The cross flow drag acting on rectangular cross-sections with round edge. J. Soc. Naval Architects of Japan 172, 1 to 8. https://www.jstage.jst.go.jp/article/jjasnaoe1968/1992/172/1992_172_1/_pdf
- **[TK93]** Tanaka, S. and Kijima, K. (1993). On the distribution of cross flow drag over the length of a ship moving transversely. J. Soc. Naval Architects of Japan 174, 357 to 363. https://www.jstage.jst.go.jp/article/jjasnaoe1968/1993/174/1993_174_357/_pdf
- **[K90]** Kijima, K., Katsuno, T., Nakiri, Y. and Furukawa, Y. (1990). On the manoeuvring performance of a ship with the parameter of loading condition. J. Soc. Naval Architects of Japan 168, 141 to 148. https://www.jstage.jst.go.jp/article/jjasnaoe1968/1990/168/1990_168_141/_pdf
- **[Y09]** Yoshimura, Y., Nakao, I. and Ishibashi, A. (2009). Unified mathematical model for ocean and harbour manoeuvring. Proc. MARSIM 2009. https://eprints.lib.hokudai.ac.jp/repo/huscap/all/42969/MARSIM09(Yoshimura)auther.pdf
- **[O87]** Obokata, J. (1987). On the basic design of single point mooring systems (1st report). J. Soc. Naval Architects of Japan 161, 183 to 195. https://www.jstage.jst.go.jp/article/jjasnaoe1968/1987/161/1987_161_183/_pdf
- **[DS53]** Delany, N. K. and Sorensen, N. E. (1953). Low-speed drag of cylinders of various shapes. NACA TN 3038. Table I re-checked in the second pass. https://ntrs.nasa.gov/api/citations/19930083675/downloads/19930083675.pdf
- **[VC82]** Viterna, L. A. and Corrigan, R. D. (1982). Fixed pitch rotor performance of large horizontal axis wind turbines. NASA CP-2230. https://ntrs.nasa.gov/api/citations/19830010962/downloads/19830010962.pdf
- **[HB]** H-boat model artifact, version 1792502085-f25d: offsets, `model/derived.json`, `docs/appendages.md`, `docs/decisions.md`, `src/hboat/hull.ts`. https://claude.ai/artifact/8GXU2RTYXeE4CezLk3YRGb
- **[I14]** Issue #14 resolution (ship definition contract), ADR 0004, `docs/intention/02-hull.md`.
- **[SL15]** † Slooff, J. W. (2015). The Aero- and Hydromechanics of Keel Yachts. Springer. Sect. 5.16 (non-lifting bodies), 6.3 to 6.4 (side force, yawing moment, directional stability), 6.8 (dynamic stability), 7.4 (Fig. 7.4.33 and 7.4.34, flat-plate normal force after Hoerner 1965 and Winter 1937), App. G (hull yawing moment), App. J. Supplied copy.
- **[MF11]** † Masuyama, Y. and Fukasawa, T. (2011). Tacking simulation of sailing yachts with new model of aerodynamic force variation during tacking maneuver. Journal of Sailboat Technology, Article 2011-01, SNAME. Eq. (7) to (12), Fig. 9 and 10, Table 1, Appendix. http://higherlogicdownload.s3.amazonaws.com/SNAME/1516f098-2760-4bff-86fa-9ca63a85f102/UploadedImages/2011-01.pdf
- **[AS17]** † Angelou, M. and Spyrou, K. J. (2017). A new mathematical model for investigating course stability and maneuvering motions of sailing yachts. Journal of Sailboat Technology, Article 2017-06, SNAME. Eq. (24) to (39), Fig. 11 to 14. https://higherlogicdownload.s3.amazonaws.com/SNAME/1516f098-2760-4bff-86fa-9ca63a85f102/UploadedImages/2017-06__Angelou_and_Spyrou__A_New_Mathematical_Model_for_Investigating_Course_Stability_and_Maneuvering_Motions_of_Sailing_Yachts.pdf
- **[AS19]** † Angelou, M. and Spyrou, K. J. (2019). Modeling of transient hydrodynamic lifting forces of sailing yachts and study of their effect on maneuvering in waves. Ocean Engineering 173, 531 to 547. Sect. 3, 4.1, App. D. Supplied copy.
- **[AS21]** † Angelou, M. and Spyrou, K. J. (2021). Course-keeping assessment of yachts' upwind sailing in waves. Journal of Fluids and Structures 101, 103227. Sect. 2.2, 3. Supplied copy.
- **[SY95]** † Suzuki, K. and Yoshihara, A. (1995). Computation of hydrodynamic forces acting on sailing yacht by means of surface panel method. J. Soc. Naval Architects of Japan 178, 113 to 123. Supplied copy.
- **[YA05]** † Yoo, J. and Ahn, H. (2005). Experimental study on the hydrodynamic forces of 30 feet sailing yacht. J. Soc. Naval Architects of Korea 42(3), 233 to 240. Supplied copy (scanned; read as images).
- **[JA10]** † Jang, H. Y., Park, C. H., Kim, H. W., Lee, B. S. and Lee, I. W. (2010). A study on the sail force prediction method for hull hydrodynamic force measurement of 30 feet catamaran sailing yacht. J. Soc. Naval Architects of Korea 47(4), 477 to 483. Supplied copy.
- **[KL20]** † Klaka, K. (2020). Why yacht rudders break. Trans. RINA 162 A4, IJME. Appendix 1 (normal force near stall, after Whicker and Fehlner 1958 via Lewis 1989) and Appendix 3 (effective aspect ratio after Molland 1978). Supplied copy.

Supplied files judged not relevant to this ticket after reading:

| File                                                                                                | Content                                                                                  | Why not used                                                                                                                 |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A Fast Hybrid Method ... large heel angles (Duan et al. 2026)                                       | Radiation and diffraction forces on a C11 container ship at heel, CGAN Green's functions | No drift, no cross-flow, no yacht                                                                                            |
| CFD Simulations of Marine Hydrodynamics (MDPI book)                                                 | Merchant-ship CFD papers: resistance, seakeeping, rudder–propeller, inland drift         | Table of contents and full-text search found no cross-flow drag or yacht derivatives; the inland drift paper is the next row |
| The impact of free surface modelling ... inland waterways                                           | Barge static drift 0 to 12° in shallow water                                             | Shallow-water barge; only notes that nonlinearity starts near 6° of drift                                                    |
| Engineering Mathematics in Ship Design (MDPI book)                                                  | Includes an MMG simulation chapter citing Inoue et al.                                   | Generic MMG; no yacht or cross-flow content                                                                                  |
| On Wave-making Hydrodynamic Forces and Wave Pattern of a Sailing Yacht (Song, Ikehata, Suzuki 1989) | Slender-ship theory at small drift                                                       | Small drift only; #17 territory                                                                                              |
| Sailing yacht performance prediction ... 6 DOF (Levin and Larsson 2017)                             | CFD equilibrium sailing                                                                  | Small leeway only; #17 territory                                                                                             |
| On the structural assessment of tall ship rigs                                                      | Rig structures                                                                           | Not hydrodynamics                                                                                                            |
| Two ScienceDirect HTML pages on interaction forces                                                  | Saved pages are a bot-verification screen with no article text                           | No content to read                                                                                                           |

Sources identified but **not read**:

- Hooft, J. P. (1994). The cross-flow drag on a manoeuvring ship. Ocean Engineering 21(3), 329 to 342, DOI 10.1016/0029-8018(94)90004-3. Paywalled; no open copy found.
- Hooft, J. P. and Quadvlieg, F. H. H. A. (1996). Non-linear hydrodynamic hull forces derived from segmented model tests. Proc. MARSIM 1996. No open copy found.
- Keuning, J. A. and Vermeulen, K. J. (2003). The yaw balance of sailing yachts upright and heeled. Proc. 16th CSYS, TU Delft report 1363-P. The repository file (repository.tudelft.nl File_2919930e...) refused connections from here; OnePetro is paywalled.
- Keuning, J. A., Vermeulen, K. J. and de Ridder, E. J. (2005). A generic mathematical model for the maneuvering and tacking of a sailing yacht. Proc. 17th CSYS, DOI 10.5957/CSYS-2005-012. Paywalled.
- de Ridder, E. J., Vermeulen, K. J. and Keuning, J. A. (2004). A mathematical model for the tacking maneuver of a sailing yacht. 18th HISWA Symposium. Portal record only.
- Masuyama, Y., Fukasawa, T. and Sasagawa, H. (1995). Tacking simulation of sailing yachts: numerical integration of equations of motion and application of neural network technique. Proc. 12th CSYS. The origin of the [MF11] derivative model and the Fair V oblique-tow data.
- Hoerner, S. F. (1965). Fluid-Dynamic Drag. Cited through [SL15], [VC82] and [AS17].
- van der Kolk, N. J. (2020). Hydromechanics of wind-assisted ship propulsion. TU Delft PhD thesis. It treats large-leeway side force and cites Hooft; repository unreachable.

## 1. The sectional rule

### 1.1 Form of the force

Both readable merchant formulations integrate a quadratic drag over strips, with the local lateral velocity at each strip:

- [Y09] eq. (5) to (7): ΔY = -(ρ/2)·C_D·d·Δx·|v + C_rY·r·x|·(v + C_rY·r·x), with ΔN = ΔY·x. C_rY and C_rN are correction factors on the yaw-rate part; both are 1.0 in the original cross-flow theory.
- [O87] eq. (2): F_y = -(1/2)ρ·d·∫ C_y(φ_x)·V_x² dx, where V_x and φ_x are the relative speed and inflow angle at each section, with current included.
- [TK93] eq. (10) and [KT92] define the two-dimensional coefficient on the double body (the free surface as a rigid wall): C_D = Y / (½ρ·(2d)·U²) per unit length, where 2d is the section's height normal to the flow. For the real half-body this is a force of ½ρ·C_D·d·U² per unit length.

The yacht formulation [AS17] eq. (35) and (36) has the same strip form: Y_CF = -(ρ/2)·∫ A(x,T)·C_D(x,T,v_T)·v_T·|v_T|·cos φ dx, with v_T = v + r·x and N_CF the same integrand times x. The paper calls A(x,T) "the cross sectional area of a section". An area there makes the integrand a moment, not a force, so it must be the section's projected lateral length (draft). This reading is an inference.

The design doc's integrand "½ρ·C_D(x)·|v_n|·v_n" is missing the local draft: **the force per unit length is ½ρ·C_D(x)·T(x)·|v_n|·v_n**. T(x) is the section's submerged height normal to the inflow at the current attitude. v_n is the section's lateral relative velocity: sway plus yaw rate times x, minus current.

### 1.2 Two-dimensional C_D from section shape

**[KT92] Fig. 12**, a discrete-vortex computation for rectangular double-body sections. Values read off the figure, to within about ±0.03:

| r/2d \ B/2d | 1.0  | 1.5  | 2.0  |
| ----------- | ---- | ---- | ---- |
| 0.0         | 2.15 | 1.90 | 1.61 |
| 0.05        | 1.53 | 1.31 | 1.21 |
| 0.1         | 1.33 | 1.21 | 0.91 |
| 0.2         | 1.15 | 0.92 | 0.66 |

This is the right table for a merchant hull such as the Joutsen's. It does not reach the H-boat.

**[DS53] Table I**, wind-tunnel C_d at Re = 1e5 (2e5 where marked), with fineness ratio c0/b0 = length in the flow direction over height across it. For a hull in pure sway this is B/2T. The second pass re-read the table and added the triangle rows:

| Shape                          | c0/b0 | r/b0           | C_d                 |
| ------------------------------ | ----- | -------------- | ------------------- |
| Circle                         | 1:1   | 0.5            | 1.0                 |
| Ellipse                        | 1:2   |                | 1.6                 |
| Ellipse                        | 2:1   |                | 0.6                 |
| Square                         | 1:1   | 0.021          | 2.0                 |
| Square                         | 1:1   | 0.167 / 0.333  | 1.2 (2e5) / 1.0     |
| Rectangle                      | 2:1   | 0.042          | 1.4                 |
| Rectangle                      | 2:1   | 0.167 / 0.500  | 0.7 (2e5) / 0.4     |
| Diamond (apex facing the flow) | 1:2   | 0.021 to 0.167 | 1.8 / 1.7           |
| Diamond (apex facing the flow) | 1:1   | 0.015 to 0.235 | 1.5                 |
| Diamond (apex facing the flow) | 2:1   | 0.042 to 0.333 | 1.1                 |
| Triangle, apex forward         | 1:1   | 0.021 to 0.250 | 1.2, 1.3 (2e5), 1.1 |
| Triangle, base forward         | 1:1   | 0.021 to 0.250 | 2.0, 1.9 (2e5), 1.3 |

Reynolds-number behaviour [DS53, Fig. 6, 11, 12] decides the H-boat case. The 2:1 ellipse drops from about 0.6 to about 0.1 between Re 1.5e5 and 4e5. The diamonds with r/b0 up to 0.17 stay flat to Re 1e6 and beyond, because their separation is fixed at the corners across the flow.

### 1.3 Finite length and distribution along the hull

[TK93] measured a 1.0 m by 0.065 m aluminium plate towed broadside (2d/L = 0.13) and found Y' = Y/(½ρLdU²) = 1.03, about half of the two-dimensional plate value of 1.98.

| Hull            | B/d   | 2d/L  | L/B  | Y' computed | Y' measured                              | Distribution                                                                                                   |
| --------------- | ----- | ----- | ---- | ----------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Wigley          | 1.6   | 0.125 | 10.0 | 0.90        | 0.91                                     | Below 1.0 amidships, above 1.0 for sections 0.3 to 0.45 L from midship, about the plate value 1.0 at both ends |
| SR108 container | 2.674 | 0.109 | 6.89 | 0.59        | 0.57 (Matsumoto et al., segmented model) | Below 1.0 everywhere except within 0.05 L of the ends; midship C_D 60 to 70 % of the Wigley's                  |

The finite-length factor used here, **f3D = 1.03 / 1.98 = 0.52**, is that measured plate ratio. The H-boat canoe body has 2T/L ≈ 0.14, close to the plate's 0.13. Taking the factor from a plate and applying it to a hull is an estimate.

### 1.4 Whole-hull regression as a cross-check

[Y09] eq. (19) fits a single hull C_D to the draft ratio: **C_D = -0.0591·(L/d) + 1.848**, from about seven models with L/d 10 to 22. For the H-boat canoe body (L/d = 14.5) it gives 0.99, an upper bound since that fit includes end effects at merchant L/B.

### 1.5 What the yacht manoeuvring models use (second pass)

- **[AS17]** names two options for the per-section C_D. The first is Hoerner's (1965) 2D data for "equivalent ellipsoidal or triangular two-dimensional shapes", which the authors reject as too inaccurate to read off old printed figures. The second is CFD. They then argue that "the potential influence of the cross-flow drag has already been implemented inside the velocity derivatives of the ideal-fluid effects sub-model". So they ran RANS (Fluent, Spalart–Allmaras) on double-body sections and **subtracted the pressure part**. The remaining viscous part was fitted as C_D = a·v^b. For a section with keel at four drafts (Fig. 12): a = 0.023 to 0.034, b = -0.25 to -0.26, so C_D falls from about 0.2 near zero speed to about 0.03 at 0.5 m/s. They call the viscous contribution "of very small order".
- **[AS19]** sect. 4.1 describes the same model: "Cross-flow effects are implemented as in Söding (1982) ... based on a cross-flow drag coefficient retrieved from data concerning 2-D bodies of similar shapes (Hoerner, 1965)". **[AS21]** sect. 3 says "the required friction coefficients were obtained from (Hoerner, 1965)". Neither paper prints a coefficient value.
- **Assessment.** The ideal-fluid derivatives of [AS17] (Yuanxie 1986 strip integrals of the sectional sway added mass, eq. (28) to (34)) are linear in v·u. In pure sway at zero forward speed they give no steady force. An inviscid strip model also has no separation drag. What remains in [AS17] at 90° of drift is the 0.03 to 0.2 viscous term, an order below every plate and section value in 1.2 and 2.2. That suits their upwind tacking scope, where the rudder is capped at 15° to keep the flow attached [AS21]. It cannot reproduce lying ahull. **The [AS17] coefficients are not adopted.** The note in issue #17 that this model "adds cross-flow (Söding with Hoerner coefficients) to lift" holds for the structure but not for the values: the term exists, but its coefficient is viscous-only.
- **[SL15]** has no sectional cross-flow rule for hulls. Sect. 5.16 describes non-lifting slender bodies: negligible lift at small incidence, then lift "as a result of cross-flow separation and vortex formation" growing with angle, "until the flow breaks down completely by massive separation due to excessive cross-flow". That is the Allen–Perkins picture the strip model represents.

### 1.6 Uncertainty of the canoe-body value (second pass)

- **[DS53] end leakage.** The report states that its circle reads about 1.0, against 1.2 in sealed tests, "due to the flow of air through the gaps in the tunnel walls at the ends of the model", and that "some influence of end leakage on the drag measurements for all the other cylinders may have been present also". The diamond values may therefore read low by up to about 17 %.
- **Finite-length factor from Hoerner.** Viewed broadside, the canoe double body is a plate of length L_WL and height 2T, aspect ratio 6.06 / 0.834 = 7.3. [VC82] gives C_D,max = 1.11 + 0.018·7.3 = 1.24, and [SL15 Fig. 7.4.34] gives C_N90 between 1.2 and 1.3 at 1/A = 0.14. Against the 2D 1.96 to 1.98 this is a factor of **0.63**, above the 0.52 of [TK93]. The [TK93] plate pierced the free surface at model scale; Hoerner's plates were deep. The surface-piercing case is the H-boat's, so 0.52 stays the recommended value and 0.63 the upper bound.

Together these put the canoe-body C_D·A between 1.05 and about 1.26 m² (1.05 × 0.63 / 0.52). The [DS53] leakage bias, if real, would push the upper end towards 1.5 m².

## 2. H-boat values

### 2.1 Canoe-body sections

These come from the printed offsets [HB], in the model's frame (station s at x = (s - 5)·0.63 m). The waterline is the measurement condition: 47.4 mm below KVL at station 5, 0.658 degrees bow up, 1456 kg. The canoe body closes on the upper keel-line value, so stub, skeg and keel are excluded. The equivalent bilge radius comes from A = B·T - 2(1 - π/4)·r².

| Station | x (m)  | T (m) | B (m) | C_M  | B/2T | r/2T | C_D,2D | C_D (x 0.52) | C_D (x 0.63) |
| ------- | ------ | ----- | ----- | ---- | ---- | ---- | ------ | ------------ | ------------ |
| 0.5     | -2.835 | 0.063 | 0.486 | 0.50 | 3.85 | 1.50 | 1.10   | 0.57         | 0.69         |
| 1       | -2.520 | 0.132 | 0.840 | 0.50 | 3.19 | 1.36 | 1.10   | 0.57         | 0.69         |
| 2       | -1.890 | 0.244 | 1.286 | 0.56 | 2.63 | 1.17 | 1.10   | 0.57         | 0.69         |
| 3       | -1.260 | 0.334 | 1.560 | 0.56 | 2.33 | 1.10 | 1.10   | 0.57         | 0.69         |
| 4       | -0.630 | 0.393 | 1.700 | 0.55 | 2.16 | 1.06 | 1.10   | 0.57         | 0.69         |
| 5       | 0.000  | 0.417 | 1.693 | 0.56 | 2.03 | 1.02 | 1.10   | 0.57         | 0.69         |
| 6       | 0.630  | 0.408 | 1.493 | 0.56 | 1.83 | 0.97 | 1.17   | 0.61         | 0.74         |
| 7       | 1.260  | 0.371 | 1.175 | 0.54 | 1.58 | 0.92 | 1.27   | 0.66         | 0.80         |
| 8       | 1.890  | 0.291 | 0.783 | 0.54 | 1.35 | 0.85 | 1.36   | 0.71         | 0.86         |
| 9       | 2.520  | 0.151 | 0.336 | 0.52 | 1.12 | 0.79 | 1.45   | 0.76         | 0.91         |
| 9.5     | 2.835  | 0.046 | 0.093 | 0.50 | 1.01 | 0.77 | 1.50   | 0.78         | 0.95         |

Stations 0 and 10 are dry in this condition. In the sailing condition (1777 kg, 1.49 degrees bow up) every T grows by about 0.04 m, B/2T moves by under 0.1, and the profile area rises from 1.71 to 1.95 m².

- **C_M is 0.50 to 0.56 at every station**, close to a triangle and far from an ellipse or a rounded rectangle. In the double body the keel line is a sharp apex across the flow, which is the diamond family of [DS53]. No second-pass source contradicts this choice. [AS17] names "triangular" shapes as one of the two Hoerner families for yacht sections, which is the same family seen from one side.
- **C_D,2D is interpolated linearly in B/2T** between the 1:1 diamond (1.5) and the 2:1 diamond (1.1), and held at 1.1 above B/2T = 2. Both are estimates.

Integrated: **C_D·A of the canoe body is 1.05 m² (factor 0.52) to 1.26 m² (factor 0.63) over a profile area of 1.71 m²**, a mean C_D of 0.61 to 0.74.

### 2.2 Keel and rudder as bluff plates

**Superseded (second pass):** the first pass took C_D,max = 1.11 + 0.018·AR from [VC82] as the primary value (keel 1.13, rudder 1.19). [VC82] stays as a cross-check, and the primary citation becomes Hoerner's plate data as reproduced in [SL15].

[SL15] sect. 7.4, after Hoerner (1965) and Winter (1937): "the normal force coefficient CN of square, flat plates (A = 1) takes the value CN ≈ 1.17 for α > ≅ 40°. For an aspect ratio of 2 this is CN ≈ 1.20 for α > ≅ 55°. The corresponding values in two-dimensional flow (A = ∞) are CN ≈ 1.96 for α > ≅ 75°." Fig. 7.4.34: "C_N90 ≅ 1.2 for values of 1/A > ≅ 0.2, that is for A < ≅ 5." With flow separated at all edges, "the effects of Reynolds number are totally negligible". With the hull as a reflection plane, the effective AR is twice the geometric one; that doubling is an estimate. [KL20] cites 1.7 times geometric for rudders at small angles (after Molland 1978). Both factors put both fins in the C_N90 ≈ 1.2 band.

| Appendage              | Area (m²) | Span (m) | AR geometric | AR effective | C_N90 [SL15] | C_D,max [VC82] | C_D·A (m²) |
| ---------------------- | --------- | -------- | ------------ | ------------ | ------------ | -------------- | ---------- |
| Keel below VL8 [HB]    | 0.898     | 0.70     | 0.55         | 1.09         | 1.17         | 1.13           | 1.05       |
| Rudder, post-1972 [HB] | 0.305     | 0.820    | 2.21         | 4.41         | 1.20         | 1.19           | 0.37       |

The stub (0.026 m³) and the skeg (27 to 94 mm deep) are `appendage` solids with no lifting surface. No source assigns them a rule; section 4 keeps the proposal of counting them in the local section depth.

### 2.3 Appendages between stall and 90 degrees (second pass)

The design doc says "keel and rudder become bluff plates in this regime" and writes the regime's force as ½ρ·C_D·|v_n|·v_n. Applied to a plate, that is a normal force coefficient of C_N90·sin²α. Hoerner's measured plate curves [SL15 Fig. 7.4.33, read off the figure to about ±0.1] behave differently:

| α   | C_N90·sin²α (AR 1) | Measured C_N, AR 1                  | Measured C_N, AR 2 |
| --- | ------------------ | ----------------------------------- | ------------------ |
| 30° | 0.29               | about 1.4, rising                   | about 0.8          |
| 38° | 0.44               | peak about 1.75, then a sudden drop | about 0.95         |
| 45° | 0.59               | about 1.17                          | about 1.05         |
| 60° | 0.88               | about 1.17                          | about 1.2          |
| 90° | 1.17               | 1.17                                | 1.2                |

[KL20] Appendix 1 gives a typical yacht spade rudder near stall at α = 23°: C_L 1.28, C_D 0.52, C_N 1.38 (Whicker and Fehlner 1958, via Lewis 1989).

So between stall (15 to 25° for these aspect ratios) and about 40 to 55°, a fin's normal force is one to four times what the sin²α law gives. Its lift is C_N90·cos α [SL15 eq. 7.4.13], not zero. A stalled boat failing a tack, or a broaching boat with the rudder at 30 to 50°, sits in exactly this range. **The appendage rule should be a C_N(α) polar over 0 to 90°, indexed by effective aspect ratio and evaluated on the local inflow angle**, with lift and drag from C_N·cos α and C_N·sin α. It is the same data shape as the sail polars. The VLM carries the attached range below stall, and the blend hands over from the VLM to the polar, not to a sin²α term. The canoe body has no such data in any source read; for it the strip law of 2.1 stays.

### 2.4 Totals and a drift sanity check

In pure sway: canoe body 1.05 (to 1.26), keel 1.05 and rudder 0.37, **about 2.5 m² of C_D·A (up to 2.7 m²)**, before stub and skeg. The appendages carry 57 %. As an illustration only, a steady aerodynamic side force of 400 N would balance at v = √(2·400 / (1025·2.47)) = 0.56 m/s = 1.1 kn. That falls inside the design doc's lying-ahull target of 0.5 to 1.5 kn. The aero force is a placeholder, not a result.

## 3. Linear manoeuvring derivatives

### 3.1 Kijima et al. 1990 (first pass, unchanged)

[K90] eq. (7), even keel, nondimensionalised on ½ρ·L·d·U² and ½ρ·L²·d·U², with k = 2d/L: Y'_β = (π/2)·k + 1.4·C_B·B/L; Y'_r - (m' + m'_x) = -1.5·C_B·B/L; N'_β = k; N'_r = -0.54·k + k², plus nonlinear terms and a trim correction (eq. 9). Parameters: L, B, d, C_B, τ, m', m'_x. Fitted on 13 merchant models: L/B 4.5 to 6.9, B/d 2.7 to 6.2, C_B 0.49 to 0.84, k 0.058 to 0.146.

### 3.2 Yoshimura et al. 2009 (first pass, unchanged)

[Y09] eq. (17) and (18) modify Kijima's linear terms for fine ships. The paper writes the linear terms as Y'_v·v'·|u'| + (Y'_r - m'_x)·r'·u' and N'_v·v'·u' + N'_r·r'·|u'|, so that they vanish at zero forward speed, and adds the cross-flow integral with C_D = -0.0591·(L/d) + 1.848, C_rY = 0.520·(L/B) - 1.062 and C_rN = 0.0742·(L/d) - 0.297. Model ranges: L/B 4.8 to 6.9, L/d 13 to 22, C_B 0.55 to 0.83.

### 3.3 The H-boat against these regressions (first pass, unchanged)

| Basis                                   | d (m) | k     | C_B   | L/B  | B/d  | Y'_β  | Y'_r - (m'+m'_x) | N'_β  | N'_r   | In [K90] range?               |
| --------------------------------------- | ----- | ----- | ----- | ---- | ---- | ----- | ---------------- | ----- | ------ | ----------------------------- |
| Canoe body, midship draft, V ≈ 1.279 m³ | 0.417 | 0.138 | 0.29  | 3.48 | 4.18 | 0.333 | -0.125           | 0.138 | -0.055 | k and B/d yes; C_B and L/B no |
| Whole hull, full draft, V = 1.4205 m³   | 1.263 | 0.417 | 0.107 | 3.48 | 1.38 | 0.698 | -0.046           | 0.417 | -0.051 | No parameter in range         |

The H-boat is outside the merchant family on either basis, and the canoe-body basis misses the fin.

### 3.4 Yacht derivatives with tank data: Masuyama and Fukasawa 2011 (second pass)

**Superseded (second pass):** the first pass said the yacht-specific sources were unreachable and the derivative slot had "nothing citable for the H-boat". [MF11] is open and gives measured yacht derivatives.

[MF11] eq. (7) models the steady hull force (canoe body plus fin keel, rudder removed) as a polynomial in V' = -sin β and heel φ:

Y_H = (Y'_V·V' + Y'_φ·φ + Y'_Vφφ·V'φ² + Y'_VVφ·V'²φ + Y'_VVV·V'³)·½ρV_B²·L·D, and the same form for N_H on ½ρV_B²·L²·D. Here L is L_WL and D is the draft including the fin keel. N is taken about midships. The coefficients come from oblique towing and rudder angle tests on scale models ("the analysis procedure ... is described in a previous paper (Masuyama et al. 1995)"). Table 1, upright terms:

| Boat                 | Fujin (YR 10.3) | Fair V (KIT 34) | Sea Dragon |
| -------------------- | --------------- | --------------- | ---------- |
| LOA (m)              | 10.35           | 10.39           | 6.45       |
| L_WL (m)             | 8.80            | 8.55            | 5.30       |
| B_WL (m)             | 2.64            | 2.42            | 1.87       |
| Canoe draft (m)      | 0.44            | 0.41            | 0.28       |
| Draft with fin D (m) | 2.02            | 1.96            | 1.30       |
| Displacement (kg)    | 4410            | 3780            | 1370       |
| Y'_V                 | -0.535          | -0.598          | -0.585     |
| Y'_VVV               | 3.07            | 3.20            | 1.95       |
| N'_V                 | -0.0323         | -0.0273         | -0.0482    |
| N'_VVV               | -0.0298         | 0.0187          | -0.0902    |
| Y'_ψ̇ (computed)      | -0.00401        | 0.0153          | -0.0188    |
| N'_ψ̇ (computed)      | -0.00589        | -0.00521        | -0.00643   |

Displacement includes crew. Heel-coupling terms, rudder coefficients C_Xδ to C_Nδ, added masses and inertias are in the same table and not repeated here.

- **The H-boat is in this population.** Sea Dragon (L_WL 5.30 m, D 1.30 m, 1370 kg) is close to the H-boat (L_WL 6.06 m, D 1.26 m, 1456 kg in measurement trim). The three boats span L_WL/D 4.1 to 4.4 against the H-boat's 4.8, and L_WL/B_WL 2.8 to 3.5 against 3.5.
- **Y'\_V is tight across the three: 0.535 to 0.598.** On the H-boat's L_WL·D = 6.06 × 1.263 = 7.65 m², that is a dimensional leeway slope of **4.1 to 4.6 m² per radian (times ½ρV²), hull and keel without rudder, upright**. The first pass's order-of-magnitude Helmbold estimate (keel 1.44, canoe 0.55, about 2.0 m² before downwash) is about half of this. The difference suggests that lift carry-over onto the canoe body and the fin's root lift are large. The VLM, which models both, should land near the [MF11] band, and that makes the band a benchmark.
- **N'\_V/Y'\_V is 0.046 to 0.082**, a centre of leeway force 0.05 to 0.08 L_WL from midships. Fig. 10 shows Y'_H and N'_H with the same sign for positive β, which in [MF11]'s axes puts the centre ahead of midships, as the hull Munk moment predicts [SL15 sect. 6.4]. The sign reading is an inference from the figure.
- **Y'\_ψ̇ and N'\_ψ̇ are not measured.** [MF11] eq. (11) and (12) compute them from geometry. The canoe-body term comes from Inoue et al. (1981) with k = 2d_m/L on the canoe draft. The fin term comes from lifting-surface theory (Etkin 1972): -2a0·(h - h0)·½ρV·A_F·c̄ for Y, and -2a0·(h - h̄)·½ρV·A_F·c̄² for N, with h̄ = (h0 + h_wb)/2. Here A_F is the fin's lateral area, a0 its lift slope, c̄ its mean chord, and h, h0, h_wb are the chord-fraction distances from the CG to the fin's leading edge, the axis of zero lift and the aerodynamic centre. The rudder's yaw-rate inflow enters through its own angle of attack (eq. 9), not through these derivatives.
- **Drift range.** Fig. 10 (Fujin) shows test points from about -5 to +15° of leeway at heel 0, -10, -20 and -30°. The cubic fits peak at β = 13.9° (Fujin), 14.5° (Fair V) and 18.4° (Sea Dragon), and change sign at 24.7°, 25.6° and 33.2°. **The fits must not be used beyond about 15°.** No forward speed is stated for the towing tests in [MF11].

### 3.5 How the yacht models derive their derivatives (second pass)

| Model                                          | Linear sway–yaw terms                                                                                                                                                                                        | Large-drift term                                | Source of numbers                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------- |
| [MF11] (after Masuyama et al. 1995)            | Polynomial in sin β, measured                                                                                                                                                                                | None; cubic fit to about 15°                    | Oblique tow (Y_V, N_V); geometry (Y_ψ̇, N_ψ̇) |
| Keuning, Vermeulen and de Ridder 2005 (unread) | Per [MF11] p. 2: "extended our model to be able to apply the calculation method to a large variety of yachts using their extensive database of ... DSYHS"                                                    | Not known                                       | DSYHS regressions                           |
| [AS17], [AS19], [AS21]                         | Ideal-fluid strip integrals of sectional sway added mass (Yuanxie 1986) plus a lifting-surface solution for keel, rudder and canoe body                                                                      | Söding strip cross-flow, viscous-only C_D (1.5) | Geometry at load; per-section BEM and RANS  |
| [SL15] App. G                                  | Hull yaw moment C_MHz ≈ 2λ{(1 - D_h/L_WL)·f' - D_h/L_WL}, after Lewis (1988); reports that Keuning and Vermeulen (2003) use the slender-body limit k2 ≈ 1, k1 ≈ 0; correlation with their data "only modest" | None                                            | Geometry                                    |

Every yacht model read derives at least the rotary derivatives from geometry. None uses a merchant regression for the fin. [AS21] reports a 6 % error for its lifting-surface side force against Delft tank data (Gerritsma et al. 1989) at small leeway, and [AS19] validates against the Sysser-26 tests. That validation belongs to #17.

### 3.6 Munk moment: count it once (second pass)

[MF11] Appendix: the destabilising Munk moment -(m_x - m_y)·U·V appears in the rigid-body equations written with added mass. "When the hydrodynamic derivatives of the hull are obtained from the oblique towing test using scaled model, these Munk Moments are included in the measured data", so [MF11] **removes those terms from the equations of motion**.

The same holds in Luovi. A VLM hull and fin solution, or any derivative set derived from it, already contains the slender-body yaw moment of the hull. If `sim-hull` also applies the full Kirchhoff (Coriolis and centripetal) terms of the 6x6 added mass, the Munk moment is counted twice. Exactly one module must own it. Two ways to do that: the rigid body carries added-mass inertia without its velocity-coupling terms, or the VLM hull loading has the slender-body part subtracted. This is an open question for #16 and the rigid-body work. It is not a contract change.

### 3.7 Recommendation

**Unchanged in direction, now with yacht precedent and a check band.** Derive Y_v, N_v, Y_r and N_r for the H-boat from the VLM at load: a pure sway inflow for Y_v and N_v, and a pure yaw-rate inflow (v + x·r at each control point) for Y_r and N_r. The derivatives are then continuous with the lift regime by construction. This matches how every yacht model read obtains its rotary derivatives (3.5). The design doc names "the CFD grid or Kijima regressions", so this remains a deviation to open as a question, not to adopt silently.

Benchmark candidates for `tool-validate`, each needing a decision on tolerance:

- H-boat VLM Y'_V (hull and keel, rudder removed, upright, on ½ρV²·L_WL·D) inside the [MF11] band of 0.535 to 0.598, widened by an agreed tolerance for hull-shape scatter.
- H-boat VLM yaw-rate derivatives against the [MF11] eq. (11) and (12) recipe evaluated on the H-boat geometry. That is a cross-check of two geometric methods, not a measurement.

## 4. Does the ship definition supply the parameters?

| Parameter                                                  | Needed by                          | Supplied?                                           | From                                                                       |
| ---------------------------------------------------------- | ---------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| Per-section B(x), T(x), area, C_M, equivalent bilge radius | Sectional C_D rule                 | Yes                                                 | `hull`-role solids clipped at the current attitude                         |
| Projected height normal to the inflow at heel              | Integrand T(x)                     | Yes                                                 | Same clip, along body z rotated by heel                                    |
| Keel and rudder area, span, effective AR                   | Plate C_N90 and C_N(α) polar       | Yes                                                 | `liftingSurfaces` chord stacks; derived, not stored                        |
| Stub, skeg lateral area                                    | Cross-flow                         | Geometry yes, rule **no**                           | `appendage` solids without a lifting surface                               |
| L, B, d, C_B, τ                                            | [K90], [Y09]                       | Yes                                                 | Hydrostatics of the `hull` solids at the load condition's equilibrium      |
| L_WL, D, canoe draft, fin A_F, c̄, a0, h, h0, h_wb          | [MF11] eq. (11), (12) cross-check  | Yes                                                 | Solids and lifting surfaces; a0 from the VLM or a cited lift-slope formula |
| m', m'_x, 6x6 added mass                                   | [K90] Y'_r form, [Y09], rigid body | Yes                                                 | Mass items and the hydro block                                             |
| Rule coefficients: 2D diamond table, f3D, plate C_N(α)     | Cross-flow and appendage polar     | Yes, as a slot                                      | Hydro block "cross-flow section drag rule with coefficients"               |
| Y_v, N_v, Y_r, N_r                                         | Linear part                        | Slot exists, **nothing to hold if derived at load** | Hydro block "linear manoeuvring derivatives"                               |

Contract consequences:

1. **Stub and skeg (unchanged).** The cross-flow rule acts on the union of all `hull` and non-lifting `appendage` solids at each x: their depth adds to T(x), and the section keeps the diamond family. Fins with a lifting surface are handled by the appendage polar. No new role, no special case.
2. **Derivatives from the VLM (unchanged).** The hydro block's linear derivatives become optional: present and cited for a hull inside a regression family (the Joutsen with [K90] or [Y09]), absent for the H-boat. The [MF11] band is benchmark data in `tool-validate`, not definition data.
3. **Appendage polar (new).** The plate rule becomes a cited C_N(α) table by effective aspect ratio, carried by value like a sail polar. It fits the existing "cross-flow section drag rule with coefficients" slot, so the contract needs no new field. Whether the table is shared with the rudder polar's stall branch mentioned in the design doc's broaching row is for #16.

No finding here changes the ship state contract (#9). Exposing per-module hull forces (lift, cross-flow, blend weight) in state would make the drift and broach benchmarks diagnosable, but nothing requires it.

## 5. Coverage of each source for the blend

| Source                           | Drift angle                                                                                                                         | Speed / Reynolds                                                 | Hull family                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| [K90] linear and nonlinear       | Not stated; captive tests                                                                                                           | Forward speed; 2.5 to 3.0 m models                               | Merchant, C_B 0.49 to 0.84, L/B 4.5 to 6.9         |
| [Y09] unified model              | 0 to 180°; linear fit checked within about 10°                                                                                      | Includes zero forward speed; 2 to 4 m models                     | Merchant and fishing, L/d 13 to 22, L/B 4.8 to 6.9 |
| [O87] strip model                | Local inflow angle up to 90°                                                                                                        | Current speed at the moored hull                                 | Tanker                                             |
| [TK93] longitudinal distribution | 90° only                                                                                                                            | Computed at U = 1 m/s; plate tow at model scale                  | Wigley and SR108; double body                      |
| [KT92] 2D table                  | 90° (2D)                                                                                                                            | Inviscid vortex method                                           | Rectangles, B/2d 1 to 2, r/2d 0 to 0.2             |
| [DS53] 2D table                  | 90° (2D)                                                                                                                            | Re 1.1e4 to 2.3e6; values tabled at 1e5                          | Ellipses, rectangles, diamonds, triangles          |
| [VC82] plate law                 | Stall to 90°; C_D,max is the 90° value                                                                                              | Sharp edges; insensitive                                         | Flat plates, AR ≤ 50                               |
| [SL15] plate data †              | 0 to 90°; C_N reaches C_N90 from about 40° (AR 1), 55° (AR 2), 75° (2D)                                                             | Sharp edges; "effects of Reynolds number are totally negligible" | Rectangular flat plates, AR 1, 2, ∞                |
| [MF11] †                         | About -5 to +15° measured; cubic fit peaks at 14 to 18°, changes sign at 25 to 33°                                                  | Not stated for the tow                                           | Fin-keel yachts, L_WL 5.3 to 8.8 m                 |
| [AS17], [AS19], [AS21] †         | Lifting surface for upwind sailing: leeway sweeps 0 to 10°, rudder capped at 15°                                                    | Viscous C_D fitted for 0 to 0.5 m/s cross-flow                   | Sysser-26 (DSYHS, L_WL 2 m model), YD-40           |
| [SY95] †                         | Panel method against tank data at β 0 to 8° (KIT 34), 0 to 6° (NCAC 12 m); measured lift falls below potential flow beyond about 6° | Fn 0.27 to 0.76                                                  | KIT 34 (Fair V), 12 m class                        |
| [YA05] †                         | Leeway 0 to 3° at 20° heel; heel 0 to 30° at 3° leeway                                                                              | 4 to 8 kn full scale (model 1:3, 1.19 to 2.38 m/s)               | 30 ft fin-keel yacht, L_WL 8.25 m, draft 1.9 m     |
| [JA10] †                         | Leeway 0, 2, 6, 10, 14°; heel 0 to 10°                                                                                              | 9 kn design speed                                                | 30 ft catamaran                                    |
| [KL20] †                         | Rudder near stall, α = 23°                                                                                                          | Spade rudder data, Whicker and Fehlner                           | Yacht spade rudder                                 |

None of the yacht sources tests a hull between 20 and 90° of drift. [YA05] and [JA10] are small-leeway resistance and side-force data. They are benchmark candidates for the lift regime (#17), not for cross-flow.

H-boat Reynolds numbers (ν = 1.19e-6 m²/s) at the design doc's thresholds (first pass, unchanged):

| Lateral speed | Re on beam (1.7 m) | Re on keel mean chord (1.28 m) | Re on rudder mean chord (0.372 m) |
| ------------- | ------------------ | ------------------------------ | --------------------------------- |
| 0.3 kn        | 2.2e5              | 1.7e5                          | 4.8e4                             |
| 1.0 kn        | 7.4e5              | 5.5e5                          | 1.6e5                             |
| 1.5 kn        | 1.1e6              | 8.3e5                          | 2.4e5                             |

Points for the blend ticket (#16):

- **The published unified models add their terms (first pass, unchanged).** [Y09] and [O87] sum a lift term that vanishes by its own form at 90° and at zero forward speed with a cross-flow term. The yacht model [AS17] does the same (eq. 24: ideal fluid plus cross-flow plus lifting). None of them switches.
- **Upper limit of the lift regime: about 15°, now with yacht data.** [MF11]'s fitted yacht side force peaks at 14 to 18° and its tests stop near 15°. [SY95] measured lift falling below potential flow beyond about 6° on the KIT 34. The VLM has no stall, so its weight must be well down by 15 to 20°. A threshold that rises with the fin's aspect ratio, as #17's overview suggests from [SL15] Fig. 6.3.5, fits this.
- **The handover target for the appendages is a C_N(α) polar, not a v_n² term** (2.3). In 20 to 50° the sin²α law gives one-quarter to one-half of the measured plate normal force.
- **No source covers the canoe body between 15 and 90°.** The strip law with the 90° coefficients of 2.1 is the only option. It is the Allen–Perkins form [SL15 sect. 5.16] and reproduces [Y09]'s fits for merchant hulls once the lift term is added.
- **Speed.** The design doc's 0.3 kn VLM cut-off falls in the drag crisis of rounded sections (Re 2e5 to 1e6). The sharp-apex diamond family and the edge-separated plates are why the H-boat's coefficients do not depend on that crisis.

## 6. Proposed `data-hboat` entries

Every value is `{ value, src }` or `{ value, estimate }`, per the issue #14 contract.

- `crossFlow.section2D.diamond`: B/2T 0.5 → 1.8, 1.0 → 1.5, 2.0 → 1.1; src [DS53] Table I (diamonds, apex into the flow, Re 1e5). Linear interpolation between them, and the constant 1.1 above 2.0, as estimates: "no diamond data beyond 2:1; aft sections shallow". Note in the source field: "[DS53] reports possible end-leakage bias; its circle reads 1.0 against 1.2 sealed".
- `crossFlow.section2D.roundedRectangle`: the [KT92] Fig. 12 table, src [KT92] (not used by the H-boat; listed for the shared rule).
- `crossFlow.finiteLength`: 0.52, src [TK93] (1.03 / 1.98, broadside tow of a surface-piercing 1.0 by 0.065 m plate); estimate when applied to a hull: "2T/L 0.14 against the plate's 0.13; Hoerner's deep plates at the same aspect ratio give 0.63 [SL15, VC82]".
- `crossFlow.appendagePolar`: C_N(α) for 0 to 90° by effective aspect ratio. C_N90 = 1.17 (AR 1) and 1.2 (AR 2 to 5), and 1.96 (2D); src [SL15] sect. 7.4 and Fig. 7.4.33 and 7.4.34, after Hoerner (1965) and Winter (1937). The intermediate-angle points of 2.3 are read off a figure (±0.1) and need digitising from Hoerner's original before they land. Cross-check src [VC82] eq. (13). Effective AR = 2 × geometric for a fin root on the hull, estimate: "reflection plane; [KL20] cites 1.7× for rudders after Molland (1978); both give C_N90 ≈ 1.2".
- `manoeuvring.linear`: absent for the H-boat, derived from the VLM at load (if 3.7 is adopted).
- Benchmark data for `tool-validate`, not `data-hboat`: [MF11] Table 1 Y'_V band 0.535 to 0.598 and the Sea Dragon row as the closest analogue.

Resulting H-boat values at the measurement condition: canoe-body C_D 0.57 to 0.78 (factor 0.52) or 0.69 to 0.95 (factor 0.63), keel C_N90 1.17, rudder 1.20, total C_D·A in pure sway 2.5 m² (up to 2.7 m²) before stub and skeg.

## Open questions

1. **Linear derivatives from the VLM** (3.7) instead of "the CFD grid or Kijima": still a design doc deviation for the coordinator. The second pass adds yacht precedent ([MF11], [AS17]) and a measured check band ([MF11]); the question stands.
2. **Stub and skeg in cross-flow** (4): union-of-solids sections, or a rule per appendage. Unchanged.
3. **Additive versus switched blend** (5): the literature adds. The design doc's "exactly one of them carries the side force" is still for #16 to decide.
4. **New: appendage polar instead of a sin²α plate law** (2.3). The design doc's "keel and rudder become bluff plates" with a v_n² integrand under-predicts fin normal force by two to four times between stall and 40 to 55°. This affects #16's blend weights and the broaching benchmark.
5. **New: Munk moment ownership** (3.6). The 6-DOF added-mass Coriolis terms and the VLM hull loading must not both carry it. This is for #16 and the rigid-body slice, not a contract change.
6. **Canoe-body coefficient uncertainty** (1.6): 1.05 to 1.26 m², possibly higher if the [DS53] leakage bias is real. The lying-ahull drift benchmark is the only check until Hooft (1994) or a double-body CFD run is available.
7. **Still wanted:** Hooft (1994), Hooft and Quadvlieg (1996), Keuning and Vermeulen (2003), Keuning, Vermeulen and de Ridder (2005), and Masuyama et al. (1995) for the oblique-tow speeds and the Fair V raw data. The TU Delft repository copies of the Keuning papers exist (report 1363-P and 1367-P) but could not be reached from this session. Someone on a different network may fetch them directly.
8. **Closed:** whether the Angelou and Spyrou model supplies usable cross-flow coefficients. It does not; its C_D is viscous-only (1.5).
