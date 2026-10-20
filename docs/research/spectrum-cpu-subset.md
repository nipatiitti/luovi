# Spectrum sampling for the CPU sea

Research for issue #4, 2026-10-20. Question: how the deterministic CPU sea can be a seeded sample of the same spectrum the GPU FFT draws, so a ship floats on the water the renderer shows; which components to keep, how many, how to look up height under choppy displacement, and what agreement the ocean benchmark should demand.

## Answer in brief

The per-bin mapping is exact and cheap. Every FFT bin is one travelling cosine with amplitude $2|\tilde h_0(\mathbf k)|$ and phase $\arg \tilde h_0(\mathbf k)$, and a CPU sum of those cosines matches a direct inverse DFT of the same spectrum to $3\times10^{-15}$ m in our check (section 1).

Keeping the N largest bins of that lattice does not work at the N the ticket expects. With N = 32, the 32 largest realised bins carry 27 to 61% of the height variance in light and moderate Baltic seas, and 84% in a storm. The rest, 0.26 to 0.71 m RMS, would be drawn on screen but felt by no hull. This happens because the energy near the spectral peak is spread over hundreds of lattice bins (section 2).

Recommendation, which is to make the FFT the complement of the CPU sea rather than to make the CPU sea a subset of the FFT:

- The CPU owns every wave longer than a split wavelength $\lambda_s = 2\pi/k_s$, with $k_s = 3k_p$ by default. That band is discretised from the same spectrum function, seed and dispersion relation into N = 32 components of equal energy. Each component's wave vector sits at a seeded position inside its cell, so the band does not repeat every tile length.
- The GPU renders those same N components analytically. Every FFT bin with $|\mathbf k| < k_s$ is zeroed, so the FFT cascades carry only waves shorter than $\lambda_s$, and no force reads them.
- The disagreement between physics and pixels is then the spectral tail above $k_s$, which is known in advance: 7.3 to 7.8% of $H_s$ RMS at a point, and 0.1 to 7.4% of $H_s$ averaged over a hull's waterplane, depending on hull size against the sea (section 5). Where a small hull in a big sea misses the budget, raise $k_s$.
- Cost, measured in Node 26 on an Apple M1 Pro: 200 query points with N = 32 take 147 µs per tick, including two inverse-displacement iterations. 500 points take 386 µs (sections 3 and 4).

If the team wants to stay with a lattice subset anyway, section 2 also gives the best lattice rule: rank globally by realised amplitude, and have the GPU zero the bins it dropped below $k_s$. It leaves more energy out of either the physics or the picture, so it is the fallback, not the recommendation.

This changes the intent in `docs/intention/01-ocean.md` ("a few Gerstner terms from the same seed") only in how the terms are chosen, but it is a design change to the ocean pipeline. Per `AGENTS.md` it is opened as a question at the end rather than written into the design doc.

## Sources

