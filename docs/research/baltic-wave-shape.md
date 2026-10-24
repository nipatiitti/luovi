# Baltic wave climate and wave shape

Research for the "super symmetric swells" question, 2026-10-24. The owner finds that luovi's seas look like symmetric ocean swell, not like waves on the Baltic coast. The benchmark photos are an open-sea scene and a Finnish archipelago scene in a fresh breeze. The renders are the three reference seas on main at 6c95bd5. Questions: what the measured Baltic wave climate is where people sail, whether JONSWAP describes it, how spread and short-crested young seas are, how far real crests depart from a linear (or choppy) surface and what the cheapest faithful model is, and which three Baltic reference seas would replace or join ours. Facts and options only; the decisions belong to a ticket.

## Findings

| #   | Question | Finding |
| --- | -------- | ------- |
| 1   | Measured climate | **Short, moderately steep seas; the extremes are ocean-like in steepness.** Mean ice-free Hs and Tp are 1.24 m and 5.4 s at the Northern Baltic Proper buoy (100 m depth) and 0.84 m and 4.9 s at the Helsinki buoy; the 99th percentiles are 4.24 m and 9.7 s, and 2.75 m and 8.9 s [BJ18 Table 2]. The Gulf of Finland buoy (62 m) averaged Hm0 0.80 m at a 0.23 Hz peak (Tp 4.3 s) in 2016 to 2018, and the Suomenlinna buoy in the Helsinki archipelago (22 m) 0.33 m at 0.29 Hz [BJ19 Table 1]. Records: 8.2 m and 12.7 s in the Northern Baltic Proper (Rafael, 2004), 8.1 m in the Bothnian Sea (Aapeli, 2019), 5.2 m in the Gulf of Finland (2001 and 2012) [FMI, BJ17]. The storms' mean inverse steepness λp/Hs is 25 to 30 [BJ17 Table 1], so Hs/Lp is 0.033 to 0.040; the percentile pairs give 0.022 to 0.029 (section 1). |
| 2   | Fetch, slanting fetch, swell, crossing | **In the Gulf of Finland, half the wind directions give a steered sea.** "When the wind is in a 90° sector around the axis of the bay the dominant waves propagate along the axis independently of wind direction" [PE10 §2], so wave and wind directions differ by up to 50° [BJ19 §3.3], and the peak direction relaxes back toward the wind as frequency rises [PE10 §8]. In the archipelago the long waves are attenuated open-sea wind sea, not swell ("the waves travel slower than the wind") [BJ19 §2.4], and the islands collapse the spectrum to a flat plateau over 0.6 to 1.1 f_m [BJ19 §3.1]. Swell from the Baltic Proper entering the gulf is common enough that [PE10] had to screen it out, and a change of wind direction brought swell into the Bothnian Sea data [KC92 Fig. 23]. No source read gives the share of time a sea is crossed or swell-mixed (section 1). |
| 3   | Is JONSWAP the right shape | **Yes for open water with orthogonal fetch; no for the archipelago; with a stability caveat.** The Bothnian Sea had higher peak enhancement than other data sets at the same fetch [KC92 abstract]. The energy grows almost linearly with fetch in unstable air and slower in stable air; at luovi's reference fetches the build's JONSWAP Hs lies between Kahma and Calkoen's stable (30 to 36% lower) and unstable (12 to 18% higher) laws. In the narrow Gulf of Finland the storm spectrum is less peaked [BJ19 §3.2, after Pettersson 2004]. In the archipelago no single peaked spectrum fits: the narrowness κ² falls from 0.18 to 0.19 outside to 0.03 to 0.07 inside [BJ19 §3.2]. Above the peak the measured tail is ω⁻⁴ up to ω̃ = ωU/g ≈ 5 and ω⁻⁵ beyond [KC92 §3b]; JONSWAP is ω⁻⁵ throughout (section 2). |
| 4   | Spreading and crest length | **At the peak, Donelan-Banner already matches; the young-sea features are above 2 f_p and in the slanting fetch.** The Bothnian storm sea had a 16° spread at the peak [BJ20 App. A2]; Donelan's β of 2.28 at the peak gives 22°. A sech² spread at β = 2.44 gives a mean crest length of 2.8 peak wavelengths by Longuet-Higgins's zero-crossing measure; β = 1.24 gives 1.5 (computed). Young seas are bimodal above about twice the peak frequency [PE18 §1, citing five data sets]; in a 10.7 m/s fetch-limited Adriatic sea the lobes appear at k/k_p ≈ 5 and separate as 82°·√(1 − 10^(−0.039(k/k_p − 5))) each side [PE18 eq. 19]. Our band ends at 3 k_p, so bimodality is a tail matter (section 3). |
| 5   | How far real crests depart from linear | **This is where the build is most wrong: the choppy band has no vertical asymmetry.** Measured and simulated storm seas have elevation skewness 0.14 to 0.17 [FE16 Table 1], and second-order theory gives crests about 10% above Rayleigh at fixed sensors [FO00 §5]. Choppy (Gerstner-type) displacement of a Gaussian sea has a slightly negative skewness at second order, "opposite sign" to Longuet-Higgins's [NO09 eq. 14, 76]: it sharpens crests and flattens troughs, but lowers the mean level under each wave group by exactly as much as it raises the crests. On the moderate reference sea's own band, the choppy surface has skewness 0.01 (linear 0.01) and its 0.1% crest and trough levels are 0.77 and −0.77 Hs; adding the Sharma and Dean second order gives skewness 0.15 and 0.82 against −0.73 Hs. The light and storm seas give the same numbers (section 4). Wave buoys follow the surface and so cancel the second-order crest rise [FO00 §3a], which is why the Finnish buoy crests agree with Rayleigh [BJ19 §4.3]: that is not evidence the Baltic is symmetric. |
| 6   | Front-back asymmetry | **Wind-driven forward lean belongs to short, strongly forced waves, not the spectral peak.** In the tank, asymmetry grows as −A = −0.066 + 0.323 u*/C_m over u*/C_m = 0.3 to 1.6 while skewness barely changes [LE95 eq. 4.1]. At sea u*/c_p is 0.04 to 0.1 at the peak, outside the fit and near its zero, but 0.3 to 1 for metre-scale waves. No source read gives a field asymmetry value for deep water. Wind theory links asymmetry to the growth rate [ZF20 abstract]; breaking onset and shoaling are the other causes (section 4). |
| 7   | Cheapest faithful models | **One per-point correction gives the right second-order statistics on top of the existing choppy band, deterministically.** Add to each surface point's height, at its Lagrangian label x₀, z₂ = η₂(x₀) + H·H_k, with η₂ the Sharma and Dean pair sum and H = Σ a k̂ sin θ, H_k = Σ a k k̂ sin θ. On the moderate band this reproduces the Eulerian second-order skewness (0.148 against 0.148) and mean (computed). The pair sum needs only the cos and sin the first-order sum already has, through angle-addition products, so it is basic float operations only: 163 µs per tick for 200 points with N = 32 on an M1 Pro (computed). A factorised form ½(η η_k + H·H_k), with η_k = Σ k a cos θ, is O(N) per point, exact for collinear waves, and overshoots skewness by about 40% on a spread sea (0.206). The same form rotated by a harmonic phase gives forward lean at no extra cost (derived here, no source) (section 5). |
| 8   | Our reference seas | **All three are one sea at three scales, and the moderate one is a top-5% Baltic sea.** Dimensionless fetch 7 400 to 10 200, wave age c_p/U 0.85 to 0.96 and Hs/Lp 0.035 to 0.036 for all three; their shape statistics are identical (finding 5). The moderate sea (Hs 2.96 m, Tp 7.4 s, Lp 84 m) sits between the Helsinki 99th and the Northern Baltic Proper 95th percentile Hs [BJ18 Table 2]. Coastal sailing seas are younger: the Gulf and archipelago cases below have dimensionless fetch 2 300 to 5 500, wave age 0.58 to 0.78, Lp 14 to 56 m. |
| 9   | Proposed Baltic seas | **Three seas, each tied to a measured case** (section 6): a Helsinki archipelago onshore breeze (8 m/s, 15 km, 22 m, γ 1: Hs 0.47 m, Tp 3.0 s, Lp 14 m) against Suomenlinna's P80 Hm0 of 0.50 m [BJ19]; an open Gulf of Finland fresh breeze (12 m/s, 80 km, 60 m, γ 3.3: Hs 2.1 m, Tp 6.0 s, Lp 56 m) against the Helsinki buoy's 95th percentile Hs of 2.0 m [BJ18]; and the Bothnian Sea storm Aapeli (27 m/s, 194 km, 120 m, γ 3.3: Hs 7.1 m, Tp 10.5 s) against 8.1 m measured, 7.0 m low-pass filtered, 12 s and a 16° peak spread [BJ20]. |

