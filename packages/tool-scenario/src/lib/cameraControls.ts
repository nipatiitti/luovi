import { type Camera, cameraPose, clampPitch, NEAR_PLANE, type Vec3 } from '@luovi/render-scene'

// Pointer and keyboard input for the two cameras. Units are UI feel, not physics: radians per pixel of drag, the
// fraction of the orbit distance per wheel notch, and metres per second of free flight.
const RADIANS_PER_PIXEL = 0.005
const ZOOM_PER_WHEEL_UNIT = 0.001
const ORBIT_DISTANCE = { min: 2, max: 20000 }
const FLIGHT_SPEED = 20
const FLIGHT_BOOST = 10

export interface CameraControls {
  readonly camera: Camera
  /** Switches mode keeping the eye and view direction where they are. */
  setMode(mode: Camera['mode']): void
  /** Replaces the camera outright, as a named view of `pnpm shots` does. */
  set(camera: Camera): void
  /** Advances free flight by held keys; call once per frame. */
  update(seconds: number): void
  detach(): void
}

// An orbit looking up from below the horizon would put its eye under the sea; a level gaze is as low as it goes, and the
// pose's own eye clamp keeps that level eye a near plane above the surface.
const clampOrbitPitch = (pitch: number): number => Math.min(0, clampPitch(pitch))

const clampOrbitDistance = (distance: number): number =>
  Math.min(ORBIT_DISTANCE.max, Math.max(ORBIT_DISTANCE.min, distance))

const toFree = (camera: Camera): Camera => {
  if (camera.mode === 'free') return camera
  return { mode: 'free', position: cameraPose(camera).eye, yaw: camera.yaw, pitch: camera.pitch }
}

const toOrbit = (camera: Camera): Camera => {
  if (camera.mode === 'orbit') return camera
  const [x, y, z] = camera.position
  const distance = clampOrbitDistance(Math.hypot(x, y, z))
  // The orbit looks at the origin, so its view direction is the eye's direction reversed.
  return {
    mode: 'orbit',
    distance,
    yaw: Math.atan2(-y, -x),
    pitch: clampOrbitPitch(Math.asin(-z / Math.hypot(x, y, z))),
  }
}

export const attachCameraControls = (element: HTMLElement, initial: Camera): CameraControls => {
  let camera = initial
  const held = new Set<string>()
  // The last pointer position of a drag in progress; movementX is unreliable across browsers and synthetic input.
  let drag: { x: number; y: number } | undefined

  const onPointerDown = (event: PointerEvent): void => {
    drag = { x: event.clientX, y: event.clientY }
    element.setPointerCapture(event.pointerId)
  }
  const onPointerUp = (event: PointerEvent): void => {
    drag = undefined
    element.releasePointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent): void => {
    if (drag === undefined) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    drag = { x: event.clientX, y: event.clientY }
    // A grab: the scene follows the cursor. Turning a free gaze left slides the scene right, so a free camera's yaw and
    // pitch go with the drag. An orbit swings the eye about the target instead, which moves the sea between eye and
    // target the opposite way to the gaze, so its angles go against the drag. Sea beyond the target always moves
    // against the near sea under an orbit, so the near sea, which fills the lower screen, is the one that follows.
    const sense = camera.mode === 'orbit' ? -1 : 1
    const yaw = camera.yaw + sense * dx * RADIANS_PER_PIXEL
    const pitch = camera.pitch + sense * dy * RADIANS_PER_PIXEL
    camera =
      camera.mode === 'orbit'
        ? { ...camera, yaw, pitch: clampOrbitPitch(pitch) }
        : { ...camera, yaw, pitch: clampPitch(pitch) }
  }
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    if (camera.mode !== 'orbit') return
    const distance = camera.distance * Math.exp(event.deltaY * ZOOM_PER_WHEEL_UNIT)
    camera = { ...camera, distance: clampOrbitDistance(distance) }
  }
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
    held.add(event.code)
  }
  const onKeyUp = (event: KeyboardEvent): void => {
    held.delete(event.code)
  }
  const onBlur = (): void => {
    held.clear()
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointerup', onPointerUp)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  const axis = (positive: string, negative: string): number =>
    (held.has(positive) ? 1 : 0) - (held.has(negative) ? 1 : 0)

  return {
    get camera() {
      return camera
    },
    setMode: (mode) => {
      camera = mode === 'free' ? toFree(camera) : toOrbit(camera)
    },
    set: (next) => {
      camera = next
    },
    update: (seconds) => {
      if (camera.mode !== 'free') return
      const forward = axis('KeyW', 'KeyS')
      const right = axis('KeyD', 'KeyA')
      const up = axis('KeyE', 'KeyQ')
      if (forward === 0 && right === 0 && up === 0) return
      const step = seconds * FLIGHT_SPEED * (held.has('ShiftLeft') || held.has('ShiftRight') ? FLIGHT_BOOST : 1)
      // Drone flight: W and S follow the heading, not the gaze, so looking down and pressing W keeps the height; only
      // Q and E change it. Right is the heading turned a quarter clockwise.
      const heading: Vec3 = [Math.cos(camera.yaw), Math.sin(camera.yaw), 0]
      const starboard: Vec3 = [Math.sin(camera.yaw), -Math.cos(camera.yaw), 0]
      const move = (i: 0 | 1 | 2): number => (heading[i] * forward + starboard[i] * right + (i === 2 ? up : 0)) * step
      // The eye is drawn no lower than the near plane, so the stored height stops there too: sinking further would
      // leave E climbing through height nobody sees before the view moves.
      const position: Vec3 = [
        camera.position[0] + move(0),
        camera.position[1] + move(1),
        Math.max(NEAR_PLANE, camera.position[2] + move(2)),
      ]
      camera = { ...camera, position }
    },
    detach: () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    },
  }
}
