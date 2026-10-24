// Prints the WebGPU adapter headed Chrome gets with the fps run's flags, to show it is the hardware GPU.
const { chromium } = await import('/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario/node_modules/playwright/index.mjs')
const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--ignore-gpu-blocklist', '--use-angle=metal', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--force-device-scale-factor=1'],
})
const page = await browser.newPage()
await page.goto('about:blank')
console.log(await browser.version())
console.log(JSON.stringify(await page.evaluate(async () => {
  const a = await navigator.gpu.requestAdapter()
  const i = a.info
  return { vendor: i.vendor, architecture: i.architecture, device: i.device, description: i.description, isFallbackAdapter: i.isFallbackAdapter, timestamps: a.features.has('timestamp-query') }
})))
await browser.close()
