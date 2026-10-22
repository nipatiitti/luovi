# Precomputed atmospheric scattering for sky, sun and aerial perspective

`render-scene` lights the world with Bruneton's 2017 precomputed atmospheric scattering: transmittance, scattering and irradiance tables computed once at load by compute passes, read by every shader through one sky radiance function, sun and sky irradiance, and aerial perspective over the view. The sun is a render setting (elevation and azimuth), exposure a fixed render setting, and the HDR target is tone mapped with the Khronos PBR Neutral curve; no other post-processing exists on this map. The alternatives were Hosek and Wilkie's fitted sky (large coefficient tables, no aerial perspective over a 2 km sea) and Preetham's analytic sky (small, but over-bright horizons at the low sun angles the Baltic has for months).

Decided by the render-ocean v1 ticket ([#23](https://github.com/nipatiitti/luovi/issues/23)) on 2026-10-22, which folded render-scene v1 into its resolution.

## Consequences

- Atmospheric constants (Rayleigh and Mie coefficients, scale heights, ozone) live in `data/src/shared/` cited to Bruneton 2017; the precompute runs once and reruns only when they change.
- Replacing the sky model later touches every shader that reads the tables, which is why this is an ADR and the camera, sun and exposure settings are not.
- The sun does not come from the scenario. A scenario date, time and position derive it only once a scenario needs daylight to mean something.
- Auto exposure is deferred with a trigger; until then the host exposes the exposure value.
- The camera is an orbit around the hero ship (the world origin without ships) plus free flight, reverse-Z with an infinite far plane, clamped above the surface; underwater views are out of scope.
