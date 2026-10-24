// Mean (min to max) over seeds of each search row, per sea, layout, band size, field and exclusion.
import { readFileSync, readdirSync } from 'node:fs'
const files = readdirSync('out').filter((f) => f.endsWith('.jsonl') || f.endsWith('-N.jsonl.txt')).sort()
const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3)
for (const file of files) {
  const lines = readFileSync(`out/${file}`, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const head = lines[0]
  console.log(`\n== ${head.sea} ${head.layout} ratio ${f3(head.ratio)} ppt ${head.periodsPerTile} rot ${head.rotate} | Lp ${f2(head.Lp)} m cutL ${f2(head.cutWavelength)} m | count ${head.count} tiles ${head.tiles.map(f2).join('/')} m = ${head.tilesLp.map(f3).join('/')} Lp | inner bins ${head.kInnerBins.map((v) => v.toFixed(1)).join('/')} outer bins ${head.kOuterBins.map((v) => v.toFixed(1)).join('/')} | shortest ${(head.shortestWave * 100).toFixed(2)} cm | ellH ${f2(head.ellH_Lp)} Lp ellS ${f2(head.ellS_Lp)} Lp`)
  const groups = {}
  for (const r of lines.slice(1).filter((r) => r.kind === undefined)) (groups[`${r.N} ${r.field} ${r.exclusion}`] ??= []).push(r)
  for (const [key, rs] of Object.entries(groups)) {
    const st = (g) => { const v = rs.map(g); return `${f3(v.reduce((a, b) => a + b) / v.length)} [${f3(Math.min(...v))}-${f3(Math.max(...v))}]` }
    const where = rs.map((r) => `(${f2(r.atLp[0])},${f2(r.atLp[1])})Lp=(${r.atM[0].toFixed(1)},${r.atM[1].toFixed(1)})m nat ${f3(r.naturalAtMax)}`).join('; ')
    console.log(`  N ${key.padEnd(10)} max ${st((r) => r.max)}  tile0-multiple ${st((r) => r.tileMultipleMax)}  at ${where}`)
  }
}
