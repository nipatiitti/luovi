// Encodes two layouts' frame sequences side by side as a WebM clip (MediaRecorder in headless Chrome, frames paced at
// 30 fps), and writes a strip of frames at 0, 1, 2, 3 and 4 s. node encode.mjs <view> <left> <right>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
const base = '/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual'
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const [view, left, right] = process.argv.slice(2)
const LABEL = { L0: 'L0 baseline', L2: 'L2 golden-angle turn', L5: 'L5 cascade 0 hex-tiled', L6: 'L6 hex-tiled and turned' }
const frames = readdirSync(`${base}/motion/${view}/${left}`).filter((f) => f.endsWith('.png')).sort()
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
await page.route('http://frames.local/**', (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname)
  if (!path.endsWith('.png')) return route.fulfill({ body: '<!doctype html><body></body>', contentType: 'text/html' })
  return route.fulfill({ body: readFileSync(`${base}/motion/${view}${path}`), contentType: 'image/png' })
})
// Served from the routed origin, so the frames are same-origin and the canvas stays clean for capture.
await page.goto('http://frames.local/')
const result = await page.evaluate(async ({ frames, left, right, labels }) => {
  const W = 1280, H = 720, BAR = 40
  const canvas = document.createElement('canvas')
  canvas.width = 2 * W
  canvas.height = H + BAR
  const g = canvas.getContext('2d')
  const fetchBlob = async (u) => (await fetch(u)).blob()
  const blobs = []
  for (const f of frames) blobs.push([await fetchBlob(`http://frames.local/${left}/${f}`), await fetchBlob(`http://frames.local/${right}/${f}`)])
  const bitmaps = async (i) => Promise.all(blobs[i].map((b) => createImageBitmap(b)))
  const draw = ([a, b], i) => {
    g.fillStyle = '#0b0e12'
    g.fillRect(0, 0, canvas.width, BAR)
    g.drawImage(a, 0, BAR)
    g.drawImage(b, W, BAR)
    g.fillStyle = '#e6e9ee'
    g.font = '24px system-ui, sans-serif'
    g.fillText(`${labels[0]}`, 16, 28)
    g.fillText(`${labels[1]}`, W + 16, 28)
    g.fillText(`t = ${(i / 30).toFixed(2)} s`, 2 * W - 160, 28)
  }
  const stream = canvas.captureStream(0)
  const track = stream.getVideoTracks()[0]
  const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 40_000_000 })
  const chunks = []
  recorder.ondataavailable = (e) => chunks.push(e.data)
  const stopped = new Promise((r) => (recorder.onstop = r))
  let next = await bitmaps(0)
  recorder.start()
  const t0 = performance.now()
  const late = []
  for (let i = 0; i < blobs.length; i++) {
    const current = next
    draw(current, i)
    const due = t0 + (i * 1000) / 30
    const wait = due - performance.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    else late.push(i)
    track.requestFrame()
    if (i + 1 < blobs.length) next = await bitmaps(i + 1)
  }
  await new Promise((r) => setTimeout(r, 100))
  recorder.stop()
  await stopped
  const buf = new Uint8Array(await new Blob(chunks, { type }).arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return { webm: btoa(s), type, late: late.length, seconds: (performance.now() - t0) / 1000 }
}, { frames, left, right, labels: [LABEL[left], LABEL[right]] })
const clip = `${base}/motion/${view}.${left}-vs-${right}.webm`
writeFileSync(clip, Buffer.from(result.webm, 'base64'))
console.log(clip, result.type, `late frames ${result.late}`, `wall ${result.seconds.toFixed(1)} s`)
// The strip: rows at 0, 1, 2, 3 and 4 s, the two layouts side by side, at half size.
const picks = [0, 30, 60, 90, 119]
const rows = picks.map((i) => {
  const f = frames[i]
  const img = (l) => `data:image/png;base64,${readFileSync(`${base}/motion/${view}/${l}/${f}`).toString('base64')}`
  return `<div class="row"><div class="t">t = ${(i / 30).toFixed(2)} s</div><img src="${img(left)}"><img src="${img(right)}"></div>`
})
await page.setViewportSize({ width: 1280, height: 400 })
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; background: #0b0e12; color: #e6e9ee; font: 16px system-ui, sans-serif; }
.head { display: grid; grid-template-columns: 640px 640px; padding: 6px 0; } .head div { padding-left: 8px; }
.row img { width: 640px; height: 360px; display: inline-block; vertical-align: top; }
.t { padding: 4px 8px; }
</style></head><body><div class="head"><div>${LABEL[left]}</div><div>${LABEL[right]}</div></div>${rows.join('')}</body></html>`)
const strip = `${base}/motion/${view}.${left}-vs-${right}.strip.png`
await page.screenshot({ path: strip, fullPage: true })
console.log(strip)
await browser.close()
