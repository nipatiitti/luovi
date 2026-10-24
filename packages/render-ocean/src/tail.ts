import { TICKS_PER_SECOND } from '@luovi/core'
import {
  type CascadeLayout,
  defaultCascadeLayout,
  generateTail,
  type SeaDescription,
  tailStream,
} from '@luovi/sim-world'
import type { RenderOceanSettings } from './settings.ts'
import { phaseWgsl, wrap } from './shared.ts'

// The FFT tail on the GPU (ADR 0011): h0 from sim-ocean's pure generator, uploaded once per sea state; per frame one
// compute pass evolves every cascade at the slot's tick time, runs the inverse FFT over rows then columns, and builds
// the mip chains the surface samples. Nothing here returns to the CPU: the tail is drawn and never felt.

/**
 * Cascades the surface can composite: each ring carries one vec4 of cascade weights, and the decision's layouts have
 * three cascades, four when three cannot reach the floor.
 */
export const MAX_CASCADES = 4

/**
 * The tail repeats in time after this many ticks (1000 s). Each bin's frequency is rounded to a whole number of cycles
 * per period, which moves no bin by more than pi / 1000 rad/s, so the phase m t / P is exact integer arithmetic on the
 * slot's tick: an f32 omega t would lose every digit of the phase after an hour's run. P^2 stays under 2^32.
 */
const PERIOD_TICKS = 60_000

/** Where each field of the `Tail` uniform starts, in 4-byte words; the WGSL struct below lists them in this order. */
const TAIL_WORD = { gravity: 0, depth: 1, tick: 2, cascades: 4 } as const

const TAIL_UNIFORM_BYTES = 4 * (TAIL_WORD.cascades + 4 * MAX_CASCADES)

/** rgba16float filters and is a core storage format, and half precision is a fraction of a millimetre on these fields. */
const FIELD_FORMAT: GPUTextureFormat = 'rgba16float'

