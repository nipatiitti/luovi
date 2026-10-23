<script lang="ts">
  import { onMount } from 'svelte'
  import { type EffectiveScenario, MAX_BAND_COMPONENTS, type SeaDescription } from '@luovi/core'
  import { jonswap } from '@luovi/data'
  import type { Camera } from '@luovi/render-scene'
  import { attachCameraControls } from '../lib/cameraControls.ts'
  import {
    type Block,
    createBlockSender,
    currentBlock,
    type EnvironmentForm,
    formFor,
    scenarioFile,
    seaBlock,
    windBlock,
  } from '../lib/environment.ts'
  import { type Host, startHost } from '../lib/host/host.ts'
  import { formatHash, formatMsPerTick, readScenarioFile, SPEEDS } from '../lib/runBar.ts'
  import { SHOWCASE } from '../lib/scenarios/showcase.ts'
  import { isolationProblem } from '../lib/isolation.ts'
  import { degrees, initialSettings, toDegrees } from '../lib/settings.ts'
  import { startViewer, type Viewer } from '../lib/viewer.ts'

  // The panel works in degrees and compass bearings; the render settings it builds are radians.
  let sunElevation = $state(Math.round(toDegrees(initialSettings.sunElevation)))
  let sunAzimuth = $state(Math.round(toDegrees(initialSettings.sunAzimuth)))
  let exposureValue = $state(initialSettings.exposureValue)
  let cameraMode = $state<Camera['mode']>(initialSettings.camera.mode)
  let band = $state(true)
  // A toggle per tail cascade of the drawn sea; a cascade with no entry yet is drawn.
  let cascades = $state<boolean[]>([])
  let wireframe = $state(false)
  let foam = $state(true)
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
  const firstShowcase = SHOWCASE[1] ?? SHOWCASE[0]
  let showcase = $state(firstShowcase?.name ?? '')
  let scenarioName = $state(firstShowcase?.name ?? 'No scenario')
  // The name of the load in flight, shown once the Worker accepts it.
  let pendingName = ''
  let problem = $state<string | undefined>(undefined)
  const noMarkers = new Float32Array(0)
  // The loaded world's sea; the renderer uploads a new one when this changes identity.
  let sea: SeaDescription | null = null

  // The live environment. The form opens from each load's effective scenario and is not overwritten by the Worker's
  // echo of an edit, which would fight a slider mid-drag; the echoed effective scenario is what an export writes.
  // Raw, not a deep proxy: it is replaced whole and posted back to the Worker on reload, which cannot clone a proxy.
  let effective = $state.raw<EffectiveScenario | undefined>(undefined)
  let form = $state<EnvironmentForm | undefined>(undefined)
  let lastApplied = $state<string | undefined>(undefined)
  const blocks = createBlockSender((input) => host?.send(input))

  const edit = (block: Block) => {
    if (form === undefined || effective === undefined) return
    switch (block) {
      case 'wind':
        blocks.edit({ kind: 'environment', block, value: windBlock(form.wind, effective.environment.wind) })
        return
      case 'sea':
        blocks.edit({ kind: 'environment', block, value: seaBlock(form.sea, effective.environment.sea) })
        return
      case 'current':
        blocks.edit({ kind: 'environment', block, value: currentBlock(form.current, effective.environment.current) })
    }
  }

  const readFrame = () => {
    blocks.flush()
    const frame = host?.frame()
    if (frame !== undefined) {
      tick = frame.tick
      hash = frame.hash
    }
    return frame
  }

  const load = (name: string, document: unknown) => {
    pendingName = name
    blocks.clear()
    host?.load(document)
    host?.play()
  }

  const onShowcase = () => {
    const entry = SHOWCASE.find((candidate) => candidate.name === showcase)
    if (entry !== undefined) load(entry.name, entry.document)
  }

  const onFile = async (event: Event) => {
    const input = event.currentTarget
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined
    if (file === undefined) return
    const read = await readScenarioFile(file)
    if ('problem' in read) problem = read.problem
    else load(file.name, read.document)
    if (input instanceof HTMLInputElement) input.value = ''
  }

  // Depth and seed sit outside the three live blocks, so they take a reload: the effective scenario with both, from tick 0.
  const reload = () => {
    if (effective === undefined || form === undefined) return
    const { depth, seed } = form
    load(scenarioName, { ...effective, seed, environment: { ...effective.environment, depth } })
  }

  const exportScenario = () => {
    if (effective === undefined) return
    const url = URL.createObjectURL(scenarioFile(effective))
    const link = document.createElement('a')
    link.href = url
    link.download = `${scenarioName.replace(/[.]json$/, '').replace(/[^A-Za-z0-9]+/g, '-')}-tick-${String(tick ?? 0)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  onMount(() => {
    refusal = isolationProblem(crossOriginIsolated)
    if (refusal !== undefined || canvas === undefined) return
    const simulation = startHost({
      loaded: (loaded) => {
        sea = loaded.sea
        effective = loaded.effectiveScenario
        form = formFor(loaded.effectiveScenario)
        problem = undefined
        lastApplied = undefined
        scenarioName = pendingName
      },
      environment: (change) => {
        if ('sea' in change) sea = change.sea ?? null
        effective = change.effectiveScenario
        problem = undefined
        lastApplied = `${change.applied.map((input) => input.kind === 'environment' ? input.block : input.control).join(', ')} at tick ${String(change.tick)}`
      },
      error: (message) => {
        problem = message
      },
      status: (status) => {
        running = status.running
        msPerTick = status.msPerTick
      },
    })
    host = simulation
    if (firstShowcase !== undefined) load(firstShowcase.name, firstShowcase.document)
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
      const count = viewer?.cascadeCount ?? 0
      if (count !== cascades.length) cascades = Array.from({ length: count }, (_, c) => cascades[c] ?? true)
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
          const slot = readFrame()
          return {
            settings: {
              sunElevation: degrees(sunElevation),
              sunAzimuth: degrees(sunAzimuth),
              exposureValue,
              camera: controls.camera,
            },
            sea,
            tick: slot?.tick ?? 0,
            oceanDebug: { band, cascades, wireframe, foam },
            markers: slot?.markers ?? noMarkers,
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
      <dt>Last edit</dt>
      <dd data-readout="applied">{lastApplied ?? 'none yet'}</dd>
    </dl>
    {#if problem !== undefined}
      <p class="error" data-readout="load-error">{problem}</p>
    {/if}

    <h1>Scenario</h1>
    <label>
      <span>Showcase</span>
      <select bind:value={showcase} onchange={onShowcase} data-control="showcase">
        {#each SHOWCASE as entry (entry.name)}
          <option value={entry.name}>{entry.name}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>Import a scenario file</span>
      <input type="file" accept=".json,application/json" onchange={onFile} />
    </label>
    <div class="buttons">
      <button onclick={exportScenario} disabled={effective === undefined} data-control="export">Export effective scenario</button>
    </div>
    {#if form !== undefined}
      <label>
        <span>Depth in metres</span>
        <input type="number" min="1" step="1" bind:value={form.depth} data-control="depth" />
      </label>
      <label>
        <span>Seed</span>
        <input type="number" min="0" max="4294967295" step="1" bind:value={form.seed} data-control="seed" />
      </label>
      <div class="buttons">
        <button onclick={reload} data-control="reload">Reload from tick 0</button>
      </div>
      <p class="hint">Depth and seed apply on reload. Wind, sea and current apply live.</p>

      <h1>Wind</h1>
      <label>
        <span>Speed at 10 m <output>{form.wind.knots.toFixed(1)} kn</output></span>
        <input type="range" min="0" max="60" step="0.1" bind:value={form.wind.knots} oninput={() => edit('wind')} />
      </label>
      <label>
        <span>From <output>{form.wind.from}°</output></span>
        <input type="range" min="0" max="359" step="1" bind:value={form.wind.from} oninput={() => edit('wind')} />
      </label>
      <label>
        <span>Roughness length <output>{form.wind.roughness} mm</output></span>
        <input type="number" min="0.001" step="0.01" bind:value={form.wind.roughness} oninput={() => edit('wind')} />
      </label>

      <h1>Sea</h1>
      <label class="toggle">
        <input type="checkbox" bind:checked={form.sea.on} onchange={() => edit('sea')} data-control="sea-on" />
        <span>Waves (off is flat water)</span>
      </label>
      {#if form.sea.on}
        <label>
          <span>Generating wind <output>{form.sea.knots.toFixed(1)} kn</output></span>
          <input type="range" min="1" max="60" step="0.1" bind:value={form.sea.knots} oninput={() => edit('sea')} data-control="sea-knots" />
        </label>
        <label>
          <span>From <output>{form.sea.from}°</output></span>
          <input type="range" min="0" max="359" step="1" bind:value={form.sea.from} oninput={() => edit('sea')} />
        </label>
        <label>
          <span>Fetch <output>{form.sea.fetch} km</output></span>
          <input type="range" min="1" max="500" step="1" bind:value={form.sea.fetch} oninput={() => edit('sea')} data-control="sea-fetch" />
        </label>
        <label>
          <span>Peak enhancement <output>{form.sea.gamma.toFixed(1)}</output></span>
          <input
            type="range"
            min={jonswap.gammaMin.value}
            max={jonswap.gammaMax.value}
            step="0.1"
            bind:value={form.sea.gamma}
            oninput={() => edit('sea')}
          />
        </label>
        <label>
          <span>Cut ratio <output>{form.sea.cutRatio.toFixed(1)}</output></span>
          <input type="range" min="1.1" max="10" step="0.1" bind:value={form.sea.cutRatio} oninput={() => edit('sea')} />
        </label>
        <label>
          <span>Strips <output>{form.sea.strips}</output></span>
          <input type="range" min="1" max="16" step="1" bind:value={form.sea.strips} oninput={() => edit('sea')} />
        </label>
        <label>
          <span>Sectors <output>{form.sea.sectors}</output></span>
          <input type="range" min="1" max="12" step="1" bind:value={form.sea.sectors} oninput={() => edit('sea')} />
        </label>
        <p class="hint">Strips times sectors is at most {MAX_BAND_COMPONENTS}: {form.sea.strips * form.sea.sectors} now.</p>
        <label>
          <span>Choppiness <output>{form.sea.choppiness.toFixed(2)}</output></span>
          <input type="range" min="0" max="2" step="0.05" bind:value={form.sea.choppiness} oninput={() => edit('sea')} />
        </label>
      {/if}

      <h1>Current</h1>
      <label>
        <span>Speed <output>{form.current.knots.toFixed(1)} kn</output></span>
        <input type="range" min="0" max="6" step="0.1" bind:value={form.current.knots} oninput={() => edit('current')} />
      </label>
      <label>
        <span>Sets toward <output>{form.current.toward}°</output></span>
        <input type="range" min="0" max="359" step="1" bind:value={form.current.toward} oninput={() => edit('current')} />
      </label>
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
    <label class="toggle">
      <input type="checkbox" bind:checked={band} />
      <span>Band</span>
    </label>
    {#each cascades as _, c (c)}
      <label class="toggle">
        <input type="checkbox" bind:checked={cascades[c]} />
        <span>Cascade {c}</span>
      </label>
    {/each}
    <label class="toggle">
      <input type="checkbox" bind:checked={foam} />
      <span>Foam</span>
    </label>
    <label class="toggle">
      <input type="checkbox" bind:checked={wireframe} />
      <span>Wireframe rings</span>
    </label>
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
    max-height: calc(100vh - 48px);
    overflow-y: auto;
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
  label.toggle {
    display: flex;
    align-items: center;
    gap: 6px;
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
