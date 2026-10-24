// Slope self-correlation max per shift-distance annulus (mean over seeds, worst seed), and slope weights per cascade.
import { readFileSync, readdirSync } from 'node:fs'
const files = readdirSync('out').filter((f) => f.startsWith('profile-')).sort()
for (const file of files) {
  const lines = readFileSync(`out/${file}`, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const head = lines[0]
  const w = lines.filter((r) => r.kind === 'weights' && r.field === 's')
  const wm = w[0].cascades.map((_, c) => (w.reduce((p, r) => p + r.cascades[c], 0) / w.length).toFixed(2))
  const prof = {}
  for (const r of lines.filter((r) => r.kind === 'profile')) (prof[`${r.fromLp}-${r.toLp}`] ??= []).push(r)
  const cells = Object.entries(prof).map(([k, rs]) => { const v = rs.map((r) => r.max); const worst = rs.reduce((a, b) => (b.max > a.max ? b : a)); return `${k}: ${(v.reduce((a, b) => a + b) / v.length).toFixed(2)} (worst ${worst.max.toFixed(2)} at ${worst.atM.map((x) => x.toFixed(1)).join(',')} m)` })
  console.log(`${head.sea} ${head.layout} slope weights band ${(w.reduce((p, r) => p + r.band128, 0) / w.length).toFixed(2)} cascades ${wm.join('/')}\n   ${cells.join('\n   ')}`)
}