const fftWgsl = /* wgsl */ `
struct Cascade {
  tile: f32,
  lambda: f32,
  // PROTOTYPE (tail repetition, #44): cos and sin of the lattice's turn; bins evolve with world-frame wave vectors.
  turn: vec2f,
}

struct Tail {
  gravity: f32,
  depth: f32,
  // The slot's tick modulo the tail's period.
  tick: u32,
  _pad: u32,
  cascades: array<Cascade, ${String(MAX_CASCADES)}>,
}

override N: u32 = 256u;
override PERIOD: u32 = ${String(PERIOD_TICKS)}u;
// rad/s per cycle per period: 2 pi TICKS_PER_SECOND / PERIOD.
override OMEGA_STEP: f32;

@group(0) @binding(0) var<uniform> tail: Tail;
@group(0) @binding(1) var<storage, read> h0: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> rows: array<vec4f>;
@group(0) @binding(3) var displacement: texture_storage_2d_array<rgba16float, write>;
@group(0) @binding(4) var derivatives: texture_storage_2d_array<rgba16float, write>;
@group(0) @binding(5) var moments: texture_storage_2d_array<rgba16float, write>;

${phaseWgsl}
const PI: f32 = 3.14159265358979324;

// Four complex fields per bin, each the packing X + iY of two real fields, so one complex transform yields two real
// outputs: (Dx, Dy), (h, dDx/dy), (dh/dx, dh/dy), (dDx/dx, dDy/dy). Real parts in re, imaginary parts in im.
var<workgroup> re: array<vec4f, N>;
var<workgroup> im: array<vec4f, N>;

fn cmul(a: vec2f, b: vec2f) -> vec2f {
  return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn conj(a: vec2f) -> vec2f {
  return vec2f(a.x, -a.y);
}

fn bit_reversed(i: u32) -> u32 {
  return reverseBits(i) >> (32u - countTrailingZeros(N));
}

// The fields of bin (ix, iy) of cascade c at the uniform's time, packed for the transform. Bin i holds
// k = (i - N/2) 2 pi / L, as sim-ocean's generator lays it out.
fn spectrum(c: u32, ix: u32, iy: u32) {
  let cascade = tail.cascades[c];
  let lattice = vec2f(f32(i32(ix) - i32(N / 2u)), f32(i32(iy) - i32(N / 2u))) * (TAU / cascade.tile);
  let kv = vec2f(
    cascade.turn.x * lattice.x - cascade.turn.y * lattice.y,
    cascade.turn.y * lattice.x + cascade.turn.x * lattice.y,
  );
  let k = length(kv);
  let slot = bit_reversed(ix);
  if (k == 0.0) {
    re[slot] = vec4f(0.0);
    im[slot] = vec4f(0.0);
    return;
  }
  let base = c * N * N;
  let a = h0[base + iy * N + ix];
  // -k; the Nyquist row and column are their own mirror, which keeps their fields real.
  let b = h0[base + ((N - iy) % N) * N + (N - ix) % N];
  // Gravity-only finite-depth dispersion, omega^2 = g k tanh(k d), per bin. tanh(9) is 1 in f32, and some
  // implementations form tanh from exponentials that overflow far beyond it.
  let omega = sqrt(tail.gravity * k * tanh(min(k * tail.depth, 9.0)));
  let cycles = (u32(round(omega / OMEGA_STEP)) % PERIOD) * tail.tick % PERIOD;
  let turn = TAU * f32(cycles) / f32(PERIOD);
  let e = vec2f(cos(turn), sin(turn));
  // h0(k) travels along +k under the band's phase k . x - omega t; the conjugate mirror keeps h(x) real.
  let h = cmul(a, conj(e)) + cmul(conj(b), e);
  let ih = vec2f(-h.y, h.x);
  let khat = kv / k;
  let dx = cascade.lambda * khat.x * ih;
  let dy = cascade.lambda * khat.y * ih;
  let jxy = -cascade.lambda * kv.x * khat.y * h;
  let sx = kv.x * ih;
  let sy = kv.y * ih;
  let jxx = -cascade.lambda * kv.x * khat.x * h;
  let jyy = -cascade.lambda * kv.y * khat.y * h;
  // X + iY for real-valued X and Y.
  re[slot] = vec4f(dx.x - dy.y, h.x - jxy.y, sx.x - sy.y, jxx.x - jyy.y);
  im[slot] = vec4f(dx.y + dy.x, h.y + jxy.x, sx.y + sy.x, jxx.y + jyy.x);
}

// In-place radix-2 decimation in time on the bit-reversed workgroup arrays, inverse sign, unnormalised: h(x) is the
// plain sum over k of h(k) e^(i k . x). Thread t owns butterfly t of every stage.
fn transform(t: u32) {
  for (var half = 1u; half < N; half *= 2u) {
    workgroupBarrier();
    let position = t % half;
    let i0 = (t / half) * 2u * half + position;
    let i1 = i0 + half;
    let angle = PI * f32(position) / f32(half);
    let w = vec2f(cos(angle), sin(angle));
    let br = re[i1];
    let bi = im[i1];
    let tr = w.x * br - w.y * bi;
    let ti = w.x * bi + w.y * br;
    let ar = re[i0];
    let ai = im[i0];
    re[i0] = ar + tr;
    im[i0] = ai + ti;
    re[i1] = ar - tr;
    im[i1] = ai - ti;
  }
  workgroupBarrier();
}

@compute @workgroup_size(N / 2u)
fn rows_main(@builtin(local_invocation_id) local: vec3u, @builtin(workgroup_id) group: vec3u) {
  let iy = group.x;
  let c = group.y;
  let t = local.x;
  spectrum(c, t, iy);
  spectrum(c, t + N / 2u, iy);
  transform(t);
  for (var e = 0u; e < 2u; e++) {
    let ix = t + e * (N / 2u);
    let o = 2u * ((c * N + iy) * N + ix);
    rows[o] = re[ix];
    rows[o + 1u] = im[ix];
  }
}

@compute @workgroup_size(N / 2u)
fn columns_main(@builtin(local_invocation_id) local: vec3u, @builtin(workgroup_id) group: vec3u) {
  let ix = group.x;
  let c = group.y;
  let t = local.x;
  for (var e = 0u; e < 2u; e++) {
    let iy = t + e * (N / 2u);
    let o = 2u * ((c * N + iy) * N + ix);
    let slot = bit_reversed(iy);
    re[slot] = rows[o];
    im[slot] = rows[o + 1u];
  }
  transform(t);
  for (var e = 0u; e < 2u; e++) {
    let iy = t + e * (N / 2u);
    // The lattice is centred on k = 0, so every output carries e^(-i pi (x + y)) = (-1)^(x + y).
    let sign = select(1.0, -1.0, ((ix + iy) & 1u) == 1u);
    let r = re[iy] * sign;
    let i = im[iy] * sign;
    textureStore(displacement, vec2u(ix, iy), c, vec4f(r.x, i.x, r.y, i.y));
    textureStore(derivatives, vec2u(ix, iy), c, vec4f(r.z, i.z, r.w, i.w));
    // The slope's second moments and the square of the displacement's divergence, the linear part of the Jacobian foam
    // reads, so the mips hold the variance each texel averages, not only the mean.
    let divergence = r.w + i.w;
    textureStore(moments, vec2u(ix, iy), c, vec4f(r.z * r.z, i.z * i.z, r.z * i.z, divergence * divergence));
  }
}
`

