// The rotated replica at angle 0 against sim-world's generateTail, bit for bit, and each layout's tiles.
import { W, build, LAYOUTS, layoutOf, generateRotated, ruleOf } from './lib.mjs'
for (const name of ['storm', 'gulf', 'archipelago', 'moderateOld']) {
  const sea = build(name, 128, 3, 1)
  const lay = layoutOf(sea, LAYOUTS.L0)
  const a = W.generateTail(sea, lay, W.tailStream(1)), b = generateRotated(sea, lay, W.tailStream(1))
  let same = true
  a.forEach((c, i) => { for (let j = 0; j < c.re.length; j++) if (!Object.is(c.re[j], b[i].re[j]) || !Object.is(c.im[j], b[i].im[j])) same = false })
  const def = W.defaultCascadeLayout(sea)
  console.log(name, 'replica==generateTail', same, 'L0==default', JSON.stringify(def.tiles) === JSON.stringify(lay.tiles))
}
