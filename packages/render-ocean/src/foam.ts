import { TICKS_PER_SECOND, type WhitecapTable } from '@luovi/core'
import type { RenderOceanSettings } from './settings.ts'
import { cascadeWgsl, phaseWgsl, waveWgsl, wrap } from './shared.ts'
import { MAX_CASCADES, type TailFields } from './tail.ts'
import { CREST_BANDS, whitecapWgsl } from './whitecaps.ts'

// The foam buffer of ADR 0011: a world-aligned, camera-centred, toroidal buffer of foam density and the rate it fades
// at. Each frame one pass fades every texel's density at its own rate and raises it to the foam a roller passing over it now leaves
// (whitecaps.ts), or a hull's stamp, so a whitecap leaves a trail that stays on its water and fades.
//
// The buffer is indexed by undisplaced (Lagrangian) position, the coordinate every tail field and the band's phase are
// evaluated at, and the surface looks foam up at the undisplaced position of each pixel. Foam therefore rides the
// displacement map: a texel's foam moves exactly as the water particle it was injected on, which is advection by the
// surface's horizontal velocity integrated without error, with no velocity field, no resampling and so no numerical
// diffusion. What it leaves out is the second-order Stokes drift, about 0.1 m/s in the storm sea, so a few tenths of a
// metre over a foam lifetime.
//
// The surface draws the rollers themselves per pixel, sharp at any distance; the buffer only has to hold what they
// leave, which is smooth, and which the surface's lace breaks into detail.

/** Stamps one frame may inject: hull contact from render-ship (step 2) sends a handful per hull. */
export const MAX_FOAM_STAMPS = 64

/** Where each field of the `Foam` uniform starts, in 4-byte words; the WGSL struct below lists them in this order. */
const FOAM_WORD = {
  window: 0,
  shift: 2,
  corner: 4,
  spacing: 6,
  elapsed: 7,
  trail: 8,
  count: 9,
  cascadeCount: 10,
  stampCount: 11,
  keep: 12,
  stampRate: 13,
  cascades: 16,
  /** The steepness and shape constants, then a vec4 per crest band, as the surface lays them out. */
  whitecap: 16 + 4 * MAX_CASCADES,
  crestBands: 16 + 4 * MAX_CASCADES + 8,
} as const

/** Crest bands the buffer tests for rollers: the CPU band as one, then each cascade's. */
const CREST_BAND_SLOTS = 1 + CREST_BANDS * MAX_CASCADES

const FOAM_UNIFORM_BYTES = 4 * (FOAM_WORD.crestBands + 4 * CREST_BAND_SLOTS)

/** Density and the rate it fades at, 1/s: a small breaker's foam is gone far sooner than a long wave's. */
const FOAM_FORMAT: GPUTextureFormat = 'rg16float'