// A 2 by 2 box down the chain: every field is linear in the surface, so the mean is the field of the mean surface, and
// the mean of the second moments is the second moment over the texel's footprint.
const mipWgsl = /* wgsl */ `
@group(0) @binding(0) var source_a: texture_2d_array<f32>;
@group(0) @binding(1) var source_b: texture_2d_array<f32>;
@group(0) @binding(2) var source_c: texture_2d_array<f32>;
@group(0) @binding(3) var target_a: texture_storage_2d_array<rgba16float, write>;
@group(0) @binding(4) var target_b: texture_storage_2d_array<rgba16float, write>;
@group(0) @binding(5) var target_c: texture_storage_2d_array<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn mip_main(@builtin(global_invocation_id) id: vec3u) {
  if (any(id.xy >= textureDimensions(target_a))) {
    return;
  }
  let p = vec2i(id.xy) * 2;
  let layer = i32(id.z);
  var a = vec4f(0.0);
  var b = vec4f(0.0);
  var m = vec4f(0.0);
  for (var j = 0; j < 4; j++) {
    let q = p + vec2i(j & 1, j >> 1);
    a += textureLoad(source_a, q, layer, 0);
    b += textureLoad(source_b, q, layer, 0);
    m += textureLoad(source_c, q, layer, 0);
  }
  textureStore(target_a, id.xy, id.z, a * 0.25);
  textureStore(target_b, id.xy, id.z, b * 0.25);
  textureStore(target_c, id.xy, id.z, m * 0.25);
}
`

/** What the surface samples, per sea state. */
export interface TailFields {
  /** Cascades evolved, 0 for flat water or a sea the cascade rule has no layout for. */
  readonly count: number
  /** m, cascade 0 first. */
  readonly tiles: readonly number[]
  /** PROTOTYPE (tail repetition, #44): rad, each cascade's lattice turn. */
  readonly rotations: readonly number[]
  /** m, the longest wave each cascade holds: the one the ring rule tests. */
  readonly longest: readonly number[]
  /** (Dx, Dy, h, dDx/dy) per cascade layer, mipmapped. */
  readonly displacement: GPUTextureView
  /** (dh/dx, dh/dy, dDx/dx, dDy/dy) per cascade layer, mipmapped. */
  readonly derivatives: GPUTextureView
  /**
   * The second moments (dh/dx^2, dh/dy^2, dh/dx dh/dy, (dDx/dx + dDy/dy)^2) per cascade layer, mipmapped: a mip texel
   * minus the square of the matching `derivatives` texel is the slope covariance, or the divergence's variance, over its
   * footprint, and the last mip's is the cascade's whole.
   */
  readonly moments: GPUTextureView
}

export interface OceanTail {
  /** Generates and uploads h0 for a new sea state, replacing the previous one's textures. */
  setSea(sea: SeaDescription | null, settings: RenderOceanSettings): TailFields
  /** The frame's time uniform: the slot's tick, the same instant the band's phases are formed at. */
  prepare(tick: number): void
  /** Evolution, both transforms and the mips, into an open compute pass. */
  encode(pass: GPUComputePassEncoder): void
  destroy(): void
}

/**
 * The layout the surface draws: the default rule's tiles with the settings' choppiness. A sea whose cut tile does not
 * clear the floor has no layout under the rule, and is drawn by its band alone rather than refused, since the band is
 * the sea the simulation feels.
 */
const layoutFor = (sea: SeaDescription, settings: RenderOceanSettings): CascadeLayout | undefined => {
  const layout = defaultCascadeLayout(sea, settings.cascadeRule)
  if (layout === undefined) return undefined
  return { ...layout, choppiness: layout.tiles.map((_, c) => settings.cascadeChoppiness[c] ?? sea.block.choppiness) }
}

