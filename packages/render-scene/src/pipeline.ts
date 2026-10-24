// The thin layer ADR 0001 asks for: explicit layouts (never 'auto', so one bind group serves every pipeline that
// declares the same group), bind groups by position, uniform buffers, and the full-screen triangle every post pass
// shares. Nothing here owns pass order or resource lifetime; the caller does.

/** One binding of a layout; its index is its position in the list. */
export type BindingKind =
  | { readonly uniform: true }
  | { readonly storage: 'read-only-storage' | 'storage' }
  | { readonly texture: GPUTextureSampleType; readonly dimension?: GPUTextureViewDimension }
  | {
      readonly storageTexture: GPUTextureFormat
      readonly dimension?: GPUTextureViewDimension
    }
  | { readonly sampler: GPUSamplerBindingType }

const layoutEntry = (kind: BindingKind, binding: number, visibility: number): GPUBindGroupLayoutEntry => {
  if ('uniform' in kind) return { binding, visibility, buffer: { type: 'uniform' } }
  if ('storage' in kind) return { binding, visibility, buffer: { type: kind.storage } }
  if ('texture' in kind) {
    return { binding, visibility, texture: { sampleType: kind.texture, viewDimension: kind.dimension ?? '2d' } }
  }
  if ('storageTexture' in kind) {
    return {
      binding,
      visibility,
      storageTexture: { access: 'write-only', format: kind.storageTexture, viewDimension: kind.dimension ?? '2d' },
    }
  }
  return { binding, visibility, sampler: { type: kind.sampler } }
}

export const createBindGroupLayout = (
  device: GPUDevice,
  label: string,
  visibility: number,
  kinds: readonly BindingKind[],
): GPUBindGroupLayout =>
  device.createBindGroupLayout({ label, entries: kinds.map((kind, i) => layoutEntry(kind, i, visibility)) })

/** A GPUBuffer is bound whole; anything else (a view, a sampler) is bound as given. */
export type BindingResource = GPUBuffer | GPUTextureView | GPUSampler

export const createBindGroup = (
  device: GPUDevice,
  label: string,
  layout: GPUBindGroupLayout,
  resources: readonly BindingResource[],
): GPUBindGroup =>
  device.createBindGroup({
    label,
    layout,
    entries: resources.map((resource, binding) => ({
      binding,
      resource: resource instanceof GPUBuffer ? { buffer: resource } : resource,
    })),
  })

export const createComputePipeline = (
  device: GPUDevice,
  label: string,
  code: string,
  layouts: readonly GPUBindGroupLayout[],
  constants?: Record<string, number>,
): GPUComputePipeline =>
  device.createComputePipeline({
    label,
    layout: device.createPipelineLayout({ label, bindGroupLayouts: [...layouts] }),
    compute: {
      module: device.createShaderModule({ label, code }),
      entryPoint: 'main',
      ...(constants && { constants }),
    },
  })

/** Vertex stage of a triangle covering the viewport; `ndc` runs from -1 to 1 with y up. */
const fullscreenVertexWgsl = /* wgsl */ `
struct FullscreenVarying {
  @builtin(position) position: vec4f,
  @location(0) ndc: vec2f,
}

@vertex
fn fullscreen_vertex(@builtin(vertex_index) index: u32) -> FullscreenVarying {
  let ndc = vec2f(f32((index << 1u) & 2u) * 2.0 - 1.0, f32(index & 2u) * 2.0 - 1.0);
  return FullscreenVarying(vec4f(ndc, 0.0, 1.0), ndc);
}
`

export interface FullscreenPipelineOptions {
  readonly label: string
  /** Must contain a `@fragment fn main(in: FullscreenVarying)`; the vertex stage is prepended. */
  readonly fragmentWgsl: string
  readonly layouts: readonly GPUBindGroupLayout[]
  readonly format: GPUTextureFormat
  readonly sampleCount?: number
  readonly depthFormat?: GPUTextureFormat
  /**
   * Against the triangle's depth of 0, the far plane under reverse-Z: 'equal' draws only where nothing has been drawn.
   * Default 'always'.
   */
  readonly depthCompare?: GPUCompareFunction
}

/** A full-screen pass: no vertex buffers, three vertices, and depth left unwritten when a depth target exists. */
export const createFullscreenPipeline = (device: GPUDevice, options: FullscreenPipelineOptions): GPURenderPipeline => {
  const { label, fragmentWgsl, layouts, format, sampleCount = 1, depthFormat, depthCompare = 'always' } = options
  const module = device.createShaderModule({ label, code: fullscreenVertexWgsl + fragmentWgsl })
  return device.createRenderPipeline({
    label,
    layout: device.createPipelineLayout({ label, bindGroupLayouts: [...layouts] }),
    vertex: { module, entryPoint: 'fullscreen_vertex' },
    fragment: { module, entryPoint: 'main', targets: [{ format }] },
    multisample: { count: sampleCount },
    ...(depthFormat && {
      depthStencil: { format: depthFormat, depthWriteEnabled: false, depthCompare },
    }),
  })
}

export interface UniformBuffer {
  readonly buffer: GPUBuffer
  write(data: Float32Array<ArrayBuffer>): void
}

export const createUniformBuffer = (device: GPUDevice, label: string, byteSize: number): UniformBuffer => {
  const buffer = device.createBuffer({ label, size: byteSize, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  return {
    buffer,
    write: (data) => {
      device.queue.writeBuffer(buffer, 0, data)
    },
  }
}

export interface ScenePipelineOptions {
  readonly label: string
  /** Must contain `@vertex fn vertex_main` and `@fragment fn fragment_main`; vertices come from storage or the index. */
  readonly wgsl: string
  readonly layouts: readonly GPUBindGroupLayout[]
  readonly format: GPUTextureFormat
  readonly sampleCount: number
  readonly depthFormat: GPUTextureFormat
}

/**
 * An opaque scene pass into the HDR target: no vertex buffers, triangle list, depth tested and written. Depth is
 * reverse-Z (1 near, 0 at infinity), so nearer is greater.
 */
export const createScenePipeline = (device: GPUDevice, options: ScenePipelineOptions): GPURenderPipeline => {
  const { label, wgsl, layouts, format, sampleCount, depthFormat } = options
  const module = device.createShaderModule({ label, code: wgsl })
  return device.createRenderPipeline({
    label,
    layout: device.createPipelineLayout({ label, bindGroupLayouts: [...layouts] }),
    vertex: { module, entryPoint: 'vertex_main' },
    fragment: { module, entryPoint: 'fragment_main', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
    multisample: { count: sampleCount },
    depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: 'greater' },
  })
}