const foamWgsl = (whitecaps: WhitecapTable): string => /* wgsl */ `
${phaseWgsl}
${waveWgsl}
${cascadeWgsl}
${whitecapWgsl(CREST_BAND_SLOTS)}

struct Foam {
  // The world texel index of the window's first texel, and how far the window moved since the previous frame, texels.
  window: vec2i,
  shift: vec2i,
  // The window's first corner from the clipmap origin, m.
  corner: vec2f,
  spacing: f32,
  // The frame's simulated time step, s.
  elapsed: f32,
  // The density of the foam a full roller leaves.
  trail: f32,
  count: u32,
  cascade_count: u32,
  stamp_count: u32,
  // 1 when the previous buffer holds this sea's foam, 0 after a new sea, a step back in time or the toggle.
  keep: u32,
  // 1/s, the rate a hull stamp's foam fades at.
  stamp_rate: f32,
  _pad1: vec2u,
  // Per cascade: tile L (m), the clipmap origin modulo L plus half a texel (m), and the mip matching a buffer texel.
  cascades: array<vec4f, ${String(MAX_CASCADES)}>,
  whitecap: vec4f,
  whitecap_shape: vec4f,
  crest_bands: array<vec4f, ${String(CREST_BAND_SLOTS)}>,
}

@group(0) @binding(0) var<uniform> foam: Foam;
@group(0) @binding(1) var<storage, read> waves: array<Wave>;
@group(0) @binding(2) var<storage, read> phases: array<f32>;
@group(0) @binding(3) var previous: texture_2d<f32>;
// (steepness, slope x, slope y, squared envelope) per crest band (tail.ts).
@group(0) @binding(4) var crests: texture_2d_array<f32>;
@group(0) @binding(6) var tail_sampler: sampler;
// World-space stamps from the clipmap origin: centre x and y (m), radius (m), density.
@group(0) @binding(7) var<storage, read> stamps: array<vec4f>;

fn crest_band(b: u32) -> vec4f {
  return foam.crest_bands[b];
}

fn whitecap_steepness() -> vec4f {
  return foam.whitecap;
}

fn whitecap_shape() -> vec4f {
  return foam.whitecap_shape;
}

@vertex
fn vertex_main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  // One triangle over the whole target.
  let corner = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(corner * 2.0 - 1.0, 0.0, 1.0);
}

@fragment
fn fragment_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let n = i32(textureDimensions(previous).x);
  let texel = vec2i(position.xy);
  // Texel t holds the world index congruent to t modulo n inside the window.
  let offset = ((texel - foam.window % n) % n + n) % n;
  let x = (vec2f(offset) + 0.5) * foam.spacing + foam.corner;

  var density = 0.0;
  var rate = 0.0;
  let before = offset + foam.shift;
  if (foam.keep != 0u && all(before >= vec2i(0)) && all(before < vec2i(n))) {
    let kept = textureLoad(previous, texel, 0).rg;
    rate = kept.g;
    density = kept.r * exp(-foam.elapsed * rate);
  }

  // Every crest band's fields at the texel: the band's summed here, each cascade's from the mip whose texel matches the
  // buffer's, its group steepness from the mip a wavelength wide.
  var crest_s: array<f32, ${String(CREST_BAND_SLOTS)}>;
  var crest_g: array<vec2f, ${String(CREST_BAND_SLOTS)}>;
  var groups: array<f32, ${String(CREST_BAND_SLOTS)}>;
  var share: array<f32, ${String(CREST_BAND_SLOTS)}>;
  for (var i = 0u; i < foam.count; i++) {
    let wave = waves[i];
    let theta = reduce_phase(dot(wave.k, x) + phases[i]);
    crest_s[0] += wave.amplitude * wave.magnitude * cos(theta);
    crest_g[0] -= wave.amplitude * sin(theta) * wave.k;
  }
  groups[0] = length(vec3f(crest_s[0], crest_g[0])) / ${String(whitecaps.pointOverGroup.value)};
  share[0] = 1.0;
  for (var c = 0u; c < foam.cascade_count; c++) {
    let cascade = foam.cascades[c];
    let uv = cascade_uv(cascade, x);
    let texel = cascade.x / f32(textureDimensions(crests).x);
    for (var j = 0u; j < ${String(CREST_BANDS)}u; j++) {
      let slot = 1u + ${String(CREST_BANDS)}u * c + j;
      let info = foam.crest_bands[slot];
      if (info.w <= 0.0) {
        continue;
      }
      let layer = ${String(CREST_BANDS)}u * c + j;
      let wide = max(log2(max(${String(whitecaps.groupWavelengths.value)} * TAU / info.y, foam.spacing) / texel), 0.0);
      let field = textureSampleLevel(crests, tail_sampler, uv, layer, cascade.w).xyz;
      crest_s[slot] = field.x;
      crest_g[slot] = field.yz;
      groups[slot] = sqrt(textureSampleLevel(crests, tail_sampler, uv, layer, wide).w);
      share[slot] = 1.0 - smoothstep(0.5, 1.5, info.y * foam.spacing);
    }
  }
  let rollers = whitecap_rollers(
    &crest_s, &crest_g, &groups, &share, 1u + ${String(CREST_BANDS)}u * foam.cascade_count, 0.45, foam.spacing);
  if (foam.trail * rollers.y > density) {
    density = foam.trail * rollers.y;
    rate = rollers.z;
  }

  for (var s = 0u; s < foam.stamp_count; s++) {
    let stamp = stamps[s];
    if (distance(x, stamp.xy) <= stamp.z && stamp.w > density) {
      density = stamp.w;
      rate = foam.stamp_rate;
    }
  }
  return vec4f(density, rate, 0.0, 0.0);
}
`

/** Where the surface finds the buffer this frame. */
export interface FoamWindow {
  /** The window's first corner from the clipmap origin, m. */
  readonly corner: readonly [number, number]
  /** m, the window's side. */
  readonly extent: number
  /** The clipmap origin modulo the extent, m: a point r from the origin samples the buffer at (r + offset) / extent. */
  readonly offset: readonly [number, number]
}

