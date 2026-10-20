# Cross-flow drag coefficients and manoeuvring derivatives for the H-boat

Research for issue #15, 2026-10-20. Question: which published rule gives the sectional cross-flow drag coefficient C_D(x) from section shape for a fin-keel yacht hull like the H-boat, what values it gives for the H-boat's sections and for its keel and rudder as bluff plates, which source gives the linear manoeuvring derivatives Y_v, N_v, Y_r and N_r and with which hull parameters, whether the ship definition from issue #14 supplies those parameters, and what drift-angle and speed range each source covers.

## Answer in brief

- **No published closed-form rule covers yacht sections.** The rules that give C_D from section shape were built on merchant hulls. Kijima and Tanaka (1992) give two-dimensional C_D for rectangular sections against breadth-to-draft ratio and bilge radius, for B/2d 1.0 to 2.0 and r/2d 0 to 0.2. Tanaka and Kijima (1993) give the three-dimensional distribution along the length for a Wigley hull and a container ship in pure sway. The H-boat's canoe-body sections are slack V-sections with B/2T of 1.0 to 3.9 and an equivalent bilge radius as large as the draft, outside both.
- **Proposed rule for the H-boat canoe body:** take the two-dimensional C_D of a sharp-apexed lens or diamond section of the same breadth ratio from Delany and Sorensen (1953): 1.5 at B/2T = 1 and 1.1 at B/2T = 2, nearly independent of Reynolds number. Multiply it by the finite-length factor 0.52 that Tanaka and Kijima (1993) measured on a towed flat plate (1.03 against the two-dimensional 1.98). That gives **C_D from 0.57 amidships and aft to 0.78 at the bow**, a mean of 0.61 over a lateral profile of 1.71 m², so **C_D·A of the canoe body is about 1.05 m²**. The 2D table is cited; extending it past B/2T = 2 and applying the plate factor to a hull are estimates.
- **Keel and rudder as bluff plates:** Viterna and Corrigan (1982), after Hoerner (1965), give C_D,max ≈ 1.11 + 0.018·AR for a flat plate normal to the flow. With the hull as a reflection plane, the effective aspect ratio is 1.09 for the keel and 4.41 for the rudder, which gives **keel C_D 1.13 (C_D·A 1.02 m²) and rudder C_D 1.19 (C_D·A 0.36 m²)**. The appendages carry more than half of the H-boat's cross-flow drag, and their coefficients are the least uncertain.
- **Linear derivatives: Kijima's regressions do not apply to the H-boat.** Kijima et al. (1990) give Y'_β, Y'_r, N'_β and N'_r from L, B, d, C_B and trim, fitted on 13 merchant models with C_B 0.49 to 0.84, L/B 4.5 to 6.9 and k = 2d/L 0.058 to 0.146. The H-boat canoe body has C_B 0.29 and L/B 3.5, and most of its side force comes from a fin that the regression has never seen. Yoshimura et al. (2009) give a fine-ship variant and a unified model valid to 180 degrees of drift, with the same family limits. The yacht-specific sources (Keuning and Vermeulen 2003, Keuning, Vermeulen and de Ridder 2005) are behind paywalls and were not read. **Recommendation: take Y_v, N_v, Y_r and N_r from the VLM at load**, which the design doc does not list as a source. That is an open question for the coordinator.
- **The ship definition supplies every parameter** these sources need: L, B, d, C_B, trim and the per-section breadth, draft and area all come from the baked solids at the load condition's attitude, and m' and m'_x come from the mass items and the 6x6 added mass. Two gaps: appendage solids that carry no lifting surface (stub, skeg) have no cross-flow treatment, and the contract's "linear manoeuvring derivatives" field has nothing citable to hold for the H-boat.
- **For the blend:** both published unified models (Obokata 1987, Yoshimura et al. 2009) **add** a lift term that dies away with forward speed to a cross-flow term that grows with drift. They do not switch from one to the other. Their lift terms are fitted to about 10 degrees of drift, and their cross-flow terms are fitted at 90 degrees of drift and at zero speed. The H-boat's Reynolds numbers at 0.3 to 1.5 kn of drift are 2e5 to 1.1e6 on the beam, which is why the sharp-edged section family matters.

## Sources read

Primary sources read in full or in the parts cited:

