import type { SeaDescription } from '@luovi/sim-world'
import { bandWeights, type Clipmap, clipmapFor, surfacePhases } from './clipmap.ts'
import { type RingMesh, ringMesh } from './mesh.ts'
import { defaultRenderOceanSettings, type OceanDebug, type RenderOceanSettings } from './settings.ts'

// The sea surface draw: every ring of the clipmap as one indexed draw of the shared ring mesh, the band summed per vertex
// (ADR 0011). render-ocean may not import render-scene (both are renderers), so the frame's target formats, the camera
// and atmosphere WGSL and their bind group layouts come in as arguments.

/** What the scene renderer lends the sea: its device, target formats and the WGSL and layouts of its shared groups. */
export interface OceanTarget {
  readonly device: GPUDevice
  readonly format: GPUTextureFormat
  readonly sampleCount: number
  /** Reverse-Z: the pipeline keeps the greater depth. */
  readonly depthFormat: GPUTextureFormat
  /**
   * WGSL that declares `camera` (with a world `eye`) at group 0 and the atmosphere at group 1, with
   * `sky_radiance(position, ray)` and `sky_radiance_to_point(eye, point)` returning `radiance` and `transmittance`.
   */
  readonly sceneWgsl: string
  /** The layouts of groups 0 and 1 in that order. */
  readonly sceneLayouts: readonly GPUBindGroupLayout[]
}

/** One frame of the sea as the scene renderer asks for it. */
export interface OceanFrame {
  /** The published slot's tick: the sea is drawn at tick / TICKS_PER_SECOND and never at wall time, so pause freezes it. */
  readonly tick: number
  /** World eye position, m, f64. */
  readonly eye: readonly [number, number, number]
  /** The frame's view-projection for positions measured from `origin` (world m), so the GPU never sees a large coordinate. */
  viewProjectionFrom(origin: readonly [number, number, number]): Float32Array<ArrayBuffer>
  readonly debug: OceanDebug
}

export interface OceanSurface {
  /**
   * A new sea state: uploads its wave vectors, frequencies and amplitudes, the only time they move to the GPU. null is
   * flat water. Settings default to those derived from the sea; a host override replaces them whole.
   */
  setSea(sea: SeaDescription | null, settings?: RenderOceanSettings): void
  readonly settings: RenderOceanSettings
  /** The frame's CPU work and uploads: the clipmap, the per-ring band weights and the N phases. */
  prepare(frame: OceanFrame): void
  /** Encodes the surface into an open scene pass; `sceneGroups` are the bind groups for `sceneLayouts`. */
  draw(pass: GPURenderPassEncoder, sceneGroups: readonly GPUBindGroup[]): void
  destroy(): void
}

/** Floats per component in the wave table: kx, ky, amplitude, lambda A / k, omega, then padding to 32 bytes. */
const WAVE_FLOATS = 8
/** Floats per ring: centre x and y from the origin, spacing, carry, height morph, level, padding. */
const RING_FLOATS = 8
/** Bytes of the `Ocean` uniform: view-projection, eye, count, origin, cells, wireframe. */
const OCEAN_UNIFORM_BYTES = 96

