/** Thrown when the browser cannot give us a WebGPU device; the message says what is missing and what to do. */
export class WebGpuUnavailableError extends Error {
  override readonly name = 'WebGpuUnavailableError'
}

export interface Gpu {
  readonly adapter: GPUAdapter
  readonly device: GPUDevice
  /** The swap chain format the browser prefers; the tone-map pass writes it. */
  readonly canvasFormat: GPUTextureFormat
  /** Whether the device was created with `timestamp-query`, so per-pass GPU timings can exist. */
  readonly timestampQuery: boolean
}

const browsers = 'Use a current Chrome, Edge or Safari on a machine with a supported GPU.'

export const acquireGpu = async (): Promise<Gpu> => {
  if (!('gpu' in navigator)) {
    throw new WebGpuUnavailableError(`This browser has no WebGPU (navigator.gpu is missing). ${browsers}`)
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
  if (adapter === null) {
    throw new WebGpuUnavailableError(
      `WebGPU is present but no GPU adapter was offered, which usually means the GPU is blocklisted or hardware acceleration is off. ${browsers}`,
    )
  }
  const timestampQuery = adapter.features.has('timestamp-query')
  const device = await adapter.requestDevice({ requiredFeatures: timestampQuery ? ['timestamp-query'] : [] })
  return { adapter, device, canvasFormat: navigator.gpu.getPreferredCanvasFormat(), timestampQuery }
}
