# Modern open sources for the secondary-sourced coefficients

Research for issue #24, 2026-10-21. Question: settle the four disputed DSYHS table entries, confirm or replace the cross-flow and manoeuvring-derivative sources, confirm the Donelan-Banner spreading parameters and replace the Koepke 1984 whitecap citation. Use open sources from 2015 onward where they exist, and name the citation each `data-*` file should carry. The questions come from `research/dsyhs-hboat`, `research/cross-flow-hboat` and `research/ocean-wave-survey` and are not re-derived here.

## Answer in brief

1. **All four DSYHS disputes are settled by the primary papers, checked against the CC0 measurement data.** No open source from 2015 onward reproduces these tables correctly. The three theses the DSYHS research relied on all carry one transcription error that nobody had flagged: the keel term is **A2·(Tc + Zcbk)/∇k^(1/3)**, not (Tc + Zcbk)³/∇k. The primaries (K&K 2008, K&S 1998) plus the 4TU CC0 dataset are therefore load-bearing and are the citations. Resolved values:
   - a3 at Fn 0.55 is **0.8726** [KK08 Table 2].
   - The heel-delta table is **printed × 1000**. The true u coefficients are the printed values × 10⁻³, with **LCB in percent of LWL from mid-LWL, aft negative**. Sysser 1 data at 20° heel confirms both (§1.2).
   - **Zcbk is the depth of the keel's centre of buoyancy below the free surface, positive down**, and enters as Tc + Zcbk in the corrected linear term. The z-up reading drives keel residuary negative at Fn 0.50 to 0.55 (§1.3).
   - **H4 multiplies LWL/∇c^(1/3)**, the canoe body's volume [KS98 eq. 18].
   - Also settled from the same papers: the side-force grouping, the leeway unit (radians), the friction convention, the appendage form factor and the trim-delta table (§1.5).
2. **Hooft and the Keuning-Vermeulen papers are not load-bearing for any number.** The cross-flow strip form, the section C_D and the finite-length factor are already cited to open sources: Obokata 1987, Delany and Sorensen 1953, and Tanaka and Kijima 1993. The derivative check band moves onto two open papers by Masuyama's group, which the primary papers task obtained. Masuyama et al. 1993 Table 1 gives measured Fair V derivatives (Y'_V -0.554, N'_V -0.0562, oblique tow to 20°), and Y'_V sits inside the [MF11] band. **No open yacht source from 2015 onward with measured derivatives was found**, and no open source has measured yaw-rate derivatives at all. The VLM-at-load recommendation stands. The band is Y'_V 0.535 to 0.598 and N'_V 0.027 to 0.056. KS98's own side-force regression gives the H-boat a leeway slope of 4.7 m² per radian, consistent with that band (§2).
3. **Donelan-Banner is confirmed, with two corrections to the survey's form.**
   - Donelan writes β = 2.44(ω/0.95ω_p)^(±1.3), which is the survey's 2.61 and 2.28 to three figures. He also sets **β = 1.24 outside 0.56 < ω/ω_p < 1.6**, so the lower branch needs a floor that the survey's form lacks.
   - Banner's high-frequency branch is written **in wavenumber, k/k_p > 2.56**. The ω form holds only in deep water, so under TMA it must be evaluated on k/k_p.
   - **Koepke 1984 is replaced by Dierssen 2019** (Frontiers in Earth Science, CC BY). Its values: about 0.40 for whitecaps in the visible, about 0.50 for fresh Stage A foam, and about 0.18 for thin residual foam. It reports Koepke's 0.22 as a lifetime average, with a decay from 0.20 to 0.55 at breaking to 0.03 to 0.10 after 10 s. That answers the survey's open fresh-foam and decay questions to the precision a renderer needs (§3).
4. Citation lines for every value are in §4.

## Sources read

Primary papers obtained by issue #22, read from `~/Downloads/hydro-research/primary/` (rendered page images were checked for every number quoted):

