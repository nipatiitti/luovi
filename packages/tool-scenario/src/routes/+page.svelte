<script lang="ts">
  import { onMount } from 'svelte'
  import type { Camera } from '@luovi/render-scene'
  import { attachCameraControls } from '../lib/cameraControls.ts'
  import { type Host, startHost } from '../lib/host/host.ts'
  import { formatHash, formatMsPerTick, readScenarioFile, SPEEDS } from '../lib/runBar.ts'
  import referenceSea from '../lib/scenarios/reference-moderate.json'
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

  // The run bar. Tick and hash come from the slot each frame reads; running and ms per tick from the Worker's status.
  let host: Host | undefined
  let running = $state(false)
  let tick = $state<number | undefined>(undefined)
  let hash = $state<number | undefined>(undefined)
  let msPerTick = $state<number | undefined>(undefined)
  let speed = $state(1)
  let scenarioName = $state('Moderate reference sea')
  let pendingName = 'Moderate reference sea'
  let loadError = $state<string | undefined>(undefined)
  const noMarkers = new Float32Array(0)

  const readFrame = () => {
    const frame = host?.frame()
    if (frame !== undefined) {
      tick = frame.tick
      hash = frame.hash
    }
    return frame
  }

  const load = (name: string, document: unknown) => {
    pendingName = name
    host?.load(document)
    host?.play()
  }

  const onFile = async (event: Event) => {
    const input = event.currentTarget
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined
    if (file === undefined) return
    const read = await readScenarioFile(file)
    if ('problem' in read) loadError = read.problem
    else load(file.name, read.document)
    if (input instanceof HTMLInputElement) input.value = ''
  }

  onMount(() => {
    refusal = isolationProblem(crossOriginIsolated)
    if (refusal !== undefined || canvas === undefined) return
    const simulation = startHost({
      loaded: () => {
        loadError = undefined
        scenarioName = pendingName
      },
      error: (message) => {
        loadError = message
      },
      status: (status) => {
        running = status.running
        msPerTick = status.msPerTick
      },
    })
    host = simulation
    load(pendingName, referenceSea)
    const controls = attachCameraControls(canvas, initialSettings.camera)
    let viewer: Viewer | undefined
    let stopped = false
    // The renderer reads the newest slot once per frame it draws; until it has started, or if it never does, the run bar
    // reads it here instead, so the slot is still read once per frame.
    let poll = 0
    const pollFrame = () => {
      if (viewer === undefined) readFrame()
      poll = requestAnimationFrame(pollFrame)
    }
    poll = requestAnimationFrame(pollFrame)
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
            settings: {
              sunElevation: degrees(sunElevation),
              sunAzimuth: degrees(sunAzimuth),
              exposureValue,
              camera: controls.camera,
            },
            content: { markers: readFrame()?.markers ?? noMarkers },
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
      cancelAnimationFrame(poll)
      simulation.stop()
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
    <h1>Run</h1>
    <div class="buttons">
      <button onclick={() => (running ? host?.pause() : host?.play())}>{running ? 'Pause' : 'Play'}</button>
      <button onclick={() => host?.step()} disabled={running}>Step</button>
      <select bind:value={speed} onchange={() => host?.setSpeed(speed)} aria-label="Speed">
        {#each SPEEDS as option (option)}
          <option value={option}>{option} times real time</option>
        {/each}
      </select>
    </div>
    <dl>
      <dt>Scenario</dt>
      <dd>{scenarioName}</dd>
      <dt>Tick</dt>
      <dd data-readout="tick">{tick ?? 'not loaded'}</dd>
      <dt>State hash</dt>
      <dd data-readout="hash">{hash === undefined ? 'not loaded' : formatHash(hash)}</dd>
      <dt>Worker per tick</dt>
      <dd data-readout="ms">{formatMsPerTick(msPerTick)}</dd>
    </dl>
    <label>
      <span>Load a scenario file</span>
      <input type="file" accept=".json,application/json" onchange={onFile} />
    </label>
    {#if loadError !== undefined}
      <p class="error" data-readout="load-error">{loadError}</p>
    {/if}
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
  .buttons {
    display: flex;
    gap: 6px;
  }
  .buttons select {
    flex: 1;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    margin: 0;
  }
  dt {
    color: #9aa3ad;
  }
  dd {
    margin: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
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