- **[KT92]** Kijima, K. and Tanaka, S. (1992). The cross flow drag acting on rectangular cross-sections with round edge. J. Soc. Naval Architects of Japan 172, 1 to 8. Japanese text, English summary and figures. https://www.jstage.jst.go.jp/article/jjasnaoe1968/1992/172/1992_172_1/_pdf
- **[TK93]** Tanaka, S. and Kijima, K. (1993). On the distribution of cross flow drag over the length of a ship moving transversely. J. Soc. Naval Architects of Japan 174, 357 to 363. https://www.jstage.jst.go.jp/article/jjasnaoe1968/1993/174/1993_174_357/_pdf
- **[K90]** Kijima, K., Katsuno, T., Nakiri, Y. and Furukawa, Y. (1990). On the manoeuvring performance of a ship with the parameter of loading condition. J. Soc. Naval Architects of Japan 168, 141 to 148. https://www.jstage.jst.go.jp/article/jjasnaoe1968/1990/168/1990_168_141/_pdf
- **[Y09]** Yoshimura, Y., Nakao, I. and Ishibashi, A. (2009). Unified mathematical model for ocean and harbour manoeuvring. Proc. MARSIM 2009, Panama City. https://eprints.lib.hokudai.ac.jp/repo/huscap/all/42969/MARSIM09(Yoshimura)auther.pdf
- **[O87]** Obokata, J. (1987). On the basic design of single point mooring systems (1st report). J. Soc. Naval Architects of Japan 161, 183 to 195. https://www.jstage.jst.go.jp/article/jjasnaoe1968/1987/161/1987_161_183/_pdf
- **[DS53]** Delany, N. K. and Sorensen, N. E. (1953). Low-speed drag of cylinders of various shapes. NACA TN 3038. https://ntrs.nasa.gov/api/citations/19930083675/downloads/19930083675.pdf
- **[VC82]** Viterna, L. A. and Corrigan, R. D. (1982). Fixed pitch rotor performance of large horizontal axis wind turbines. DOE/NASA Workshop on Large Horizontal Axis Wind Turbines, NASA CP-2230. https://ntrs.nasa.gov/api/citations/19830010962/downloads/19830010962.pdf
- **[HB]** H-boat model artifact, version 1792502085-f25d: `src/hboat/data/offsets.ts` (the A.1.2 table of offsets), `model/derived.json`, `docs/appendages.md`, `docs/decisions.md`, `src/hboat/hull.ts`. https://claude.ai/artifact/8GXU2RTYXeE4CezLk3YRGb
- **[I14]** Issue #14 resolution comment (ship definition contract), ADR 0004, `docs/intention/02-hull.md`, and the earlier findings `docs/research/ship-definition-shape.md` on `research/ship-definition-shape`.

Sources identified but **not read**, because no open copy was reachable. Nothing below depends on their content:

- Hooft, J. P. (1994). The cross-flow drag on a manoeuvring ship. Ocean Engineering 21(3), 329 to 342. Segmented-model tests of the longitudinal distribution of cross-flow drag. https://www.marin.nl/en/publications/the-cross-flow-drag-on-a-manoeuvring-ship
- Hooft, J. P. and Quadvlieg, F. H. H. A. (1996). Non-linear hydrodynamic hull forces derived from segmented model tests. Proc. MARSIM 1996. https://www.marin.nl/en/publications/non-linear-hydrodynamic-hull-forces-derived-from-segmented-model-tests
- Keuning, J. A. and Vermeulen, K. J. (2003). The yaw balance of sailing yachts upright and heeled. Proc. 16th Chesapeake Sailing Yacht Symposium; also Trans. RINA 145 B1. https://research.tudelft.nl/en/publications/the-yaw-balance-of-sailing-yachts-upright-and-heeled/
- Keuning, J. A., Vermeulen, K. J. and de Ridder, E. J. (2005). A generic mathematical model for the maneuvering and tacking of a sailing yacht. Proc. 17th Chesapeake Sailing Yacht Symposium, 143 to 163, DOI 10.5957/CSYS-2005-012. https://research.tudelft.nl/en/publications/a-generic-mathematical-model-for-the-maneuvering-and-tacking-of-a/
- Hoerner, S. F. (1965). Fluid-Dynamic Drag. Author's edition. Cited here only through [VC82].
- Inoue, S., Hirano, M. and Kijima, K. (1981). Hydrodynamic derivatives on ship manoeuvring. International Shipbuilding Progress 28(321). The origin of the (π/2)k term; cited here only through [K90] and [O87].