- **[KK08]** Keuning, J. A. and Katgert, M. (2008). A bare hull resistance prediction method derived from the results of the Delft Systematic Yacht Hull Series extended to higher speeds. Int. Conf. Innovation in High Performance Sailing Yachts, Lorient, RINA, 13 to 21. Eq. (1.7), Table 2 on p. 18. https://research.tudelft.nl/en/publications/a-bare-hull-resistance-prediction-method-derived-from-the-results
- **[KS98]** Keuning, J. A. and Sonnenberg, U. B. (1998). Approximation of the hydrodynamic forces on a sailing yacht based on the "Delft Systematic Yacht Hull Series". 15th Int. HISWA Symposium, Amsterdam. TU Delft Ship Hydromechanics Laboratory report 1175-P. Pages cited are the printed page numbers (PDF page minus 2). https://research.tudelft.nl/en/publications/approximation-of-the-hydrodynamic-forces-on-a-sailing-yacht-based/
- **[DSD]** den Ouden, J. (2022). Delft Systematic Yacht Hull Series Measurement Data. 4TU.ResearchData, CC0, doi:10.4121/21501402.v1. Sheet "Sys 1" of the full-scale workbook.
- **[M93]** Masuyama, Y., Nakamura, I., Tatano, H., Sakaguchi, K. and Kanekiyo, T. (1993). Sailing performance of ocean cruising yacht by full-scale sea test (Part 2: Maneuverability and tacking performance). J. Soc. Naval Architects of Japan 174, 377 to 388. Table 1, eq. (5) to (11). Open on J-STAGE: https://www.jstage.jst.go.jp/article/jjasnaoe1968/1993/174/1993_174_377/_pdf
- **[M92]** Masuyama, Y. et al. (1992). Part 1 of the same series (steady sailing and motion in waves). J. Soc. Naval Architects of Japan 172, 349ff. Read for the boat particulars only (10.6 m LOA, 3.4 t).
- **[DHH83]** Donelan, M. A., Hamilton, J. and Hui, W. H. (January 1983). Directional spectra of wind-generated waves. Manuscript submitted to Phil. Trans. R. Soc. Lond., NWRI, Canada Centre for Inland Waters. Eq. (11.12), p. 83. Published as Phil. Trans. R. Soc. A 315 (1985) 509 to 562, doi:10.1098/rsta.1985.0054 (not read).
- **[B90]** Banner, M. L. (1990). Equilibrium spectra of wind waves. J. Phys. Oceanogr. 20, 966 to 984, doi:10.1175/1520-0485(1990)020<0966:ESOWW>2.0.CO;2. Eq. (2.8) to (2.10), pp. 970 to 971 (scan, read as images).

Found and read for this ticket:

- **[D19]** Dierssen, H. M. (2019). Hyperspectral measurements, parameterizations, and atmospheric correction of whitecaps and foam from visible to shortwave infrared for ocean color remote sensing. Front. Earth Sci. 7:14, doi:10.3389/feart.2019.00014, CC BY. Abstract and pp. 4 to 7, 13. https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2019.00014 (corrigendum to eq. 7, which is not used here: doi:10.3389/feart.2021.683136).

Carried over from the earlier branches, open, already cited there: [MF11] Masuyama and Fukasawa 2011, [AS17] Angelou and Spyrou 2017, [DS53] Delany and Sorensen 1953, [TK93] Tanaka and Kijima 1993, [KT92] Kijima and Tanaka 1992, [O87] Obokata 1987, [Y09] Yoshimura et al. 2009 (full references in `research/cross-flow-hboat`).

Searched and **not reachable or not found**:

- Keuning and Vermeulen (2003), report 1363-P and 1367-P. TU Delft's repository (131.180.123.142) still refuses connections from here, and the SciSpace mirror returns a CloudFront block.
- Kleijweg (2016) and van der Kolk (2020) theses: both are on the same TU Delft server.
- The Galați 2015 Delft series paper (gup.ugal.ro): connection refused.
- **No open yacht source from 2015 onward** gives measured hull or appendage manoeuvring derivatives. Searches covered oblique-tow and PMM yacht studies, the Journal of Sailing Technology, J-STAGE and repository theses. Only the methods carry over from the merchant-ship CFD studies found (Oud and Toxopeus 2022, DTMB 5415 oblique tow 2025). The SYRF Wide Light project (2015) published resistance, sideforce and yaw moment tank data for a wide offshore hull. That data suits a VLM method benchmark but not an H-boat band, and its files were not read.

## 1. DSYHS disputed entries

### 1.1 a3 at Fn 0.55

[KK08] Table 2, p. 18, prints **0.8726**. [UCT] and [LABI] were right and [TEIX]'s 0.8762 is a transcription slip. Every other cell of the §2.1 table on `research/dsyhs-hboat` matches Table 2. The page also confirms the equation form: a0 stands outside the bracket and the bracket multiplies ∇c^(1/3)/LWL [KK08 eq. 1.7].

