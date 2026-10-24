import { TICKS_PER_SECOND } from '@luovi/core'
import type { RenderOceanSettings } from './settings.ts'
import { cascadeOffset, cascadeWgsl, coverageWgsl, hexUniform, hexWgsl, phaseWgsl, waveWgsl, wrap } from './shared.ts'
import { MAX_CASCADES, type TailFields } from './tail.ts'

// The near-field foam buffer of ADR 0011: a world-aligned, camera-centred, toroidal r16float density buffer. Each frame
// one pass decays every texel's density at the cited rate and raises it to the coverage breaking now injects there, so a
// whitecap leaves a trail that fades.
//
// The buffer is indexed by undisplaced (Lagrangian) position, the coordinate every tail field and the band's phase are
// evaluated at, and the surface looks foam up at the undisplaced position of each pixel. Foam therefore rides the
// displacement map: a texel's foam moves exactly as the water particle it was injected on, which is advection by the
// surface's horizontal velocity integrated without error, with no velocity field, no resampling and so no numerical
// diffusion. What it leaves out is the second-order Stokes drift, about 0.1 m/s in the storm sea, so a few tenths of a
// metre over a foam lifetime.
//
// Injection is the filtered coverage of the texel's footprint, the same Gaussian tail of the linearised Jacobian the far
// field uses and the threshold was solved for (sim-ocean breaking.ts): the band exactly at the texel's centre, each
// cascade's divergence and its variance from the mip whose texel matches the buffer's. A pointwise test would alias the
// short cascades into noise at half a metre; the coverage is that test's expectation over the texel.

/** Stamps one frame may inject: hull contact from render-ship (step 2) sends a handful per hull. */
export const MAX_FOAM_STAMPS = 64

/** Where each field of the `Foam` uniform starts, in 4-byte words; the WGSL struct below lists them in this order. */
const FOAM_WORD = {
  window: 0,
  shift: 2,
  corner: 4,
  spacing: 6,
  decay: 7,
  threshold: 8,
  count: 9,
  cascadeCount: 10,
  stampCount: 11,
  keep: 12,
  cascades: 16,
  /** PROTOTYPE (tail repetition, #44): cos and sin of each cascade's lattice turn. */
  turns: 16 + 4 * MAX_CASCADES,
  /** PROTOTYPE (tail repetition, #44, L5): hex and hex_id (shared.ts hexUniform). */
  hex: 16 + 8 * MAX_CASCADES,
} as const

const FOAM_UNIFORM_BYTES = 4 * (FOAM_WORD.hex + 8)

const FOAM_FORMAT: GPUTextureFormat = 'r16float'