export interface FoamFrame {
  readonly tick: number
  readonly eye: readonly [number, number, number]
  readonly origin: readonly [number, number]
  readonly enabled: boolean
  /** World x, y, radius (m) and density per stamp; at most MAX_FOAM_STAMPS. */
  readonly stamps: Float64Array | undefined
}

/** The band as the surface uploads it once per sea: the wave table and the per-frame phases, `count` of each. */
export interface BandTables {
  readonly count: number
  readonly waves: GPUBuffer
  readonly phases: GPUBuffer
}

export interface OceanFoam {
  /**
   * A new sea state or settings: sizes the buffer, binds the band's tables and the tail's fields, and forgets the old
   * foam. Flat water is not `breaking`. `breakers` is the surface's whitecap uniform: twelve constants, then a vec4
   * per crest band; `fadeRates` is the rate (1/s) each band's foam fades at.
   */
  setSea(
    breaking: boolean,
    settings: RenderOceanSettings,
    band: BandTables,
    tail: TailFields,
    breakers: readonly number[],
    fadeRates: readonly number[],
  ): void
  /** The frame's window and decay; returns where the surface samples the buffer. */
  prepare(frame: FoamFrame): FoamWindow
  /** The buffer written this frame, for the surface to bind; one of two that alternate. */
  readonly current: 0 | 1
  readonly views: readonly [GPUTextureView, GPUTextureView]
  /** The update as one render pass carrying `timestampWrites`, so the foam's timing reads this pass alone. */
  encode(encoder: GPUCommandEncoder, timestampWrites: GPURenderPassTimestampWrites | undefined): void
  destroy(): void
}

