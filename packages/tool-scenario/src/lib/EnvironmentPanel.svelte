<script lang="ts">
  import { MAX_BAND_COMPONENTS } from '@luovi/core'
  import { jonswap } from '@luovi/data'
  import type { Block, EnvironmentForm } from './environment.ts'

  // The live environment's controls: depth and seed for a reload, then the wind, sea and current blocks, each of which
  // the page sends whole on every edit.
  let {
    form = $bindable(),
    edit,
    reload,
  }: { form: EnvironmentForm; edit: (block: Block) => void; reload: () => void } = $props()
</script>

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
