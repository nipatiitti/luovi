// ADR 0011's quick-tier conditions under each layout, replicating tool-validate's ocean.tail-variance: each cascade's
// realised variance (mean over 32 forks of the ocean.tail stream, 2 sum |h0|^2) against the polar trapezoid of F over its
// annulus, and band plus tail against the full m0. Also the foam side: the shortest wave each layout draws against the
// breaking-cutoff candidates of research #42 (0.14 to 2.55 m, weight zero below L_c / sqrt 2 in the #41 prototype), and
// how main's breaking.ts (which still integrates k^2 F over the default layout's annuli) would move its threshold.
import { W, M, build, LAYOUTS, layoutOf, generateRotated, integLog } from './lib.mjs'
const STREAMS = 32
const annulus = (sea, inner, outer, perEFold = 128, thetas = 128) => {
  const spec = W.waveSpectrum(sea), span = Math.log(outer / inner), n = Math.ceil(span * perEFold), ds = span / n, dT = 2 * Math.PI / thetas
  let sum = 0
  for (let i = 0; i <= n; i++) { const k = inner * Math.exp(i * ds); let ring = 0; for (let j = 0; j < thetas; j++) ring += spec.directional(k, -Math.PI + j * dT); sum += (i === 0 || i === n ? 0.5 : 1) * ring * k * k }
  return sum * ds * dT
}
const divergence = (sea, inner, outer) => { const spec = W.waveSpectrum(sea); return integLog((k) => spec.omnidirectional(k) * k * k, inner, outer, 4000) }
for (const name of ['storm', 'gulf', 'archipelago', 'moderateOld']) {
  const sea = build(name, 128, 3, 1)
  const spec = W.waveSpectrum(sea)
  const band = integLog((k) => spec.omnidirectional(k), sea.peakWavenumber * 1e-3, sea.cutWavenumber, 40000)
  const full = band + annulus(sea, sea.cutWavenumber, 1e6 * sea.cutWavenumber)
  const { amplitude, count } = sea.components
  let bandRealised = 0; for (let i = 0; i < count; i++) bandRealised += 0.5 * amplitude[i] ** 2
  const lam = sea.block.choppiness
  let bandDiv = 0; for (let i = 0; i < count; i++) bandDiv += 0.5 * (amplitude[i] * sea.components.k[i]) ** 2
  const divOf = (lay) => sea.choppiness ** 2 * bandDiv + lay.tiles.reduce((p, _, c) => p + lam * lam * divergence(sea, lay.kInner[c], lay.kOuter[c]), 0)
  const div0 = divOf(layoutOf(sea, LAYOUTS.L0))
  for (const [ln, L] of Object.entries(LAYOUTS)) {
    let lay
    try { lay = layoutOf(sea, L) } catch (e) { console.log(`${name.padEnd(12)} ${ln} not applicable: ${e.message}`); continue }
    const realised = new Float64Array(lay.count), stream = W.tailStream(sea.seed)
    for (let s = 0; s < STREAMS; s++) generateRotated(sea, lay, stream.fork(`stream.${s}`)).forEach((c, i) => { let v = 0; for (let j = 0; j < c.re.length; j++) v += c.re[j] ** 2 + c.im[j] ** 2; realised[i] += 2 * v / STREAMS })
    const ratios = lay.tiles.map((_, c) => realised[c] / annulus(sea, lay.kInner[c], lay.kOuter[c]))
    const total = (bandRealised + realised.reduce((a, b) => a + b, 0)) / full
    const shortest = 2 * Math.PI / lay.kOuter[lay.count - 1]
    const thrNew = 1 + (sea.breakingThreshold - 1) * Math.sqrt(divOf(lay) / div0)
    console.log(`${name.padEnd(12)} ${ln} count ${lay.count} tiles ${lay.tiles.map((t) => t.toFixed(2)).join('/')} m | cascade realised/annulus ${ratios.map((r) => r.toFixed(3)).join(' ')} | band+tail/full ${total.toFixed(4)} | last tile ${lay.tiles[lay.count - 1].toFixed(2)} m shortest wave ${(shortest * 100).toFixed(2)} cm, below 0.14/sqrt2 m: ${shortest < 0.14 / Math.SQRT2} | main's threshold ${sea.breakingThreshold.toFixed(4)} -> ${thrNew.toFixed(4)}`)
  }
}