export const createOceanFoam = (
  device: GPUDevice,
  decayTime: number,
  whitecaps: WhitecapTable,
  tailSampler: GPUSampler,
): OceanFoam => {
  const label = 'ocean foam'
  const module = device.createShaderModule({ label, code: foamWgsl(whitecaps) })
  const pipeline = device.createRenderPipeline({
    label,
    layout: 'auto',
    vertex: { module, entryPoint: 'vertex_main' },
    fragment: { module, entryPoint: 'fragment_main', targets: [{ format: FOAM_FORMAT }] },
    primitive: { topology: 'triangle-list' },
  })
  const uniform = device.createBuffer({
    label: `${label} uniform`,
    size: FOAM_UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  const uniformData = new ArrayBuffer(FOAM_UNIFORM_BYTES)
  const floats = new Float32Array(uniformData)
  const words = new Uint32Array(uniformData)
  const ints = new Int32Array(uniformData)
  const stampBuffer = device.createBuffer({
    label: `${label} stamps`,
    size: 16 * MAX_FOAM_STAMPS,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  })
  const stampData = new Float32Array(4 * MAX_FOAM_STAMPS)

  interface State {
    readonly size: number
    readonly spacing: number
    readonly breaking: boolean
    readonly textures: readonly [GPUTexture, GPUTexture]
    readonly views: readonly [GPUTextureView, GPUTextureView]
    /** groups[i] writes texture i and reads the other. */
    readonly groups: readonly [GPUBindGroup, GPUBindGroup]
    readonly band: BandTables
    readonly tail: TailFields
    readonly resolution: number
  }

  const texture = (size: number): GPUTexture =>
    device.createTexture({
      label,
      size: [size, size],
      format: FOAM_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    })

  let state: State | undefined
  let current: 0 | 1 = 0
  let enabled = false
  // The tick and window the buffer last held; undefined when it holds nothing worth keeping.
  let last: { tick: number; window: readonly [number, number] } | undefined

  return {
    setSea: (breaking, settings, band, tail, breakers, fadeRates) => {
      const size = settings.foamBufferSize
      const reuse = state?.size === size ? state : undefined
      if (state !== undefined && reuse === undefined) for (const old of state.textures) old.destroy()
      const textures = reuse?.textures ?? ([texture(size), texture(size)] as const)
      const views = reuse?.views ?? ([textures[0].createView(), textures[1].createView()] as const)
      const group = (read: GPUTextureView): GPUBindGroup =>
        device.createBindGroup({
          label,
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: uniform } },
            { binding: 1, resource: { buffer: band.waves } },
            { binding: 2, resource: { buffer: band.phases } },
            { binding: 3, resource: read },
            { binding: 4, resource: tail.crests },
            { binding: 6, resource: tailSampler },
            { binding: 7, resource: { buffer: stampBuffer } },
          ],
        })
      state = {
        size,
        spacing: settings.foamSpacing,
        breaking,
        textures,
        views,
        groups: [group(views[1]), group(views[0])],
        band,
        tail,
        resolution: settings.cascadeRule.resolution,
      }
      last = undefined
      floats.set(breakers.slice(0, 8), FOAM_WORD.whitecap)
      floats.set(breakers.slice(12), FOAM_WORD.crestBands)
      // The buffer reads a band's third number as its foam's fade rate, where the surface reads a phase.
      fadeRates.forEach((rate, slot) => {
        floats[FOAM_WORD.crestBands + 4 * slot + 2] = rate
      })
      floats[FOAM_WORD.stampRate] = 1 / decayTime
      floats[FOAM_WORD.trail] = whitecaps.trailDensity.value
    },
    prepare: (frame) => {
      if (state === undefined) throw new Error('The foam has no sea; call setSea first')
      const { size, spacing, breaking, tail, resolution } = state
      const extent = size * spacing
      const window = [
        Math.floor(frame.eye[0] / spacing) - size / 2,
        Math.floor(frame.eye[1] / spacing) - size / 2,
      ] as const
      const [x0, y0] = frame.origin
      enabled = frame.enabled && breaking
      // Time only runs forward through the buffer: a step back, a new sea or the toggle starts it empty.
      const kept = enabled && last !== undefined && frame.tick >= last.tick ? last : undefined
      const seconds = kept === undefined ? 0 : (frame.tick - kept.tick) / TICKS_PER_SECOND
      const shift = (axis: 0 | 1): number =>
        kept === undefined ? 0 : Math.max(-size, Math.min(size, window[axis] - kept.window[axis]))
      ints.set([window[0], window[1], shift(0), shift(1)], FOAM_WORD.window)
      floats.set([window[0] * spacing - x0, window[1] * spacing - y0, spacing, seconds], FOAM_WORD.corner)
      words[FOAM_WORD.count] = state.band.count
      words[FOAM_WORD.cascadeCount] = tail.count
      const stamps = frame.stamps ?? new Float64Array(0)
      const stampCount = stamps.length / 4
      if (!(Number.isInteger(stampCount) && stampCount <= MAX_FOAM_STAMPS)) {
        throw new RangeError(`Foam takes up to ${String(MAX_FOAM_STAMPS)} stamps of four numbers each`)
      }
      for (let s = 0; s < stampCount; s += 1) {
        stampData.set(
          [(stamps[4 * s] ?? 0) - x0, (stamps[4 * s + 1] ?? 0) - y0, stamps[4 * s + 2] ?? 0, stamps[4 * s + 3] ?? 0],
          4 * s,
        )
      }
      if (stampCount > 0) device.queue.writeBuffer(stampBuffer, 0, stampData, 0, 4 * stampCount)
      words[FOAM_WORD.stampCount] = stampCount
      words[FOAM_WORD.keep] = kept === undefined ? 0 : 1
      tail.tiles.forEach((tile, c) => {
        const texel = tile / resolution
        const offset = (x: number): number => wrap(x, tile) + texel / 2
        floats.set([tile, offset(x0), offset(y0), Math.max(0, Math.log2(spacing / texel))], FOAM_WORD.cascades + 4 * c)
      })
      device.queue.writeBuffer(uniform, 0, uniformData)
      current = current === 0 ? 1 : 0
      last = enabled ? { tick: frame.tick, window } : undefined
      return {
        corner: [window[0] * spacing - x0, window[1] * spacing - y0],
        extent,
        offset: [wrap(x0, extent), wrap(y0, extent)],
      }
    },
    get current() {
      return current
    },
    get views() {
      if (state === undefined) throw new Error('The foam has no sea; call setSea first')
      return state.views
    },
    encode: (encoder, timestampWrites) => {
      if (state === undefined) return
      const pass = encoder.beginRenderPass({
        label,
        colorAttachments: [{ view: state.views[current], clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'store' }],
        ...(timestampWrites && { timestampWrites }),
      })
      if (enabled) {
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, state.groups[current])
        pass.draw(3)
      }
      pass.end()
    },
    destroy: () => {
      if (state !== undefined) for (const old of state.textures) old.destroy()
      uniform.destroy()
      stampBuffer.destroy()
    },
  }
}
