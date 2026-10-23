// Cameras in the world frame (x east, y north, z up, metres). Orientation is a yaw counterclockwise from east and a
// pitch up from the horizontal, both radians. The projection is reverse-Z with an infinite far plane: depth is
// near / distance, 1 at the near plane falling to 0 at infinity, which spends float precision where distance needs it.

export type Vec3 = readonly [number, number, number]

/** 50 degrees, the vertical field of view of every scene view. */
const VERTICAL_FIELD_OF_VIEW = (50 * Math.PI) / 180

/** m. Reverse-Z float depth keeps precision at any near distance, so the near plane sits just in front of the eye. */
export const NEAR_PLANE = 0.1

export interface OrbitCamera {
  readonly mode: 'orbit'
  /** m from the world origin, which the camera looks at. */
  readonly distance: number
  readonly yaw: number
  readonly pitch: number
}

export interface FreeCamera {
  readonly mode: 'free'
  readonly position: Vec3
  readonly yaw: number
  readonly pitch: number
}

export type Camera = OrbitCamera | FreeCamera

/** Where the eye is and which way it looks, with the basis the sky pass turns into view rays. */
export interface CameraPose {
  readonly eye: Vec3
  readonly forward: Vec3
  readonly right: Vec3
  readonly up: Vec3
}

const forwardOf = (yaw: number, pitch: number): Vec3 => [
  Math.cos(pitch) * Math.cos(yaw),
  Math.cos(pitch) * Math.sin(yaw),
  Math.sin(pitch),
]

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const normalize = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2])
  return [a[0] / length, a[1] / length, a[2] / length]
}

/** Pitch stays short of straight up or down so the right vector (forward x z) never degenerates. */
export const clampPitch = (pitch: number): number => Math.max(-1.55, Math.min(1.55, pitch))

/**
 * Keeps the eye a near-plane distance above z = 0, so the near plane never cuts the mean sea surface. This is the
 * stand-in for "above the band" until the renderer has the band's crest height.
 */
const clampEye = (eye: Vec3): Vec3 => [eye[0], eye[1], Math.max(eye[2], NEAR_PLANE)]

export const cameraPose = (camera: Camera): CameraPose => {
  const forward = forwardOf(camera.yaw, clampPitch(camera.pitch))
  const right = normalize(cross(forward, [0, 0, 1]))
  const up = cross(right, forward)
  const eye =
    camera.mode === 'orbit'
      ? clampEye([-forward[0] * camera.distance, -forward[1] * camera.distance, -forward[2] * camera.distance])
      : clampEye(camera.position)
  return { eye, forward, right, up }
}

/** Column-major view-projection for WGSL's mat4x4f: view space is right-handed, looking down -z with y up. */
export const viewProjection = (pose: CameraPose, aspect: number): Float32Array<ArrayBuffer> => {
  const { eye, forward, right, up } = pose
  const f = 1 / Math.tan(VERTICAL_FIELD_OF_VIEW / 2)
  const sx = f / aspect
  // Rows of projection times view. Reverse-Z infinite: clip z is the near distance and clip w is the distance along
  // forward, so depth = near / distance.
  const rows = [
    [right[0] * sx, right[1] * sx, right[2] * sx, -dot(right, eye) * sx],
    [up[0] * f, up[1] * f, up[2] * f, -dot(up, eye) * f],
    [0, 0, 0, NEAR_PLANE],
    [forward[0], forward[1], forward[2], -dot(forward, eye)],
  ]
  const out = new Float32Array(16)
  rows.forEach((row, i) => {
    row.forEach((v, j) => {
      out[j * 4 + i] = v
    })
  })
  return out
}

/** Floats of the WGSL `Camera` struct in `cameraWgsl`, 128 bytes. */
export const cameraUniform = (pose: CameraPose, aspect: number): Float32Array<ArrayBuffer> => {
  const out = new Float32Array(32)
  out.set(viewProjection(pose, aspect), 0)
  out.set([...pose.eye, Math.tan(VERTICAL_FIELD_OF_VIEW / 2)], 16)
  out.set([...pose.right, aspect], 20)
  out.set(pose.up, 24)
  out.set(pose.forward, 28)
  return out
}

export const CAMERA_UNIFORM_BYTES = 128

/** The camera uniform as every scene shader reads it; `group` is the bind group index the caller assigns. */
export const cameraWgsl = (group: number): string => /* wgsl */ `
struct Camera {
  view_projection: mat4x4f,
  eye: vec3f,
  tan_half_fov_y: f32,
  right: vec3f,
  aspect: f32,
  up: vec3f,
  forward: vec3f,
}

@group(${String(group)}) @binding(0) var<uniform> camera: Camera;

/** World-space unit view ray through a point in normalised device coordinates. */
fn camera_ray(ndc: vec2f) -> vec3f {
  let t = camera.tan_half_fov_y;
  return normalize(camera.forward + camera.right * (ndc.x * t * camera.aspect) + camera.up * (ndc.y * t));
}
`
