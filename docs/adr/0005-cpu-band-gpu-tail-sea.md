# The CPU owns the sea below a cut wavenumber; the GPU renders the tail

The authoritative sea is a band of N equal-energy wave components below a cut wavenumber k_s, discretised off-lattice from the scenario's spectrum and seed in `sim-ocean`. The renderer draws those same components analytically and adds an FFT tail whose spectrum is zero below k_s, so nothing is counted twice and every wave a hull feels is on screen. The alternative the ocean chapter implied, a CPU subset of the FFT lattice, was rejected because the energy near the spectral peak is spread over hundreds of lattice bins: the 32 largest bins hold only 27 to 61% of the height variance in light and moderate Baltic seas, so a hull would float out of step with the swell drawn around it. Shrinking the tile until 32 bins hold the peak makes the swell repeat every few wavelengths.

Decided by the Ocean and environment query contract ticket ([#8](https://github.com/nipatiitti/luovi/issues/8)) on 2026-10-21, from the spectrum sampling research ([#4](https://github.com/nipatiitti/luovi/issues/4)) and the ocean wave survey ([#18](https://github.com/nipatiitti/luovi/issues/18)).

## Consequences

- The cut is one number shared by band and tail, carried by the scenario as a ratio k_s / k_p with default 3. The sea never depends on which ships sail it.
- Band amplitudes are fixed at sqrt(2 m0_band / N), not Rayleigh-distributed as Tucker et al. 1984 and Fréchot recommend, so the band's variance equals the spectrum's for every seed. The tail keeps Gaussian amplitudes with the corrected normalisation ½(ξr + iξi) sqrt(F Δkx Δky), never the reference shaders' sqrt(2 F Δk²), which is 8 times too much energy.
- Directional spreading is Donelan-Banner for both band and tail, because its cumulative inverts in closed form, which the equal-energy direction sectors need.
- Choppiness is clamped at build so the band's contraction constant K = λ Σ k_i A_i stays below 0.8; the band then never folds and two fixed-point iterations invert the displacement.
- The tail's initial spectrum is generated on the CPU with the seeded RNG and uploaded, so it is reproducible, but it is never authoritative and no force reads it.
- The band's wavenumbers and frequencies are global per scenario: no distance fade, no per-point depth, and the GPU never recomputes them.
- A spatially varying sea may later scale the band's amplitudes from authoritative data; it may never change the band's wavenumbers pointwise.

## Amendment, 2026-10-22

Amended by the design doc corrections task ([#25](https://github.com/nipatiitti/luovi/issues/25)) from the modern coefficient sources research ([#24](https://github.com/nipatiitti/luovi/issues/24)) and the render-ocean decision ([#23](https://github.com/nipatiitti/luovi/issues/23)).

- Donelan-Banner spreading takes the β exponent from Donelan, Hamilton and Hui 1985 inside 0.56 to 1.6 ω_p and floors it at 1.24 outside that range, the published high-frequency limit, so the band's direction sectors never collapse onto the mean direction. Banner 1990's upper branch is evaluated on k/k_p under TMA, not on ω/ω_p, because the TMA depth factor moves the frequency of a given wavenumber and the spreading was measured against wavenumber.
- Whitecap reflectance comes from Dierssen 2019 (CC BY), 0.40 for a fresh whitecap and 0.22 as the lifetime average, replacing Koepke 1984, which the research could not obtain and which the open literature reproduces.
- Fixed band amplitudes change the crest statistics. The sum of N fixed-amplitude cosines with random phases has lighter tails than a Gaussian sea: its highest crest is bounded by the sum of the amplitudes, and crests above about twice the significant height are rarer than the Rayleigh crest distribution of a Gaussian sea predicts. Hs is exact for every seed by construction; extreme-value statistics are not, and no benchmark depends on them. The tail keeps Gaussian amplitudes, so the short waves drawn on top of the band keep their natural crest statistics.
