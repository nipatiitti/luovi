// Item 5 and item 4: plain sea parameters and the effective lambda per N.
import { build, spectralBudget, LAYOUT } from './lib.mjs'
const seeds = [1, 2, 3, 4, 5]
for (const name of ['A', 'B', 'C', 'D']) {
  for (const cut of [3, 2]) {
    const { sea } = build(name, 32, cut, 1)
    const b = spectralBudget(sea)
    const m0 = sea.bandVariance + b.tailVar
    const Hs = 4 * Math.sqrt(m0), Lp = 2 * Math.PI / sea.peakWavenumber, Tp = 2 * Math.PI / sea.spectrum.peakFrequency
    // mean wavenumber from Tm01 over band+tail (frequency moments via k integral of omega S)
    const m1 = b.spec ? null : null
    console.log(JSON.stringify({ name, cut, gamma: sea.block.gamma, alpha: +sea.spectrum.alpha.toFixed(4), capped: sea.spectrum.peakCapped, Hs: +Hs.toFixed(3), Tp: +Tp.toFixed(2), Lp: +Lp.toFixed(1), steep: +(Hs / Lp).toFixed(4), kpHs2: +(sea.peakWavenumber * Hs / 2).toFixed(3), HsBand: +(4 * Math.sqrt(sea.bandVariance)).toFixed(3), kpd: +(sea.peakWavenumber * sea.depth).toFixed(2), tiles: b.layout.tiles.map((t) => +t.toFixed(2)), kFloor: +b.kFloor.toFixed(1) }))
    const row = {}
    for (const N of Object.keys(LAYOUT).map(Number)) {
      let lam = 0, K1 = 0
      for (const s of seeds) { const r = build(name, N, cut, s).sea; lam += r.choppiness; K1 += r.contraction / r.choppiness }
      row[N] = `lambda ${(lam / seeds.length).toFixed(3)} K(lambda=1) ${(K1 / seeds.length).toFixed(3)}`
    }
    console.log('  ', JSON.stringify(row))
  }
}
