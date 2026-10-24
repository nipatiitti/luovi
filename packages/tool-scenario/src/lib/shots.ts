import type { Camera } from '@luovi/render-scene'
import { bearingOf, toDegrees, toRadians } from './angles.ts'
import { initialSettings } from './settings.ts'
import { FOAM_VARIANTS } from './foamPrototype.ts'

// The named views `pnpm shots` captures. Each is the page's own state, a showcase scenario, a camera, the Sun and the
// debug toggles, so a capture never depends on clicking the panel. The page installs the hook below only when opened
// with ?shots, and the capture script asks it for each view by name.

export interface ShotView {
  readonly name: string
  /** The caption on the contact sheet. */
  readonly label: string
  /** A showcase entry's name. */
  readonly scenario: string
  readonly camera: Camera
  /** Degrees above the horizon. */
  readonly sunElevation: number
  /** Compass degrees the Sun stands in. */
  readonly sunBearing: number
  readonly exposureValue: number
  readonly foam: boolean
  /** Pause the simulation once the sea has run, then draw the frozen state. */
  readonly paused: boolean
  /** PROTOTYPE (#41): the whitecap variant's key. */
  readonly foamVariant: string
}

const daylight = {
  sunElevation: Math.round(toDegrees(initialSettings.sunElevation)),
  sunBearing: Math.round(bearingOf(initialSettings.sunAzimuth)),
  exposureValue: initialSettings.exposureValue,
  foam: true,
  paused: false,
}

/** The opening orbit, 40 m out with the eye about 6 m up, facing south toward the afternoon Sun's glitter. */
const surface: Camera = initialSettings.camera

/** 300 m above the origin, looking south and down so the near sea and the horizon share the frame. */
const high: Camera = { mode: 'free', position: [0, 0, 300], yaw: toRadians(-90), pitch: toRadians(-25) }

/** The opening orbit turned west, toward a Sun on the horizon. */

/** PROTOTYPE (#41): 4 m above the water looking south and down at 30 degrees, for near detail. */
const close: Camera = { mode: 'free', position: [0, 0, 4], yaw: toRadians(-90), pitch: toRadians(-30) }

/** PROTOTYPE (#41): each scene once per whitecap variant, named scene.variant. */
const SCENES: readonly Omit<ShotView, 'foamVariant'>[] = [
  { name: 'light', label: 'Light sea, 8 m/s', scenario: 'Light reference sea', camera: surface, ...daylight },
  { name: 'moderate', label: 'Moderate sea, 12 m/s', scenario: 'Moderate reference sea', camera: surface, ...daylight },
  { name: 'storm', label: 'Storm sea, 20 m/s', scenario: 'Storm reference sea', camera: surface, ...daylight },
  { name: 'storm-300m', label: 'Storm sea from 300 m', scenario: 'Storm reference sea', camera: high, ...daylight },
  { name: 'storm-close', label: 'Storm sea from 4 m up', scenario: 'Storm reference sea', camera: close, ...daylight },
  {
    name: 'moderate-close',
    label: 'Moderate sea from 4 m up',
    scenario: 'Moderate reference sea',
    camera: close,
    ...daylight,
  },
  { name: 'below', label: 'Below onset, 4.0 m/s', scenario: 'Below onset, 4.0 m/s', camera: surface, ...daylight },
  { name: 'above', label: 'Above onset, 4.5 m/s', scenario: 'Above onset, 4.5 m/s', camera: surface, ...daylight },
  { name: 'early', label: 'Early whitecaps, 6.0 m/s', scenario: 'Early whitecaps, 6.0 m/s', camera: surface, ...daylight },
]

const SHOT_VIEWS: readonly ShotView[] = SCENES.flatMap((scene) =>
  FOAM_VARIANTS.map((variant) => ({
    ...scene,
    name: `${scene.name}.${variant.key}`,
    label: `${scene.label}, ${variant.label}`,
    foamVariant: variant.key,
  })),
)

/** What a captured view reports beside its picture. */
export interface ShotResult {
  readonly tick: number | undefined
  /** GPU milliseconds per pass, null without `timestamp-query`. */
  readonly timings: Readonly<Record<string, number>> | null
}

export interface ShotsHook {
  readonly views: readonly ShotView[]
  /** Loads the view's scenario, applies its camera, Sun and toggles, and settles once the sea has run and drawn. */
  show(name: string): Promise<void>
  /** The state the page draws now. */
  read(): ShotResult
}

declare global {
  var luoviShots: ShotsHook | undefined
}

/** What the page lends the hook: its own load, settings and simulation controls. */
export interface ShotsPage {
  /** Loads a showcase entry from tick 0 and settles once the Worker has accepted it. */
  load(scenario: string): Promise<void>
  /** Sets the view's camera, Sun, exposure and toggles. */
  apply(view: ShotView): void
  pause(): void
  /** Settles once this many more frames have been drawn. */
  frames(count: number): Promise<void>
  read(): ShotResult
}

// Frames drawn before a view counts as settled: two seconds at 60 Hz, which runs the sea long enough for foam to build
// up from its empty start (the storm's foam decays over seconds, data's foamDecayTime) and for the timer queries to land.
const RUN_FRAMES = 120
// Frames drawn after a pause, so the picture is of the frozen state rather than the frame the pause arrived on.
const PAUSED_FRAMES = 30

export const installShotsHook = (page: ShotsPage): (() => void) => {
  globalThis.luoviShots = {
    views: SHOT_VIEWS,
    show: async (name) => {
      const view = SHOT_VIEWS.find((candidate) => candidate.name === name)
      if (view === undefined) throw new Error(`no view named ${name}`)
      await page.load(view.scenario)
      page.apply(view)
      await page.frames(RUN_FRAMES)
      if (view.paused) {
        page.pause()
        await page.frames(PAUSED_FRAMES)
      }
    },
    read: () => page.read(),
  }
  return () => {
    globalThis.luoviShots = undefined
  }
}

/** Counts drawn frames and settles waits on a count; `drawn` is called once per frame the viewer draws. */
export const frameCounter = (): { drawn(): void; after(count: number): Promise<void> } => {
  let drawn = 0
  let waiters: { readonly at: number; readonly resolve: () => void }[] = []
  return {
    drawn: () => {
      drawn += 1
      const due = waiters.filter((waiter) => waiter.at <= drawn)
      waiters = waiters.filter((waiter) => waiter.at > drawn)
      for (const waiter of due) waiter.resolve()
    },
    after: async (count) =>
      new Promise((resolve) => {
        waiters.push({ at: drawn + count, resolve })
      }),
  }
}