### 1.2 Heel-delta table: scale and LCB unit

[KS98] Table 6, p. 19, is headed **"Coefficients are multiplied by 1000"**. Its printed values are the ones [LABI] and [TEIX] copied, for example u0 = -0.0268 at Fn 0.25. The true coefficients are therefore the printed values × 10⁻³, which is the DSYHS research's plausibility reading. [UCT] printed a further × 1000 and then divided once. u4 at Fn 0.45 is -1.0064 as printed. The table's last row label "u⁵" is a typo for u5.

LCB is not defined next to eq. 10. In [KS98] the unsubscripted LCB is the series parameter in percent of LWL from mid-LWL, aft negative (Table 2, p. 8, and the definition under eq. 35, p. 45). The upright polynomial uses LCBfpp in metres instead.

The CC0 data settles both points. For Sysser 1 at 10 m LWL (L/B 3.155, B/Tc 3.992, LCB -2.29 %, ∇c 9.185 m³), the change in total resistance between 0° and 20° heel against eq. 10 to 11 gives:

| Fn | Measured ΔRt (N) [DSD] | Eq. 10, × 10⁻³, LCB in % | Same, LCBfpp in m | Printed values as true |
| --- | --- | --- | --- | --- |
| 0.30 | 22 | 17 | 48 | 17,281 |
| 0.35 | 76 | 57 | -36 | 56,562 |
| 0.40 | 82 | 87 | -547 | 87,248 |
| 0.45 | 48 | 97 | -1016 | 96,515 |

ΔRt includes the small change in friction with heeled wetted area, so the agreement is order and sign, not exact. Only the × 10⁻³ scale with LCB in percent gives the right order and sign at every Froude number.

### 1.3 Keel residuary: the equation form and Zcbk

[KS98] eq. 16, p. 26 (rendered at 300 dpi):

Rrk/(∇k·ρ·g) = A0 + A1·T/BWL + A2·(Tc + Zcbk)/∇k^(1/3) + A4·∇c/∇k

**[UCT], [LABI] and [TEIX] all write A2·(Tc + Zcbk)³/∇k.** The "⅓" exponent on ∇k was misread as a cube on the numerator. The primary form is dimensionless, as a regression term must be; the theses' form is not. The equation labels the last coefficient A4 while Table 9 labels it A3. They are the same coefficient, and Table 9's values are as transcribed in the DSYHS research.

Zcbk: the symbol list says "vertical position of centre of buoyancy of keel", and the text above eq. 16 says "the vertical distance of the centre of buoyancy of the keel volume to the free surface". That makes Zcbk a distance from the free surface. Taken positive down, Tc + Zcbk is canoe draft plus keel CB depth. The z-up reading (Zcbk negative) is ruled out by the result. For the H-boat in the sailing condition (∇k 0.1288 m³, T 1.312 m, BWL 1.840 m, Tc 0.457 m, ∇c 1.594 m³, keel CB 0.837 m below the waterline; inputs from the DSYHS research §5.1):

| Fn | Zcbk positive down (Tc + 0.837) | Zcbk z-up (Tc - 0.837) | Old cubed form, from the DSYHS research §7 |
| --- | --- | --- | --- |
| 0.40 | 69 N | 27 N | 95 N |
| 0.45 | 104 N | 107 N | 103 N |
| 0.50 | 256 N | -1 N | 410 N |
| 0.55 | 297 N | -6 N | 478 N |
| 0.60 | 326 N | 51 N | |

The z-up reading collapses to zero or below just where keel wave-making should grow. The positive-down reading rises monotonically above Fn 0.35. **Resolved: Zcbk is the keel CB depth below the still waterline, positive, measured on the keel solids (fin plus stub or fillet).** The DSYHS research's §7 keel numbers, built on the cubed form, are superseded by the first column.

### 1.4 The ∇ in the keel heel term

[KS98] eq. 18, p. 28: Ch = H1·Tc/T + H2·BWL/Tc + H3·(Tc/T)·(BWL/Tc) + H4·**LWL/∇c^(1/3)**, with ΔRrk/(∇k·ρ·g) = Ch·Fn²·φ, φ in radians (eq. 17). It is the canoe-body volume, as [UCT] had it. H1 to H4 = -3.5837, -0.0518, 0.5958, 0.2055 (Table 10). For the H-boat Ch = 0.501, so ΔRrk at 20° is 20, 36 and 57 N at Fn 0.30, 0.40 and 0.50.