## What the decisions need to settle

These touch the ocean contract (ADR 0005), the render-ocean decision (ADR 0011) and the reference seas in `tool-validate` and `tool-scenario`, so per `AGENTS.md` each is a question to open, not a change to make.

| Decision | Options | What the sources and measurements support |
| -------- | ------- | ----------------------------------------- |
| Vertical asymmetry of the band | (a) keep the choppy band as is; (b) add the Lagrangian correction z₂ with the exact pair sum on the CPU and in the vertex shader; (c) add the factorised z₂, O(N), with its 40% skewness overshoot on spread seas; (d) (b) for the band and (c) for the tail | (a) is measurably wrong in skewness [NO09, FE16, our check]. (b) is exact to second order and cheap on the CPU; in the shader it costs 528 pair terms per vertex against today's 32 `sincos`. (c) needs only one extra linear field (η_k) per cascade, since H_k = −∇η is already computed for normals |
| Reference seas | (a) keep; (b) replace with the three Baltic seas of section 6; (c) keep ours as the cost and stability set and add the Baltic seas for the look | The current set spans no wave age, so it cannot show the difference between a young coastal sea and a grown one. Benchmarks and cost figures are stated on the reference seas (GLOSSARY), so (b) moves every number |
| One wave system per scenario | (a) keep one JONSWAP-TMA system; (b) allow an attenuated open-sea system beside the local one; (c) allow the mean direction to vary with frequency (slanting fetch) | The archipelago spectrum is a flat plateau no single JONSWAP fits [BJ19]; slanting fetch gives a frequency-dependent mean direction [PE10]. Both need a second set of band components or a direction law per strip, a contract change |
| Tail shape | (a) keep ω⁻⁵; (b) ω⁻⁴ up to ω̃ ≈ 5, then ω⁻⁵ | [KC92 §3b] and Donelan et al. 1985 (second-hand) support (b); it raises metre-scale wave energy and slope. Not quantified against the build here |
| Stability | (a) one growth law; (b) a stability input choosing Kahma and Calkoen's stable or unstable law | The difference is 45 to 70% in energy [KC92 §4c]. Baltic sailing in spring and early summer is mostly warm air over cold water (stable), autumn the reverse; the season split is general knowledge, not from a source read here |