- [T] J. Tessendorf, _Simulating Ocean Water_, SIGGRAPH course notes, 1999 to 2004, [PDF](https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2004.pdf). Equations cited by number.
- [J] K. Hasselmann et al., _Measurements of wind-wave growth and swell decay during the Joint North Sea Wave Project (JONSWAP)_, Ergänzungsheft zur Deutschen Hydrographischen Zeitschrift A8 Nr. 12, 1973, [scan](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/10/Jonswap-Hasselmann1973.pdf). Section 2.4, equations 2.4.1 to 2.4.5.
- [TMA] E. Bouws, H. Günther, W. Rosenthal, C. L. Vincent, _Similarity of the wind wave spectrum in finite depth water: 1. Spectral form_, JGR 90(C1) 975 to 986, 1985, [doi:10.1029/JC090iC01p00975](https://doi.org/10.1029/JC090iC01p00975). Paywalled. Only the abstract was read, so the depth factor below is quoted as both reference implementations write it.
- [GOW] GodotOceanWaves, the repository linked from the ocean chapter, [sebbasim/GodotOceanWaves](https://github.com/sebbasim/GodotOceanWaves). It is a fork of 2Retr0/GodotOceanWaves with identical content, read at commit `a171446f`. Links below point at files and lines in that commit.
- [FO] gasgiant/FFT-Ocean (Unity), read at commit `ac3ea954`. GOW derives from the same structure. It is used here for the cascade cutoffs and the CPU height lookup.
- [AB] D. Algis, _Arc Blanc: a real time ocean simulation framework_, [arXiv:2503.03326v2](https://arxiv.org/abs/2503.03326), 2025. Used for cascade partitioning, the iterative height lookup and its iteration count, and FFT-form velocities.
- [H15] C. J. Horvath, _Empirical Directional Wave Spectra for Computer Graphics_, DigiPro 2015, [doi:10.1145/2791261.2791267](https://doi.org/10.1145/2791261.2791267). GOW cites it for TMA and Hasselmann spreading. The paper itself was not accessible, so claims about it go through GOW's code.
- [M] Our measurements, run for this note. Scripts and method are under "Reproducing the measurements".

GOW file links, all at commit `a171446f8174348895aaafc426576c26261058b9`:

- [`spectrum_compute.glsl`](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl)
- [`spectrum_modulate.glsl`](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_modulate.glsl)
- [`fft_unpack.glsl`](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/fft_unpack.glsl)
- [`wave_generator.gd`](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/wave_generator.gd)
- [`water.gd`](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/water.gd)

FO file links, at commit `ac3ea95448376eb61265ff7a4c71a5d7d82d6a83`:

- [`InitialSpectrum.compute`](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/ComputeShaders/InitialSpectrum.compute)
- [`WavesGenerator.cs`](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/Scripts/WavesGenerator.cs)

## 1. From an FFT bin to a Gerstner component

### What the FFT computes

Tessendorf writes the height as a sum over a lattice, $h(\mathbf x,t)=\sum_{\mathbf k}\tilde h(\mathbf k,t)\,e^{i\mathbf k\cdot\mathbf x}$. The lattice is $k_x = 2\pi n/L_x$, $k_z = 2\pi m/L_z$, with $-N/2 \le n < N/2$ [T eq. 36]. The amplitudes are $\tilde h(\mathbf k,t)=\tilde h_0(\mathbf k)e^{i\omega t}+\tilde h_0^*(-\mathbf k)e^{-i\omega t}$ [T eq. 43], with $\tilde h_0=\tfrac{1}{\sqrt2}(\xi_r+i\xi_i)\sqrt{P_h(\mathbf k)}$ for independent standard normal $\xi$ [T eq. 42]. The finite-depth dispersion relation is $\omega^2=gk\tanh(kD)$ [T eq. 32]. GOW implements exactly this shape. It packs $\tilde h_0(\mathbf k)$ and $\tilde h_0^*(-\mathbf k)$ into one texel ([`spectrum_compute.glsl` L124](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl#L117-L125)), modulates them with $e^{\pm i\omega t}$ ([`spectrum_modulate.glsl` L64-L68](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_modulate.glsl#L64-L68)), and undoes the centred index with a $(-1)^{x+y}$ sign after the inverse FFT ([`fft_unpack.glsl` L38](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/fft_unpack.glsl#L37-L38)). AB applies the same correction [AB section 3.5].

### One bin is one travelling wave

Expand the sum and pair the $e^{+i\omega t}$ term at $\mathbf k$ with the $e^{-i\omega t}$ term at $-\mathbf k$. The two are complex conjugates, so the whole sea is $\sum_{\mathbf k} 2\,\mathrm{Re}[\tilde h_0(\mathbf k)\,e^{i(\mathbf k\cdot\mathbf x+\omega t)}]$. Every lattice bin, in both half-planes, contributes one real cosine of its own. Under Tessendorf's sign that cosine travels toward $-\mathbf k$, because its phase is $\mathbf k\cdot\mathbf x+\omega t$. His Gerstner form uses $\mathbf k\cdot\mathbf x_0-\omega t$ and travels toward $+\mathbf k$ [T eq. 26 to 30], so the two halves of the same paper disagree on direction. Luovi should flip the time sign in the FFT, $\tilde h=\tilde h_0(\mathbf k)e^{-i\omega t}+\tilde h_0^*(-\mathbf k)e^{+i\omega t}$, so that bin $\mathbf k$ travels along $+\mathbf k$. The spectrum's directional term is then evaluated at the direction of travel.

With that convention, component $i$, which is lattice bin $\mathbf k_i$, is in luovi's world frame (x east, y north, z up):

| Quantity            | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wave vector         | $\mathbf k_i$, the lattice point $(2\pi n/L_c,\ 2\pi m/L_c)$ of cascade $c$; unit $\hat{\mathbf k}_i=\mathbf k_i/k_i$                                                       |
| Angular frequency   | $\omega_i=\sqrt{g k_i\tanh(k_i d)}$ [T eq. 32]                                                                                                                              |
| Amplitude           | $A_i = 2\,\lvert\tilde h_0(\mathbf k_i)\rvert$                                                                                                                              |
| Phase               | $\varphi_i=\arg\tilde h_0(\mathbf k_i)$, so $\theta_i=\mathbf k_i\cdot\mathbf x-\omega_i t+\varphi_i$                                                                       |
| Elevation           | $\eta=\sum_i A_i\cos\theta_i$                                                                                                                                               |
| Choppy displacement | $\mathbf D=-\lambda\sum_i\hat{\mathbf k}_iA_i\sin\theta_i$; the surface point is $(\mathbf x+\mathbf D,\ \eta)$; $\lambda=1$ is Gerstner [T eq. 29, 30]                      |
| Surface velocity    | $\dot\eta=\sum_i A_i\omega_i\sin\theta_i$, $\dot{\mathbf D}=\lambda\sum_i\hat{\mathbf k}_iA_i\omega_i\cos\theta_i$                                                           |
| FFT form of D       | $\tilde{\mathbf D}(\mathbf k,t)=+i\lambda\hat{\mathbf k}\,\tilde h(\mathbf k,t)$                                                                                            |

[M] checks this mapping. A 32² cascade has 792 non-zero bins. Its inverse DFT ($\sum_{\mathbf k}\tilde h e^{i\mathbf k\cdot\mathbf x}$, which is what the FFT evaluates on its grid) matches the component sum at 20 arbitrary points and times to $2.7\times10^{-15}$ m in height and $1.4\times10^{-15}$ m in displacement.

### The sign of the choppy displacement

Tessendorf writes $\mathbf D=\sum -i\,\hat{\mathbf k}\,\tilde h\,e^{i\mathbf k\cdot\mathbf x}$ with the surface at $\mathbf x+\lambda\mathbf D$, and says this sharpens peaks [T eq. 44 and the text after it]. Per component, $-i$ gives $+\hat{\mathbf k}A\sin\theta$, which is the negative of his own Gerstner displacement [T eq. 29]. [M] found the $-i$ form equal to minus the Gerstner $\mathbf D$ to $1.4\times10^{-15}$. For a single wave with $kA$ = 0.126, the Gerstner sign compresses the surface to 0.874 of its spacing at the crest. Tessendorf's sign with $\lambda>0$ stretches it to 1.126, which sharpens the troughs. GOW uses $+i$ in practice: `h_inv = vec2(-h.y, h.x)` is $i\tilde h$ ([`spectrum_modulate.glsl` L69-L74](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_modulate.glsl#L69-L74)). Luovi should state the convention as $+i\lambda\hat{\mathbf k}$ with $\lambda \ge 0$.

### Amplitude normalisation

Let $F(\mathbf k)$ be the directional variance density in wavenumber space. For JONSWAP with the TMA depth factor and directional spreading:

$F(\mathbf k)=S_J(\omega)\,\Phi(\omega,d)\,D(\omega,\theta)\,\dfrac{1}{k}\dfrac{d\omega}{dk}$

where:

- $S_J(\omega)=\alpha g^2\omega^{-5}\exp[-\tfrac54(\omega_p/\omega)^4]\,\gamma^{r}$ and $r=\exp[-(\omega-\omega_p)^2/(2\sigma^2\omega_p^2)]$. This is the frequency form of [J eq. 2.4.1, 2.4.2] with $\gamma=3.3$, $\sigma=0.07$ below the peak and $0.09$ above [J eq. 2.4.5].
- The fetch laws are $f_m=3.5\,\tilde x^{-0.33}$ and $\alpha=0.076\,\tilde x^{-0.22}$, with $\tilde x=gx/U_{10}^2$ [J eq. 2.4.3, 2.4.4]. GOW writes the peak as $\omega_p=22(g^2/(U F))^{1/3}$ ([`wave_generator.gd` L115-L121](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/wave_generator.gd#L115-L121)).
- $\Phi$ is the Kitaigorodskii depth factor of TMA [TMA]. Both implementations use $\omega_h=\omega\sqrt{d/g}$ and $\Phi=\omega_h^2/2$ for $\omega_h\le1$, $1-(2-\omega_h)^2/2$ for $1<\omega_h<2$, and $1$ above ([`spectrum_compute.glsl` L89-L101](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl#L89-L101), [`InitialSpectrum.compute` L98-L106](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/ComputeShaders/InitialSpectrum.compute#L98-L106)).
- $D$ is Hasselmann spreading in Longuet-Higgins form $\cos^{2s}(\theta/2)$, as GOW implements it from [H15] ([`spectrum_compute.glsl` L68-L86](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl#L68-L86)). GOW normalises with an approximation its author does not remember deriving (L70). The exact factor follows from the Beta integral, $\int_{-\pi}^{\pi}\cos^{2s}(\theta/2)\,d\theta=2\sqrt\pi\,\Gamma(s+\tfrac12)/\Gamma(s+1)$. At $s = 0$ this gives $1/(2\pi)$, which matches GOW's small-$s$ branch.

The variance of a cosine of amplitude $A$ is $A^2/2$, so the sea's variance is $\sum_i 2|\tilde h_0(\mathbf k_i)|^2$. For that to equal $m_0=\int F\,d^2k$, the draw must satisfy

$\mathbb E|\tilde h_0(\mathbf k)|^2=\tfrac12 F(\mathbf k)\,\Delta k_x\Delta k_y$, that is $\tilde h_0=\tfrac12(\xi_r+i\xi_i)\sqrt{F\,\Delta k_x\Delta k_y}$.

In Tessendorf's terms that is $P_h=F\Delta k^2/2$ [T eq. 42]. [M] checked it. A 512² cascade over 1024 m, averaged over 8 seeds, gives realised variance 1.027 times the analytic $m_0$. Both reference implementations instead write $\xi\sqrt{2F\Delta k^2}$ with two unit normals ([`spectrum_compute.glsl` L111-L114](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl#L103-L115), [`InitialSpectrum.compute` L152-L153](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/ComputeShaders/InitialSpectrum.compute#L134-L153)). A replica of that formula in [M] gives 8.2 times $m_0$, so heights come out about $2\sqrt2$ too large. GOW exposes a per-cascade `displacement_scale` whose comment says it "should be reduced as the number of cascades increases" ([`wave_cascade_parameters.gd` L9](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/wave_cascade_parameters.gd#L9)). Luovi must not copy the reference's constant. The benchmark in section 5 pins realised $H_s$ to the spectrum.

### Reference-implementation details that break CPU agreement

Each of these is harmless for a visual-only ocean, and each would make a CPU mirror of GOW disagree with what GOW draws:

- **Cascades overlap in k.** Every GOW cascade evaluates the full spectrum on its own lattice, with no cutoff ([`spectrum_compute.glsl` L103-L115](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl#L103-L115)). The same wavelength is then present in several cascades with independent noise, which inflates energy again. FO partitions k into annuli instead: `if (kLength <= CutoffHigh && kLength >= CutoffLow)` ([`InitialSpectrum.compute` L140](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/ComputeShaders/InitialSpectrum.compute#L140)), with boundaries at $6\cdot2\pi/L_{c+1}$ ([`WavesGenerator.cs` L56-L60](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/Scripts/WavesGenerator.cs#L56-L60)). AB describes the same cut "to avoid overlap" and credits the cascade idea to Dupuy and Bruneton [AB section 3.3]. Luovi needs the partition, otherwise "the same bin" is not well defined.
- **Per-cascade clocks.** GOW starts each cascade at `time = 120.0 + PI*i` ([`water.gd` L31-L32](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/water.gd#L31-L32)), updates one cascade per frame ([`wave_generator.gd` L56-L63](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/wave_generator.gd#L56-L63)) and runs at 50 updates per second by default ([`water.gd` L51](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/water.gd#L51)). Luovi's GPU time must be the integer tick divided by 60.
- **Rotated output.** GOW skips the second transpose because "rotating the wave by PI/2 doesn't affect it visually" ([`wave_generator.gd` L77-L82](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/water/wave_generator.gd#L77-L82)), and swaps k components it does not understand ([`spectrum_modulate.glsl` L77](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_modulate.glsl#L77)). The drawn sea is therefore a rotated copy of its spectrum.
- **GPU-side randomness.** GOW draws its Gaussians on the GPU with an integer hash, then `log`, `cos` and `sin` in shader floats ([`spectrum_compute.glsl` L34-L49](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl#L34-L49)). Any sample the CPU must reproduce has to come from `core`'s seeded RNG and deterministic math, as `AGENTS.md` requires, and be uploaded to the GPU rather than recomputed there.
- **Float time.** The phase $\omega t$ is formed from a float32 `time` ([`spectrum_modulate.glsl` L65](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_modulate.glsl#L65)). At t = 1 h the float32 spacing is $2^{-12}$ s, and at 24 h it is $2^{-7}$ s, which is 0.023 rad of phase lag at $\omega$ = 3 rad/s. For components the physics reads, the CPU should upload $(\varphi_i-\omega_i t) \bmod 2\pi$ in float64 each frame. That is N floats.

## 2. Which components the CPU keeps

### The literal rule: N largest lattice bins

[M] built a full four-cascade discretisation: lattices of 256² over L = 512, 128, 32 and 8 m, partitioned by the FO rule, with JONSWAP, TMA and Hasselmann spreading and the normalisation above. It ranked bins three ways, averaged over 8 seeds. The table gives the share of total height variance kept; the residual is what the screen shows and no force reads.

| Sea state ($H_s$, $T_p$, $\lambda_p$)                   | N   | By realised $\lvert\tilde h_0\rvert$, global | By expected $F\Delta k^2$ | Cascade 0 only | Residual RMS |
| ------------------------------------------------------- | --- | -------------------------------------------- | ------------------------- | -------------- | ------------ |
| Light, $U_{10}$ 8 m/s, 50 km, 40 m deep (1.2 m, 4.6 s, 33 m)   | 16  | 17.6%                                        | 8.6%                      | 15.9%          | 0.28 m       |
|                                                         | 32  | 27.5%                                        | 16.1%                     | 24.8%          | 0.26 m       |
|                                                         | 64  | 41.1%                                        | 27.7%                     | 36.5%          | 0.23 m       |
| Moderate, 12 m/s, 150 km, 60 m (3.1 m, 7.6 s, 90 m)     | 16  | 46.1%                                        | 35.9%                     | 46.1%          | 0.58 m       |
|                                                         | 32  | 60.8%                                        | 53.1%                     | 60.8%          | 0.49 m       |
|                                                         | 64  | 73.1%                                        | 66.5%                     | 73.1%          | 0.41 m       |
| Storm, 20 m/s, 300 km, 80 m (7.0 m, 11.3 s, 198 m)      | 16  | 75.3%                                        | 70.9%                     | 75.3%          | 0.89 m       |
|                                                         | 32  | 84.3%                                        | 80.5%                     | 84.3%          | 0.71 m       |
|                                                         | 64  | 90.5%                                        | 88.5%                     | 90.5%          | 0.55 m       |
| Shallow TMA, 12 m/s, 50 km, 8 m (1.4 m, 5.3 s, 38 m)    | 32  | 31.6%                                        | 20.8%                     | 29.8%          | 0.30 m       |

Three conclusions follow:

- **Realised amplitude beats expected energy.** Ranking by $|\tilde h_0|$ always keeps more than ranking by $F\Delta k^2$, by 4 to 13 points at N = 32 across both layouts, because the Rayleigh draw moves real energy between neighbouring bins. Amplitude and energy rank identically once realised, since $A^2/2$ is monotone in $A$, so "by amplitude" and "by energy" are the same rule.
- **Global beats per-cascade.** Where the peak sits in cascade 0, the two agree. With L = 1024/256/64/16 m, the light sea's peak falls in cascade 1, and the 32 largest bins of cascade 0 keep 2.3% against 48.2% globally [M].
- **Neither is enough.** The share is set by how many lattice bins sit under the peak, roughly $(L_0/\lambda_p)^2$. A tile large enough not to repeat visibly puts tens to hundreds of energetic bins there. Below $2k_p$, the moderate sea has 163 bins above 1% of the peak bin and the light sea 743 [M]. The residual includes waves as long as the peak: at N = 32 on the 512 m layout, 0.25 to 0.69 m RMS of it comes from waves longer than 10 m [M]. A hull would visibly float out of step with the swell drawn around it.

Shrinking $L_0$ until N bins hold the peak, around $L_0 \approx 2.5\lambda_p$ for about 40 energetic bins [M], fixes the energy but makes the whole swell repeat every 2.5 wavelengths. Tessendorf warns that the patch periodicity shows unless the patch is large against the view [T section 4.3], and the view here is 2 to 3 km [`01-ocean.md`].

### Recommended rule: the CPU owns a band, the FFT owns the rest

Split the spectrum at $k_s$. Every wave with $|\mathbf k|<k_s$ belongs to the CPU sea, and the FFT cascades start at $k_s$ by zeroing every lattice bin below it. Because the FFT is linear, the drawn surface is the CPU band plus the FFT detail, with nothing counted twice. The pointwise disagreement is exactly the FFT part, whose variance is the spectral tail above $k_s$ [M]:

| $k_s$    | Variance left to FFT | Residual RMS, share of $H_s$ |
| -------- | -------------------- | ---------------------------- |
| $1.5k_p$ | 28 to 33%            | 13.2 to 14.5%                |
| $2k_p$   | 17.6 to 20.7%        | 10.5 to 11.4%                |
| $3k_p$   | 8.5 to 9.8%          | 7.3 to 7.8%                  |
| $4k_p$   | 4.9 to 5.6%          | 5.5 to 5.9%                  |

Ranges cover the four sea states. The share depends almost only on $k_s/k_p$, which follows from the $\omega^{-5}$ tail [J eq. 2.4.1]; it is close to $0.75\,(k_p/k_s)^2$ of the variance.

Inside the band, the lattice is the wrong discretisation for N in the tens, because it spends components on lattice spacing rather than on energy. Discretise the band instead with the same spectrum function, seed and dispersion relation, into N cells of equal energy:

1. Compute the band variance $m_{0,b}=\int_{k<k_s}F\,d^2k$ once per sea state.
2. Split $[0,\omega(k_s))$ into $N_f$ frequency strips of equal variance, by inverting the cumulative of $S_J\Phi$. Split each strip into $N_d$ direction sectors of equal variance, by inverting the cumulative of $D(\omega_{\text{strip}},\theta)$. Then $N=N_fN_d$, for example 8 × 4 = 32 or 8 × 6 = 48.
3. For cell $i$, draw two uniforms from `core`'s seeded RNG keyed by (seed, i), not by generation order. Place $\omega_i$ and $\theta_i$ at those quantiles inside the cell, solve $\omega_i^2=gk_i\tanh(k_i d)$ for $k_i$ by Newton iteration in deterministic math, and draw $\varphi_i$ uniform on $[0,2\pi)$.
4. Set $A_i=\sqrt{2m_{0,b}/N}$. The band then has exactly the spectrum's variance for every seed, rather than a Rayleigh-scattered one. Wave vectors are off-lattice, so the band never repeats.

The CPU evaluates these N components with the table in section 1. The renderer receives the same list.

The default is $k_s=3k_p$, which leaves 7.3 to 7.8% of $H_s$ RMS at a point. What a hull feels is the residual averaged over its waterplane, and that depends on hull size against the sea. [M] filtered the residual with an L × B rectangle in three headings:

| Sea, $k_s$      | Residual at a point | 8.3 × 2.2 m (H-boat-sized) | 96 × 10 m (full-rigger-sized) |
| --------------- | ------------------- | -------------------------- | ----------------------------- |
| Light, $3k_p$    | 7.3% $H_s$          | 2.9 to 3.7%                | 0.1 to 0.2%                   |
| Moderate, $3k_p$ | 7.3%                | 5.9 to 6.1%                | 1.0 to 1.5%                   |
| Storm, $3k_p$    | 7.8%                | 7.4%                       | 2.3 to 3.1%                   |
| Moderate, $4k_p$ | 5.6%                | 4.1 to 4.3%                | 0.6 to 0.9%                   |
| Storm, $6k_p$    | 4.0%                | 3.4%                       | 0.8%                          |

A small hull in a big sea sits in the residual, because its waves are still long against the hull. So $k_s$ should be chosen per world: the smallest $k_s\ge3k_p$ that meets the waterplane budget of section 5 for the smallest hull the scenario declares authoritative. The equal-energy cells widen at high k, so N does not have to grow with $k_s$.

### What the GPU must be told

In the recommended design the GPU needs no list of bins:

- The sea description: spectrum parameters, seed, $k_s$ and the cascade layout. From it the GPU builds FFT cascades whose $\tilde h_0$ is zero for $|\mathbf k|<k_s$ and partitioned into annuli between cascades.
- The N band components $(\mathbf k_i,\omega_i,A_i,\varphi_i)$, plus a per-frame phase array $(\varphi_i-\omega_i t) \bmod 2\pi$ computed on the CPU from the tick. The renderer evaluates them analytically, in the vertex shader or in a compute pass into a camera-centred texture, with positions relative to the camera to keep float32 phases small.

The FFT detail itself can stay GPU-generated, because no force reads it. `05-separation-of-concerns.md` places the "spectrum definition and seed; analytic height/velocity sampling" on the authoritative side and the FFT on the visual side. The new data (component list, $k_s$) crosses that seam through `sim-world`, since renderers import `sim-world` only (`AGENTS.md`). That is an extension of the environment query contract and needs a version bump.

### Fallback if the CPU must be a lattice subset

If the team keeps a strict lattice subset:

- **Candidates.** All lattice bins in all cascades with $|\mathbf k|<k_s$.
- **Ranking.** Rank by realised $|\tilde h_0|$, descending. Break ties by cascade, then row, then column, so the order is total and independent of float noise in the ranking. Keep N.
- **Generation.** The CPU generates $\tilde h_0$ for those bins with `core`'s RNG, keyed per bin (seed, cascade, ix, iy). In practice it uploads the whole spectrum texture, so CPU and GPU hold the same numbers.
- **What the GPU is told.** It receives the kept list, or just $k_s$ and N, since it can repeat the ranking on the uploaded values. It zeroes every candidate that was not kept, both its $\tilde h_0(\mathbf k)$ in texel $\mathbf k$ and its conjugate slot in texel $-\mathbf k$, because the reference packs $\tilde h_0^*(-\mathbf k)$ next to $\tilde h_0(\mathbf k)$ ([`spectrum_compute.glsl` L124](https://github.com/sebbasim/GodotOceanWaves/blob/a171446f8174348895aaafc426576c26261058b9/assets/shaders/compute/spectrum_compute.glsl#L124), [`InitialSpectrum.compute` L167](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/ComputeShaders/InitialSpectrum.compute#L167)).

Physics and picture then agree exactly below $k_s$, but the band loses the dropped bins' energy. With $k_s=3k_p$ the band holds about 91% of the variance, so at N = 32 the picture loses about 30% of the total variance in the moderate sea, 64% in the light sea and 7% in the storm (band share minus the kept shares in the table above). Rescaling the kept amplitudes to restore the band's variance concentrates the energy in a few noise-chosen lattice directions. That is a worse version of the equal-energy discretisation, which is why this rule is not the recommendation.

Rendering the full lattice while the CPU sees a subset, with no zeroing, is the worst option. It is the "Residual RMS" column of the first table: 0.2 to 0.9 m drawn but not felt.

## 3. How many components the CPU can afford

[M] measured a straightforward structure-of-arrays sum in Node 26.1.0 on an Apple M1 Pro, single thread. Each configuration ran in its own process, with the median of five 600-tick runs after warm-up. Per tick, phases $\varphi_i-\omega_it$ are computed once. Per point, one pass gets $\sin\theta_i$ and $\cos\theta_i$ and accumulates elevation, displacement and the four velocity terms. "World (x, y)" adds the fixed-point inverse of section 4. Trig is a Cody-Waite reduction plus degree-13 polynomials, standing in for `core`'s deterministic sincos.

Microseconds per 60 Hz tick:

| N   | 200 points, $\eta$ only | 200, $\eta$ + D + v | 200, world, 1 iter | 200, world, 2 iter | 200, world, 3 iter | 500, world, 2 iter |
| --- | ----------------------- | ------------------- | ------------------ | ------------------ | ------------------ | ------------------ |
| 8   | 12                      | 20                  | not run            | 47                 | 60                 | 122                |
| 16  | 21                      | 31                  | 55                 | 74                 | 99                 | 191                |
| 32  | 41                      | 56                  | 109                | 147                | 190                | 386                |
| 48  | 62                      | 78                  | 157                | 220                | 270                | 570                |
| 64  | 88                      | 111                 | 232                | 303                | 391                | 836                |
| 128 | 247                     | 247                 | not run            | 806                | 993                | 1866               |

The cost is linear in N times points times (iterations + 1), at roughly 7 to 9 ns per component per evaluation for N ≥ 32. Repeated runs varied by up to about 10%; the N = 64, 500-point, 2-iteration case measured 754 µs in an earlier run. `Math.sin` and `Math.cos` were 2.4 to 3.8 times slower than the polynomial, for example 891 µs against 281 µs for N = 64 at 500 points with no inversion. Determinism costs nothing here.

Against the budget in `AGENTS.md`, the hero boat gets under 1 ms of CPU for everything. N = 32 with 200 points and 2 iterations uses 0.15 ms of that. N = 64 at 500 points, 0.84 ms, would consume the whole budget. So N = 32 is the default, N = 48 is the ceiling for a hero ship, and N = 64 and above is out unless profiling of the real hull shows headroom. N = 8 to 16 is cheap but, by the equal-energy argument, coarse statistics for a band out to $3k_p$.

## 4. Height at a world point under choppy displacement

The surface is parametric: point $\mathbf x_0$ is drawn at $\mathbf x_0+\mathbf D(\mathbf x_0)$ with height $\eta(\mathbf x_0)$ [T eq. 44]. It folds where the Jacobian of that map drops below zero [T eq. 45 to 49]. To get height at world $\mathbf X$, solve $\mathbf x_0+\mathbf D(\mathbf x_0)=\mathbf X$ and return $\eta(\mathbf x_0)$. Both references do this by fixed-point iteration, $\mathbf x\leftarrow\mathbf X-\mathbf D(\mathbf x)$:

- FO runs three steps on a bilinear GPU readback of cascade 0 only ([`WavesGenerator.cs` L130-L141](https://github.com/gasgiant/FFT-Ocean/blob/ac3ea95448376eb61265ff7a4c71a5d7d82d6a83/Assets/Scripts/WavesGenerator.cs#L130-L141)).
- AB uses four, from a convergence study to 1 cm consecutive change over wind speeds up to 35 m/s [AB Algorithm 1, Appendix D].
- The ocean chapter already expects "a 2 to 3 step inverse-displacement lookup" [`01-ocean.md`].

For the CPU band the iteration has a guarantee. $|\partial\mathbf D/\partial\mathbf x|\le\lambda\sum_ik_iA_i=:K$, so the map is a contraction whenever $K<1$. The inverse is then unique (no folding in the band), and the horizontal error shrinks by at least a factor K per step. K is known at sea-state build time. For 64 components from the literal ranking, K was 0.51 in the moderate sea and 0.73 in the storm [M]. For equal-energy components K grows like $\sqrt N$, because $K=\bar k\sqrt{2Nm_{0,b}}$. The rule: if $K\ge 0.8$, lower the band's $\lambda$ until it is not. Folding then stays a GPU-only visual for foam, which is where `01-ocean.md` uses it.

Measured height error against a 60-iteration solution, over 2000 points and times [M]. The first error column gives RMS and maximum; the others give the maximum. All values in mm:

| Case                   | 0 iter, use $\eta(\mathbf X)$ | 1 iter | 2 iter | 3 iter | 1 iter, warm-started from last tick |
| ---------------------- | ----------------------------- | ------ | ------ | ------ | ----------------------------------- |
| Moderate, N 16, K 0.20 | 29 RMS, 181 max               | 7.0    | 0.40   | 0.04   | 0.11                                |
| Moderate, N 64, K 0.51 | 50 RMS, 303 max               | 12.5   | 1.2    | 0.12   | 0.18                                |
| Storm, N 16, K 0.32    | 144 RMS, 640 max              | 34     | 3.7    | 0.42   | 0.43                                |
| Storm, N 64, K 0.73    | 193 RMS, 1218 max             | 77     | 10.1   | 1.4    | 0.84                                |

Skipping the inverse is a 0.2 to 1.2 m error in a storm. Two iterations bring the worst case to 1 cm, and three to 1.4 mm. The cost is one displacement-only evaluation per iteration, so 2 iterations about 2.7 times the plain evaluation (section 3).

Warm-starting from the previous tick's solution reaches 3-iteration accuracy in one step, because the surface moves little in 1/60 s. But it makes the query stateful: the previous $\mathbf x_0$ per hull panel would live in ship state. Two cold iterations is the default (KISS). Warm-starting is the optimisation to reach for if profiling demands it.

In the recommended design, the FFT detail also displaces the drawn surface horizontally, by about the residual RMS for $\lambda=1$. The CPU does not invert that, which moves the band height by about band slope times residual displacement: 6, 16 and 38 mm in the light, moderate and storm seas at $k_s=3k_p$ [M]. That is about 0.5% of $H_s$, an order below the residual itself. It is counted inside the residual budget rather than corrected.

## 5. Agreement the ocean benchmark should demand

Disagreement between physics and picture has two parts with different natures, so the benchmark should test them separately. All of these run headless in `tool-validate`:

1. **Exactness of the shared part.** The CPU band sum must equal an independent evaluation of the same components that emulates the GPU path (float32 via `Math.fround`, camera-relative positions, CPU-uploaded phases). Required: within 1 mm for $|\mathbf X|$ up to 2 km and t up to 24 h. This proves both sides compute one sea, and catches sign, axis and time-base drift of the kind listed in section 1. For the lattice fallback, the test is the CPU sum against a CPU inverse DFT of the same $\tilde h_0$, within $10^{-9}$ m; [M] got $3\times10^{-15}$.
2. **Energy.** The band variance must equal $m_{0,b}$ to $10^{-9}$ relative; it is deterministic. Realised $H_s$ of band plus FFT, averaged over 16 seeds, must be within 5% of $4\sqrt{m_0}$ from the analytic spectrum. For the full lattice, [M] measured 0.3 to 2.9% over 8 seeds. The normalisation in both references inflates $H_s$ by a factor of 2.9, so this target catches it with a wide margin.
3. **Residual budget.** The energy left out sets the disagreement. The residual's RMS height is $\sqrt{f}\,H_s/4$ for a residual variance fraction $f$, and from the band table $f\approx0.75(k_p/k_s)^2$. The benchmark should require:
   - Pointwise residual RMS ≤ 0.08 $H_s$. This forces $k_s\ge3k_p$, where [M] gives 7.3 to 7.8%.
   - Residual RMS averaged over the waterplane of each authoritative hull in the scenario ≤ 0.05 $H_s$.
   - The residual measured from the actual FFT spectrum within 10% of the value predicted from the spectrum tail.

   0.05 $H_s$ is 0.2 standard deviations of elevation, about 4% of the variance a hull feels. It is on the scale of the 5% tolerance the project already uses for polars (`AGENTS.md`), and the H-boat-sized hull meets it at $k_s=4k_p$ in a moderate sea and between $4k_p$ and $6k_p$ in a storm [M]. A pointwise target of 4% $H_s$ or tighter needs $k_s$ of $6k_p$ or more. That pushes the band into wavelengths the FFT cascades exist to carry, which is a reason not to demand it.

## Open questions for the design doc

- `01-ocean.md` says "a few Gerstner terms from the same seed", and the ticket says "a seeded subset of exactly that discretisation". The numbers above argue for a band split, where the CPU owns waves longer than $\lambda_s$ as N equal-energy components and the FFT owns the rest. This changes how render-ocean builds cascade 0 and adds an analytic band to the renderer. It needs a decision before `sim-ocean` is written.
- Whether $k_s$ is fixed at $3k_p$ or derived per world from the smallest authoritative hull, and how a mid-game sea-state change re-discretises the band without a visible jump. The phases could be carried across, for example; that question is open.
- The environment query contract gains the band component list and $k_s$. That needs a version bump and a migration, per the contract rule in `AGENTS.md`.
- The empirical constants (JONSWAP $\gamma$, $\sigma_a$, $\sigma_b$, the fetch laws, the Hasselmann $s$ coefficients, the TMA factor) belong in a `data-*` file with these citations, not in `sim-ocean` code, per `AGENTS.md`.

## Reproducing the measurements

The scripts were written for this note and are not committed. Their method, so the numbers can be rebuilt:

- **Spectrum.** As in section 1. The lattice draws use a counter-based SplitMix64 keyed by (seed, cascade, ix, iy), with Box-Muller. Normalisation is $\tfrac12(\xi_r+i\xi_i)\sqrt{F\Delta k^2}$. The Nyquist row and column are skipped.
- **Mapping check.** A 32² lattice over 200 m. Direct sum of $\tilde h e^{i\mathbf k\cdot\mathbf x}$ over all bins, against the component table, at 20 points.
- **Selection.** Four cascades of 256² (512/128/32/8 m and 1024/256/64/16 m), boundaries $6\cdot2\pi/L_{c+1}$, 8 seeds, variance shares from $A^2/2$.
- **Band split.** Analytic integral of $S_J\Phi$ above $\omega(k_s)$. Hull filtering weights each residual bin by $[\mathrm{sinc}(k_lL/2)\,\mathrm{sinc}(k_bB/2)]^2$ at headings of 0, 45 and 90 degrees to the wind.
- **Cost.** The inner loop is below, run once per point per evaluation.

```js
for (let i = 0; i < n; i++) {
  const th = kx[i] * x + ky[i] * y + phase[i] // phase[i] = phi[i] - w[i] * t, once per tick
  const s = sin(th), c = cos(th)
  h += a[i] * c
  dx -= ux[i] * a[i] * s
  dy -= uy[i] * a[i] * s
  vz += a[i] * w[i] * s
  vx += ux[i] * a[i] * w[i] * c
  vy += uy[i] * a[i] * w[i] * c
}
```

- **Inversion.** $\mathbf x\leftarrow\mathbf X-\mathbf D(\mathbf x)$ for 0 to 4 steps, compared with 60 steps, at 2000 points over a 500 m square and 126 s.