const surfaceWgsl = (sceneWgsl: string): string => /* wgsl */ `
${sceneWgsl}

struct Ocean {
  view_projection: mat4x4f,
  eye: vec3f,
  count: u32,
  origin: vec2f,
  cells: f32,
  wireframe: u32,
}

struct Wave {
  k: vec2f,
  amplitude: f32,
  // lambda A / |k|: the horizontal displacement is -lambda k_hat A sin(theta), the Gerstner sign the query uses.
  displacement: f32,
  // omega, for the surface velocity the foam pass advects by (#37); phases already carry it for the draw.
  frequency: f32,
  _pad0: f32,
  _pad1: vec2f,
}

struct Ring {
  centre: vec2f,
  spacing: f32,
  carry: f32,
  height_morph: f32,
  level: f32,
  _pad: vec2f,
}

@group(2) @binding(0) var<uniform> ocean: Ocean;
@group(2) @binding(1) var<storage, read> waves: array<Wave>;
@group(2) @binding(2) var<storage, read> phases: array<f32>;
@group(2) @binding(3) var<storage, read> weights: array<f32>;
@group(2) @binding(4) var<storage, read> rings: array<Ring>;

const TAU: f32 = 6.28318530717958648;

struct Varying {
  @builtin(position) position: vec4f,
  // Displaced position measured from the clipmap origin.
  @location(0) relative: vec3f,
  // The displaced surface's tangents along the undisplaced x and y; their cross product is the normal, formed per pixel
  // from interpolated vertex slopes.
  @location(1) tangent_x: vec3f,
  @location(2) tangent_y: vec3f,
  // Ring-local cell coordinates after the morph, for the wireframe overlay.
  @location(3) cell: vec2f,
  @location(4) @interpolate(flat) level: f32,
  // Aerial perspective between the eye and the vertex, which varies over hundreds of metres, so per vertex.
  @location(5) transmittance: vec3f,
  @location(6) in_scatter: vec3f,
}

@vertex
fn vertex_main(@builtin(vertex_index) index: u32, @builtin(instance_index) slot: u32) -> Varying {
  let ring = rings[slot];
  let side = u32(ocean.cells) + 1u;
  let half = ocean.cells * 0.5;
  let grid = vec2f(f32(index % side), f32(index / side)) - half;
  let flat_position = ring.centre + grid * ring.spacing;

  // CDLOD morph over the outer quarter of the ring, by distance from the eye so a vertex never moves when the ring
  // snaps. The ring's edge lies at least half - 1 cells from the eye, since its centre is snapped to twice its spacing,
  // so the edge is always fully morphed onto the next ring's vertices.
  let reach = max(abs(flat_position.x - ocean.eye.x), abs(flat_position.y - ocean.eye.y)) / ring.spacing;
  let morph_end = half - 1.0;
  let morph_start = morph_end - 0.25 * half;
  let morph = max(clamp((reach - morph_start) / (morph_end - morph_start), 0.0, 1.0), ring.height_morph);
  // Odd vertices slide onto the even one below them; the centre is on the coarser grid, so local parity is world parity.
  let odd = grid - 2.0 * floor(grid * 0.5);
  let cell = grid - odd * morph;
  let position = ring.centre + cell * ring.spacing;

  var height = 0.0;
  var shift = vec2f(0.0);
  var slope = vec2f(0.0);
  var stretch = vec3f(0.0); // d(shift.x)/dx, d(shift.x)/dy = d(shift.y)/dx, d(shift.y)/dy
  // Rings are ordered by carry, so a ring that carries nothing also morphs towards a ring that carries nothing.
  if (ring.carry > 0.0) {
    let row = slot * ocean.count;
    for (var i = 0u; i < ocean.count; i++) {
      // The morph also blends the band weights towards the next ring's, so a vertex that lands on the next ring
      // carries exactly what that ring carries there.
      let weight = mix(weights[row + i], weights[row + ocean.count + i], morph);
      if (weight == 0.0) {
        continue;
      }
      let wave = waves[i];
      var theta = dot(wave.k, position) + phases[i];
      // WGSL bounds sin and cos only on [-pi, pi], and far rings reach phases of a thousand radians.
      theta -= TAU * round(theta / TAU);
      let s = sin(theta);
      let c = cos(theta);
      let a = weight * wave.amplitude;
      let d = weight * wave.displacement;
      height += a * c;
      shift -= d * s * wave.k;
      slope -= a * s * wave.k;
      stretch -= d * c * vec3f(wave.k.x * wave.k.x, wave.k.x * wave.k.y, wave.k.y * wave.k.y);
    }
  }
  let relative = vec3f(position + shift, height);
  let between = sky_radiance_to_point(camera.eye, vec3f(ocean.origin + relative.xy, relative.z));
  return Varying(
    ocean.view_projection * vec4f(relative, 1.0),
    relative,
    vec3f(1.0 + stretch.x, stretch.y, slope.x),
    vec3f(stretch.y, 1.0 + stretch.z, slope.y),
    cell,
    ring.level,
    between.transmittance,
    between.radiance,
  );
}

// Tints for the wireframe overlay, alternating by ring level so each ring's extent reads against its neighbours.
const RING_TINTS = array<vec3f, 2>(vec3f(0.1, 0.9, 1.0), vec3f(1.0, 0.2, 0.8));

@fragment
fn fragment_main(in: Varying) -> @location(0) vec4f {
  let normal = normalize(cross(in.tangent_x, in.tangent_y));
  let world = vec3f(ocean.origin + in.relative.xy, in.relative.z);
  let view = normalize(in.relative - ocean.eye);
  // Placeholder shade until water shading lands (#36): a mirror for the sky along the normal. A reflected ray that dips
  // under the horizon would see the sea itself, which this shade cannot draw, so it is held to the horizon.
  let mirror = reflect(view, normal);
  let ray = normalize(vec3f(mirror.xy, max(mirror.z, 0.0)));
  let sky = sky_radiance(world, ray);
  var color = sky.radiance * in.transmittance + in.in_scatter;

  // The wireframe as lines one pixel wide along every cell edge, faded where the cells crowd closer than four pixels.
  let footprint = fwidth(in.cell);
  let pixels = abs(fract(in.cell + 0.5) - 0.5) / max(footprint, vec2f(1e-6));
  let line = (1.0 - clamp(min(pixels.x, pixels.y), 0.0, 1.0)) * (1.0 - clamp(max(footprint.x, footprint.y) * 4.0, 0.0, 1.0));
  if (ocean.wireframe != 0u) {
    let tint = RING_TINTS[u32(in.level) % 2u] * dot(color, vec3f(1.0)) * 0.5;
    color = mix(color * 0.6, tint, line);
  }
  return vec4f(color, 1.0);
}
`

