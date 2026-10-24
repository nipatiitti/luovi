import type { Camera, RenderSettings } from '@luovi/render-scene'
import { azimuthOf, toRadians } from './angles.ts'

/** The orbit the tool opens on: 40 m out, looking down a little, facing east (PROTOTYPE #41: south put the Sun in frame). */
const initialCamera: Camera = { mode: 'orbit', distance: 40, yaw: toRadians(0), pitch: toRadians(-8) }

/**
 * The render settings the tool opens with. The Sun stands as on a Baltic summer afternoon, 35 degrees up in the
 * south-west (spec #26, ADR 0012); the exposure suits that daylight sky.
 */
export const initialSettings: RenderSettings = {
  sunElevation: toRadians(35),
  sunAzimuth: azimuthOf(225),
  exposureValue: -3.5,
  camera: initialCamera,
}