### 1.5 Other items settled by the same papers

- **Side force** (DSYHS research open question 1, VLM cross-check only). [KS98] eq. 26, p. 34: Fh·cos φ/(β·½ρV²·Sc) = b1·T²/Sc + b2·(T²/Sc)² + b3·Tc/T + b4·(Tc/T)·(T²/Sc), with b1 to b4 as in Table 12, p. 35. The symbol list prints the unit of β and φ as "°", but **β must be in radians**. For the H-boat at 0° heel the right-hand side is 0.526, which gives a slope of 4.7 m² per radian on Sc 8.895 m². That agrees with the [MF11] band of 4.1 to 4.6 m² per radian, which excludes the rudder. Per degree it would be 270 m² per radian. Eq. 25 adds the leeway correction terms B0, B2 and B3, with B3 = 0.0092·(BWL/Tc)·(Tc/T) (eq. 27).
- **Friction convention**, previously sourced from three secondary sources. [KS98] pp. 11 to 14: ITTC-57, Re on **70 % of LWL** "throughout the whole DSYHS", and **no form factor (k = 0)** for the hull, with shape-dependent viscous effects left in the residuary. The paper notes that 90 % would suit modern hulls better but keeps 70 % for consistency.
- **Appendage form factor.** [KS98] eq. 15, p. 21: (1 + k) = 1 + 2·(t/c) + 60·(t/c)⁴, after Hoerner, with Re on the mean or local chord (eq. 12 to 14).
- **Heel exponent.** [KS98] eq. 11, p. 19: ΔRrh(φ) = ΔRrh(20°)·6.0·φ^1.7, φ in radians.
- **Trim delta** (DSYHS research open question 7). The coefficients exist: [KS98] eq. 34 and 35 and Table 15 (T0 to T5, Fn 0.20 to 0.60), pp. 44 to 45. The OCR is poor, so they need transcribing from the page image if the term is adopted.

### 1.6 Modern sources

The open theses that transcribe these tables (Kilpin at UCT, Borba Labi 2019 at Rostock and Teixeira at IST) all carry the keel exponent error, per their equations as recorded on `research/dsyhs-hboat` §2.3. Remmlinger 2016 re-regresses the upright series only. No modern open source is needed for these numbers now that the primaries are in hand: the 1998 and 2008 papers are the coefficient owners and the 2022 CC0 dataset is the independent check. The primaries are load-bearing, and `data-hboat` cites them.

## 2. Cross-flow and manoeuvring derivatives

### 2.1 Hooft is not load-bearing

The hull chapter names "Hooft/Obokata cross-flow drag". The strip form ½ρ·C_D(x)·|v_n|·v_n integrated over sections is written out in [O87] (J-STAGE, open) and in [Y09] (Hokkaido repository, open). The cross-flow research's numbers come from three places:

- the section C_D from [DS53] (NASA, open);
- the finite-length factor of 0.52 from [TK93] (J-STAGE, open), bracketed by Hoerner's deep-plate 0.63 via Slooff 2015;
- the appendage polar from Hoerner via Slooff 2015.

None of these values depends on Hooft (1994) or Hooft and Quadvlieg (1996). Those papers would only narrow the canoe-body uncertainty band of 1.05 to 1.26 m², and the lying-ahull drift benchmark does that job. **Cite [O87] for the form and stop chasing Hooft.** No open modern yacht source measures sectional cross-flow drag. The van der Kolk (2020) wind-assist thesis, which covers large-leeway side force on merchant hulls, is the nearest modern work and sits on the unreachable TU Delft server. It would add context, not a coefficient.

### 2.2 Keuning-Vermeulen is not load-bearing

The yaw-balance (2003) and tacking (2005) models would supply DSYHS-based derivative regressions. The cross-flow research already recommends deriving Y_v, N_v, Y_r and N_r from the VLM at load, so no `data-*` value would carry their citation. What the hull chapter needs from the literature is a check band, which comes from [M93] and [MF11]:

| Source | Boat | Y'_V | N'_V | Basis |
| --- | --- | --- | --- | --- |
| [M93] Table 1 | Fair V: 10.6 m LOA, 3,780 kg at sea test, L_WL about 8.5 m | -0.5542 | -0.05621 | Oblique tow to β = 20°, fitted within ±15°, rudder forces subtracted |
| [MF11] Table 1 | Three fin-keel yachts, one H-boat sized (Sea Dragon, L_WL 5.30 m) | -0.535 to -0.598 | -0.0273 to -0.0482 | Oblique tow, about ±15° |

Both are on ½ρV²·L_WL·D (Y) and ½ρV²·L_WL²·D (N), with D the draft including the fin and N about midships, from the same group with the same model form. [M93] also gives the yaw-rate terms Y'_ψ̇ and N'_ψ̇ (-0.00846). Its eq. (10) and (11) compute them from geometry, following Inoue for the canoe body and lifting-surface theory for the fin, as [MF11] later does. So **no open source has measured yaw-rate derivatives for a yacht**, and the VLM's Y_r and N_r can only be cross-checked against that geometric recipe.

Band for `tool-validate`: **Y'_V 0.535 to 0.598** (hull and keel without rudder, upright) and **N'_V 0.027 to 0.056** (sign as in the sources). [KS98] eq. 26 at 0° heel gives the H-boat a total slope of 4.7 m² per radian with rudder (§1.5), consistent with the band. Use that as a second check rather than as data. [M93] also confirms the stall evidence used by the blend. Its rudder inflow-reduction ratio γ_R levels off at 0.8 above β = 14° "due to separation on the fin keel".

## 3. Spreading and whitecap reflectance

### 3.1 Donelan

[DHH83] eq. (11.12), p. 83 (checked on the page image):

- β = 2.44·(ω/(0.95ω_p))^(+1.3) for 0.56 < ω/ω_p < 0.95;
- β = 2.44·(ω/(0.95ω_p))^(-1.3) for 0.95 < ω/ω_p < 1.6;
- **β = 1.24 otherwise.**

Expanded, these are 2.608·(ω/ω_p)^1.3 and 2.283·(ω/ω_p)^(-1.3), the survey's 2.61 and 2.28. The spreading function is sech²(βθ) and is "adequately described by ω/ω_p alone" for 0.8 < ω/ω_p < 1.6 and -1 < U/c_p < 4 (p. 84). The survey's form has no floor below 0.56ω_p and lets β fall towards zero, which makes the spread almost isotropic. Donelan holds it at 1.24, and the two meet within 1 % at the join (2.61·0.56^1.3 = 1.23). The CPU band's lowest strip reaches below 0.56ω_p, so `sim-ocean` should apply the floor.

### 3.2 Banner

[B90] eq. (2.8) and (2.9), p. 971, write the same sech² with b(k):

- b = 2.28·(k/k_p)^(-0.65) for 0.97 < k/k_p < 2.56;
- b = 10^(-0.4 + 0.8393·exp(-0.567·ln(k/k_p))) for k/k_p > 2.56.

In deep water k/k_p = (ω/ω_p)², so this becomes the survey's ω form with the join at ω/ω_p = 1.6. The two branches meet at 1.2374 and 1.2377. For the contract's JONSWAP-TMA sea in finite depth, k/k_p is not (ω/ω_p)². **The high-frequency branch must be evaluated on wavenumber from the depth dispersion relation**, and the Donelan branches on ω/ω_p, as each author defined them. Banner proposes the upper branch as an extrapolation of DHH beyond k/k_p of about 2.6. He supports it with unpublished extended wave-gauge array results ("Donelan, personal communication") and with comparisons of predicted and observed frequency spectra.

The spreading function is unchanged and ADR 0005's choice stands. Only the floor and the wavenumber argument are additions.

### 3.3 Whitecap reflectance

[D19] measured whitecaps with a hyperspectral radiometer from 400 to 2,500 nm. Its findings:

- Whitecap reflectance is "on average ~40% in visible wavelengths" (abstract), and about 0.50 for Stage A whitecaps with many layers of foam (p. 5).
- Thin foam left by whitecaps is about 0.18 in the visible, close to the 0.22 that atmospheric correction algorithms use.
- 0.22 comes from Koepke 1984, who "showed that reflectance varied from 20 to 55% upon initial wave breaking to 3–10% after 10 s and an time-averaged effective reflectance of whitecaps of 22% was derived". Dierssen adds that Koepke used film density, not a radiometer, and assumed a 55 % maximum.
- Earlier studies range from 0.40 to 0.75 in the visible. Reflectance falls into the near infrared, by 40 % at 850 nm per Frouin et al. 1996.

