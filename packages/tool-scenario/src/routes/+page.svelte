<script lang="ts">
  import { onMount } from 'svelte'
  import type { EffectiveScenario, SeaDescription } from '@luovi/core'
  import { openSeaRoughnessLength } from '@luovi/data'
  import type { Camera } from '@luovi/render-scene'
  import { attachCameraControls } from '../lib/cameraControls.ts'
  import EnvironmentPanel from '../lib/EnvironmentPanel.svelte'
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
  import { OPENING_SHOWCASE, SHOWCASE } from '../lib/scenarios/showcase.ts'
  import { isolationProblem } from '../lib/isolation.ts'
  import { azimuthOf, bearingOf, toDegrees, toRadians } from '../lib/angles.ts'
  import { initialSettings } from '../lib/settings.ts'
  import { frameCounter, installShotsHook } from '../lib/shots.ts'
  import { startViewer, type Viewer } from '../lib/viewer.ts'
  import { FOAM_VARIANTS, type FoamReadout, variantNamed } from '../lib/foamPrototype.ts'

  // The panel works in degrees and compass bearings; the render settings it builds are radians.
  let sunElevation = $state(Math.round(toDegrees(initialSettings.sunElevation)))
  let sunBearing = $state(Math.round(bearingOf(initialSettings.sunAzimuth)))
  let exposureValue = $state(initialSettings.exposureValue)
  let cameraMode = $state<Camera['mode']>(initialSettings.camera.mode)
  let band = $state(true)
  // A toggle per tail cascade of the drawn sea; a cascade with no entry yet is drawn.
  let cascades = $state<boolean[]>([])
  let wireframe = $state(false)
  let foam = $state(true)
  // PROTOTYPE (#41): the whitecap variant, from ?foam= and the bar at the bottom.
  let foamVariant = $state(variantNamed(new URLSearchParams(location.search).get('foam')))
  let foamReadout = $state<FoamReadout | null>(null)
  const cycleFoam = (step: number) => {
    const at = FOAM_VARIANTS.indexOf(foamVariant)
    foamVariant = FOAM_VARIANTS[(at + step + FOAM_VARIANTS.length) % FOAM_VARIANTS.length] ?? foamVariant
    const url = new URL(location.href)
    url.searchParams.set('foam', foamVariant.key)
    history.replaceState(history.state, '', url)
  }
  const onFoamKey = (event: KeyboardEvent) => {
    const target = event.target
    if (target instanceof HTMLElement && (target.closest('input, textarea, select') || target.isContentEditable)) return
    if (event.key === 'ArrowLeft') cycleFoam(-1)
    else if (event.key === 'ArrowRight') cycleFoam(1)
  }
  const percent = (fraction: number) => `${(fraction * 100).toPrecision(2)}%`
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
  let showcase = $state(OPENING_SHOWCASE.name)
  let scenarioName = $state(OPENING_SHOWCASE.name)
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
  // pnpm shots waits on loads and drawn frames; see lib/shots.ts.
  const frames = frameCounter()
  let loadWaiter: { resolve: () => void; reject: (error: Error) => void } | undefined

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
        loadWaiter?.resolve()
        loadWaiter = undefined
      },
      environment: (change) => {
        if ('sea' in change) sea = change.sea ?? null
        effective = change.effectiveScenario
        problem = undefined
        lastApplied = `${change.applied.map((input) => input.kind === 'environment' ? input.block : input.control).join(', ')} at tick ${String(change.tick)}`
      },
      error: (message) => {
        problem = message
        loadWaiter?.reject(new Error(message))
        loadWaiter = undefined
      },
      status: (status) => {
        running = status.running
        msPerTick = status.msPerTick
      },
    })
    host = simulation
    load(OPENING_SHOWCASE.name, OPENING_SHOWCASE.document)
    const controls = attachCameraControls(canvas, initialSettings.camera)
    let viewer: Viewer | undefined
    const uninstallShots = new URLSearchParams(location.search).has('shots')
      ? installShotsHook({
          load: (name) =>
            new Promise((resolve, reject) => {
              const entry = SHOWCASE.find((candidate) => candidate.name === name)
              if (entry === undefined) {
                reject(new Error(`no showcase scenario named ${name}`))
                return
              }
              loadWaiter = { resolve, reject }
              showcase = entry.name
              load(entry.name, entry.document)
            }),
          apply: (view) => {
            controls.set(view.camera)
            cameraMode = view.camera.mode
            sunElevation = view.sunElevation
            sunBearing = view.sunBearing
            exposureValue = view.exposureValue
            foam = view.foam
            foamVariant = variantNamed(view.foamVariant)
          },
          pause: () => host?.pause(),
          frames: frames.after,
          read: () => ({ tick, timings: viewer?.timings === undefined ? null : Object.fromEntries(viewer.timings) }),
        })
      : undefined
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
      foamReadout = viewer?.foamReadout ?? null
      timings =
        latest === undefined
          ? undefined
          : [...latest].map(([pass, ms]) => `${pass} ${ms.toFixed(2)} ms`).join(', ')
    }, 500)
    const start = async (target: HTMLCanvasElement): Promise<void> => {
      try {
        const started = await startViewer(target, (seconds) => {
          frames.drawn()
          if (controls.camera.mode !== cameraMode) controls.setMode(cameraMode)
          controls.update(seconds)
          const slot = readFrame()
          return {
            settings: {
              sunElevation: toRadians(sunElevation),
              sunAzimuth: azimuthOf(sunBearing),
              exposureValue,
              camera: controls.camera,
            },
            sea,
            // Before the first load there is no sea, and the floor it would set is zero whatever z0 is.
            roughnessLength: effective?.environment.wind.z0.value ?? openSeaRoughnessLength.value,
            tick: slot?.tick ?? 0,
            oceanDebug: { band, cascades, wireframe, foam },
            markers: slot?.markers ?? noMarkers,
            foamVariant,
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
      uninstallShots?.()
      clearInterval(timer)
      cancelAnimationFrame(poll)
      simulation.stop()
      controls.detach()
      viewer?.stop()
    }
  })
</script>

<svelte:window onkeydown={onFoamKey} />

{#if refusal !== undefined}
  <main class="message">
    <h1>Cross-origin isolation required</h1>
    <p>{refusal}</p>
  </main>
{:else}
  <canvas bind:this={canvas}></canvas>
  <div class="prototype-bar">
    <button onclick={() => cycleFoam(-1)} aria-label="Previous foam variant">&larr;</button>
    <div>
      <strong>{foamVariant.key}</strong> {foamVariant.label}
      <small>
        {#if foamReadout === null}
          Flat water
        {:else if foamReadout.threshold === null}
          At or below the 4.23 m/s onset, so no whitecaps
        {:else}
          Target coverage {percent(foamReadout.targetCoverage)}, threshold {foamReadout.threshold.toFixed(3)}
        {/if}
      </small>
    </div>
    <button onclick={() => cycleFoam(1)} aria-label="Next foam variant">&rarr;</button>
  </div>
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
      <EnvironmentPanel bind:form {edit} {reload} />
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
      <span>Sun bearing <output>{sunBearing}°</output></span>
      <input type="range" min="0" max="359" step="1" bind:value={sunBearing} />
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
  aside :global(h1) {
    font-size: 14px;
    margin: 0;
  }
  aside :global(label) {
    display: grid;
    gap: 4px;
  }
  aside :global(label span) {
    display: flex;
    justify-content: space-between;
  }
  aside :global(label.toggle) {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  aside :global(.buttons) {
    display: flex;
    gap: 6px;
  }
  aside :global(.buttons select) {
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
  aside :global(.hint) {
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
  /* PROTOTYPE (#41): the whitecap variant switcher, deliberately unlike the tool's own panel. */
  .prototype-bar {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 999px;
    background: #ffd84d;
    color: #111;
    box-shadow: 0 4px 16px rgb(0 0 0 / 40%);
    font: 13px/1.3 system-ui, sans-serif;
    z-index: 10;
  }
  .prototype-bar div {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 360px;
  }
  .prototype-bar button {
    border: 0;
    border-radius: 999px;
    width: 32px;
    height: 32px;
    background: #111;
    color: #ffd84d;
    font-size: 16px;
    cursor: pointer;
  }
</style>