const foamWgsl = /* wgsl */ `
${phaseWgsl}
${waveWgsl}
${cascadeWgsl}
${coverageWgsl}
${hexWgsl}

struct Foam {
  // The world texel index of the window's first texel, and how far the window moved since the previous frame, texels.
  window: vec2i,
  shift: vec2i,
  // The window's first corner from the clipmap origin, m.
  corner: vec2f,
  spacing: f32,
  // exp(-dt / tau) for the frame's simulated time step.
  decay: f32,
  threshold: f32,
  count: u32,
  cascade_count: u32,
  stamp_count: u32,
  // 1 when the previous buffer holds this sea's foam, 0 after a new sea, a step back in time or the toggle.
  keep: u32,
  _pad0: u32,
  _pad1: vec2u,
  // Per cascade: tile L (m), the clipmap origin modulo L plus half a texel (m), and the mip matching a buffer texel.
  cascades: array<vec4f, ${String(MAX_CASCADES)}>,
  turns: array<vec4f, ${String(MAX_CASCADES)}>,
  hex: vec4f,
  hex_id: vec4f,
}

@group(0) @binding(0) var<uniform> foam: Foam;
@group(0) @binding(1) var<storage, read> waves: array<Wave>;
@group(0) @binding(2) var<storage, read> phases: array<f32>;
@group(0) @binding(3) var previous: texture_2d<f32>;
@group(0) @binding(4) var derivatives: texture_2d_array<f32>;
@group(0) @binding(5) var moments: texture_2d_array<f32>;
@group(0) @binding(6) var tail_sampler: sampler;
// World-space stamps from the clipmap origin: centre x and y (m), radius (m), density.
@group(0) @binding(7) var<storage, read> stamps: array<vec4f>;

@vertex
fn vertex_main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  // One triangle over the whole target.
  let corner = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(corner * 2.0 - 1.0, 0.0, 1.0);
}

@fragment
fn fragment_main(@builtin(position) position: vec4f) -> @location(0) f32 {
  let n = i32(textureDimensions(previous).x);
  let texel = vec2i(position.xy);
  // Texel t holds the world index congruent to t modulo n inside the window.
  let offset = ((texel - foam.window % n) % n + n) % n;
  let x = (vec2f(offset) + 0.5) * foam.spacing + foam.corner;

  var density = 0.0;
  let before = offset + foam.shift;
  if (foam.keep != 0u && all(before >= vec2i(0)) && all(before < vec2i(n))) {
    density = textureLoad(previous, texel, 0).r * foam.decay;
  }

  // The linearised Jacobian 1 + div D: the band's exactly, every cascade's as its mean and variance over the texel.
  var mean = 1.0;
  var variance = 0.0;
  for (var i = 0u; i < foam.count; i++) {
    let wave = waves[i];
    mean += wave_divergence(wave, wave.displacement, cos(reduce_phase(dot(wave.k, x) + phases[i])));
  }
  for (var c = 0u; c < foam.cascade_count; c++) {
    let cascade = foam.cascades[c];
    let uv = cascade_uv(cascade, foam.turns[c].xy, x);
    var derivative = textureSampleLevel(derivatives, tail_sampler, uv, c, cascade.w);
    var second = textureSampleLevel(moments, tail_sampler, uv, c, cascade.w);
    // PROTOTYPE (tail repetition, #44, L5): cascade 0 hex-blended as the surface blends it (surface.ts tail_pixel).
    if (c == 0u && foam.hex.w != 0.0) {
      let t = hex_taps(x, foam.hex, foam.hex_id);
      let d0 = textureSampleLevel(derivatives, tail_sampler, uv + t.offset0, c, cascade.w);
      let d1 = textureSampleLevel(derivatives, tail_sampler, uv + t.offset1, c, cascade.w);
      let d2 = textureSampleLevel(derivatives, tail_sampler, uv + t.offset2, c, cascade.w);
      let m0 = textureSampleLevel(moments, tail_sampler, uv + t.offset0, c, cascade.w);
      let m1 = textureSampleLevel(moments, tail_sampler, uv + t.offset1, c, cascade.w);
      let m2 = textureSampleLevel(moments, tail_sampler, uv + t.offset2, c, cascade.w);
      derivative = t.weight.x * d0 + t.weight.y * d1 + t.weight.z * d2;
      let w2 = t.weight * t.weight;
      second = w2.x * (m0 - hex_square(d0)) + w2.y * (m1 - hex_square(d1)) + w2.z * (m2 - hex_square(d2))
        + hex_square(derivative);
    }
    let divergence = cascade_divergence(derivative, second);
    mean += divergence.x;
    variance += divergence.y;
  }
  density = max(density, coverage_below(foam.threshold, mean, variance));

  for (var s = 0u; s < foam.stamp_count; s++) {
    let stamp = stamps[s];
    if (distance(x, stamp.xy) <= stamp.z) {
      density = max(density, stamp.w);
    }
  }
  return density;
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
   * foam. A null threshold is flat water, which never breaks.
   */
  setSea(threshold: number | null, settings: RenderOceanSettings, band: BandTables, tail: TailFields): void
  /** The frame's window and decay; returns where the surface samples the buffer. */
  prepare(frame: FoamFrame): FoamWindow
  /** The buffer written this frame, for the surface to bind; one of two that alternate. */
  readonly current: 0 | 1
  readonly views: readonly [GPUTextureView, GPUTextureView]
  /** The update as one render pass carrying `timestampWrites`, so the foam's timing reads this pass alone. */
  encode(encoder: GPUCommandEncoder, timestampWrites: GPURenderPassTimestampWrites | undefined): void
  destroy(): void
}

export const createOceanFoam = (device: GPUDevice, decayTime: number, tailSampler: GPUSampler): OceanFoam => {
  const label = 'ocean foam'
  const module = device.createShaderModule({ label, code: foamWgsl })
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
    readonly threshold: number | null
    readonly textures: readonly [GPUTexture, GPUTexture]
    readonly views: readonly [GPUTextureView, GPUTextureView]
    /** groups[i] writes texture i and reads the other. */
    readonly groups: readonly [GPUBindGroup, GPUBindGroup]
    readonly band: BandTables
    readonly tail: TailFields
    readonly resolution: number
    readonly hex: boolean | 'linear'
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
    setSea: (threshold, settings, band, tail) => {
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
            { binding: 4, resource: tail.derivatives },
            { binding: 5, resource: tail.moments },
            { binding: 6, resource: tailSampler },
            { binding: 7, resource: { buffer: stampBuffer } },
          ],
        })
      state = {
        size,
        spacing: settings.foamSpacing,
        threshold,
        textures,
        views,
        groups: [group(views[1]), group(views[0])],
        band,
        tail,
        resolution: settings.cascadeRule.resolution,
        hex: settings.hexCascade0 ?? false,
      }
      last = undefined
    },
    prepare: (frame) => {
      if (state === undefined) throw new Error('The foam has no sea; call setSea first')
      const { size, spacing, threshold, tail, resolution } = state
      const extent = size * spacing
      const window = [
        Math.floor(frame.eye[0] / spacing) - size / 2,
        Math.floor(frame.eye[1] / spacing) - size / 2,
      ] as const
      const [x0, y0] = frame.origin
      enabled = frame.enabled && threshold !== null
      // Time only runs forward through the buffer: a step back, a new sea or the toggle starts it empty.
      const kept = enabled && last !== undefined && frame.tick >= last.tick ? last : undefined
      const seconds = kept === undefined ? 0 : (frame.tick - kept.tick) / TICKS_PER_SECOND
      const shift = (axis: 0 | 1): number =>
        kept === undefined ? 0 : Math.max(-size, Math.min(size, window[axis] - kept.window[axis]))
      ints.set([window[0], window[1], shift(0), shift(1)], FOAM_WORD.window)
      floats.set(
        [window[0] * spacing - x0, window[1] * spacing - y0, spacing, Math.exp(-seconds / decayTime)],
        FOAM_WORD.corner,
      )
      floats[FOAM_WORD.threshold] = threshold ?? 0
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
        const turn = tail.rotations[c] ?? 0
        floats.set(
          [tile, ...cascadeOffset(tile, texel, turn, x0, y0), Math.max(0, Math.log2(spacing / texel))],
          FOAM_WORD.cascades + 4 * c,
        )
        floats.set([Math.cos(turn), Math.sin(turn)], FOAM_WORD.turns + 4 * c)
      })
      const tile0 = tail.tiles[0]
      floats.set(hexUniform(tile0 ?? 1, x0, y0, tile0 === undefined ? false : state.hex), FOAM_WORD.hex)
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
