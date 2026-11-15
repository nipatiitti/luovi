// Where the sea breaks, shared by the surface, which draws the rollers, and the foam buffer, which
// keeps the foam they leave.
//
// The tail's cascades are split into crest bands of under two octaves (tail.ts), and the CPU band counts as one more. A
// crest band is an analytic signal: its steepness field s = sum a k cos(theta) and the slope g, s's Riesz transform, give
// the wave's phase atan2(|g|, s), zero at the crest, and the mean of s^2 + |g|^2 over a wavelength is the square of the
// wave group's steepness a k. A crest spills where its group is steeper than the onset, and the roller covers the phase
// from just behind the crest to some way down the forward face. Longer waves steepen the short ones riding their crests
// by (1 + their steepness)^2 (Longuet-Higgins and Stewart 1960), which gathers the whitecaps on the dominant crests.
//
// Only the roller is read off the wave field. The foam it leaves is written into the foam buffer at the water it was
// left on and fades there (foam.ts): a wave group changes shape within a period, so foam read off the field of the
// moment slides over the water and vanishes with the group.

/** Crest bands per cascade, long band first (tail.ts). */
export const CREST_BANDS = 2

/**
 * The rollers of every crest band at a point. The including shader defines `crest_band(b)`, the band's (steepness
 * variance, mean wavenumber, fade phase, share of a full whitecap's foam its breakers make), `whitecap_steepness()`,
 * (onset, full, the unit vector of travel), and `whitecap_shape()`, whose xy are the roller's phase ahead of and behind
 * the crest.
 */
export const whitecapWgsl = (slots: number): string => /* wgsl */ `
// s and g are each band's steepness and slope here, group its group steepness, share how much of it the point resolves,
// jag a number around 0.45 that rags the roller's ends and its leading edge, and footprint the point's width along the
// direction of travel, m. Returns the roller's foam density, that foam's thickness, 1 for a long wave's roller, and the
// third number of the band whose roller is thickest here, which the foam buffer reads as the rate its foam fades at.
fn whitecap_rollers(
  s: ptr<function, array<f32, ${String(slots)}>>,
  g: ptr<function, array<vec2f, ${String(slots)}>>,
  group: ptr<function, array<f32, ${String(slots)}>>,
  share: ptr<function, array<f32, ${String(slots)}>>,
  count: u32,
  jag: f32,
  footprint: f32,
) -> vec3f {
  let steepness = whitecap_steepness();
  let shape = whitecap_shape();
  var longer = 0.0;
  var rollers = vec3f(0.0);
  for (var b = 0u; b < count; b++) {
    let info = crest_band(b);
    let lift = clamp(1.0 + longer, 0.6, 1.5);
    longer += (*s)[b];
    let here = smoothstep(steepness.x, steepness.y, lift * lift * (*group)[b]) * (*share)[b];
    if (info.w <= 0.0 || here <= 0.0) {
      continue;
    }
    let slope = (*g)[b];
    // Down the forward face the surface falls along the direction of travel.
    let forward = select(-1.0, 1.0, dot(slope, steepness.zw) < 0.0);
    let phase = atan2(forward * length(slope), (*s)[b]);
    // Along a breaking group's crest line the roller runs where the crest itself stands high, so a long crest breaks
    // in dashes.
    let crest = smoothstep(0.35, 0.7, lift * lift * (*s)[b] / steepness.x + 0.3 * (jag - 0.45));
    // The roller reaches further down the face the harder the crest breaks and the more air its wave entrains: a wave
    // barely long enough to whitecap carries a sliver of foam on its crest.
    let front = shape.x * here * info.w * (0.5 + jag);
    let back = shape.y * info.w;
    let pixel = clamp(info.y * footprint, 0.02, 1.5);
    let roller = here * crest * smoothstep(-back - pixel, -back, phase) * (1.0 - smoothstep(front, front + pixel, phase));
    rollers.x = max(rollers.x, roller);
    if (roller * info.w > rollers.y) {
      rollers.y = roller * info.w;
      rollers.z = info.z;
    }
  }
  return rollers;
}
`