/** Throws RangeError for a lattice the workgroup transform cannot hold: one thread per butterfly, 16 KiB of storage. */
const checkResolution = (layout: CascadeLayout): void => {
  const n = layout.resolution
  if (n > 512) throw new RangeError(`The GPU tail transforms at most 512 bins a side, got ${String(n)}`)
  if (layout.count > MAX_CASCADES) {
    throw new RangeError(`The surface composites at most ${String(MAX_CASCADES)} cascades, got ${String(layout.count)}`)
  }
}

export const createOceanTail = (device: GPUDevice): OceanTail => {
  const label = 'ocean tail'
  const uniform = device.createBuffer({
    label: `${label} uniform`,
    size: TAIL_UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  const uniformData = new ArrayBuffer(TAIL_UNIFORM_BYTES)
  const uniformFloats = new Float32Array(uniformData)
  const uniformWords = new Uint32Array(uniformData)
  const fftModule = device.createShaderModule({ label, code: fftWgsl })
  const mipModule = device.createShaderModule({ label: `${label} mips`, code: mipWgsl })
  const mipPipeline = device.createComputePipeline({
    label: `${label} mips`,
    layout: 'auto',
    compute: { module: mipModule, entryPoint: 'mip_main' },
  })
  // Pipelines depend on the lattice side through the override, so they are kept per side.
  const fftPipelines = new Map<number, { rows: GPUComputePipeline; columns: GPUComputePipeline }>()
  const fftPipelinesFor = (n: number): { rows: GPUComputePipeline; columns: GPUComputePipeline } => {
    const known = fftPipelines.get(n)
    if (known !== undefined) return known
    const constants = { N: n, OMEGA_STEP: (2 * Math.PI * TICKS_PER_SECOND) / PERIOD_TICKS }
    const pipeline = (entryPoint: string): GPUComputePipeline =>
      device.createComputePipeline({ label, layout: 'auto', compute: { module: fftModule, entryPoint, constants } })
    const made = { rows: pipeline('rows_main'), columns: pipeline('columns_main') }
    fftPipelines.set(n, made)
    return made
  }

  /** Everything sized by the sea state. */
  interface State {
    readonly count: number
    readonly resolution: number
    readonly buffers: readonly GPUBuffer[]
    readonly textures: readonly GPUTexture[]
    readonly rowsGroup: GPUBindGroup | undefined
    readonly columnsGroup: GPUBindGroup | undefined
    readonly mipGroups: readonly GPUBindGroup[]
    readonly fields: TailFields
  }

  const fieldTexture = (name: string, n: number, layers: number): GPUTexture =>
    device.createTexture({
      label: `${label} ${name}`,
      size: [n, n, layers],
      format: FIELD_FORMAT,
      mipLevelCount: Math.log2(n) + 1,
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    })
  const arrayView = (texture: GPUTexture, mip?: number): GPUTextureView =>
    texture.createView({
      dimension: '2d-array',
      ...(mip !== undefined && { baseMipLevel: mip, mipLevelCount: 1 }),
    })

  const build = (sea: SeaDescription | null, settings: RenderOceanSettings): State => {
    const layout = sea === null ? undefined : layoutFor(sea, settings)
    if (sea === null || layout === undefined) {
      // The surface binds the fields whether or not a tail exists, so flat water gets a one-texel stand-in.
      const textures = [
        fieldTexture('displacement', 1, 1),
        fieldTexture('derivatives', 1, 1),
        fieldTexture('moments', 1, 1),
      ] as const
      return {
        count: 0,
        resolution: 1,
        buffers: [],
        textures,
        rowsGroup: undefined,
        columnsGroup: undefined,
        mipGroups: [],
        fields: {
          count: 0,
          tiles: [],
          rotations: [],
          longest: [],
          displacement: arrayView(textures[0]),
          derivatives: arrayView(textures[1]),
          moments: arrayView(textures[2]),
        },
      }
    }
    checkResolution(layout)
    const n = layout.resolution
    const { count } = layout
    const cascades = generateTail(sea, layout, tailStream(sea.seed))
    const h0 = new Float32Array(count * n * n * 2)
    cascades.forEach((cascade, c) => {
      const base = c * n * n
      for (let i = 0; i < n * n; i += 1) {
        h0[2 * (base + i)] = cascade.re[i] ?? 0
        h0[2 * (base + i) + 1] = cascade.im[i] ?? 0
      }
    })
    const h0Buffer = device.createBuffer({
      label: `${label} h0`,
      size: h0.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(h0Buffer, 0, h0)
    const rows = device.createBuffer({
      label: `${label} rows`,
      size: count * n * n * 32,
      usage: GPUBufferUsage.STORAGE,
    })

    layout.tiles.forEach((tile, c) => {
      const turn = layout.rotations?.[c] ?? 0
      uniformFloats.set([tile, layout.choppiness[c] ?? 0, Math.cos(turn), Math.sin(turn)], TAIL_WORD.cascades + 4 * c)
    })
    uniformFloats.set([sea.gravity, sea.depth], TAIL_WORD.gravity)

    const displacement = fieldTexture('displacement', n, count)
    const derivatives = fieldTexture('derivatives', n, count)
    const moments = fieldTexture('moments', n, count)
    const pipelines = fftPipelinesFor(n)
    const group = (pipeline: GPUComputePipeline, entries: readonly GPUBindingResource[]): GPUBindGroup =>
      device.createBindGroup({
        label,
        layout: pipeline.getBindGroupLayout(0),
        entries: entries.map((resource, binding) => ({ binding, resource })),
      })
    const rowsGroup = group(pipelines.rows, [{ buffer: uniform }, { buffer: h0Buffer }, { buffer: rows }])
    // Auto layouts keep only the bindings an entry point uses, so the column pass's group has no uniform or h0.
    const columnsGroup = device.createBindGroup({
      label,
      layout: pipelines.columns.getBindGroupLayout(0),
      entries: [
        { binding: 2, resource: { buffer: rows } },
        { binding: 3, resource: arrayView(displacement, 0) },
        { binding: 4, resource: arrayView(derivatives, 0) },
        { binding: 5, resource: arrayView(moments, 0) },
      ],
    })
    const mipGroups = Array.from({ length: displacement.mipLevelCount - 1 }, (_, level) =>
      group(mipPipeline, [
        arrayView(displacement, level),
        arrayView(derivatives, level),
        arrayView(moments, level),
        arrayView(displacement, level + 1),
        arrayView(derivatives, level + 1),
        arrayView(moments, level + 1),
      ]),
    )
    return {
      count,
      resolution: n,
      buffers: [h0Buffer, rows],
      textures: [displacement, derivatives, moments],
      rowsGroup,
      columnsGroup,
      mipGroups,
      fields: {
        count,
        tiles: layout.tiles,
        rotations: layout.tiles.map((_, c) => layout.rotations?.[c] ?? 0),
        longest: layout.kInner.map((k) => (2 * Math.PI) / k),
        displacement: arrayView(displacement),
        derivatives: arrayView(derivatives),
        moments: arrayView(moments),
      },
    }
  }

  const release = (old: State): void => {
    for (const buffer of old.buffers) buffer.destroy()
    for (const texture of old.textures) texture.destroy()
  }

  let state: State | undefined

  return {
    setSea: (sea, settings) => {
      const next = build(sea, settings)
      if (state !== undefined) release(state)
      state = next
      return next.fields
    },
    prepare: (tick) => {
      uniformWords[TAIL_WORD.tick] = wrap(tick, PERIOD_TICKS)
      device.queue.writeBuffer(uniform, 0, uniformData)
    },
    encode: (pass) => {
      if (state?.rowsGroup === undefined || state.columnsGroup === undefined) return
      const { count, resolution: n } = state
      const pipelines = fftPipelinesFor(n)
      pass.setPipeline(pipelines.rows)
      pass.setBindGroup(0, state.rowsGroup)
      pass.dispatchWorkgroups(n, count)
      pass.setPipeline(pipelines.columns)
      pass.setBindGroup(0, state.columnsGroup)
      pass.dispatchWorkgroups(n, count)
      pass.setPipeline(mipPipeline)
      state.mipGroups.forEach((group, level) => {
        const size = Math.max(1, n >> (level + 1))
        pass.setBindGroup(0, group)
        pass.dispatchWorkgroups(Math.ceil(size / 8), Math.ceil(size / 8), count)
      })
    },
    destroy: () => {
      if (state !== undefined) release(state)
      uniform.destroy()
    },
  }
}
