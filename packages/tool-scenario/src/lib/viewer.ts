import type { SeaDescription } from '@luovi/core'
import { brunetonAtmosphere } from '@luovi/data'
import { createOceanSurface, type OceanDebug } from '@luovi/render-ocean'
import { acquireGpu, createSceneRenderer, type RenderSettings } from '@luovi/render-scene'

/** One frame's input to the renderer: what the viewer chose and what the simulation shows. */
export interface ViewerFrame {
  readonly settings: RenderSettings
  /** The loaded sea, null for flat water; a new object means a new sea state and a new upload. */
  readonly sea: SeaDescription | null
  /** The published slot's tick the sea is drawn at. */
  readonly tick: number
  readonly oceanDebug: OceanDebug
  /** xyz per probe marker in world metres. */
  readonly markers: Float32Array<ArrayBuffer>
}

export interface Viewer {
  /** GPU milliseconds per pass, absent without `timestamp-query`. */
  readonly timings: ReadonlyMap<string, number> | undefined
  stop(): void
}

/**
 * Acquires the GPU, precomputes the atmosphere and draws every animation frame with whatever `frame` returns, so a
 * panel edit shows on the next frame. The canvas backing store follows its CSS size in device pixels. The sea surface
 * comes from render-ocean and joins render-scene's frame as a layer, which only a tool may wire, since neither renderer
 * imports the other.
 */
export const startViewer = async (
  canvas: HTMLCanvasElement,
  frame: (seconds: number) => ViewerFrame,
): Promise<Viewer> => {
  const gpu = await acquireGpu()
  const renderer = await createSceneRenderer(gpu, canvas, brunetonAtmosphere)
  const ocean = createOceanSurface(renderer.layerTarget)
  const limit = gpu.device.limits.maxTextureDimension2D

  const resize = new ResizeObserver(([entry]) => {
    const box = entry?.devicePixelContentBoxSize[0]
    if (box === undefined) return
    canvas.width = Math.min(limit, Math.max(1, box.inlineSize))
    canvas.height = Math.min(limit, Math.max(1, box.blockSize))
  })
  resize.observe(canvas, { box: 'device-pixel-content-box' })

  let sea: SeaDescription | null = null
  let handle = 0
  let last: number | undefined
  const tick = (now: number): void => {
    const seconds = last === undefined ? 0 : (now - last) / 1000
    last = now
    const next = frame(seconds)
    if (next.sea !== sea) {
      sea = next.sea
      ocean.setSea(sea)
    }
    renderer.render(next.settings, {
      markers: next.markers,
      sea: {
        prepare: (view) => {
          ocean.prepare({ ...view, tick: next.tick, debug: next.oceanDebug })
        },
        draw: (pass, sceneGroups) => {
          ocean.draw(pass, sceneGroups)
        },
      },
    })
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
      ocean.destroy()
      renderer.destroy()
      gpu.device.destroy()
    },
  }
}
