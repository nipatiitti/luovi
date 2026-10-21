# Real-time ocean wave synthesis and rendering survey

Research for issue #18, 2026-10-21. Question: what the supplied ocean synthesis and rendering papers, and the primary sources behind them, add to the ocean chapter (`docs/intention/01-ocean.md`) and to the open decisions on the map. Those decisions are the ocean and environment query contract (#8: a CPU low-wavenumber band plus a GPU FFT tail, per the spectrum research on `research/spectrum-cpu-subset`), the `render-ocean` mesh LOD and cascade count, foam and whitecaps, and spatially varying sea state. The survey must also confirm or refute two findings of the spectrum research: the 8x normalisation error in both reference implementations, and the equal-energy CPU band.

## Recommendation

| #   | Question | Verdict |
| --- | -------- | ------- |
| 1   | The 8x normalisation error | **Confirmed and fully explained.** The error is two separate traps that multiply. Fréchot's Section 4 swaps fixed amplitudes for Rayleigh ones using unit normals, on an amplitude that already carries the factor 2, which doubles the variance. Tessendorf's Hermitian packing then counts every bin twice, which quadruples it. Both reference shaders write exactly $(\xi_r,\xi_i)\sqrt{2F\Delta k^2}$, and that is 2 x 4 = 8. A Parseval check over a 128² JONSWAP lattice gives 8.18 times $m_0$ for the reference formula, 2.04 for the Section 4 trap alone, 4.09 for the conjugate trap alone and 1.02 for the corrected $\tfrac12(\xi_r+i\xi_i)\sqrt{F\Delta k^2}$ (section 1). The rest of Fréchot's chain is correct. |
| 2   | The equal-energy CPU band | **Confirmed, with one precedent and one caveat.** Fréchot already samples the spectrum adaptively into cells of roughly equal energy ("a quadtree of 4 + 6n samples") and warns that a second, short-wave domain must abut the first with no hole. That is the $k_s$ seam. The caveat is statistical: Fréchot, after Tucker et al. 1984, recommends random (Rayleigh) amplitudes, whereas the band uses fixed amplitudes so that every seed has exactly the spectrum's variance. Fixed amplitudes remain right for luovi because the benchmark needs a deterministic $H_s$, but #8 should record it as a choice (section 1.4). |
| 3   | Fournier et al. 2026, Dynamic Wave Trains | **Beside the FFT, never below $k_s$, and not in v1.** Each train is a trochoidal profile driven by a tiled-and-blended Gaussian noise exemplar. Its spectrum is broad and spiky, hand-fitted to JONSWAP, its tiles must span about 2λ so long waves are out of reach, and its shoaling and refraction are pointwise, not phase-consistent. At 2560 x 1440 five trains cost 2.42 ms on an RTX 3060. The one use worth planning is a single short wind-ripple train (λ about 0.3 m) whose mask follows the authoritative wind field, which shows gusts and wind shadows on the water. It needs the gridded wind field, so it waits for build step 5 (section 2). |
| 4   | Whitecaps and foam | **Chapter confirmed; add a far-field coverage term and fix the albedo citation.** Atlas and Sea of Thieves both inject foam where the Jacobian crosses a threshold and blur or fade it in a feedback buffer, which is the chapter's advected, decaying buffer. Dupuy and Bruneton add an analytic, mipmappable coverage $W=\tfrac12+\tfrac12\operatorname{erf}((\epsilon-\mu)/(\sqrt2\sigma))$ for distances the buffer does not reach. Their foam albedo of 0.4 is attributed to Koepke 1984, but Koepke's measured effective whitecap reflectance is 0.22 with ±50% error bars (section 3). |
| 5   | Cascade count, sizes and LOD | **Three FFT cascades of 256² above $k_s$, four as the ceiling, on a CDLOD-morphed clipmap mesh.** Every production or open source cascade layout found uses three or four bands (Atlas 4, Dupuy and Bruneton 4, Arc Blanc 3, FFT-Ocean 3, Unity HDRP 3). Three 256² cascades cost 0.38 ms for heights on an RTX 2070 Super (Arc Blanc), and Atlas's four bands 0.5 ms on an RTX 2080. For the mesh, CDLOD's per-vertex morph over the last 15 to 30% of each range on world-snapped rings (the "CDClipmap" of Crest) beats the projected and concentric grids in every folder paper, which swim, pop or stitch (section 4). |
| 6   | The older GPU papers (Zhang 2010, Ren 2008, Wang 2012, Chiu 2006, Peng 2011, Luo 2010) | **Superseded; nothing to carry except two negative lessons.** Distance fades of displacement (Ren 2008, and Atlas's "bands start fading away at ~30 world space periods") must never touch the CPU band, and pointwise depth-dependent wavenumbers (Luo 2010, Fournier) break phase continuity (section 5). |

## What #8 must now decide

| Decision | Options | Recommendation |
| -------- | ------- | -------------- |
| Spectrum amplitude convention | (a) copy a reference; (b) state the chain once in `core` with the corrected constant | **(b)**: $\tilde h_0=\tfrac12(\xi_r+i\xi_i)\sqrt{F(\mathbf k)\Delta k_x\Delta k_y}$ with unit normals for the lattice tail; $A_i=\sqrt{2m_{0,b}/N}$ for band components (section 1). |
| Band amplitudes | (a) fixed equal energy (spectrum research); (b) Rayleigh per Tucker et al. 1984 and Fréchot | **(a)**, recorded as deliberate. (b) scatters the band variance by about $1/\sqrt N$, 18% at N = 32, per seed. |
| Directional spreading | (a) Hasselmann 1980 as GOW and FFT-Ocean implement it; (b) Mitsuyasu 1975 $\cos^{2s}(\theta/2)$; (c) Donelan-Banner $\operatorname{sech}^2(\beta\theta)$ | **(c) for the CPU band.** Its normaliser $\beta/(2\tanh\beta\pi)$ is exact and its cumulative $\tfrac12+\tanh(\beta\theta)/(2\tanh\beta\pi)$ inverts in closed form, which is what the equal-energy direction sectors need. (b) is the fetch-dependent alternative. (a) as coded is discontinuous at the peak, and both references normalise it with fitted approximations (section 1.5). |
| Fetch-limited JONSWAP | fetch laws only, or capped | Fetch laws from Hasselmann 1973 as Fréchot writes them, **capped at the Pierson-Moskowitz limit** $\omega_pU_{10}/g\ge0.855$, which the fetch law reaches at $gx/U_{10}^2\approx1.9\times10^4$ (276 km at 12 m/s), where its α is 0.0087 against PM's 0.0081 (section 1.5). |
| Cut wavenumber and N | as the spectrum research | $k_s=3k_p$ default and N = 32, ceiling 48. Nothing in the folder argues otherwise; Fréchot's "no hole between domains" means $k_s$ must be one number shared by band and tail. |
| Who generates the FFT tail's $\tilde h_0$ | GPU hash RNG, or CPU with `core`'s RNG, uploaded | **CPU, once per sea state, uploaded.** It is not authoritative, but only then can `tool-validate` check the tail's energy and the residual budget headless in Node (determinism flag 1). |
| Spatially varying sea state on the CPU band | (a) one homogeneous band per scenario; (b) a cited amplitude envelope from an authoritative attenuation map; (c) depth-dependent wavenumber | **(a) in v1, (b) allowed later, (c) never pointwise** (determinism flag 5). |
| Environment exposure for visuals | point query only; or a gridded field snapshot as well | **Add a gridded snapshot** of the authoritative wind field (and later depth with its gradient) that the renderer reads through `sim-world`. The batched point query serves the simulation. Dynamic Wave Trains, wind streaks and the far-field spectrum modulation all need fields, not points (section 2.4). |

## Sources read

Supplied papers, outside the repo, copyrighted, read in full:

- **[FO26]** R. Fournier, A. Laurain, P. Kraemer, G. Gilet, B. Sauvage, _Dynamic Wave Trains: A Procedural Approach to Spatially Varying Ocean Synthesis_, Computer Graphics Forum 2026, e70495, [doi:10.1111/cgf.70495](https://doi.org/10.1111/cgf.70495). Open access, CC BY-NC.
- **[FR]** J. Fréchot, _Realistic simulation of ocean surface using wave spectra_, GRAPP 2006, Setúbal, pp. 76 to 83 (as cited by [REN08] and [WANG12]); an extended version appeared in the Journal of Virtual Reality and Broadcasting 4(11), 2007 (as cited by [VGS15]). The supplied PDF is the 8-page conference form.
- **[DB12]** J. Dupuy, E. Bruneton, _Real-time Animation and Rendering of Ocean Whitecaps_, SIGGRAPH Asia 2012 Technical Briefs, [PDF](https://liris.cnrs.fr/Documents/Liris-5812.pdf), code at [jdupuy/whitecaps](https://github.com/jdupuy/whitecaps).
- **[CC06]** Y.-F. Chiu, C.-F. Chang, _GPU-based Ocean Rendering_, ICME 2006, pp. 2125 to 2128.
- **[ZH10]** W. Zhang, H. Zhou, L. Tang, X. Zhou, _Realistic Real-Time Rendering for Ocean Waves on GPU_, IEEE 2010 (ISBN 978-1-4244-6789-1), pp. 743 to 747.
- **[PENG11]** M. Peng et al., _The parallel waves simulation based on GPU_, ISIE 2011, pp. 160 to 163, doi:10.1109/ISIE.2011.34 as printed.
- **[REN08]** 任鸿翔, 尹勇, 金一丞 (Ren, Yin, Jin), _大规模海浪场景的真实感绘制_ (Realistic rendering of large-scale ocean wave scene), J. Computer-Aided Design and Computer Graphics 20(12), 1617 to 1622, 2008. Chinese with English abstract.
- **[WANG12]** 王纲, 季振洲, 张泽旭 (Wang, Ji, Zhang), _大范围动态海浪实时渲染_ (Real-time rendering of large scale dynamic ocean waves), J. Harbin Institute of Technology 44(3), 59 to 63, 2012. Chinese; read from the page images.
- **[LUO10]** M. Luo, G. Gong, A. El Kamel, _GPU-Based Real-Time Virtual Reality Modeling and Simulation of Seashore_, ISDA 2010, pp. 1036 to 1041. The `.html` file of the same title is an IEEE Xplore PDF wrapper with no article text.
- **[VGS15]** J. M. Varela, C. Guedes Soares, _Interactive 3D desktop ship simulator for testing and training offloading manoeuvres_, Applied Ocean Research 51, 367 to 380, 2015.
- **[AQV26]** J. Bai, D. Zhu, M. Chen, _Aqua-Verse: Augmented Quasi-Physical Aquatic Universe for Realistic Underwater Robot Simulation_, IEEE Internet of Things Journal 13(16), 2026, doi:10.1109/JIOT.2026.3698460 as printed.
- _Ship and Ocean Visual Simulation System Based on High Definition Render Pipeline_ (`.html`): an IEEE Xplore PDF wrapper with no article text, and a title search found no listing. Not read; nothing below depends on it.

Primary sources outside the folder:

- **[T]** J. Tessendorf, _Simulating Ocean Water_, SIGGRAPH course notes 1999 to 2004, [PDF](https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2004.pdf), eq. 42 and 43, as already read by the spectrum research.
- **[J73]** K. Hasselmann et al., JONSWAP, Dt. Hydrogr. Z. A8(12), 1973, [scan](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/10/Jonswap-Hasselmann1973.pdf), eq. 2.4.1 to 2.4.5, via the spectrum research.
- **[GOW]** GodotOceanWaves at commit `a171446f`: [`spectrum_compute.glsl`](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl), [`spectrum_modulate.glsl`](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_modulate.glsl), [`water.gd`](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/water.gd).
- **[FFTO]** gasgiant/FFT-Ocean at commit `ac3ea954`: [`InitialSpectrum.compute`](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/ComputeShaders/InitialSpectrum.compute), [`TimeDependentSpectrum.compute`](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/ComputeShaders/TimeDependentSpectrum.compute), [`WavesGenerator.cs`](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/Scripts/WavesGenerator.cs).
- **[ATL19]** M. Mihelich, T. Tcheblokov, _Wakes, Explosions and Lighting: Interactive Water Simulation in "Atlas"_, GDC 2019, [slides](https://gpuopen.com/gdc-presentations/2019/gdc-2019-agtd6-interactive-water-simulation-in-atlas.pdf).
- **[SOT18]** N. Ang et al., _The Technical Art of Sea of Thieves_, SIGGRAPH 2018 Talks, [PDF](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf). No cascade numbers are given.
- **[CDLOD]** F. Strugar, _Continuous Distance-Dependent Level of Detail for Rendering Heightmaps_, J. Graphics, GPU and Game Tools, [doi:10.1080/2151237X.2009.10129287](https://doi.org/10.1080/2151237X.2009.10129287); paper and code at [fstrugar/CDLOD](https://github.com/fstrugar/CDLOD).
- **[CREST]** Crest ocean system, technical documentation, [v4.9](https://crest.readthedocs.io/en/4.9/user/technical-information.html), and [repository](https://github.com/ivdstudios/crest-oceanrender), describing the SIGGRAPH 2017 Advances talk by Bowles and Zimmermann. The talk itself was not retrieved.
- **[AB]** D. Algis, _Arc Blanc: a real time ocean simulation framework_, [arXiv:2503.03326v2](https://arxiv.org/abs/2503.03326), 2025, cascade layout and Figure 16 timings.
- **[HFW]** H. Malan, _Rendering Water in Horizon Forbidden West_, SIGGRAPH 2022 Advances, [PDF](https://advances.realtimerendering.com/s2022/SIGGRAPH2022-Advances-Water-Malan.pdf). Read for cascade or LOD numbers; the talk covers only baked breaking waves.
- **[OOWB]** Ocean Optics Web Book, [Whitecaps](https://oceanopticsbook.info/view/atmospheric-correction/level-2/whitecaps), for Koepke 1984's effective reflectance and the Stramska and Petelski 2003 coverage laws.
- **[M]** Our Parseval check of the normalisation, described under "Reproducing the check".

Identified but not read (paywalled or not found); claims about them go through the sources that quote them:

- C. J. Horvath, _Empirical Directional Wave Spectra for Computer Graphics_, DigiPro 2015, [doi:10.1145/2791261.2791267](https://doi.org/10.1145/2791261.2791267). Whether its own amplitude formula carries the factor that GOW copies could not be checked.
- P. Koepke, _Effective reflectance of oceanic whitecaps_, Applied Optics 23(11), 1816 to 1824, 1984, doi:10.1364/AO.23.001816.
- M. J. Tucker, P. G. Challenor, D. J. T. Carter, _Numerical simulation of a random sea_, Applied Ocean Research 6(2), 118 to 122, 1984 (via [FR] Section 4).
- H. Mitsuyasu et al., _Observations of the directional spectrum of ocean waves using a cloverleaf buoy_, J. Phys. Oceanogr. 5(4), 750 to 760, 1975 (via [FR] eq. 24).
- M. A. Donelan, J. Hamilton, W. H. Hui, _Directional spectra of wind-generated waves_, Phil. Trans. R. Soc. A 315, 1985, and M. L. Banner, _Equilibrium spectra of wind waves_, J. Phys. Oceanogr. 20, 1990 (via [FFTO] `DonelanBanner` and [AB]).
- N. Lutz, A. Schoentgen, G. Gilet, _Fast orientable aperiodic ocean synthesis using tiling and blending_, PACMCGIT 7(3), 2024 (via [FO26] §10.2).
- J. M. Varela, C. Guedes Soares, _Ring discretization of the wave spectrum for sea surface simulation_, IEEE CG&A 34(2), 2014, doi:10.1109/MCG.2013.102. A statistically motivated alternative discretisation; only its bibliographic record was found.
- J.-F. St-Amour, _Rendering Assassin's Creed III_, GDC 2013 ([listing](https://gdcvault.com/play/1017710/Rendering-Assassin-s-Creed)): members-only, so no cascade numbers from Ubisoft could be checked.

## 1. Fréchot and the normalisation chain

### 1.1 The chain, step by step

[FR] converts a frequency spectrum to wave amplitudes in six steps. Each is checked here against the two reference implementations the spectrum research compared ([GOW], [FFTO]).

| Step | [FR] | Correct? | [GOW] and [FFTO] |
| ---- | ---- | -------- | ---------------- |
| 1. Variance from the spectrum | $\operatorname{var}\eta=\int_0^\infty S(\omega)\,d\omega$ (eq. 12) | Yes | Same JONSWAP/TMA $S(\omega)$ |
| 2. Directional spectrum | $E(\omega,\theta)=S(\omega)D(\omega,\theta)$ with $\int_{-\pi}^{\pi}D\,d\theta=1$ (eq. 10, 11) | Yes | Same, but $D$ normalised by fitted polynomials ([FFTO] `NormalisationFactor`; [GOW] "i forgot how i derived this") |
| 3. Frequency to wavenumber | $S_\kappa(\kappa)=S_\omega(\sqrt{g\kappa})\tfrac12\sqrt{g/\kappa}$ (eq. 25) | Yes, deep water | Same with finite-depth $d\omega/dk$ |
| 4. Polar to Cartesian | $E_{\vec\kappa}=E_{\kappa,\theta}/\kappa$ (eq. 26, 27) | Yes | `spectrum * abs(dOmegadk) / kLength * deltaK * deltaK` ([FFTO] L152-L153) and `dispersion[1] / k * dk.x*dk.y` ([GOW] L105-L114) |
| 5. Cell variance | $\int_{\Delta}E\approx F\Delta k^2$ | Yes | Same |
| 6. Real cosine amplitude | $a^2=2\int_\Delta E$ (eq. 18, 19), because a cosine of amplitude $a$ has variance $a^2/2$ (eq. 14) | Yes, for a fixed-amplitude cosine | The factor 2 appears inside the square root: `sqrt(2 * spectrum ...)` |

Up to step 6 the chain is right, and both references follow it. The 8x comes after.

### 1.2 Trap A: Fréchot Section 4

Section 4 follows Tucker et al. 1984 and replaces each fixed-amplitude, random-phase term with random amplitudes: "$a\cos(\kappa x_0-\omega t+\varphi)$ becomes $r_1a\cos(\kappa x_0-\omega t)+r_2a\sin(\kappa x_0-\omega t)$, where $r_1$ and $r_2$ are random numbers from the standard normal distribution" (eq. 28). The time-averaged variance of that term is $a^2(\mathbb E r_1^2+\mathbb E r_2^2)/2=a^2$, twice the $a^2/2$ that step 6 assigned. The amplitude from eq. 19 already carries the factor 2, and unit normals put another one on top. Either $r_1,r_2\sim\mathcal N(0,\tfrac12)$ or $a^2=\int_\Delta E$ would be correct here. Tessendorf's own form has the $1/\sqrt2$ [T eq. 42].

### 1.3 Trap B: Hermitian packing

Fréchot's own FFT form takes the real part of a one-sided sum, $z=-\Re\sum A(\vec\kappa,t)e^{i\vec\kappa\cdot\vec x_0}$ (eq. 6, 7). With that form, $|A|=a$ is right. Both references instead use Tessendorf's Hermitian form, $\tilde h(\mathbf k,t)=\tilde h_0(\mathbf k)e^{i\omega t}+\tilde h_0^*(-\mathbf k)e^{-i\omega t}$ ([FFTO] `TimeDependentSpectrum.compute`, [GOW] `spectrum_modulate.glsl` L64-L68). There, bin $\mathbf k$ and its mirror $-\mathbf k$ each contribute, so a real cosine has amplitude $2|\tilde h_0|$, as the spectrum research showed. Using Fréchot's real-cosine amplitude $a$ as $|\tilde h_0|$ doubles the amplitude and quadruples the variance.

### 1.4 The product, checked numerically

Both shaders write $\tilde h_0=(\xi_r,\xi_i)\sqrt{2F\Delta k^2}$ with two unit normals: `float2(Noise[id.xy].x, Noise[id.xy].y) * sqrt(2 * spectrum * ...)` ([FFTO] L152) and `gaussian(hash(...)) * sqrt(2.0 * s * d * w_norm)` ([GOW] L114). That is step 6, plus trap A, plus trap B: $\mathbb E|\tilde h_0|^2=4F\Delta k^2$ against the correct $\tfrac12F\Delta k^2$, which is 8 times too much.

[M] evaluated the realised variance by Parseval, $\operatorname{var}\eta=\sum_{\mathbf k}|\tilde h_0(\mathbf k)+\tilde h_0^*(-\mathbf k)|^2$, over a 128² lattice of 512 m (JONSWAP at 12 m/s and 150 km, a $\cos^2$ half-plane spread, $H_s$ 3.14 m), averaged over 6 seeds:

| Formula | Realised variance / $m_0$ |
| ------- | ------------------------- |
| References: unit normals, $\sqrt{2F\Delta k^2}$ | 8.18 |
| Trap A alone: unit normals, $\sqrt{F\Delta k^2/2}$ | 2.04 |
| Trap B alone: normals of variance ½, $\sqrt{2F\Delta k^2}$ | 4.09 |
| Corrected: $\tfrac12(\xi_r+i\xi_i)\sqrt{F\Delta k^2}$ | 1.02 |

The spectrum research measured 8.2 and 1.027 on a 512² cascade, so the two checks agree. The issue comment's hypothesis, "with conjugate bins counted at full energy that is a plausible contributor", is confirmed: the conjugate count is the factor 4, and the Section 4 trap is the factor 2.

The equal-energy CPU band avoids both traps. It has no Hermitian pairing and no random amplitudes: $A_i=\sqrt{2m_{0,b}/N}$ is step 6 applied to cells of equal variance. Where #8 keeps the fixed amplitudes, Fréchot's argument for random ones (Tucker et al.) still deserves a line in the contract. Fixed amplitudes make the band's variance exact for every seed. That is what the energy benchmark needs, at the price of the realisation-to-realisation scatter of a true Gaussian sea, which a game seed does not need.

### 1.5 What else Fréchot carries into the contract

- **Equal-energy sampling precedent.** "We build a quadtree of 4 + 6n samples ... Samples have different sizes but each of them roughly corresponds to the same energy, and so the same amplitude" over a domain holding "roughly 95% of the total energy" [FR §3.3]. Fréchot also warns that when only the energetic domain is sampled, the short waves must come from "a second domain ... close to the first one, to avoid a 'hole'". In luovi the second domain is the FFT tail, and the hole is avoided only if band and tail use the same $k_s$.
- **Fetch-limited JONSWAP**, in the form the spectrum research already uses: $\alpha=0.076(U_{10}^2/(Fg))^{0.22}$, $\omega_p=22(g^2/(U_{10}F))^{1/3}$, $\gamma=3.3$ ("can vary between 1 and 7"), $\sigma=0.07/0.09$ [FR §3.2]. $22=2\pi\times3.5$ to two figures, so this is [J73] eq. 2.4.3 in angular frequency. The ω form keeps the same α, because $S(\omega)=E(f)/2\pi$ removes the $(2\pi)^{-4}$ of [J73] eq. 2.4.1 exactly.
- **Pierson-Moskowitz limit.** [FR] gives $\omega_p=0.855g/U_{10}$ for a fully developed sea. The fetch law crosses that value at $\tilde x=gx/U_{10}^2\approx1.9\times10^4$, where its α is 0.0087 against PM's 0.0081 [M]. That is 122 km at 8 m/s, 276 km at 12 m/s and 766 km at 20 m/s. Beyond it the fetch law would make the peak longer than a fully developed sea allows, so the contract should cap $\omega_p$ there. Baltic fetches are mostly below the cap, but a scenario must not be able to exceed it.
- **Mitsuyasu spreading.** $D=N(s)\cos^{2s}((\theta_w-\theta)/2)$ with the exact normaliser $N(s)=\Gamma(s+1)/(2\sqrt\pi\,\Gamma(s+\tfrac12))$, and $s(\omega)=11.5(g/(\omega_pU_{10}))^{2.5}(\omega/\omega_p)^{\mu}$ with $\mu=5$ below the peak and $-2.5$ above [FR eq. 24]. It is continuous at the peak and depends on the wave age $\omega_pU_{10}/g$, so it carries fetch. [FR] calls eq. 24 "the dispersion relation", a slip: it is the spreading function.
- **The references' spreading is a hybrid.** [FFTO] `SpreadPower` uses Hasselmann's coefficients 6.97 and 9.77 with Mitsuyasu's exponents 5 and −2.5. [GOW] uses Hasselmann's exponents (4.06 below, $-2.33-1.45(U\omega_p/g-1.17)$ above). In both, $s$ jumps from 6.97 to 9.77 at the peak.
- **Donelan-Banner** ([FFTO] `DonelanBanner`; [AB]): $D=\beta/(2\tanh\beta\pi)\operatorname{sech}^2(\beta\theta)$ with $\beta=2.61(\omega/\omega_p)^{1.3}$ below $0.95\omega_p$, $2.28(\omega/\omega_p)^{-1.3}$ up to $1.6\omega_p$, and $10^{-0.4+0.8393\exp(-0.567\ln((\omega/\omega_p)^2))}$ above. It is continuous at both joins (2.441/2.437 and 1.238/1.237 [M]). Its normaliser is exact on $[-\pi,\pi]$, and its cumulative inverts in closed form, $\theta=\operatorname{atanh}((2u-1)\tanh\beta\pi)/\beta$. FDLIBM 5.3, which `core` is porting (#3), includes `atanh`. That makes it the cheapest exact choice for the band's equal-energy direction sectors. $\cos^{2s}$ needs a numerical incomplete Beta inverse there.

## 2. Fournier et al. 2026, Dynamic Wave Trains

### 2.1 What it is

The ocean is a sum of mono-frequency wave trains, $O=\sum_\lambda O_\lambda$ [FO26 eq. 4]. Each train is $O_\lambda=\frac{1}{2\pi F(u)}H\circ G_\lambda(u,t)$, where $H$ is a precomputed map of trochoidal profiles from flat to choppy, and $G_\lambda$ is a complex Gaussian field synthesised by Heitz and Neyret tiling and blending from a small exemplar texture [FO26 eq. 5, 8]. The phase of $G$ selects the position on the trochoid and its norm the choppiness, softened by $\delta\leftarrow\tanh\lVert G\rVert$ to mimic breaking [FO26 eq. 7, 9]. Four control fields steer each train, all evaluated at tile centres: frequency $F$, orientation $\Theta$, profile $\Delta$ and velocity $V$ [FO26 §5, eq. 10 to 13]. Amplitude is not set directly; it follows from $A=\Delta/(F\pi)$ [FO26 eq. 6].

| Property | Value in [FO26] |
| -------- | ---------------- |
| Trains needed | "In most cases, five wave trains are sufficient"; tested up to eight; Tahiti scene uses eight, λ 0.8 to 200 m (§10.1, Fig. 14) |
| Cost per train | "about 0.2 ms per wave train"; 1.2 ms for five and 2.1 ms for eight at 1920 x 1080, RTX 3060, OpenGL 3 (§10.1) |
| Cost by resolution, five trains | 0.8 ms at 1280 x 720, 1.15 ms at 1920 x 1080, **2.42 ms at 2560 x 1440**, 5.72 ms at 3840 x 2160 (Table 1). The running text calls 1.15 ms "HD" and 2.42 ms "full HD", which contradicts the table and Fig. 16; the table is taken as right |
| Where the cost lies | Fragment shader (normals and BRDF); vertex displacement "negligible" (§10.1) |
| Extra costs | Software bilinear filtering to avoid moiré, about 0.5 ms for eight trains at 1080p (App. C); foam and spray "less than a 10% drop of the framerate" |
| Tile size | "one tile spans 2λ" (App. C) |
| Deep-water fields | $F=1/\lambda$, $V=\sqrt{\lambda g/2\pi}$ (eq. 14, 15) |
| Shallow-water fields | $V=\sqrt{\frac{\lambda g}{2\pi}\tanh\frac{2\pi p}{\lambda}}$; $F\propto V_{deep}/V$; Snell refraction across depth isolines, pointwise; Green's law shoaling $\Delta\propto(\lambda/2p)^{1/4}$ (eq. 16 to 19) |
| Wind ripples | A train with λ = 0.3 m, orientation from the wind direction, profile used "as a mask ... proportional to the local wind intensity for wind ripples, and vanishing in wind shadows", "at no computational overhead" (§6) |
| Spectrum fidelity | Five trains "adjusted by hand" to a 25 m/s, 50 km JONSWAP; the result "exhibits spikes", and "accurate spectral control is difficult" (§10.3, Fig. 18) |

### 2.2 Does it change a design doc claim or a map decision?

Not the core. The chapter's background sea is "Tessendorf FFT, JONSWAP/TMA + directional spreading, 3–4 cascades", and the map decision makes the CPU own the band below $k_s$. [FO26] cannot replace either part:

- **Not below $k_s$.** The trains have no spectrum that the energy benchmark could pin. A single train already spreads over many frequencies through the noise and the trochoid's harmonics [FO26 §10.3]. "One tile spans 2λ" and the authors call "very long and continuous waves" difficult [FO26 §11]. Refraction is "a pointwise approximation ... not equal to the result of a numerical integration along a wave trajectory" [FO26 §7]. And the surface is built from texture fetches whose hardware bilinear filtering caused visible precision artefacts [FO26 App. C], which a CPU mirror could not reproduce.
- **Not instead of the FFT tail.** The tail must carry a known residual so the residual benchmark can predict it (spectrum research §5). Hand-fitted trains cannot. The tail is also cheap: three 256² cascades cost 0.38 ms [AB].
- **Beside the top cascade, as an additive visual layer.** A short train whose $\Theta$ and $\Delta$ follow the wind field does what a stationary FFT cascade cannot: crests that turn with a gust and vanish in a wind shadow. That is the chapter's own intent in its wind section: "The same field drives the local wave spectrum (fetch-limited sea in a lee) and the sails."

Two chapter claims are touched indirectly. The chapter says the far field gets "shorter steeper waves over shallows" from spectrum modulation; [FO26 §7] shows how to do that above the cut, but it needs a smooth depth map with no local extrema: "the gradient ∇p must be continuous, not vanish and have no singularities" [FO26 §7]. A procedural archipelago is the opposite, so for luovi coastal behaviour stays with the dispersive patch near the player. And [FO26]'s phase-coherent foam (foam behind the crest, spray in front, eq. 24, 25) is an alternative to the Jacobian buffer only for train-based oceans; it does not apply to FFT cascades.

### 2.3 What carries forward

| Item | Where | When |
| ---- | ----- | ---- |
| One wind-ripple train, λ about 0.3 m, $\Theta$ from the authoritative wind direction, $\Delta$ from local wind speed and zero in shadow, summed on top of the FFT cascades | `render-ocean` | Build step 5 (wind field), not v1, since until then wind is uniform per the map |
| Its amplitude derived from the spectrum: $\Delta$ chosen so the train's variance equals the JONSWAP variance in its band at the local $U_{10}$, so no free coefficient is added | `render-ocean`, constants in `data-*` | With the train |
| A budget line: one train at 1440p is about 0.4 to 0.5 ms on an RTX 3060 (2.42 ms for five, Table 1); RTX 4060 class is similar or faster, not measured here | `render-ocean` budget | Before adopting |
| Reflection, diffraction and refraction trains for harbours | Out; the dispersive patch (build step 7) does these near the player | Revisit with the patch |

### 2.4 What the environment would need to expose if trains are adopted

[FO26] needs fields, not point samples: $\Theta$ and $\Delta$ vary per tile and are smooth. The renderer would need:

- the authoritative wind field as a grid at the solver's resolution (the chapter's 25 to 50 m cells), giving direction for $\Theta$ and speed, gust and shelter for $\Delta$;
- later, depth $p$ and $\nabla p$ as a C¹ grid, for shoaling and refraction trains;
- later, obstacle normals or a signed distance field (the paper bakes 64 x 64 maps for its coast comparison, §10.2), for reflection.

None of these feed back. They cross the seam the same way ship state does: produced by `sim-world`, read by the renderer. They are a gridded snapshot, distinct from the batched point query.

## 3. Dupuy and Bruneton 2012, whitecaps

### 3.1 What it contributes

- **Wave model.** "A number n of patterns, each sampling a different part of the wave spectrum ... (in practice, n = 4 is enough to avoid artifacts)" [DB12 §2]. Each pattern has its own choppiness $\lambda_i$.
- **Breaking criterion.** Whitecaps where the Jacobian of the horizontal map drops below a threshold, $b=\Upsilon(\epsilon-j)$, with $j$ the determinant of $I+\sum_i\lambda_i\nabla\mathbf D_i$ [DB12 eq. 3, 4].
- **Filtered coverage.** Assuming $j$ is normally distributed over a pixel footprint (after Ross et al. 2005 for slopes), the coverage is $W=\tfrac12+\tfrac12\operatorname{erf}\big((\epsilon-\mu_A)/(\sqrt2\sigma_A)\big)$ [DB12 eq. 6]. $\mu_A$ and $\sigma_A^2$ come from per-pattern terms $k_i=\tfrac1n+a_i+b_i+a_ib_i-c_i^2$ and $k_i^2$ stored in mipmapped textures, with cross-pattern products dropped as uncorrelated [DB12 eq. 7, 8]. The hardware's mipmapping then filters the coverage at any distance.
- **Radiance.** $R\simeq WR_F+R_C+R_W$, with foam "a smooth Lambertian surface with a reflectance of 0.4, a reasonable approximation in the visible spectrum range [Koepke 1984]" (taken from Premože and Ashikhmin 2001) [DB12 §2].
- **Cost.** Eight RGBA textures, "up to 5.33 MB (accounting for the whole mip pyramid) of memory at half floating point precision"; whole frames under 10 ms at 1280 x 720 on a GTX 560 Ti [DB12 §4, Fig. 2].
- **Stated gap.** No decay: whitecaps "can last up to several seconds" [DB12 §5].

### 3.2 Against the chapter

The chapter says: "Jacobian of displacement marks folding; advected, decaying foam buffer shared with wakes". Production practice confirms it. Atlas: "Calculate Jacobian of displacements per frequency band; If above threshold ... inject some amount of 'turbulent energy'; Dissipate it over time (blur + fade)" [ATL19]. Sea of Thieves: foam "generated at wave peaks using the method described in [Tessendorf]", with a buffer progressively blurred "with feedback to simulate the foam dispersing" [SOT18 §1.1].

[DB12] adds what the buffer cannot do: the buffer is world-space and camera-centred, so it ends at some radius, and beyond it the 2 to 3 km view needs a coverage that filters correctly. The recommendation is the advected buffer near the camera and [DB12]'s $W$ beyond it, blended.

One point is luovi-specific. The band is drawn analytically, so its displacement gradient must enter $j$ like a fifth pattern. The band alone never folds when its contraction constant $K<0.8$ (spectrum research §4), but it compresses the short waves riding on swell crests, which is where whitecaps should cluster. Its terms $a,b,c$ are closed-form sums over the N components. Its slope covariance is a constant per sea state, $\sum_i\tfrac12A_i^2k_i^2\hat{\mathbf k}_i\hat{\mathbf k}_i^{\mathsf T}$, so the band also adds an exact term to the far-field roughness without any texture.

### 3.3 What the data file needs

| Constant | Value and source | Note |
| -------- | ---------------- | ---- |
| Foam reflectance | **0.22, ±50%**, Koepke 1984 effective whitecap reflectance, wavelength-independent in the visible, falling to 0.645 of that at 865 nm [OOWB] | [DB12] cites Koepke for 0.4, but Koepke's figure is 0.22. The effective value averages over the whitecap's life, as foam ages and thins. If the foam buffer models decay itself, the per-texel value should be the fresh-foam reflectance instead, which is not established here (open question) |
| Whitecap coverage against wind | $F_{wc}=5.0\times10^{-5}(U_{10}-4.47)^3$ developed, $8.75\times10^{-5}(U_{10}-6.33)^3$ undeveloped, Stramska and Petelski 2003 [OOWB] | 2.1% and 1.6% at 12 m/s [M]. [OOWB] applies it only for $6.33\le U_{10}\le12$ m/s. Use it to calibrate the threshold $\epsilon$ (below) instead of hand-tuning |
| Foam decay time | Several seconds [DB12 citing Koepke 1984] | Needs a primary citation before it becomes a number |
| Fresnel at normal incidence | $((n-1)/(n+1))^2=0.0204$ for $n=1.333$ | [ZH10] uses 0.02037; [LUO10] prints 0.2037, ten times too large. Derived from a refractive index, so the index needs the citation |

Calibrating $\epsilon$: with $\mu$ and $\sigma$ of $j$ computable from the spectrum at sea-state build, $\epsilon$ follows in closed form from the cited coverage at the scenario's $U_{10}$, by inverting [DB12 eq. 6] at the spatial mean. This is a proposal derived here, not something [DB12] does. It replaces an artist constant with a cited law, in the spirit of the "no magic coefficients" rule.

## 4. Cascades, sizes and LOD: GPU papers and production talks

### 4.1 Cascade layouts found

| Source | Bands | Resolution and tile sizes | Cost | Notes |
| ------ | ----- | ------------------------- | ---- | ----- |
| [ATL19] Atlas, GDC 2019 | 4 | "Use small FFTs; split spectrum to 4 frequency bands based on wave lengths" | Wind waves 0.5 ms on RTX 2080 and on Radeon VII (max quality) | Dual fetch-limited JONSWAP; LEADR-style slope moments per band; "bands start fading away at ~30 world space periods from camera"; iterative height lookup for buoyancy |
| [DB12] | 4 | Not stated | Whole frame < 10 ms, 720p, GTX 560 Ti | "n = 4 is enough to avoid artifacts" |
| [AB] Arc Blanc, 2025 | 3 | 256² at L = 256, 16, 4 m; bands $[0,12\pi/16]$, $[12\pi/16,12\pi/4]$, $[12\pi/4,\infty)$ | Heights 0.376 ms, with velocities 1.551 ms, RTX 2070 Super | Cut "to avoid overlap" |
| [FFTO] FFT-Ocean | 3 | 256² at L = 250, 17, 5 m; boundaries $6\cdot2\pi/L_{c+1}$ | Not given | `WavesGenerator.cs` L13-L24, L56-L60 |
| Unity HDRP water | 3 | "swell, agitation, ripples" | Not given | From Unity's blog via search results; not read first-hand |
| [GOW] | Configurable | Default map size 1024² | Not given | Overlapping cascades, a known defect (spectrum research) |
| [VGS15] | Several | "a set of Simulation Grids with different levels of detail. Each Simulation Grid simulates a range of frequencies"; 64² to 256² grids | Best case about 460 fps on its 2015 test machine; one ship drops it by about 80% because each ship adds six FFTs | Projected grid; ship motions from RAOs on the same components |
| [REN08] | 1 | 256² Phillips FFT, heights faded to zero beyond a distance to hide tiling | 8.3 fps at 2 km on a GeForce 7900 GTX | Superseded |

**Recommendation for luovi.** The CPU band takes everything longer than $\lambda_s=\lambda_p/3$ (11, 30 and 66 m in the light, moderate and storm seas of the spectrum research). The FFT tail needs to cover roughly three decades, from $\lambda_s$ down to a few centimetres. Three 256² cascades with a tile ratio of about 8 to 16 do that, which matches [AB] and [FFTO]; four is the quality ceiling, matching [ATL19] and [DB12]. Partition $k$ into annuli as [FFTO] and [AB] do, with cascade 0's inner edge at $k_s$ exactly. Cascade 0's tile should be about $6\lambda_s$ so the energetic waves just above the cut do not visibly repeat, after the [FFTO] boundary rule. Because $\lambda_s$ follows the sea state, that tile size is a render setting derived from $k_s$, not a constant. Expected cost is about 0.4 to 0.5 ms for the tail on RTX 4060 class hardware, scaled from [AB] and [ATL19], plus a negligible analytic band (32 terms per texel or vertex).

### 4.2 Mesh LOD

| Scheme | Used by | Problem |
| ------ | ------- | ------- |
| Projected grid | [CC06], [DB12], [VGS15], Johanson 2004 | Vertices slide over the surface as the camera moves, so a choppy, displaced surface shimmers unless filtered heavily; [DB12] and [FO26] spend their filtering effort on exactly this |
| Concentric or radial grid around the camera | [REN08], [WANG12], Kryachko 2005 | Rotates and translates with the camera, so it swims unless snapped; [WANG12] adds a two-level fine grid near the eye with T-junction fixes |
| Quadtree with skirts | [ZH10] | Pops at level changes; "skirts" hide cracks |
| CDLOD | [CDLOD] | Quadtree of one fixed grid mesh (16² to 128²), ranges doubling per level, per-vertex morph "usually covers the last 15%-30% of every LOD range"; no stitching; LOD by true 3D distance |
| CDClipmap | [CREST] | "combines the simplicity of Clipmaps with the Continuous Detail of CDLOD"; rings of 2x scale, square isolines from the infinity norm, verts snapped "to grid positions to make them stable", data in camera-centred textures, 256² per LOD in the example |

For an infinite ocean the quadtree's main benefit, culling by terrain bounding boxes, is weak, while the clipmap's camera-centred textures are where the analytic band and the foam buffer want to live anyway. Recommendation: **CDClipmap**, nested rings at 2x spacing snapped to their own world grid, with CDLOD's continuous per-vertex morph over the outer 15 to 30% of each ring. The chapter's "CDLOD or clipmap mesh" becomes "a clipmap with CDLOD morphing".

### 4.3 Distance filtering

The chapter has "Bruneton distance-filtered roughness". [ATL19] gives the concrete pipeline: per band, store displacement and the first and second slope moments and the covariance, mip them, and combine bands with the cross terms $E[x^2]=E_1[x^2]+E_2[x^2]+2E_1[x]E_2[x]$; fix bilinear magnification by lerping the variance toward zero at fine mips; Beckmann NDF with Walter's Smith approximation. [FO26 §8.3] does the same with a covariance lookup per footprint size (Deliot and Heitz 2019). The band's slope covariance is exact and constant (section 3.2), so it is added as a constant.

## 5. The remaining folder papers

| Paper | Contribution | Changes a claim? | Carry |
| ----- | ------------ | ---------------- | ----- |
| [ZH10] Zhang et al. 2010 | 250 baked looping height maps on a quadtree LOD with skirts; Schlick Fresnel with $R_0=0.02037$; a distance fade of Fresnel to stop far flicker | No; superseded by CDLOD or clipmap on every point, as the issue comment said | Nothing. Baked loops cannot share a seed with the CPU band |
| [REN08] Ren et al. 2008 | Concentric-circle grid with quadratic radii; 256² Phillips FFT; height faded to zero with distance "to reduce the tiling effect" | No | A negative lesson: a distance fade on the band would make far ships float on water drawn differently (determinism flag 2) |
| [WANG12] Wang et al. 2012 (Chinese) | Two-level fine grid plus concentric rings; a Pierson-Moskowitz Gerstner sum, baked into a bump texture for the far field; "当 kA ≤ 1 ... 当 kA > 1 时，将会出现渲染错误" (rendering errors when kA > 1); 400 fps at 90 km on a GTX 260 | No | The kA < 1 rule is the single-wave case of the spectrum research's contraction condition $K=\lambda\sum k_iA_i<1$ |
| [CC06] Chiu and Chang 2006 | Projected grid in a vertex texture; height maps at several scales summed; state-preserving GPU spray particles | No | Nothing |
| [PENG11] Peng et al. 2011 | Textbook Tessendorf with Phillips; writes the finite-depth dispersion as $gk\tan(kh)$ (should be tanh); notes grid overlap under large λ | No | Nothing |
| [LUO10] Luo et al. 2010 | Gerstner sum with a per-point depth: $k=k_\infty/\sqrt{\tanh(k_\infty h)}$ "valid for the entire range within 5%"; Bézier key-framed breakers | No | A negative lesson: a pointwise $k(h(x))$ breaks phase continuity (flag 5); a 5% approximation of $k(\omega)$ is not acceptable on the CPU, where `core` solves the dispersion relation by Newton. Breakers are done better by [HFW] |
| [VGS15] Varela and Guedes Soares 2015 | Ship simulator: seakeeping by RAOs on the same discretised spectrum components the surface uses, "converted ... to the wave number domain as described by Fréchot"; frequency-banded simulation grids; projected grid | No | A precedent for one set of components feeding both physics and picture. RAOs are not luovi's hull model (panel Froude-Krylov) |
| [AQV26] Aqua-Verse 2026 | UE5 Gerstner sum shared by visuals and robot buoyancy | No | A negative example: eq. 12 uses $-QAd_x\cos$ horizontally against $A\sin$ vertically, which crowds points at troughs rather than crests (the same sign trap the spectrum research found in Tessendorf), and reuses $d_x$ for the y component; amplitudes are not tied to a spectrum |

## Design doc claims affected

Per `AGENTS.md`, these are opened as questions, not edited.

| Claim in `01-ocean.md` | Finding | Proposed wording |
| ---------------------- | ------- | ---------------- |
| "Background sea \| Tessendorf FFT, JONSWAP/TMA + directional spreading, 3–4 cascades, choppy displacement \| Whole 2–3 km view; <1 ms; CDLOD or clipmap mesh" | Count confirmed; the band split changes what cascade 0 holds; the mesh choice resolves | "N = 32 equal-energy analytic components below $k_s$ (shared with the CPU), plus 3 FFT cascades (4 max) above it; < 1 ms; clipmap mesh with CDLOD morphing" |
| "Foam / whitecaps \| Jacobian of displacement marks folding; advected, decaying foam buffer shared with wakes" | Confirmed by [ATL19] and [SOT18] | Add: "Dupuy-Bruneton filtered coverage beyond the buffer; band Jacobian included; threshold calibrated to cited whitecap coverage" |
| "Micro detail / reflections \| Highest cascade + detail normals; Bruneton distance-filtered roughness" | Confirmed | Add: "per-cascade slope moments (LEADR) plus the band's exact slope covariance" |
| "Far from the player, the FFT spectrum is modulated by procedural bathymetry and a per-tile obstacle attenuation map (less energy in the lee of an island, shorter steeper waves over shallows)." | The band is now part of what the hull feels, so modulating it is a physics change | "The FFT tail may be modulated freely. The CPU band may take an amplitude envelope from an authoritative attenuation map; its wavenumbers never vary pointwise" |
| "Multiplayer determinism is easier if background heights at hull samples are evaluated analytically (a few Gerstner terms from the same seed)" | Already reopened by the spectrum research | "32 equal-energy components of the band below $k_s$" |
| "WebGPU compute is required for the FFT, the dispersive patch and the wind solve" | `05-separation-of-concerns.md` puts "Coarse per-tile 2D solve, gust layer, height profile" on the authoritative CPU side. If sails read a GPU wind field, GPU results enter authority | Open question; the two chapters disagree (flag 4) |
| "Read back the small region under each ship (~64² heights + velocities), or evaluate the background spectrum analytically on CPU at the sample points for determinism." | Readback is ruled out by "GPU results never enter authoritative state" (`AGENTS.md`) | Drop the readback option |

## Carry into #8

Contract-level facts for the ocean and environment query contract:

- **Spectrum normalisation.** State the chain once: $S(\omega)$ variance density, $D$ normalised exactly, $F(\mathbf k)=S\,\Phi\,D\,(d\omega/dk)/k$; band components $A_i=\sqrt{2m_{0,b}/N}$; lattice tail $\tilde h_0=\tfrac12(\xi_r+i\xi_i)\sqrt{F\Delta k_x\Delta k_y}$ with unit normals. Never $\sqrt{2F\Delta k^2}$ (section 1). Record that band amplitudes are fixed by choice (Tucker et al. argue for Rayleigh).
- **Spectrum parameters a scenario carries.** $U_{10}$, wind direction, fetch, depth for TMA, optional $\gamma$ (default 3.3, range 1 to 7 per [FR]), optional swell system as a second JONSWAP (Atlas uses "dual fetch limited JONSWAP spectra"). $\omega_p$ capped at the Pierson-Moskowitz value $0.855g/U_{10}$. All constants ($\gamma$, $\sigma_a$, $\sigma_b$, 0.076, 0.22, 22 or 3.5 and 0.33, 0.855, the spreading coefficients) in `data-*` with [J73], [FR] and the spreading citations.
- **Spreading function.** Donelan-Banner $\operatorname{sech}^2$ for the band (exact normaliser, closed-form inverse cumulative with `atanh`); Mitsuyasu as the documented alternative. Whichever is chosen, the GPU tail uses the same function with an exact normaliser, not a fitted one.
- **Cut wavenumber.** $k_s=3k_p$ default, raised per world for the smallest authoritative hull (spectrum research §5). One value shared by band and tail; no hole and no overlap.
- **Number of CPU components.** N = 32 default, 48 ceiling, as $N_f\times N_d$ strips and sectors; [FR]'s equal-energy quadtree is the precedent.
- **What crosses to the renderer.** The component list $(\mathbf k_i,\omega_i,A_i,\varphi_i)$ and a per-frame phase array computed on the CPU from the integer tick; $k_s$; the cascade partition rule; and the tail's $\tilde h_0$ generated by `core`'s RNG and uploaded. The GPU never recomputes $k_i$ or $\omega_i$.
- **Spatial variation in v1.** One homogeneous band per scenario. A later amplitude envelope is allowed if it comes from authoritative, cited data; a pointwise wavenumber change is not.
- **Field snapshot for visuals.** If Dynamic Wave Trains, wind streaks or the far-field modulation are adopted, the contract needs a gridded export of the authoritative wind field (and later depth with its gradient and an obstacle field) beside the batched point query. Not needed for build steps 1 to 4.

## Carry into render-ocean

- **Cascades.** Three 256² FFT cascades above $k_s$, four at most; $k$ partitioned into annuli; cascade 0 inner edge exactly $k_s$, tile about $6\lambda_s$; ratio about 8 to 16 between tiles. Budget about 0.4 to 0.5 ms for the tail on RTX 4060 class hardware, scaled from [AB] (0.376 ms, 2070 Super) and [ATL19] (0.5 ms, 2080).
- **Band.** The N components evaluated analytically, into a camera-centred texture per clipmap level or in the vertex shader, with CPU-uploaded phases and camera-relative positions. No distance fade.
- **LOD.** Clipmap rings at 2x scale with vertices snapped to each ring's world grid and CDLOD's continuous per-vertex morph over the last 15 to 30% of each range [CDLOD], [CREST]. Not a projected or concentric grid.
- **Filtering.** Per-cascade slope moments mipmapped and combined with cross terms [ATL19]; the band's slope covariance added as an exact constant; the FFT tail may fade with distance ("~30 world space periods" in [ATL19]), the band may not.
- **Foam.** Near field: per-cascade Jacobian (band included) above a threshold injects into a world-space, camera-centred buffer that is advected, blurred and decayed [ATL19], [SOT18], shared with hull injection as the chapter says. Far field: [DB12] coverage $W$ from mipmapped $k_i$ and $k_i^2$. Threshold from the cited coverage law; reflectance 0.22 (Koepke, effective) with the fresh-foam value open.
- **Wind ripples (step 5).** Optionally one Dynamic Wave Train at about 0.3 m driven by the authoritative wind field grid, amplitude derived from the spectrum; about 0.4 to 0.5 ms at 1440p, so only if the 5 ms budget allows.

## Determinism flags

Anything that would alter the CPU sampling versus GPU rendering split:

1. **GPU-generated FFT tail cannot be validated headless.** [GOW] draws its Gaussians on the GPU with a hash, `log`, `cos` and `sin` in shader floats. The tail is visual only, but the residual budget benchmark (spectrum research §5.3) needs its realised spectrum. Generate the tail's $\tilde h_0$ on the CPU with `core`'s RNG once per sea state and upload it, so `tool-validate` can check it in Node.
2. **No distance fade on the band.** [ATL19] fades bands beyond about 30 periods and [REN08] fades all height to zero with distance. Applied to the band, a distant AI ship would float on water drawn differently from the water it feels. Only the FFT tail may fade.
3. **Texture filtering is not reproducible on the CPU.** [FO26 App. C] switched to software bilinear because of hardware interpolation precision. Anything a hull feels must not depend on hardware-filtered texture reads. If the band goes into a texture for drawing, its interpolation error enters the 1 mm exactness benchmark and must be shown to fit; otherwise evaluate the band per vertex near hulls.
4. **Wind field location.** The ocean chapter wants the wind solve on WebGPU; the separation chapter puts it on the CPU as authoritative. Sails feel force from it, so it must be CPU. The renderer's ripples, streaks and any Dynamic Wave Train should read that same authoritative field, so the water shows the wind the sails feel.
5. **Spatially varying sea state.** A pointwise wavenumber change ($k(h(x))$ in [LUO10], Snell per point in [FO26 §7]) is not phase-consistent. On the band it would desynchronise physics from any phase-consistent picture and from itself across space. An amplitude envelope from authoritative data is acceptable; shoaling of the band waits for a phase-integrated (ray or eikonal) formulation or stays with the dispersive patch.
6. **Wave trains never below $k_s$.** [FO26] has no spectrum the energy benchmark could pin and long waves are beyond its tiles. Any train with a wavelength a hull's waterplane would not filter out (more than about a metre for the H-boat) adds unbudgeted, unfelt variance; keep trains short or count them in the residual budget.
7. **Visual masks must not become forces.** [FO26] suggests its foam and spray transfer functions could "advect small buoyant objects", and whitecap or spray masks invite gameplay use. Anything that pushes a body must come from the CPU band and authoritative state, never from GPU foam, spray or train fields.
8. **One dispersion solve.** [LUO10]'s 5% approximation of $k(\omega)$ and per-shader recomputation would drift from the CPU's Newton solve. The GPU receives $k_i$ and $\omega_i$; it never recomputes them for band components.

## Open questions

- Fixed against Rayleigh band amplitudes (section 1.4): fixed is recommended for deterministic $H_s$; confirm in #8.
- Spreading function for the contract: Donelan-Banner (closed-form inverse) or Mitsuyasu (fetch-dependent through wave age). Both are cited; the choice is a modelling decision.
- Whether the environment contract v1 includes a gridded field snapshot now, or only at step 5 when Dynamic Wave Trains and wind streaks would first need it.
- The fresh-foam reflectance and a foam decay time with primary citations, if the foam buffer models decay explicitly (Koepke's 0.22 is a lifetime average).
- The two design doc disagreements in the table above (wind solve on GPU or CPU; readback as an option) need an owner decision before `render-ocean` and `sim-ocean` slices are cut.
- Horvath 2015, Koepke 1984, Mitsuyasu 1975 and Donelan et al. 1985 were not read first-hand; the formulas above come through [FR], [FFTO], [AB] and [OOWB]. A later pass should check them before the `data-*` file cites them as primary.

## Reproducing the check

The script was written for this note and is not committed. Method: a 128² lattice over 512 m, skipping the Nyquist row and column so every $-\mathbf k$ exists; deep-water JONSWAP with the [FR] fetch laws at $U_{10}$ = 12 m/s and 150 km; a $\tfrac{2}{\pi}\cos^2\theta$ half-plane spread (any normalised $D$ gives the same ratios); $F=S\,D\,(d\omega/dk)/k$; $\tilde h_0=(\mathcal N(0,s)+i\,\mathcal N(0,s))\sqrt{cF\Delta k^2}$ for the four $(s,c)$ pairs in the table; realised variance $\sum_{\mathbf k}|\tilde h_0(\mathbf k)+\tilde h_0^*(-\mathbf k)|^2$ by Parseval; 6 seeds of Python's `random.gauss`. The fetch crossover solves $3.5\tilde x^{-0.33}=0.855/2\pi$ for $\tilde x$.
