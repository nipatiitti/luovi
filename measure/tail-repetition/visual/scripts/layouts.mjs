// Prints each sea's cascade tiles under each candidate rule (the worktree's built sim-world).
import { readFileSync } from 'node:fs'
const root = '/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages'
const W = await import(`${root}/sim-world/dist/index.js`)
const doc = (p) => JSON.parse(readFileSync(`${root}/tool-scenario/src/lib/scenarios/${p}.json`, 'utf8'))
const n128 = (d) => ({ ...d, environment: { ...d.environment, sea: { ...d.environment.sea, strips: 32, sectors: 4, boundWaves: 'factorised' } } })
const seas = { bothnian: doc('band-size/bothnian'), helsinki: doc('band-size/helsinki'), moderate: doc('reference-seas/moderate') }
const phi = (1 + Math.sqrt(5)) / 2
const rules = { L0: {}, L1: { ratio: 8 + phi }, L3: { periodsPerTile: 12 } }
for (const [name, d] of Object.entries(seas)) {
  const w = W.loadWorld(n128(d))
  const sea = w.sea
  const kc = sea.cutWavenumber
  console.log(name, 'cut k', kc.toFixed(4), 'cut wavelength', (2 * Math.PI / kc).toFixed(2), 'm', JSON.stringify(Object.fromEntries(Object.entries(sea.block).filter(([, v]) => typeof v === 'number'))))
  for (const [r, o] of Object.entries(rules)) {
    const l = W.defaultCascadeLayout(sea, { ...W.DEFAULT_CASCADE_RULE, ...o })
    console.log('  ', r, l?.tiles.map((t) => t.toFixed(2)).join(' / '), 'ratios', l?.tiles.slice(1).map((t, i) => (l.tiles[i] / t).toFixed(3)).join(' '))
  }
}