## 1. The sectional rule

### 1.1 Form of the force

Both readable formulations integrate a quadratic drag over strips, with the local lateral velocity at each strip:

- [Y09] eq. (5) to (7): ΔY = -(ρ/2)·C_D·d·Δx·|v + C_rY·r·x|·(v + C_rY·r·x), with ΔN = ΔY·x. C_rY and C_rN are correction factors on the yaw-rate part; both are 1.0 in the original cross-flow theory.
- [O87] eq. (2): F_y = -(1/2)ρ·d·∫ C_y(φ_x)·V_x² dx, where V_x and φ_x are the relative speed and inflow angle at each section, with current included. The sectional coefficient is the whole-hull oblique-tow coefficient, assumed uniform along the length.
- [TK93] eq. (10) and [KT92] define the two-dimensional coefficient on the double body (the free surface as a rigid wall): C_D = Y / (½ρ·(2d)·U²) per unit length, where 2d is the section's height normal to the flow. For the real half-body this is a force of ½ρ·C_D·d·U² per unit length.

The design doc's integrand "½ρ·C_D(x)·|v_n|·v_n" is missing the local draft: **the force per unit length is ½ρ·C_D(x)·T(x)·|v_n|·v_n**. T(x) is the section's submerged height normal to the inflow at the current attitude, and v_n is the section's lateral relative velocity, sway plus yaw-rate times x minus current.

### 1.2 Two-dimensional C_D from section shape

**[KT92] Fig. 12**, a discrete-vortex computation for rectangular double-body sections, time-averaged until the shed vortices are 1.5 B downstream. These values were read off the figure, to within about ±0.03:

| r/2d \ B/2d | 1.0  | 1.5  | 2.0  |
| ----------- | ---- | ---- | ---- |
| 0.0         | 2.15 | 1.90 | 1.61 |
| 0.05        | 1.53 | 1.31 | 1.21 |
| 0.1         | 1.33 | 1.21 | 0.91 |
| 0.2         | 1.15 | 0.92 | 0.66 |

B is the breadth in the flow direction, 2d the double-body height and r the corner (bilge) radius. The text states that at r/2d = 0.2, C_D falls by about 47, 50 and 59 % from the sharp-cornered value at B/2d = 1.0, 1.5 and 2.0, which the table reproduces. This is the right table for a merchant hull such as the Joutsen's. It does not reach the H-boat.

**[DS53] Table I**, wind-tunnel C_d at Re = 1e5 (2e5 where marked), with fineness ratio c0/b0 = length in the flow direction over height across it. For a hull in pure sway this is B/2T:

| Shape                          | c0/b0 | r/b0           | C_d             |
| ------------------------------ | ----- | -------------- | --------------- |
| Circle                         | 1:1   | 0.5            | 1.0             |
| Ellipse                        | 1:2   |                | 1.6             |
| Ellipse                        | 2:1   |                | 0.6             |
| Square                         | 1:1   | 0.021          | 2.0             |
| Square                         | 1:1   | 0.167 / 0.333  | 1.2 (2e5) / 1.0 |
| Rectangle                      | 2:1   | 0.042          | 1.4             |
| Rectangle                      | 2:1   | 0.167 / 0.500  | 0.7 (2e5) / 0.4 |
| Diamond (apex facing the flow) | 1:1   | 0.015 to 0.235 | 1.5             |
| Diamond (apex facing the flow) | 2:1   | 0.042 to 0.333 | 1.1             |

Reynolds-number behaviour [DS53, Fig. 6, 11, 12] is what decides the H-boat case. The 2:1 ellipse drops from about 0.6 to about 0.1 between Re 1.5e5 and 4e5. The diamonds with r/b0 up to 0.17 stay flat to Re 1e6 and beyond, because their separation is fixed at the corners across the flow. Only the most rounded diamonds drop, near 5e5 to 1e6.

### 1.3 Finite length and distribution along the hull