For `render-ocean` this resolves the survey's open items:

| Use | Value | Source |
| --- | --- | --- |
| Fresh foam injected into the buffer (per texel, at breaking) | 0.50 (Stage A); 0.40 as the whitecap mean | [D19] p. 5 and abstract |
| Aged thin foam (decay floor) | 0.18 | [D19] p. 5 |
| Decay of a fresh whitecap | to 0.03 to 0.10 within about 10 s | Koepke 1984 as reported by [D19] p. 5 |
| Far-field coverage term with no explicit decay ([DB12] W) | 0.22 effective, the lifetime average | Koepke 1984 as reported by [D19] |

Dupuy and Bruneton's 0.4 turns out to be a fair fresh-foam value. Their attribution of 0.4 to Koepke was the error, not the number. Koepke 1984 now appears only as reported by an open CC BY source, so it is no longer load-bearing.

## 4. Citation lines for the data files

Each line is the `src` text for the value. Where the original paper owns the number, it is named as owner, and any open check is named after it.

`data-hboat`, `dsyhs` block:

- Upright residuary a0 to a7: `Keuning & Katgert 2008, Innovation in High Performance Sailing Yachts, Lorient (RINA), pp. 13-21, eq. 1.7 and Table 2 p. 18`
- Friction line, Re length and form factor: `Keuning & Sonnenberg 1998, 15th HISWA Symposium, TU Delft report 1175-P, pp. 11-14: ITTC-57, Re on 0.7 LWL, k = 0`
- Heel-delta u0 to u5: `Keuning & Sonnenberg 1998, TU Delft report 1175-P, eq. 10-11 and Table 6 p. 19; Table 6 printed x1000, stored values are printed x 1e-3; LCB in % LWL from mid-LWL, aft negative (Table 2 p. 8); checked against den Ouden 2022, 4TU.ResearchData doi:10.4121/21501402.v1, Sysser 1`
- Heel exponent 6.0·φ^1.7: `Keuning & Sonnenberg 1998, TU Delft report 1175-P, eq. 11 p. 19`
- Keel residuary A0 to A3: `Keuning & Sonnenberg 1998, TU Delft report 1175-P, eq. 16 and Table 9 p. 26; term A2·(Tc+Zcbk)/Vk^(1/3), Zcbk = keel CB depth below waterline, positive down`
- Keel heel delta H1 to H4: `Keuning & Sonnenberg 1998, TU Delft report 1175-P, eq. 17-18 and Table 10 pp. 28-29; H4 term uses canoe-body volume`
- Appendage form factor: `Keuning & Sonnenberg 1998, TU Delft report 1175-P, eq. 15 p. 21, after Hoerner 1965`
- Side force b1 to b4 (cross-check only): `Keuning & Sonnenberg 1998, TU Delft report 1175-P, eq. 25-27 and Table 12 pp. 34-35; leeway in radians`

`data-hboat`, cross-flow (unchanged values from `research/cross-flow-hboat` §6, citations firmed):

- Strip form: `Obokata 1987, J. Soc. Naval Architects of Japan 161, 183-195`
- Diamond section C_D: `Delany & Sorensen 1953, NACA TN 3038, Table I`
- Finite-length factor 0.52: `Tanaka & Kijima 1993, J. Soc. Naval Architects of Japan 174, 357-363` (and its estimate note as proposed there)
- Appendage C_N(α): `Slooff 2015, The Aero- and Hydromechanics of Keel Yachts, sect. 7.4, after Hoerner 1965 and Winter 1937`

`tool-validate`, benchmark data (not `data-hboat`):

- Y'_V and N'_V band: `Masuyama & Fukasawa 2011, J. Sailboat Technology 2011-01, Table 1; Masuyama et al. 1993, J. Soc. Naval Architects of Japan 174, 377-388, Table 1`

`data-ocean`:

