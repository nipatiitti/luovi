import { brunetonAtmosphere } from '@luovi/data'
import { acquireGpu, createSceneRenderer, type RenderSettings } from '@luovi/render-scene'

export interface Viewer {
  /** GPU milliseconds per pass, absent without `timestamp-query`. */
  readonly timings: ReadonlyMap<string, number> | undefined
  stop(): void
}

/**
 * Acquires the GPU, precomputes the atmosphere and draws every animation frame with whatever `frame` returns, so a
 * panel edit shows on the next frame. The canvas backing store follows its CSS size in device pixels.
 */
export const startViewer = async (
  canvas: HTMLCanvasElement,
  frame: (seconds: number) => RenderSettings,
): Promise<Viewer> => {
  const gpu = await acquireGpu()
  const renderer = await createSceneRenderer(gpu, canvas, brunetonAtmosphere)
  const limit = gpu.device.limits.maxTextureDimension2D

  const resize = new ResizeObserver(([entry]) => {
    const box = entry?.devicePixelContentBoxSize[0]
    if (box === undefined) return
    canvas.width = Math.min(limit, Math.max(1, box.inlineSize))
    canvas.height = Math.min(limit, Math.max(1, box.blockSize))
  })
  resize.observe(canvas, { box: 'device-pixel-content-box' })

  let handle = 0
  let last: number | undefined
  const tick = (now: number): void => {
    const seconds = last === undefined ? 0 : (now - last) / 1000
    last = now
    renderer.render(frame(seconds))
    handle = requestAnimationFrame(tick)
  }
  handle = requestAnimationFrame(tick)

  return {
    get timings() {
      return renderer.timings
    },
    stop: () => {
      cancelAnimationFrame(handle)
      resize.disconnect()
      renderer.destroy()
      gpu.device.destroy()
    },
  }
}
