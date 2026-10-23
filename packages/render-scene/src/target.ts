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

/** The render pass descriptor that clears the target and resolves it at the end of the pass. */
export const hdrPassDescriptor = (
  target: HdrTarget,
  label: string,
  timestampWrites?: GPURenderPassTimestampWrites,
): GPURenderPassDescriptor => ({
  label,
  colorAttachments: [
    {
      view: target.color,
      resolveTarget: target.resolve,
      clearValue: [0, 0, 0, 1],
      loadOp: 'clear',
      storeOp: 'discard',
    },
  ],
  depthStencilAttachment: { view: target.depth, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'store' },
  ...(timestampWrites && { timestampWrites }),
})
