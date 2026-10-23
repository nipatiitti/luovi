export const HDR_FORMAT: GPUTextureFormat = 'rgba16float'
export const DEPTH_FORMAT: GPUTextureFormat = 'depth32float'
export const MSAA_SAMPLES = 4

/**
 * The offscreen scene target every scene pass draws into: multisampled HDR colour and reverse-Z depth (cleared to 0,
 * the far plane), resolved into a single-sample HDR texture that the tone-map pass reads. It never touches the canvas.
 */
export interface HdrTarget {
  readonly width: number
  readonly height: number
  readonly color: GPUTextureView
  readonly resolve: GPUTextureView
  readonly depth: GPUTextureView
  destroy(): void
}

export const createHdrTarget = (device: GPUDevice, width: number, height: number): HdrTarget => {
  const size = { width, height }
  const color = device.createTexture({
    label: 'hdr color',
    size,
    format: HDR_FORMAT,
    sampleCount: MSAA_SAMPLES,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  })
  const resolve = device.createTexture({
    label: 'hdr resolve',
    size,
    format: HDR_FORMAT,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  })
  const depth = device.createTexture({
    label: 'hdr depth',
    size,
    format: DEPTH_FORMAT,
    sampleCount: MSAA_SAMPLES,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  })
  return {
    width,
    height,
    color: color.createView(),
    resolve: resolve.createView(),
    depth: depth.createView(),
    destroy: () => {
      color.destroy()
      resolve.destroy()
      depth.destroy()
    },
  }
}

/**
 * A render pass into the target. The first pass of a frame clears it; every pass but the last keeps colour and depth
 * for the next, and the last resolves the samples and lets them go.
 */
export const hdrPassDescriptor = (
  target: HdrTarget,
  label: string,
  order: { readonly first: boolean; readonly last: boolean },
  timestampWrites?: GPURenderPassTimestampWrites,
): GPURenderPassDescriptor => {
  const loadOp = order.first ? 'clear' : 'load'
  const storeOp = order.last ? 'discard' : 'store'
  return {
    label,
    colorAttachments: [
      {
        view: target.color,
        ...(order.last && { resolveTarget: target.resolve }),
        clearValue: [0, 0, 0, 1],
        loadOp,
        storeOp,
      },
    ],
    depthStencilAttachment: { view: target.depth, depthClearValue: 0, depthLoadOp: loadOp, depthStoreOp: storeOp },
    ...(timestampWrites && { timestampWrites }),
  }
}