## Sources

- **[BJ17]** J.-V. Björkqvist et al., _Brief communication: Characteristic properties of extreme wave events observed in the northern Baltic Proper, Baltic Sea_, NHESS 17, 1653 to 1658, 2017, [doi:10.5194/nhess-17-1653-2017](https://doi.org/10.5194/nhess-17-1653-2017). Read in full.
- **[BJ18]** J.-V. Björkqvist, I. Lukas, V. Alari, G. Ph. van Vledder, S. Hulst, H. Pettersson, A. Behrens, A. Männik, _Comparing a 41-year model hindcast with decades of wave measurements from the Baltic Sea_, Ocean Engineering 152, 57 to 71, 2018; read as [arXiv:1705.00559](https://arxiv.org/abs/1705.00559). Table 2 and section 4.1 read.
- **[BJ19]** J.-V. Björkqvist, H. Pettersson, K. K. Kahma, _The wave spectrum in archipelagos_, Ocean Science 15, 1469 to 1487, 2019, [doi:10.5194/os-15-1469-2019](https://doi.org/10.5194/os-15-1469-2019), CC BY 4.0. Read in full.
- **[BJ20]** J.-V. Björkqvist, S. Rikka, V. Alari, A. Männik, L. Tuomi, H. Pettersson, _Wave height return periods from combined measurement–model data: a Baltic Sea case study_, NHESS 20, 3593 to 3609, 2020, [doi:10.5194/nhess-20-3593-2020](https://doi.org/10.5194/nhess-20-3593-2020). Section 2 and appendix A read.
- **[FMI]** Finnish Meteorological Institute, [Wave height records in the Baltic Sea](https://en.ilmatieteenlaitos.fi/wave-height-records-in-the-baltic-sea), read 2026-10-24.
- **[KC92]** K. K. Kahma, C. J. Calkoen, _Reconciling discrepancies in the observed growth of wind-generated waves_, J. Phys. Oceanogr. 22, 1389 to 1405, 1992, [doi:10.1175/1520-0485(1992)022<1389:RDITOG>2.0.CO;2](https://doi.org/10.1175/1520-0485(1992)022%3C1389:RDITOG%3E2.0.CO;2). Scanned PDF read page by page: abstract, sections 3b, 4c, 6, equations 2 to 9 and 14 to 17.
- **[PE10]** H. Pettersson, K. K. Kahma, L. Tuomi, _Wave directions in a narrow bay_, J. Phys. Oceanogr. 40, 155 to 169, 2010, [doi:10.1175/2009JPO4220.1](https://doi.org/10.1175/2009JPO4220.1). Sections 1 to 3 and 8 read.
- **[PE18]** C. Peureux, A. Benetazzo, F. Ardhuin, _Note on the directional properties of meter-scale gravity waves_, Ocean Science 14, 41 to 52, 2018, [doi:10.5194/os-14-41-2018](https://doi.org/10.5194/os-14-41-2018). Introduction, sections 2 and 4 read. Its citations of Young et al. 1995, Ewans 1998, Wang and Hwang 2001, Hwang et al. 2000, Long and Resio 2007 and Romero and Melville 2010 are second-hand here.
- **[NO09]** F. Nouguier, C.-A. Guérin, B. Chapron, _"Choppy wave" model for nonlinear gravity waves_, J. Geophys. Res. 114, C09012, 2009, [doi:10.1029/2008JC004984](https://doi.org/10.1029/2008JC004984); author copy at [Archimer](https://archimer.ifremer.fr/doc/00000/6832/6022.pdf). Sections 2, 3 and 4.2 read.
- **[FO00]** G. Z. Forristall, _Wave crest distributions: observations and second-order theory_, J. Phys. Oceanogr. 30, 1931 to 1943, 2000, [doi:10.1175/1520-0485(2000)030<1931:WCDOAS>2.0.CO;2](https://doi.org/10.1175/1520-0485(2000)030%3C1931:WCDOAS%3E2.0.CO;2). Read in full; the Sharma and Dean 1979 kernels are taken as its equations 11 to 19 print them.
- **[FE16]** F. Fedele, J. Brennan, S. Ponce de León, J. Dudley, F. Dias, _Real world ocean rogue waves explained without the modulational instability_, Sci. Rep. 6, 27715, 2016, [doi:10.1038/srep27715](https://doi.org/10.1038/srep27715). Table 1 and Methods read.
- **[LE95]** I. A. Leykin, M. A. Donelan, R. H. Mellen, D. J. McLaughlin, _Asymmetry of wind waves studied in a laboratory tank_, Nonlin. Processes Geophys. 2, 280 to 289, 1995, [doi:10.5194/npg-2-280-1995](https://doi.org/10.5194/npg-2-280-1995). Scanned; abstract, Table 1, Fig. 1 and eq. 4.1 read.
- **[ZF20]** T. Zdyrski, F. Feddersen, _Wind-induced changes to surface gravity wave shape in deep to intermediate water_, J. Fluid Mech. 903, A31, 2020; read as [arXiv:1911.07879v2](https://arxiv.org/abs/1911.07879). Abstract, introduction and section 5.3 read.
- **[LH57]** M. S. Longuet-Higgins, _The statistical analysis of a random, moving surface_, Phil. Trans. R. Soc. A 249, 321 to 387, 1957. Not read; the zero-crossing spacing π√(m₀₀/m₂₀) it is known for is used as a definition only.
- **[M]** Our computations for this note, described under "Reproducing the computations".

Reached but not read past the abstract: Guérin et al. 2019, _An improved Lagrangian model for the time evolution of nonlinear surface waves_, J. Fluid Mech. 876, 527 to 552 (the "improved choppy wave model", a second-order Lagrangian expansion with a modified dispersion relation); HAL served a bot challenge. Not reached: Pettersson's 2004 thesis (the Ifremer copy returned 403), Kahma's 2021 Geophysica review (certificate failure), Tuomi et al. 2011 (Boreal Env. Res.), Soomere and Räämet 2011, Kahma 1981 and Fournier and Reeves 1986. Nothing from `~/Downloads/hydro-research/` was needed beyond what the prior notes already read.

## 1. The measured wave climate

### Statistics where people sail

| Site, depth | Source | Hs (m) | Tp (s) | Wind (m/s) | Hs/Lp (deep, indicative) |
| ----------- | ------ | ------ | ------ | ---------- | ------------------------ |
| Northern Baltic Proper buoy, 100 m, mean | [BJ18 Table 2] | 1.24 | 5.4 | | 0.027 |
| same, 95th / 99th percentile | [BJ18 Table 2] | 2.93 / 4.24 | 8.2 / 9.7 | | 0.028 / 0.029 |
| Helsinki buoy, mean | [BJ18 Table 2] | 0.84 | 4.9 | | 0.022 |
| same, 95th / 99th percentile | [BJ18 Table 2] | 2.01 / 2.75 | 7.5 / 8.9 | | 0.023 / 0.022 |
| Gulf of Finland buoy, 62 m, 2016 to 2018, mean (P80 Hm0) | [BJ19 Table 1] | 0.80 (1.22) | 4.3 (fp 0.23 Hz) | 7.7 mean, 10.9 P80, at 31.8 m | 0.027 |
| Harmaja, outer archipelago, 29 m, mean (P80) | [BJ19 Table 1] | 0.61 (0.92) | 4.2 (fp 0.24 Hz) | 6.2 mean, 8.9 P80, at 17.5 m | 0.022 |
| Suomenlinna, transition zone, 22 m, mean (P80) | [BJ19 Table 1] | 0.33 (0.50) | 3.4 (fp 0.29 Hz) | 6.1 mean, 8.7 P80 | 0.018 |
| Inner archipelago, 12 to 13 m, mean | [BJ19 Table 1] | 0.17 to 0.24 | 3.3 to 3.6 | 6.2 to 8.3 | |
| Rafael, NBP, 22 Dec 2004, maximum | [BJ17 Table 1] | 8.2 | 12.7 | | 1/27 = 0.037 |
| Toini, NBP, 11 Jan 2017, maximum | [BJ17 Table 1] | 8.0 | 12.5 | | 1/30 = 0.033 |
| Aapeli, Bothnian Sea, 120 m, 1 to 2 Jan 2019 | [BJ20 §1, App. A2] | 8.1 (7.0 low-pass) | 12 | about 27 at the storm peak | 0.036 |
| Gulf of Finland maximum, 2001 (SW) and 2012 (E) | [FMI, BJ19 §3.3] | 5.2 | | | |

The percentile rows pair a percentile of Hs with the same percentile of Tp, which are not joint values, so their steepness is indicative only. The storm rows are joint. In the hindcast, the Baltic Proper's mean Tp is 5 to 6 s with a 99th percentile of 10 s, and the Gulf of Finland's stays under 5 s on average, rising to 9 s in storms [BJ18 §4.1]. Archipelago peak frequencies are noisy enough to be "unusable to scale the spectra" [BJ19 §2.4].

### Fetch geometry, swell and crossing

- **Slanting fetch.** The Gulf of Finland is 300 km long and 70 to 120 km wide [PE10 §2a]. Within a 90° sector of wind around its axis the dominant waves run along the axis whatever the wind [PE10 §2, Fig. 3]. The directionally decoupled model gets the peak direction right in narrow geometry and steers too weakly in broader geometry; Donelan's method (fetch and wind component along the wave direction) steers well in clean slanting fetch but too much elsewhere; neither reproduces the drift of mean direction with frequency back toward the wind [PE10 abstract, §8]. WAM needed a 5 km grid to steer at all [PE10 abstract].
- **Swell.** Inside the archipelago the long waves are attenuated open-sea wind sea, still slower than the wind [BJ19 §2.4]. [PE10] screened out cases where swell from the Baltic Proper was not small against the wind sea. In the Bothnian Sea, swell arriving after a wind shift reduced peak enhancement [KC92 §5, Fig. 23]. In the hindcast's severe Baltic Proper storms the mean wave direction followed the long westerly fetch rather than the strongest winds, a slanting-fetch effect [BJ18 §4.2].
- **Frequency of each kind.** No source read gives the share of time Baltic seas are fetch-limited, slanting-fetch, swell-mixed or crossed. Given [PE10]'s 90° sector and the gulf's two axis directions, about half of all wind directions produce a steered sea in the middle of the Gulf of Finland (derived from the sector width, not measured as a time share).

## 2. Does JONSWAP describe these seas

**Growth laws.** Kahma and Calkoen fitted the Bothnian Sea, Lake Ontario and a reanalysed JONSWAP together, with dimensionless fetch X̃ = gX/U₁₀², energy ε̃ = g²ε/U₁₀⁴ and peak ω̃_p = ω_p U₁₀/g [KC92 §1, §4c, §6]:

| Stratification | ε̃ | ω̃_p |
| -------------- | -- | ---- |
| Stable | 9.3 × 10⁻⁷ X̃^0.76 | 12.0 X̃^−0.24 |
| Unstable | 5.4 × 10⁻⁷ X̃^0.94 | 14.2 X̃^−0.28 |
| Composite | 5.2 × 10⁻⁷ X̃^0.9 | 13.7 X̃^−0.27 |

The relations "should be valid at least up to dimensionless fetch X̃ = 8000" [KC92 §6]. Between the composite stable and unstable groups the energy differs by as much as 70% (48% within Lake Ontario alone) [KC92 §4c]. The original JONSWAP data were mostly stable, which is why JONSWAP grew slower than the Bothnian Sea [KC92 §6].

Against the build's JONSWAP-TMA (fetch laws α = 0.076 X̃^−0.22, f_p U/g = 3.5 X̃^−0.33, γ 3.3 [`data` `jonswap.ts`]) [M]:

| Sea | X̃ | Build Hs, Tp | K&C stable Hs, Tp | K&C unstable Hs, Tp |
| --- | -- | ------------ | ----------------- | ------------------- |
| 8 m/s, 50 km, 40 m | 7 660 | 1.12 m, 4.5 s | 0.75 m, 3.7 s | 1.28 m, 4.4 s |
| 12 m/s, 150 km, 60 m | 10 200 | 2.96 m, 7.4 s | 1.89 m, 5.9 s | 3.31 m, 7.2 s |
| 20 m/s, 300 km, 80 m | 7 350 | 6.67 m, 11.0 s | 4.64 m, 9.1 s | 7.87 m, 10.9 s |

The steepness Hs/Lp at a given X̃ is nearly the same under all three laws (0.035 to 0.042); stability moves Hs and Tp together. In the build, Hs also depends on γ, because α comes from the fetch law and γ multiplies the peak: at 8 m/s and 15 km, γ = 1 gives Hs 0.47 m and γ = 3.3 gives 0.58 m [M]. Kahma and Calkoen's energy law is independent of shape.

As a consistency check, the composite law at Aapeli's 27 m/s and 194 km gives Hs 7.39 m and Tp 10.6 s [M]; [BJ20 App. A2] states 7.4 m and 11 s from the same law.

**Shape.** Peak enhancement in the Bothnian Sea exceeded the other data sets at the same X̃ and was matched only by Lake Ontario at fetches an order of magnitude shorter [KC92 abstract]. The averaged high-frequency tail does not have one universal form, but the grand average shows "the transition from a ω⁻⁴ to a ω⁻⁵ tail in the neighborhood of ω̃ = 5" [KC92 §3b]. At 12 m/s that is ω ≈ 4.1 rad/s, a 3.7 m wave; JONSWAP's ω⁻⁵ from the peak up therefore carries less energy than the measured average between about 1.5 f_p and that frequency. [PE10 §3] built its spectrum with an ω⁻⁴ tail for that reason, with the composite peak law and the Pierson-Moskowitz limit ω̃_p = 0.79.

**Where it fails.** In the narrow Gulf of Finland the storm spectrum is "less peaked" because of the fetch geometry (κ² = 0.33 for the 5.2 m Antti storm, up to 0.46 seen) [BJ19 §3.2]. In the archipelago, the spectrum flattens "from a single-peaked spectrum to a spectrum with a wide frequency range having almost constant energy" [BJ19 abstract], with κ² 0.18 to 0.19 outside, 0.08 to 0.15 in the transition zone and 0.03 to 0.07 inside [BJ19 §3.2]. Single wave statistics follow: H_max/Hs averaged 1.58 at Suomenlinna and H_1/3 = 0.881 Hs [BJ19 abstract]. A JONSWAP with γ = 1 is still single-peaked; the plateau is an attenuated open-sea spectrum plus a local short-fetch one, which one wave system per scenario cannot express.

## 3. Directional spreading and crest length

**At the peak.** Donelan's sech² law is β = 2.61 (ω/ω_p)^1.3 below 0.95 ω_p and 2.28 (ω/ω_p)^−1.3 above, 1.24 beyond 1.6 ω_p [PE10 §3, quoting Donelan et al. 1985]; the build's 2.44 (ω/0.95 ω_p)^±1.3 is the same law [`data` `donelanBanner.ts`]. The Bothnian storm sea was spread 16° at the peak [BJ20 App. A2], measured by the Kuik et al. 1988 method [BJ20 §2]. On the same first-moment definition, σ = √(2(1 − |⟨e^{iθ}⟩|)), sech² at β = 2.28 gives 22° and at 2.61 gives 19.5° [M]. The peak spread is not where the build departs.

**Short-crestedness.** With the zero-crossing spacing π√(m₀₀/m₂₀) along a direction [LH57], the mean crest length over the mean wavelength is √(m₂₀/m₀₂) with x along the mean direction. For a single wavenumber that is √(⟨cos²θ⟩/⟨sin²θ⟩) [M]:

| Spreading | Crest length / wavelength | σ |
| --------- | ------------------------- | - |
| sech², β = 2.61 | 2.95 | 19.5° |
| sech², β = 2.44 | 2.77 | 20.8° |
| sech², β = 2.0 | 2.30 | 25.1° |
| sech², β = 1.24 | 1.54 | 38.3° |
| sech², β = 0.67 (Banner at k/k_p ≈ 10) | 1.08 | 58° |
| cos²ˢ(θ/2), s = 5 | 1.68 | 33.1° |
| cos²ˢ(θ/2), s = 10 | 2.30 | 24.4° |

So the dominant waves of a Donelan sea have crests about three wavelengths long, and the waves above 1.6 ω_p about one and a half. No source read gives a measured crest length ratio for a Baltic sea.

**Above the peak.** Bimodality above about twice the peak frequency is established from arrays, buoys and airborne data [PE18 §1, second-hand for the six studies]. In a fetch-limited bora sea of 10.7 m/s, Hm0 1.33 m, f_p 0.185 Hz, 17 m depth (close to a Gulf of Finland fresh breeze), stereo video detected two lobes from k/k_p ≈ 5, each at 82°·√(1 − 10^(−0.039 (k/k_p − 5))) from the mean, with lobe ratios rising roughly linearly to about 6 at k/k_p ≈ 22 [PE18 §2, §4, eq. 19]. Our band stops at k_s = 3 k_p, so this concerns the tail's spreading, which today is Banner's unimodal sech².

**Slanting fetch.** See section 1: the peak runs along the gulf and higher frequencies relax toward the wind [PE10 §8]. A slanting-fetch sea is therefore not one mean direction with a spread around it, which is what the build has; it is a direction that turns with frequency.

## 4. Wave shape beyond linear

### Vertical asymmetry (skewness)

Second-order theory for a narrow spectrum in deep water gives λ₃ = 3μ_m with μ_m = k_m σ [FE16 eq. 11, after Tayfun]. Simulated and measured storm seas (Andrea, Draupner, Killard) have λ₃ of 0.141 to 0.146 by high-order spectral simulation against 0.145 to 0.165 from the narrow-band formula [FE16 Table 1]. Second-order simulations reproduce fixed-sensor crest distributions about 10% above Rayleigh, rising slightly at low probability; directional spreading lowers deep-water crests by about 2% [FO00 §5, Fig. 6 to 9]. Forristall's Weibull fits for directional seas are α = 0.3536 + 0.2568 S₁ + 0.0800 Ur and β = 2 − 1.7912 S₁ − 0.5302 Ur + 0.284 Ur², with S₁ = 2πHs/(g T₁²) and Ur = Hs/(k₁² d³) [FO00 eq. 21 to 27].

**Choppy displacement has none of it.** For one Gerstner wave, x = x₀ − a sin θ₀, z = a cos θ₀, the Eulerian profile is a cos kx + ½ka² cos 2kx − ½ka² + O(a³): the Stokes second harmonic, plus a lowered mean. For a random sea the same expansion gives, per pair, the sum-frequency coefficient a_i a_j (k_i + k_j)/2, identical to Longuet-Higgins's for collinear waves, but a difference-frequency coefficient −a_i a_j (k_i + k_j)/2 where Longuet-Higgins has −a_i a_j |k_i − k_j|/2 [M]. In a narrow spectrum that is η_E ≈ η − k η̂² against Stokes's η + ½k(η² − η̂²): crests and troughs both stay at ±A, the envelope, while the mean level under a group drops by ½kA². The third moment of η − kη̂² vanishes at second order for a Gaussian η. [NO09] derives the full result: the choppy wave model's elevation skewness is −2σ₁⁶/(σ₀² − σ₁⁴)^{3/2}, "slightly negative", against Longuet-Higgins's λ₃ ≈ 3σ₁²/σ₀, of "opposite sign"; the choppy kernel coincides with Longuet-Higgins's only on the diagonal [NO09 eq. 14, 74 to 76].

Measured on luovi-like bands (8 strips × 4 sectors, fixed amplitudes, Donelan-Banner, k_s = 3 k_p, λ = 1, 10 seeds × 4 times × 48² points), Eulerian heights at fixed points [M]:

| Surface | Moderate: skewness, 0.1% crest / trough (× Hs) | Light | Storm |
| ------- | --------------------------------------------- | ----- | ----- |
| Linear | 0.011, 0.769 / −0.776 | −0.002 | 0.005 |
| Choppy, λ = 1 (the build) | 0.011, 0.769 / −0.772 | 0.001 | 0.008 |
| Linear + Sharma-Dean second order | 0.148, 0.820 / −0.725 | 0.137 | 0.147 |
| Choppy + Lagrangian correction z₂ (section 5) | 0.148, 0.815 / −0.722 | | |
| Linear + factorised ½(ηη_k − H·H_k) | 0.205, 0.844 / −0.705 | 0.196 | 0.205 |
| Choppy + factorised z₂ | 0.206, 0.834 / −0.702 | | |

Hs here is the band's. The build's mean level is 0.047 m below zero on the moderate sea and 0.106 m on the storm sea, the Lagrangian set-down; its crests and troughs are mirror images. A second-order sea puts its 0.1% crest 13% further from the mean than its 0.1% trough.

**Buoys do not see it.** "Surface following buoys effectively cancel out the second-order nonlinearity by making a Lagrangian measurement"; to second order the mean surface drops by as much as the crest rises [FO00 abstract, §3a]. The Finnish crest statistics, which match Rayleigh [BJ19 §4.3], come from Datawell Directional Waveriders [BJ19 §2.1], so they cannot confirm or refute Baltic skewness.

### Front-back asymmetry (crests leaning forward)

Steady deep-water Stokes waves are front-back symmetric; asymmetry comes from wind forcing, shoaling or currents [ZF20 §1]. In the tank, at steepness ε_m ≈ 0.165, skewness rose from 0.29 to 0.66 and fell again while asymmetry grew steadily from 0 at u*/C_m ≈ 0.3 to −0.4 at 1.2, with −A = −0.066 + 0.323 u*/C_m; "a negative sign of the asymmetry observed for all our data indicates that wave crests are tilted forward" [LE95 Table 1, Fig. 1, eq. 4.1]. The harmonic's phase relative to the primary fell from about 0 to −60° over the same range [ZF20 Fig. 8, Leykin's data]. Zdyrski and Feddersen's theory links the asymmetry to the non-dimensional growth rate [ZF20 abstract].

At sea, with u* ≈ 0.04 U₁₀, u*/c_p at the peak is about 0.07 for 12 m/s over a 4.3 s peak, well below Leykin's range and where his fit is zero. A 1 m wave travels at 1.25 m/s, so u*/c is about 0.35 for the same wind. Wind-driven forward lean is therefore a feature of the metre-scale waves the tail carries, and of crests at breaking onset; no source read gives a deep-water field value, and Leykin's fit should not be extrapolated to the peak.

## 5. Cheapest models, determinism and cost

**The Lagrangian correction.** With the build's choppy surface point (x₀ + D(x₀), z(x₀)), D = −λΣ k̂ a sin θ, the Eulerian height is z − D·∇z to second order. Requiring it to equal the Eulerian second-order sea η₁ + η₂ gives a vertical correction at the label, z₂(x₀) = η₂(x₀) + D·∇η₁ = η₂ + H·H_k at λ = 1, with H = Σ a k̂ sin θ and H_k = Σ a k k̂ sin θ = −∇η₁ [M]. For one wave this is the constant ½ka², which lifts Gerstner's mean back to Stokes's; in a narrow spectrum it is ½kA², the envelope squared. The table in section 4 shows it reproduces the Eulerian statistics. The improved choppy wave model is a second-order Lagrangian expansion of this kind [Guérin et al. 2019, abstract only]; its exact form was not read. It leaves the horizontal map, and so the band's contraction bound and the query's fixed-point inversion, untouched; the query already finds x₀.

**η₂ itself.** Sharma and Dean's finite-depth kernels K± [FO00 eq. 11 to 19] are per pair and fixed for a scenario, so they are computed once at build. Per point, cos(θ_i ± θ_j) = cos θ_i cos θ_j ∓ sin θ_i sin θ_j from the values the first-order sum already has, so the pair sum is additions and multiplications only: no new transcendental, deterministic on every engine as long as the kernels come from `core`'s math. With N = 32 there are 528 unordered pairs. Cost in Node 26 on an Apple M1 Pro: 163 µs per tick for 200 points on top of the first-order sum [M]. In the vertex shader the pair sum is 528 terms per vertex beside the existing 32 `sincos` (ADR 0011).

**The factorised estimate.** In deep water the collinear sum term Σᵢⱼ ¼ a_i a_j (k_i + k_j) cos(θ_i + θ_j) equals ½ Re[(Σ a e^{iθ})(Σ k a e^{iθ})] = ½(η η_k − η̂ η̂_k), so with H standing in for the Hilbert transform it is O(N) per point: η₂ ≈ ½(η η_k − H·H_k), and z₂ ≈ ½(η η_k + H·H_k) [M]. It is exact for collinear pairs and for a single wave; for spread pairs the true kernel is smaller, so the skewness comes out about 40% high (0.205 against 0.148 on all three seas) [M]. On the GPU it needs one more linear field per cascade (η_k), since H_k = −∇η is the normal's slope; the product must be formed from the total fields (band plus every cascade), so it also carries the long-short interaction. A build-solved factor matching the spectrum's second-order skewness would remove the overshoot in the mean but not in shape; that is an option, not a source.

**Forward lean at no extra cost.** The same product has an imaginary part, ½ Im[(Σ a e^{iθ})(Σ k a e^{iθ})] = ½(η Hk∥ + H∥ η_k) along the mean direction, which for one wave is ½ka² sin 2θ. Rotating the bound harmonic by a phase β, η₂(β) = cos β · Re + sin β · Im, leans the crests forward for negative β [M]. Leykin's biphase values (0 to −60°) would only apply to the strongly forced short waves (section 4).

**Third order.** The improved choppy wave model adds a modified (amplitude-dependent) dispersion relation to keep Lagrangian phases right over time [Guérin et al. 2019, abstract]; for the band's slopes (k_p σ ≈ 0.053) the Stokes frequency correction ½(ka)² is a fraction of a percent and was not evaluated further.

## 6. Reference seas

### Ours

| Sea | X̃ | Wave age c_p/U | Hs | Tp | Lp | Hs/Lp | Band k_p σ |
| --- | -- | -------------- | -- | -- | -- | ----- | ---------- |
| Light, 8 m/s, 50 km, 40 m | 7 660 | 0.87 | 1.12 m | 4.46 s | 31 m | 0.036 | 0.054 |
| Moderate, 12 m/s, 150 km, 60 m | 10 200 | 0.96 | 2.96 m | 7.36 s | 84 m | 0.035 | 0.053 |
| Storm, 20 m/s, 300 km, 80 m | 7 350 | 0.85 | 6.67 m | 11.0 s | 187 m | 0.036 | 0.053 |

All three sit near the top of the fetch-limited range at the same wave age and steepness, so in dimensionless terms they are one sea. Their choppiness is unclamped (K = 0.52 to 0.54 against the 0.8 bound) [M]. The light sea is a typical Gulf of Finland day in Hs and Tp; the moderate sea is a 95th to 99th percentile Baltic sea; the storm sea is close to the Baltic records but grown over a longer, older fetch than Aapeli (section 1).

### Proposed, each tied to a measured case [M]

| Sea | Wind, fetch, depth, γ | X̃ | Wave age | Hs | Tp | Lp | Hs/Lp | Measured case |
| --- | --------------------- | -- | -------- | -- | -- | -- | ----- | ------------- |
| Helsinki archipelago, onshore breeze | 8 m/s, 15 km, 22 m, γ 1 | 2 300 | 0.58 | 0.47 m | 3.0 s | 14 m | 0.033 | Suomenlinna P80 Hm0 0.50 m, mean f_p 0.29 Hz (3.4 s), P80 wind 8.7 m/s at 17.5 m [BJ19 Table 1]. γ 1 is the closest the contract allows to the flat transition-zone spectrum (κ² 0.08 to 0.15); it is still single-peaked. With γ 3.3 the same sea is 0.58 m |
| Open Gulf of Finland, fresh breeze | 12 m/s, 80 km, 60 m, γ 3.3 | 5 450 | 0.78 | 2.10 m | 6.0 s | 56 m | 0.038 | Helsinki buoy 95th percentile Hs 2.01 m (Tp 7.5 s, not joint) [BJ18 Table 2]; GoF buoy depth 62 m [BJ19 Table 1]. The 80 km stands for the slanting fetch along the axis; the measured Tp is longer than JONSWAP's here, consistent with longer along-axis fetch and Baltic Proper waves [PE10] |
| Bothnian Sea storm Aapeli | 27 m/s, 194 km, 120 m, γ 3.3 | 2 610 | 0.61 | 7.07 m | 10.5 s | 174 m | 0.041 | 8.1 m measured (7.0 m low-pass), Tp 12 s, 16° spread at the peak, fetch 194 km averaged over 30°, 120 m buoy depth [BJ20 §2, App. A2] |

Kahma and Calkoen's composite law gives 0.61 m and 3.0 s, 2.03 m and 5.7 s, and 7.39 m and 10.6 s for the same three [M]. The proposed seas are younger (wave age 0.58 to 0.78) and slightly steeper (0.033 to 0.041), and above all their waves are 14 to 56 m long where today's light and moderate seas are 31 and 84 m; at a 10 m hull and a cockpit camera that is the difference between riding a swell and being in a chop. The Rafael storm (8.2 m, 12.7 s, λp/Hs = 27 at 100 m) would serve as well as Aapeli for the storm, but its paper gives no wind and fetch to drive a scenario [BJ17].

None of these seas is crossed or slanting-fetch steered, because one wave system per scenario cannot be (section 2 and the decision table).

## Reproducing the computations

The scripts were written for this note and are not committed. Their method:

- **Bulk parameters.** The build's spectrum re-implemented in plain JavaScript: JONSWAP with the fetch laws and Pierson-Moskowitz cap of `build.ts`, TMA's piecewise Φ, trapezoid integration of S Φ to 20 ω_p for m₀ and to ω(k_s) for the band, Newton iteration of the finite-depth dispersion relation. Lp = 2π/k_p at the scenario depth; wave age = (ω_p/k_p)/U. The K&C rows use the coefficients of section 2 with U at 10 m.
- **Band statistics.** 8 strips × 4 sectors placed as `buildSea` places them (equal-variance strips, seeded quantile inside each cell, Donelan-Banner with the 1.24 floor and Banner on k/k_p, closed-form sech² quantile), fixed amplitudes √(2 m₀,band/N), an LCG for draws. Ten seeds, four times 37.3 s apart, a 48² grid over 7.3 Lp. Choppy heights by 40 fixed-point iterations of x₀ = x − D(x₀). Second order by Forristall's eq. 11 to 19 summed over all ordered pairs, with D⁻ set to 0 on the diagonal (where the deep-water K⁻ is then 0). Skewness, kurtosis and the 0.1% and 99.9% quantiles of the Eulerian heights, relative to the sample mean.
- **Spreading.** Direct quadrature of sech²(βθ) and cos²ˢ(θ/2) over [−π, π] for ⟨cos²⟩, ⟨sin²⟩ and ⟨cos⟩.
- **Cost.** 200 points, N = 32, 2000 repetitions; the timed loop is the upper-triangle sum `e2 += Kp[ij] * (cc - ss) + Km[ij] * (cc + ss)` with `cc = cos_i cos_j` and `ss = sin_i sin_j`, minus the same run without it.