export const createOceanSurface = (target: OceanTarget): OceanSurface => {
  const { device } = target
  const label = 'ocean surface'
  const layout = device.createBindGroupLayout({
    label,
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ...[1, 2, 3, 4].map((binding) => ({
        binding,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'read-only-storage' as const },
      })),
    ],
  })
  const module = device.createShaderModule({ label, code: surfaceWgsl(target.sceneWgsl) })
  const pipeline = device.createRenderPipeline({
    label,
    layout: device.createPipelineLayout({ label, bindGroupLayouts: [...target.sceneLayouts, layout] }),
    vertex: { module, entryPoint: 'vertex_main' },
    fragment: { module, entryPoint: 'fragment_main', targets: [{ format: target.format }] },
    primitive: { topology: 'triangle-list' },
    multisample: { count: target.sampleCount },
    depthStencil: { format: target.depthFormat, depthWriteEnabled: true, depthCompare: 'greater' },
  })

  const buffer = (name: string, size: number, usage: number): GPUBuffer =>
    device.createBuffer({ label: `${label} ${name}`, size: Math.max(16, size), usage: usage | GPUBufferUsage.COPY_DST })
  const storage = (name: string, size: number): GPUBuffer => buffer(name, size, GPUBufferUsage.STORAGE)
  const uniform = buffer('uniform', OCEAN_UNIFORM_BYTES, GPUBufferUsage.UNIFORM)
  const uniformData = new ArrayBuffer(OCEAN_UNIFORM_BYTES)
  const uniformFloats = new Float32Array(uniformData)
  const uniformWords = new Uint32Array(uniformData)

  /** Everything sized by the sea and the settings, rebuilt together when either changes. */
  interface State {
    readonly sea: SeaDescription | null
    readonly settings: RenderOceanSettings
    readonly mesh: RingMesh
    readonly indices: GPUBuffer
    readonly waves: GPUBuffer
    readonly phases: GPUBuffer
    readonly weights: GPUBuffer
    readonly rings: GPUBuffer
    readonly group: GPUBindGroup
    readonly phaseScratch: Float64Array
    readonly phaseData: Float32Array<ArrayBuffer>
    readonly weightData: Float32Array<ArrayBuffer>
    readonly ringData: Float32Array<ArrayBuffer>
    clipmap: Clipmap | undefined
  }

  const build = (sea: SeaDescription | null, settings: RenderOceanSettings, previous: State | undefined): State => {
    const reuseMesh = previous?.settings.ringCells === settings.ringCells ? previous : undefined
    const mesh = reuseMesh?.mesh ?? ringMesh(settings.ringCells)
    const indices = reuseMesh?.indices ?? buffer('indices', mesh.indices.byteLength, GPUBufferUsage.INDEX)
    if (reuseMesh === undefined) device.queue.writeBuffer(indices, 0, mesh.indices)
    if (previous !== undefined) {
      if (reuseMesh === undefined) previous.indices.destroy()
      for (const old of [previous.waves, previous.phases, previous.weights, previous.rings]) old.destroy()
    }

    const count = sea?.components.count ?? 0
    // The ring list is fixed by the settings: the displacing rings, the emerging one and the flat disc.
    const ringTotal = clipmapFor(settings, [0, 0, 0]).rings.length
    const waveData = new Float32Array(Math.max(1, count) * WAVE_FLOATS)
    if (sea !== null) {
      const { kx, ky, k, omega, amplitude } = sea.components
      for (let i = 0; i < count; i += 1) {
        const a = amplitude[i] ?? 0
        waveData.set([kx[i] ?? 0, ky[i] ?? 0, a, (sea.choppiness * a) / (k[i] ?? 1), omega[i] ?? 0], i * WAVE_FLOATS)
      }
    }
    const waves = storage('waves', waveData.byteLength)
    device.queue.writeBuffer(waves, 0, waveData)
    const phaseData = new Float32Array(Math.max(1, count))
    const weightData = new Float32Array(Math.max(1, (ringTotal + 1) * count))
    const ringData = new Float32Array(ringTotal * RING_FLOATS)
    const phases = storage('phases', phaseData.byteLength)
    const weights = storage('weights', weightData.byteLength)
    const rings = storage('rings', ringData.byteLength)
    const group = device.createBindGroup({
      label,
      layout,
      entries: [uniform, waves, phases, weights, rings].map((resource, binding) => ({
        binding,
        resource: { buffer: resource },
      })),
    })
    return {
      sea,
      settings,
      mesh,
      indices,
      waves,
      phases,
      weights,
      rings,
      group,
      phaseScratch: new Float64Array(count),
      phaseData,
      weightData,
      ringData,
      clipmap: undefined,
    }
  }

  let state = build(null, defaultRenderOceanSettings(null), undefined)

  return {
    setSea: (sea, settings) => {
      state = build(sea, settings ?? defaultRenderOceanSettings(sea), state)
    },
    get settings() {
      return state.settings
    },
    prepare: (frame) => {
      const { sea, settings } = state
      const clipmap = clipmapFor(settings, frame.eye)
      const [x0, y0] = clipmap.origin
      state.clipmap = clipmap

      if (sea !== null) {
        surfacePhases(sea, frame.tick, clipmap.origin, state.phaseScratch, state.phaseData)
        device.queue.writeBuffer(state.phases, 0, state.phaseData)
      }
      bandWeights(sea, clipmap, state.weightData)
      device.queue.writeBuffer(state.weights, 0, state.weightData)
      clipmap.rings.forEach((ring, slot) => {
        state.ringData.set(
          [
            ring.centre[0] - x0,
            ring.centre[1] - y0,
            ring.spacing,
            ring.carry,
            slot === 0 ? clipmap.heightMorph : 0,
            ring.level,
          ],
          slot * RING_FLOATS,
        )
      })
      device.queue.writeBuffer(state.rings, 0, state.ringData)

      uniformFloats.set(frame.viewProjectionFrom([x0, y0, 0]), 0)
      uniformFloats.set([frame.eye[0] - x0, frame.eye[1] - y0, frame.eye[2]], 16)
      uniformWords[19] = sea?.components.count ?? 0
      uniformFloats.set([x0, y0, settings.ringCells], 20)
      uniformWords[23] = frame.debug.wireframe ? 1 : 0
      device.queue.writeBuffer(uniform, 0, uniformData)
    },
    draw: (pass, sceneGroups) => {
      const { clipmap, mesh, indices, group } = state
      if (clipmap === undefined) return
      pass.setPipeline(pipeline)
      sceneGroups.forEach((sceneGroup, index) => {
        pass.setBindGroup(index, sceneGroup)
      })
      pass.setBindGroup(sceneGroups.length, group)
      pass.setIndexBuffer(indices, 'uint32')
      clipmap.rings.forEach((ring, slot) => {
        const range = ring.hole === undefined ? mesh.full : mesh.holed(ring.hole[0], ring.hole[1])
        // The instance index carries the ring's slot into the shader; one instance per draw.
        pass.drawIndexed(range.count, 1, range.first, 0, slot)
      })
    },
    destroy: () => {
      for (const old of [uniform, state.indices, state.waves, state.phases, state.weights, state.rings]) old.destroy()
    },
  }
}
