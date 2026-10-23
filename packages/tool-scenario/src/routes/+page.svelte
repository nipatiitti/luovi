<script lang="ts">
  import { onMount } from 'svelte'
  import type { Camera } from '@luovi/render-scene'
  import { attachCameraControls } from '../lib/cameraControls.ts'
  import { isolationProblem } from '../lib/isolation.ts'
  import { degrees, initialSettings, toDegrees } from '../lib/settings.ts'
  import { startViewer, type Viewer } from '../lib/viewer.ts'

  // The panel works in degrees and compass bearings; the render settings it builds are radians.
  let sunElevation = $state(Math.round(toDegrees(initialSettings.sunElevation)))
  let sunAzimuth = $state(Math.round(toDegrees(initialSettings.sunAzimuth)))
  let exposureValue = $state(initialSettings.exposureValue)
  let cameraMode = $state<Camera['mode']>(initialSettings.camera.mode)
  let refusal = $state<string | undefined>(undefined)
  let failure = $state<string | undefined>(undefined)
  let timings = $state<string | undefined>(undefined)
  let canvas: HTMLCanvasElement | undefined = $state()

  onMount(() => {
    refusal = isolationProblem(crossOriginIsolated)
    if (refusal !== undefined || canvas === undefined) return
    const controls = attachCameraControls(canvas, initialSettings.camera)
    let viewer: Viewer | undefined
    let stopped = false
    const timer = setInterval(() => {
      const latest = viewer?.timings
      timings =
        latest === undefined
          ? undefined
          : [...latest].map(([pass, ms]) => `${pass} ${ms.toFixed(2)} ms`).join(', ')
    }, 500)
    const start = async (target: HTMLCanvasElement): Promise<void> => {
      try {
        const started = await startViewer(target, (seconds) => {
          if (controls.camera.mode !== cameraMode) controls.setMode(cameraMode)
          controls.update(seconds)
          return {
            sunElevation: degrees(sunElevation),
            sunAzimuth: degrees(sunAzimuth),
            exposureValue,
            camera: controls.camera,
          }
        })
        if (stopped) started.stop()
        else viewer = started
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error)
      }
    }
    void start(canvas)
    return () => {
      stopped = true
      clearInterval(timer)
      controls.detach()
      viewer?.stop()
    }
  })
</script>

{#if refusal !== undefined}
  <main class="message">
    <h1>Cross-origin isolation required</h1>
    <p>{refusal}</p>
  </main>
{:else}
  <canvas bind:this={canvas}></canvas>
  <aside>
    <h1>Scene</h1>
    {#if failure !== undefined}
      <p class="error">{failure}</p>
    {/if}
    <label>
      <span>Sun elevation <output>{sunElevation}°</output></span>
      <input type="range" min="-10" max="90" step="1" bind:value={sunElevation} />
    </label>
    <label>
      <span>Sun bearing <output>{sunAzimuth}°</output></span>
      <input type="range" min="0" max="359" step="1" bind:value={sunAzimuth} />
    </label>
    <label>
      <span>Exposure value <output>{exposureValue.toFixed(1)} EV</output></span>
      <input type="range" min="-8" max="2" step="0.1" bind:value={exposureValue} />
    </label>
    <label>
      <span>Camera</span>
      <select bind:value={cameraMode}>
        <option value="orbit">Orbit the origin</option>
        <option value="free">Free flight</option>
      </select>
    </label>
    <p class="hint">
      {cameraMode === 'orbit'
        ? 'Drag to orbit, scroll to zoom.'
        : 'Drag to look. W, A, S and D fly, Q and E sink and climb, Shift goes faster.'}
    </p>
    {#if timings !== undefined}
      <p class="hint">GPU: {timings}</p>
    {/if}
  </aside>
{/if}

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
    overflow: hidden;
    background: #0b0e12;
    color: #e6e9ee;
    font: 13px/1.4 system-ui, sans-serif;
  }
  canvas {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
    touch-action: none;
  }
  aside {
    position: fixed;
    top: 12px;
    right: 12px;
    width: 260px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba(11, 14, 18, 0.78);
    backdrop-filter: blur(6px);
    display: grid;
    gap: 10px;
  }
  h1 {
    font-size: 14px;
    margin: 0;
  }
  label {
    display: grid;
    gap: 4px;
  }
  label span {
    display: flex;
    justify-content: space-between;
  }
  .hint {
    margin: 0;
    color: #9aa3ad;
  }
  .error {
    margin: 0;
    color: #ff8a80;
  }
  .message {
    max-width: 640px;
    margin: 15vh auto;
    padding: 0 24px;
  }
  .message h1 {
    font-size: 20px;
    margin-bottom: 12px;
  }
</style>
