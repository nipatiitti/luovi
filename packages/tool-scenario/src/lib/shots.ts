import { bearingOf, toDegrees, toRadians } from './angles.ts'
import { initialSettings } from './settings.ts'

// The named views `pnpm shots` captures. Each is the page's own state, a showcase scenario, a camera, the Sun and the
// debug toggles, so a capture never depends on clicking the panel. The page installs the hook below only when opened
// with ?shots, and the capture script asks it for each view by name.

export interface ShotView {
  readonly name: string
  /** The caption on the contact sheet. */
  readonly label: string
  /** A showcase entry's name. */
  readonly scenario: string
  /**
   * PROTOTYPE (band size, #43): a free eye this many metres above the CPU water height over the world origin, or over
   * the probe point with the lowest water.
   */
  readonly eyeAboveWater: number
  readonly eyeAt: 'origin' | 'trough'
  /** Radians counter-clockwise from east, and up from the horizontal. */
  readonly yaw: number
  readonly pitch: number
  /** Degrees above the horizon. */
  readonly sunElevation: number
  /** Compass degrees the Sun stands in. */
  readonly sunBearing: number
  readonly exposureValue: number
  readonly foam: boolean
  /** PROTOTYPE (band size, #43): the band variant's key, the tick the sea is drawn at, and what is drawn. */
  readonly bandVariant: string
  readonly tick: number
  readonly markers: boolean
  /** Draw the tail's cascades; off shows the band alone, the surface the CPU query answers for. */
  readonly tail: boolean
}

/** PROTOTYPE (band size, #43): the time in the run every view is drawn at, 10 s, paused there. */
const SHOT_TICK = 600

/**
 * The Sun as the tool opens with it, 35 degrees up in the south-west, behind every view below, which face north or east.
 * Foam is off in the pictures: main's near foam buffer keeps injecting while the run is paused, so its cover depends on
 * the frames drawn rather than the variant, and it hides the wave shape the comparison is about.
 */
const daylight = {
  sunElevation: Math.round(toDegrees(initialSettings.sunElevation)),
  sunBearing: Math.round(bearingOf(initialSettings.sunAzimuth)),
  exposureValue: initialSettings.exposureValue,
  foam: false,
  tick: SHOT_TICK,
  markers: false,
  tail: true,
  eyeAt: 'origin',
} as const

// The wind blows toward the east in every sea, so east is downwind and north is across the wind.
const EAST = 0
const NORTH = toRadians(90)

interface Scene {
  readonly name: string
  readonly label: string
  /** m above the water under the eye, per sea key; a number is every sea's. */
  readonly eyeAboveWater: number | Readonly<Record<string, number>>
  readonly yaw: number
  readonly pitch: number
  readonly eyeAt?: ShotView['eyeAt']
  readonly markers?: boolean
  readonly tail?: boolean
  readonly foam?: boolean
}

// PROTOTYPE (tail repetition, #44): the views of the cascade layout comparison. The layout comes from the page's
// ?layout=, so every view is drawn in whichever layout the page was opened with.
const oblique = { eyeAboveWater: 40, yaw: toRadians(45), pitch: toRadians(-20) }

const SCENES: readonly Scene[] = [
  { name: 'oblique', label: '40 m eye, 20 degrees below the horizon', ...oblique },
  { name: 'deck', label: '2.5 m eye, looking across the wind', eyeAboveWater: 2.5, yaw: NORTH, pitch: toRadians(-4) },
  { name: 'top', label: '80 m eye, looking nearly straight down', eyeAboveWater: 80, yaw: EAST, pitch: toRadians(-80) },
  { name: 'oblique-foam', label: '40 m eye, 20 degrees below the horizon, foam on', ...oblique, foam: true },
  // High enough that the frame's height spans about three of the baseline's cascade 0 tiles (50 degree field of view).
  {
    name: 'top-wide',
    label: 'Looking straight down from about three baseline tiles up',
    eyeAboveWater: { bothnian: 1120, moderate: 545, helsinki: 90 },
    yaw: EAST,
    pitch: toRadians(-89),
  },
]

const BAND_SEAS: readonly { readonly key: string; readonly scenario: string }[] = [
  { key: 'bothnian', scenario: 'Bothnian Sea storm, 27 m/s over 194 km' },
  { key: 'helsinki', scenario: 'Helsinki archipelago, 8 m/s over 15 km' },
  { key: 'moderate', scenario: 'Moderate reference sea' },
]

/** PROTOTYPE (tail repetition, #44): every scene of every sea with the 128-component band, named sea.scene. */
const SHOT_VIEWS: readonly ShotView[] = BAND_SEAS.flatMap((sea) =>
  SCENES.map((scene) => ({
    ...daylight,
    ...scene,
    eyeAboveWater: typeof scene.eyeAboveWater === 'number' ? scene.eyeAboveWater : (scene.eyeAboveWater[sea.key] ?? 1),
    name: `${sea.key}.${scene.name}`,
    label: `${sea.scenario}, ${scene.label}`,
    scenario: sea.scenario,
    bandVariant: 'n128',
  })),
)