[TK93] measured a 1.0 m by 0.065 m aluminium plate towed broadside (2d/L = 0.13) and found Y' = Y/(½ρLdU²) = 1.03, about half of the two-dimensional plate value of 1.98. For the computed distributions:

| Hull            | B/d   | 2d/L  | L/B  | Y' computed | Y' measured                              | Distribution                                                                                                   |
| --------------- | ----- | ----- | ---- | ----------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Wigley          | 1.6   | 0.125 | 10.0 | 0.90        | 0.91                                     | Below 1.0 amidships, above 1.0 for sections 0.3 to 0.45 L from midship, about the plate value 1.0 at both ends |
| SR108 container | 2.674 | 0.109 | 6.89 | 0.59        | 0.57 (Matsumoto et al., segmented model) | Below 1.0 everywhere except within 0.05 L of the ends; midship C_D 60 to 70 % of the Wigley's                  |

The finite-length factor used here, **f3D = 1.03 / 1.98 = 0.52**, is that measured plate ratio. The H-boat canoe body has 2T/L ≈ 0.14, close to the plate's 0.13, which supports the transfer. Applying the factor uniformly ignores the end rise that [TK93] shows. Taking it from a plate and applying it to a hull is an estimate.

### 1.4 Whole-hull regression as a cross-check

[Y09] eq. (19) fits a single hull C_D to the model's draft ratio: **C_D = -0.0591·(L/d) + 1.848**, from about seven models with L/d 10 to 22 (Fig. 8). It is a whole-hull coefficient on the area L·d, so it is not a sectional rule. For the H-boat canoe body (L/d = 14.5) it gives 0.99. With the full draft (L/d = 4.8, out of range) it gives 1.56.

## 2. H-boat values

### 2.1 Canoe-body sections

These come from the printed offsets [HB: offsets.ts], in the model's frame (station s at x = (s - 5)·0.63 m, heights from KVL). The waterline is the measurement condition [HB: derived.json `conditions.measurement`]: 47.4 mm below KVL at station 5, 0.658 degrees bow up, 1456 kg. The canoe body closes on the upper keel-line value, so the stub, the skeg and the keel are excluded (D6). The half-breadth at the waterline is interpolated between KVL and VL5; the section area is trapezoidal over the printed waterlines. The equivalent bilge radius comes from A = B·T - 2(1 - π/4)·r².

| Station | x (m)  | T (m) | B (m) | C_M  | B/2T | r/2T | C_D,2D | C_D (x 0.52) |
| ------- | ------ | ----- | ----- | ---- | ---- | ---- | ------ | ------------ |
| 0.5     | -2.835 | 0.063 | 0.486 | 0.50 | 3.85 | 1.50 | 1.10   | 0.57         |
| 1       | -2.520 | 0.132 | 0.840 | 0.50 | 3.19 | 1.36 | 1.10   | 0.57         |
| 2       | -1.890 | 0.244 | 1.286 | 0.56 | 2.63 | 1.17 | 1.10   | 0.57         |
| 3       | -1.260 | 0.334 | 1.560 | 0.56 | 2.33 | 1.10 | 1.10   | 0.57         |
| 4       | -0.630 | 0.393 | 1.700 | 0.55 | 2.16 | 1.06 | 1.10   | 0.57         |
| 5       | 0.000  | 0.417 | 1.693 | 0.56 | 2.03 | 1.02 | 1.10   | 0.57         |
| 6       | 0.630  | 0.408 | 1.493 | 0.56 | 1.83 | 0.97 | 1.17   | 0.61         |
| 7       | 1.260  | 0.371 | 1.175 | 0.54 | 1.58 | 0.92 | 1.27   | 0.66         |
| 8       | 1.890  | 0.291 | 0.783 | 0.54 | 1.35 | 0.85 | 1.36   | 0.71         |
| 9       | 2.520  | 0.151 | 0.336 | 0.52 | 1.12 | 0.79 | 1.45   | 0.76         |
| 9.5     | 2.835  | 0.046 | 0.093 | 0.50 | 1.01 | 0.77 | 1.50   | 0.78         |

Stations 0 and 10 are dry in this condition. In the sailing condition (1777 kg, 1.49 degrees bow up) every T grows by about 0.04 m, B/2T moves by under 0.1, and the profile area rises from 1.71 to 1.95 m².

Two findings shape the choice of 2D column:

- **C_M is 0.50 to 0.56 at every station**, close to a triangle (0.5) and far from an ellipse (0.785) or a rounded rectangle (above 0.95). The equivalent bilge radius exceeds the draft everywhere, so the [KT92] family (r/2d ≤ 0.2) does not describe these sections at all. In the double body, the keel line is a sharp apex across the flow, and amidships it continues into the stub and fin. This is the diamond family of [DS53], whose C_d does not depend on corner radius or on Reynolds number up to 1e6. The ellipse family would drop to about 0.1 at the H-boat's drift Reynolds numbers (section 5), which a sharp keel line does not allow.
- **C_D,2D is interpolated linearly in B/2T** between the 1:1 diamond (1.5) and the 2:1 diamond (1.1), and held at 1.1 above B/2T = 2. The interpolation is an estimate. Holding the value constant aft of station 5 is also an estimate: no data beyond 2:1 was found, and a flatter section should fall below 1.1. Aft sections are shallow, so this barely moves the total.

Integrated over the stations: **C_D·A of the canoe body is 1.05 m², over a profile area of 1.71 m², a mean C_D of 0.61**. That is consistent with [TK93] (container midship about 0.5 to 0.6, Wigley about 0.7, ends about 1.0) and with [Y09] eq. (19) on the canoe draft (0.99, an upper bound since that fit includes end effects at merchant L/B).

### 2.2 Keel and rudder as bluff plates

[VC82] eq. (13): **C_D,max ≈ 1.11 + 0.018·AR**, for AR ≤ 50, based on Hoerner's data. The same paper notes that a flat plate of AR 8 is below 1.3 and the two-dimensional value is about 2. With the hull as a reflection plane, the effective AR is twice the geometric one. That doubling is an estimate, but it changes C_D by less than 0.04 here.

| Appendage                            | Area (m²) | Span (m) | AR geometric | AR effective | C_D,max | C_D·A (m²) |
| ------------------------------------ | --------- | -------- | ------------ | ------------ | ------- | ---------- |
| Keel below VL8 [HB: appendages.md]   | 0.898     | 0.70     | 0.55         | 1.09         | 1.13    | 1.02       |
| Rudder, post-1972 [HB: derived.json] | 0.305     | 0.820    | 2.21         | 4.41         | 1.19    | 0.36       |

The keel span is VL8 (-0.600) to the drawn bottom at 1.300 below KVL. The ORC certificate's 1.26 m draft is measured in its own flotation [HB: appendages.md]. Plate edges fix separation, so these values hold at the H-boat's chord Reynolds numbers.

The stub (0.026 m³, the GRP moulding between the canoe body and VL8) and the skeg (a shallow deadwood from the keel to the rudder, 27 to 94 mm deep) are `appendage` solids with no lifting surface. Neither the design doc nor the contract says how they enter cross-flow. Section 4 proposes counting them as part of the local section depth.

### 2.3 Totals and a drift sanity check

The sum is canoe body 1.05, keel 1.02 and rudder 0.36: **about 2.4 m² of C_D·A in pure sway**, before stub and skeg. The appendages carry 57 %. As an illustration only: a steady aerodynamic side force of 400 N would balance at v = √(2·400 / (1025·2.4)) = 0.57 m/s = 1.1 kn. That falls inside the design doc's lying-ahull target of 0.5 to 1.5 kn. The aero force here is a placeholder, not a result.

## 3. Linear manoeuvring derivatives

### 3.1 Kijima et al. 1990

[K90] eq. (7), even keel, nondimensionalised on ½ρ·L·d·U² and ½ρ·L²·d·U², with drift angle β and k = 2d/L:

- Y'_β = (π/2)·k + 1.4·C_B·B/L
- Y'_r - (m' + m'_x) = -1.5·C_B·B/L
- N'_β = k
- N'_r = -0.54·k + k²
- and the nonlinear Y'_ββ, Y'_rr, Y'_ββr, Y'_βrr, N'_ββ, N'_rr, N'_ββr, N'_βrr, all in d(1 - C_B)/B, d·C_B/B and C_B·B/L.

