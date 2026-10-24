import type { Camera, Vec3 } from './camera.ts'

/**
 * What the viewer chooses, never what the scenario says (ADR 0012): the tool owns one of these and hands it to the
 * renderer each frame. Angles are radians; the panel converts degrees and compass bearings at its edge.
 */
export interface RenderSettings {
  /** Height of the Sun's centre above the horizon. */
  readonly sunElevation: number
  /** Direction towards the Sun in the horizontal plane, counter-clockwise from east as the camera's yaw. */
  readonly sunAzimuth: number
  /**
   * Exposure value in photographic stops: the tone curve sees radiance (W m^-2 sr^-1 nm^-1) times 2^-EV, balanced so
   * the Sun's own spectrum is white. Higher is darker. Fixed until auto exposure exists (ADR 0012).
   */
  readonly exposureValue: number
  readonly camera: Camera
}

/** World-frame unit vector towards the Sun: east is x, north is y, z up. */
export const sunDirection = (elevation: number, azimuth: number): Vec3 => [
  Math.cos(elevation) * Math.cos(azimuth),
  Math.cos(elevation) * Math.sin(azimuth),
  Math.sin(elevation),
]