/** What a captured view reports beside its picture. */
export interface ShotResult {
  readonly tick: number | undefined
  /** GPU milliseconds per pass, null without `timestamp-query`. */
  readonly timings: Readonly<Record<string, number>> | null
}

/** PROTOTYPE (band size, #43): what a frame-rate run of a view measured. */
export interface FrameRun {
  /** ms between consecutive drawn frames. */
  readonly intervals: readonly number[]
  /** The canvas's backing store, device pixels. */
  readonly width: number
  readonly height: number
  /** GPU milliseconds per pass, one read every 200 ms of the run, null without `timestamp-query`. */
  readonly timings: readonly Readonly<Record<string, number>>[] | null
}

export interface ShotsHook {
  readonly views: readonly ShotView[]
  /** Loads the view's scenario, runs it to the view's tick, applies its camera, Sun and toggles, and settles once drawn. */
  show(name: string): Promise<void>
  /** PROTOTYPE (band size, #43): loads the view, lets it run, and records drawn frames for `ms` after `warmup` ms. */
  measure(name: string, warmup: number, ms: number): Promise<FrameRun>
  advance(tick: number): Promise<void>
  /** The state the page draws now. */
  read(): ShotResult
}

declare global {
  var luoviShots: ShotsHook | undefined
}

/** What the page lends the hook: its own load, settings and simulation controls. */
export interface ShotsPage {
  /** Loads a showcase entry in a band variant from tick 0 and settles once the Worker has accepted it. */
  load(scenario: string, bandVariant: string): Promise<void>
  /** PROTOTYPE (band size, #43): pauses and runs to the tick; settles once the drawn slot shows it. */
  seek(tick: number): Promise<void>
  /** PROTOTYPE (band size, #43): a probe point of the drawn slot, x, y and the CPU water height, m. */
  water(at: ShotView['eyeAt']): readonly [number, number, number]
  /** Sets the view's camera, Sun, exposure and toggles, the eye at this world position. */
  apply(view: ShotView, eye: readonly [number, number, number]): void
  play(): void
  /** Settles once this many more frames have been drawn. */
  frames(count: number): Promise<void>
  /** PROTOTYPE (band size, #43): wall times of the frames drawn for `ms`, the canvas size and GPU timing reads. */
  record(ms: number): Promise<FrameRun>
  read(): ShotResult
}

// Frames drawn after the seek, so the picture is of the frozen state and the timer queries have landed.
const PAUSED_FRAMES = 30

const eyeOf = (page: ShotsPage, view: ShotView): readonly [number, number, number] => {
  const [x, y, z] = page.water(view.eyeAt)
  return [x, y, z + view.eyeAboveWater]
}

export const installShotsHook = (page: ShotsPage): (() => void) => {
  globalThis.luoviShots = {
    views: SHOT_VIEWS,
    show: async (name) => {
      const view = SHOT_VIEWS.find((candidate) => candidate.name === name)
      if (view === undefined) throw new Error(`no view named ${name}`)
      await page.load(view.scenario, view.bandVariant)
      await page.seek(view.tick)
      page.apply(view, eyeOf(page, view))
      await page.frames(PAUSED_FRAMES)
    },
    measure: async (name, warmup, ms) => {
      const view = SHOT_VIEWS.find((candidate) => candidate.name === name)
      if (view === undefined) throw new Error(`no view named ${name}`)
      await page.load(view.scenario, view.bandVariant)
      await page.seek(view.tick)
      page.apply(view, eyeOf(page, view))
      page.play()
      await page.record(warmup)
      return page.record(ms)
    },
    // PROTOTYPE (tail repetition, #44): runs the paused sea on to a later tick under the same eye, for frame sequences.
    advance: async (tick) => {
      await page.seek(tick)
      await page.frames(2)
    },
    read: () => page.read(),
  }
  return () => {
    globalThis.luoviShots = undefined
  }
}

/**
 * Counts drawn frames and settles waits on a count; `drawn` is called once per frame the viewer draws. PROTOTYPE (band
 * size, #43): `intervals` records the wall time between drawn frames for a while.
 */
export const frameCounter = (): {
  drawn(): void
  after(count: number): Promise<void>
  intervals(ms: number): Promise<number[]>
} => {
  let drawn = 0
  let waiters: { readonly at: number; readonly resolve: () => void }[] = []
  let stamps: number[] | undefined
  return {
    drawn: () => {
      drawn += 1
      stamps?.push(performance.now())
      const due = waiters.filter((waiter) => waiter.at <= drawn)
      waiters = waiters.filter((waiter) => waiter.at > drawn)
      for (const waiter of due) waiter.resolve()
    },
    after: async (count) =>
      new Promise((resolve) => {
        waiters.push({ at: drawn + count, resolve })
      }),
    intervals: async (ms) => {
      const recorded: number[] = []
      stamps = recorded
      await new Promise((resolve) => {
        setTimeout(resolve, ms)
      })
      stamps = undefined
      return recorded.slice(1).map((stamp, i) => stamp - (recorded[i] ?? stamp))
    },
  }
}