- Spreading below 1.6ω_p and the floor: `Donelan, Hamilton & Hui 1985, Phil. Trans. R. Soc. A 315, 509-562, doi:10.1098/rsta.1985.0054 (eq. 11.12 of the 1983 submitted manuscript, p. 83)`
- Spreading above k/k_p 2.56: `Banner 1990, J. Phys. Oceanogr. 20, 966-984, eq. 2.9b`
- Whitecap reflectance values: `Dierssen 2019, Front. Earth Sci. 7:14, doi:10.3389/feart.2019.00014 (CC BY), p. 5 and abstract`
- Effective 0.22 and decay: `Koepke 1984 (Appl. Opt. 23, 1816-1824) as reported by Dierssen 2019, Front. Earth Sci. 7:14, p. 5`

## Open questions

1. **Zcbk measured on which solids.** The resolution needs the keel CB depth over the fin plus stub. The DSYHS research's open question 3 (which solids make up the "keel" in the hydro block) still decides it, but the formula is no longer in doubt.
2. **Trim delta.** Adopt the [KS98] Table 15 term, given that the regression's at-rest inputs do not see aerodynamic trim? If so, it needs a careful transcription from the page image (the OCR is unreliable).
3. **Banner extrapolation in finite depth.** Evaluating the high-frequency branch on k/k_p follows Banner's definition, but his data were deep water. Is that acceptable for shallow TMA scenarios, or should the contract note the extrapolation?
4. **Measured yaw-rate derivatives** remain unavailable in open literature. The VLM's Y_r and N_r have only a geometric cross-check. A rotating-arm or PMM dataset for a fin-keel yacht would close this. Keuning, Vermeulen and de Ridder (2005) may contain one; it is still paywalled.

## Sources

- [Keuning & Katgert 2008, research portal record](https://research.tudelft.nl/en/publications/a-bare-hull-resistance-prediction-method-derived-from-the-results)
- [Keuning & Sonnenberg 1998, research portal record](https://research.tudelft.nl/en/publications/approximation-of-the-hydrodynamic-forces-on-a-sailing-yacht-based/)
- [den Ouden 2022, DSYHS measurement data, 4TU.ResearchData, CC0](https://data.4tu.nl/articles/dataset/Delft_Systematic_Yacht_Hull_Series_Measurement_Data/21501402)
- [Masuyama et al. 1993, Part 2, J-STAGE](https://www.jstage.jst.go.jp/article/jjasnaoe1968/1993/174/1993_174_377/_pdf)
- [Masuyama & Fukasawa 2011, J. Sailboat Technology](http://higherlogicdownload.s3.amazonaws.com/SNAME/1516f098-2760-4bff-86fa-9ca63a85f102/UploadedImages/2011-01.pdf)
- [Angelou & Spyrou 2017, J. Sailing Technology](https://higherlogicdownload.s3.amazonaws.com/SNAME/1516f098-2760-4bff-86fa-9ca63a85f102/UploadedImages/2017-06__Angelou_and_Spyrou__A_New_Mathematical_Model_for_Investigating_Course_Stability_and_Maneuvering_Motions_of_Sailing_Yachts.pdf)
- [Obokata 1987, J-STAGE](https://www.jstage.jst.go.jp/article/jjasnaoe1968/1987/161/1987_161_183/_pdf)
- [Tanaka & Kijima 1993, J-STAGE](https://www.jstage.jst.go.jp/article/jjasnaoe1968/1993/174/1993_174_357/_pdf)
- [Delany & Sorensen 1953, NACA TN 3038](https://ntrs.nasa.gov/api/citations/19930083675/downloads/19930083675.pdf)
- [Donelan, Hamilton & Hui 1985, doi](https://doi.org/10.1098/rsta.1985.0054)
- [Banner 1990, doi](https://doi.org/10.1175/1520-0485(1990)020%3C0966:ESOWW%3E2.0.CO;2)
- [Dierssen 2019, Frontiers in Earth Science](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2019.00014)
- [Dierssen 2021 corrigendum](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.683136)
- [Keuning & Vermeulen 2003, TU Delft repository (unreachable from here)](https://repository.tudelft.nl/file/File_2919930e-011d-4b5c-a89d-a996e24dbb8b)
- [Hooft 1994, MARIN record (paywalled, not needed)](https://www.marin.nl/en/publications/the-cross-flow-drag-on-a-manoeuvring-ship)
- [Oud & Toxopeus 2022, steady yaw with CFD (method only)](https://journals.sagepub.com/doi/10.3233/ISP-220001)
- [SYRF Wide Light project report notice](https://www.sailingscuttlebutt.com/2015/12/15/47747/)
