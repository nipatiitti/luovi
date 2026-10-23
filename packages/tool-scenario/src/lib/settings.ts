import type { Camera, RenderSettings } from '@luovi/render-scene'

export const degrees = (value: number): number => (value * Math.PI) / 180
export const toDegrees = (radians: number): number => (radians * 180) / Math.PI

/** The orbit the tool opens on: 40 m out, looking down a little, facing south. */
export const initialCamera: Camera = { mode: 'orbit', distance: 40, yaw: degrees(-90), pitch: degrees(-8) }

/**
 * The render settings the tool opens with. The Sun stands as on a Baltic summer afternoon, 35 degrees up in the
 * south-west (spec #26, ADR 0012); the exposure suits that daylight sky.
 */
export const initialSettings: RenderSettings = {
  sunElevation: degrees(35),
  sunAzimuth: degrees(225),
  exposureValue: -3.5,
  camera: initialCamera,
}