[K90] eq. (9) corrects each derivative for trim by the stern τ = d_a - d_f over mean draft d_m. **Parameters needed: L, B, d (mean draft), C_B, τ, plus m' and m'\_x** for the Y'_r form. The model set is 13 ships at 2.5 to 3.0 m in full, half and ballast conditions [K90, Table 1]. From that table: L/B 4.5 to 6.9, B/d 2.7 to 6.2, C_B 0.49 to 0.84, k 0.058 to 0.146. The authors state the formulae "were effective to apply for the conventional ship's body, especially for the conventional stern shape". The paper does not state the drift range of the captive tests.

### 3.2 Yoshimura et al. 2009

[Y09] eq. (17) and (18) modify Kijima's even-keel linear terms "particularly for fine ships whose Cb is less than 0.75": Y'_v0 = -0.5πk - 1.4·C_B/(L/B), (Y'_r - m'_x)0 = 0.5·C_B/(L/B), N'_v0 = -k, N'_r0 = -0.54k + k². Trim enters through (τ/d)² and τ/(d·C_B) factors. The same paper writes the linear terms as **Y'\_v·v'·|u'| + (Y'\_r - m'\_x)·r'·u'** and **N'\_v·v'·u' + N'\_r·r'·|u'|**, so that they vanish at zero forward speed and change sign correctly astern. It adds the cross-flow integral of section 1.1 with three coefficients fitted from four models at β up to 180 degrees:

- C_D = -0.0591·(L/d) + 1.848
- C_rY = 0.520·(L/B) - 1.062
- C_rN = 0.0742·(L/d) - 0.297

Fitted values for the four models [Y09, Table 2]: C_D 0.65 to 1.20, C_rY 1.36 to 2.59, C_rN 0.54 to 1.31. Model ranges: L/B 4.8 to 6.9, L/d 13 to 22, C_B 0.55 to 0.83.

### 3.3 The H-boat against these regressions

For the measurement condition (L_WL 6.058 m, B_WL 1.743 m) [HB: derived.json], evaluated two ways because "d" is ambiguous for a fin-keel hull:

| Basis                                   | d (m) | k     | C_B   | L/B  | B/d  | Y'_β  | Y'_r - (m'+m'_x) | N'_β  | N'_r   | In [K90] range?               |
| --------------------------------------- | ----- | ----- | ----- | ---- | ---- | ----- | ---------------- | ----- | ------ | ----------------------------- |
| Canoe body, midship draft, V ≈ 1.279 m³ | 0.417 | 0.138 | 0.29  | 3.48 | 4.18 | 0.333 | -0.125           | 0.138 | -0.055 | k and B/d yes; C_B and L/B no |
| Whole hull, full draft, V = 1.4205 m³   | 1.263 | 0.417 | 0.107 | 3.48 | 1.38 | 0.698 | -0.046           | 0.417 | -0.051 | No parameter in range         |

**The H-boat is outside the regression family on either basis.** The canoe-body basis also misses the fin. As an order-of-magnitude estimate, Helmbold's low-aspect-ratio lift slope with the effective aspect ratios of section 2.2 gives a·S of about 1.44 m² for the keel and 1.24 m² for the rudder before downwash, against the canoe body's (π/2)·k·L·d of 0.55 m². In the canoe-body nondimensionalisation, that puts the fin alone at about Y'_β 0.57, larger than Kijima's whole-hull value. A Kijima Y_v for the H-boat would be wrong by a factor of two or more, in a direction the regression cannot know about.

### 3.4 Yacht-specific sources

The candidates are Keuning and Vermeulen (2003), on yaw balance upright and heeled from Delft Systematic Yacht Hull Series (DSYHS) tests, and Keuning, Vermeulen and de Ridder (2005), a generic manoeuvring and tacking model built on DSYHS data. Both are SNAME or RINA proceedings and could not be reached (TU Delft repository files are campus-only; onepetro and ResearchGate refused). Their content, coefficients and test ranges are unverified here. If the coordinator wants a cited yacht regression, these two papers are the ones to obtain.

### 3.5 Recommendation

