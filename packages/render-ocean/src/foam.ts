import { TICKS_PER_SECOND } from '@luovi/core'
import type { RenderOceanSettings } from './settings.ts'
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

/** Bytes of the `Foam` uniform: window, shift, corner, spacing, decay, threshold, counts, flags, then a vec4 per cascade. */
const FOAM_UNIFORM_BYTES = 64 + 16 * MAX_CASCADES

const FOAM_FORMAT: GPUTextureFormat = 'r16float'

/**
 * The fraction of a Gaussian below `threshold`, and the step itself when the variance is zero. The erfc is Abramowitz
 * and Stegun 1964 (formula 7.1.26, absolute error under 1.5e-7): algorithm constants, not data.
 */
export const coverageWgsl = /* wgsl */ `
fn coverage_below(threshold: f32, mean: f32, variance: f32) -> f32 {
  if (variance <= 0.0) {
    return select(0.0, 1.0, mean < threshold);
  }
  let z = (threshold - mean) / sqrt(variance);
  let x = abs(z) * 0.70710678118654752;
  let t = 1.0 / (1.0 + 0.3275911 * x);
  let poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  let tail = 0.5 * poly * exp(-x * x);
  return select(1.0 - tail, tail, z < 0.0);
}
`

/** The band's wave table as the surface uploads it, shared so the foam pass reads the same layout. */
export const waveWgsl = /* wgsl */ `
struct Wave {
  k: vec2f,
  amplitude: f32,
  // lambda A / |k|: the horizontal displacement is -lambda k_hat A sin(theta), the Gerstner sign the query uses.
  displacement: f32,
  // omega, rad/s; the draw takes time through the phases, and foam needs no velocity (foam.ts).
  frequency: f32,
  _pad0: f32,
  _pad1: vec2f,
}
`

const foamWgsl = /* wgsl */ `
${waveWgsl}
${coverageWgsl}

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

const TAU: f32 = 6.28318530717958648;

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
    var theta = dot(wave.k, x) + phases[i];
    theta -= TAU * round(theta / TAU);
    mean -= wave.displacement * cos(theta) * dot(wave.k, wave.k);
  }
  for (var c = 0u; c < foam.cascade_count; c++) {
    let cascade = foam.cascades[c];
    let uv = (x + cascade.yz) / cascade.x;
    let d = textureSampleLevel(derivatives, tail_sampler, uv, c, cascade.w);
    let divergence = d.z + d.w;
    mean += divergence;
    variance += max(textureSampleLevel(moments, tail_sampler, uv, c, cascade.w).w - divergence * divergence, 0.0);
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

export interface OceanFoam {
  /**
   * A new sea state or settings: sizes the buffer, binds the band's tables and the tail's fields, and forgets the old
   * foam. A null threshold is flat water, which never breaks.
   */
  setSea(
    threshold: number | null,
    settings: RenderOceanSettings,
    bandCount: number,
    waves: GPUBuffer,
    phases: GPUBuffer,
    tail: TailFields,
  ): void
  /** The frame's window and decay; returns where the surface samples the buffer. */
  prepare(frame: FoamFrame): FoamWindow
  /** The buffer written this frame, for the surface to bind; one of two that alternate. */
  readonly current: 0 | 1
  readonly views: readonly [GPUTextureView, GPUTextureView]
  /** The update as one render pass carrying `timestampWrites`, so the foam's budget line reads this pass alone. */
  encode(encoder: GPUCommandEncoder, timestampWrites: GPURenderPassTimestampWrites | undefined): void
  destroy(): void
}

/** x modulo m into [0, m). */
const wrap = (x: number, m: number): number => ((x % m) + m) % m

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
    readonly bandCount: number
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
    setSea: (threshold, settings, bandCount, waves, phases, tail) => {
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
            { binding: 1, resource: { buffer: waves } },
            { binding: 2, resource: { buffer: phases } },
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
        bandCount,
        tail,
        resolution: settings.cascadeRule.resolution,
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
      ints.set([window[0], window[1], shift(0), shift(1)], 0)
      floats.set([window[0] * spacing - x0, window[1] * spacing - y0, spacing, Math.exp(-seconds / decayTime)], 4)
      floats[8] = threshold ?? 0
      words[9] = state.bandCount
      words[10] = tail.count
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
      words[11] = stampCount
      words[12] = kept === undefined ? 0 : 1
      tail.tiles.forEach((tile, c) => {
        const texel = tile / resolution
        const offset = (x: number): number => wrap(x, tile) + texel / 2
        floats.set([tile, offset(x0), offset(y0), Math.max(0, Math.log2(spacing / texel))], 16 + 4 * c)
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