The VLM that is now in scope solves the hull, keel and rudder together, including keel-rudder downwash and heel. Its small-drift solution is the linear derivative set by definition. Evaluated at load, with a pure sway inflow for Y_v and N_v and a pure yaw-rate inflow (v + x·r at each control point) for Y_r and N_r, it gives derivatives that are **continuous with the lift regime by construction**, so the blend cannot open a step between two disagreeing linear models. It needs only add, multiply, divide and sqrt, like the inverse itself (issue #14). The design doc names "the CFD grid or Kijima regressions", so this is a deviation to be opened as a question, not adopted silently.

## 4. Does the ship definition supply the parameters?

Against the issue #14 contract (baked section-stack solids with roles, lifting-surface chord stacks, a hydro block of cited or estimated values, mass items, derived values recomputed and never stored):

| Parameter                                                  | Needed by                            | Supplied?                                       | From                                                                                       |
| ---------------------------------------------------------- | ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Per-section B(x), T(x), area, C_M, equivalent bilge radius | Sectional C_D rule                   | Yes                                             | `hull`-role solids clipped at the current attitude; the section stack keeps stations       |
| Projected height normal to the inflow at heel              | Integrand T(x)                       | Yes                                             | Same clip, measured along the body z axis rotated by heel                                  |
| Keel and rudder area, span, AR                             | Plate C_D                            | Yes                                             | `liftingSurfaces` chord stacks; derived, not stored                                        |
| Stub, skeg lateral area                                    | Cross-flow                           | Geometry yes, rule **no**                       | `appendage` solids without a lifting surface; no rule assigns them                         |
| L, B, d, C_B, τ                                            | [K90], [Y09]                         | Yes                                             | Hydrostatics of the `hull` solids at the load condition's equilibrium                      |
| m', m'_x                                                   | [K90] Y'_r form, [Y09]               | Yes                                             | Mass items of the load condition; 6x6 added mass in the hydro block                        |
| Rule coefficients (2D table, f3D, plate law)               | Cross-flow                           | Yes, as a slot                                  | Hydro block "cross-flow section drag rule with coefficients", as cited or estimated values |
| Y_v, N_v, Y_r, N_r                                         | Linear part in the cross-flow regime | Slot exists, **nothing citable for the H-boat** | Hydro block "linear manoeuvring derivatives"                                               |

Two contract consequences for the coordinator:

1. **Stub and skeg.** The proposal is that the cross-flow rule acts on the union of all `hull` and non-lifting `appendage` solids at each x: their depth adds to T(x), and the section keeps the diamond family because the keel line stays sharp. Fins with a lifting surface are summed separately as plates. This needs no new role and no special case.
2. **Derivatives from the VLM.** If 3.5 is adopted, the hydro block's linear derivatives become optional: present and cited for a hull inside a regression family (the Joutsen with [K90] or [Y09]), absent for the H-boat, where `sim-hull` derives them from the VLM at load. Under ADR 0004 a derived value is not stored, so storing a VLM-computed estimate in the definition would contradict it.

## 5. Coverage of each source for the blend

| Source                           | Drift angle                                                                             | Speed / Reynolds                                                    | Hull family                                        |
| -------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| [K90] linear and nonlinear       | Not stated; captive tests, validated on 35 degree rudder turns                          | Forward speed; 2.5 to 3.0 m models                                  | Merchant, C_B 0.49 to 0.84, L/B 4.5 to 6.9         |
| [Y09] unified model              | 0 to 180 degrees, r' to 0.8 to 2.0; linear fit checked within about 10 degrees (Fig. 4) | Includes zero forward speed (pure turning, eq. 10); 2 to 4 m models | Merchant and fishing, L/d 13 to 22, L/B 4.8 to 6.9 |
| [O87] strip model                | Eq. (10) stated for local inflow angle up to 90 degrees                                 | Current speed at the moored hull                                    | Tanker; lift term C1 = 0.5πk + C_B·B/L after Inoue |
| [TK93] longitudinal distribution | 90 degrees only, impulsive start                                                        | Computed at d = 5 m, U = 1 m/s; plate tow at model scale            | Wigley and SR108 container; double body, no waves  |
| [KT92] 2D table                  | 90 degrees (2D)                                                                         | Inviscid vortex method; separation set by a fitted parameter        | Rectangles, B/2d 1 to 2, r/2d 0 to 0.2             |
| [DS53] 2D table                  | 90 degrees (2D)                                                                         | Re 1.1e4 to 2.3e6; values tabled at 1e5                             | Ellipses, rectangles, diamonds, triangles          |
| [VC82] plate law                 | Its post-stall model spans stall to 90 degrees; C_D,max is the 90 degree value          | Sharp edges; insensitive                                            | Flat plates, AR ≤ 50                               |

H-boat Reynolds numbers (ν = 1.19e-6 m²/s) at the design doc's thresholds:

| Lateral speed | Re on beam (1.7 m) | Re on keel mean chord (1.28 m) | Re on rudder mean chord (0.372 m) |
| ------------- | ------------------ | ------------------------------ | --------------------------------- |
| 0.3 kn        | 2.2e5              | 1.7e5                          | 4.8e4                             |
| 1.0 kn        | 7.4e5              | 5.5e5                          | 1.6e5                             |
| 1.5 kn        | 1.1e6              | 8.3e5                          | 2.4e5                             |

Points for the blend ticket:

- **The published unified models are additive.** [Y09] sums a lift term in v·|u| with the cross-flow integral at every drift angle. [O87] sums R·sin²ψ (cross-flow) with C1·sinψ·cos²ψ and C2·sin³ψ (circulation). The lift term goes to zero at 90 degrees and at zero forward speed by its own form, with no switch. The design doc's "exactly one of them carries the side force" is stricter than the literature. A lift weight that falls like cos ψ or with |u|/U reproduces the published forms without a branch.
- **Lift-term validity.** The only explicit check of a linear fit is [Y09] Fig. 4 at about 10 degrees of drift. That sits below the design doc's 15 to 20 degree handover. The VLM has no stall, so its weight must be well down by 20 degrees.
- **Cross-flow validity.** Every cross-flow coefficient here is a 90 degree, low-speed value. [Y09] shows that the plain C_D integral misses the double peak of Y' near 70 and 110 degrees for fine hulls, which C_rY and the lift term recover together.
- **Speed.** The design doc's 0.3 kn VLM cut-off falls in the drag crisis of rounded sections (Re 2e5 to 1e6). The sharp-apex diamond family and the plate law are why the H-boat's coefficients do not depend on that crisis. A rounded-section family would make the drift benchmark Reynolds-sensitive.

## 6. Proposed `data-hboat` entries

Every value is `{ value, src }` or `{ value, estimate }`, per the issue #14 contract:

- `crossFlow.section2D.diamond`: B/2T 1.0 → 1.5, 2.0 → 1.1; src [DS53] Table I (1:1 and 2:1 diamonds, Re 1e5). Linear interpolation between them, and the constant 1.1 above 2.0, as estimates: "no diamond data beyond 2:1; aft sections shallow".
- `crossFlow.section2D.roundedRectangle`: the [KT92] Fig. 12 table of section 1.2, src [KT92] (not used by the H-boat; listed for the shared rule).
- `crossFlow.finiteLength`: 0.52, src [TK93] (1.03 / 1.98, broadside tow of a 1.0 by 0.065 m plate), estimate when applied to a hull: "2T/L 0.14 against the plate's 0.13".
- `crossFlow.plate`: C_D,max = 1.11 + 0.018·AR, src [VC82] eq. (13) after Hoerner (1965). Effective AR = 2 × geometric for a fin root on the hull, estimate: "reflection plane; changes C_D by under 0.04".
- `manoeuvring.linear`: absent for the H-boat, derived from the VLM at load (if section 3.5 is adopted); otherwise `{ value, estimate }` from an offline VLM run, which conflicts with ADR 0004.

Resulting H-boat values at the measurement condition: canoe-body C_D 0.57 to 0.78 (section 2.1 table), keel 1.13, rudder 1.19, total C_D·A about 2.4 m² before stub and skeg.

## Open questions

1. **Linear derivatives from the VLM** (section 3.5) instead of "the CFD grid or Kijima": a design doc deviation for the coordinator.
2. **Stub and skeg in cross-flow** (section 4): union-of-solids sections, or a rule per appendage.
3. **Additive versus switched blend** (section 5): the literature adds; the design doc switches. The blend ticket decides.
4. **Diamond extrapolation past B/2T = 2** and the plate-derived finite-length factor are estimates. The drift benchmark, at 20 kn ahull, is the only check available until a double-body CFD run or Hooft (1994) is obtained.
5. **Yacht-specific derivatives**: if a cited source is preferred to the VLM, obtain Keuning and Vermeulen (2003) and Keuning, Vermeulen and de Ridder (2005).
