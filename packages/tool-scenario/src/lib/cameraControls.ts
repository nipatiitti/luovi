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
  /** Advances free flight by held keys; call once per frame. */
  update(seconds: number): void
  detach(): void
}

const toFree = (camera: Camera): Camera => {
  if (camera.mode === 'free') return camera
  return { mode: 'free', position: cameraPose(camera).eye, yaw: camera.yaw, pitch: camera.pitch }
}

const toOrbit = (camera: Camera): Camera => {
  if (camera.mode === 'orbit') return camera
  const [x, y, z] = camera.position
  const distance = Math.min(ORBIT_DISTANCE.max, Math.max(ORBIT_DISTANCE.min, Math.hypot(x, y, z)))
  // The orbit looks at the origin, so its view direction is the eye's direction reversed.
  return { mode: 'orbit', distance, yaw: Math.atan2(-y, -x), pitch: clampPitch(Math.asin(-z / Math.hypot(x, y, z))) }
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
    const yaw = camera.yaw - dx * RADIANS_PER_PIXEL
    // Dragging up tilts an orbit to look down from higher, and lifts a free camera's gaze.
    const sense = camera.mode === 'orbit' ? 1 : -1
    const pitch = clampPitch(camera.pitch + sense * dy * RADIANS_PER_PIXEL)
    camera = { ...camera, yaw, pitch }
  }
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    if (camera.mode !== 'orbit') return
    const distance = camera.distance * Math.exp(event.deltaY * ZOOM_PER_WHEEL_UNIT)
    camera = { ...camera, distance: Math.min(ORBIT_DISTANCE.max, Math.max(ORBIT_DISTANCE.min, distance)) }
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
    update: (seconds) => {
      if (camera.mode !== 'free') return
      const forward = axis('KeyW', 'KeyS')
      const right = axis('KeyD', 'KeyA')
      const up = axis('KeyE', 'KeyQ')
      if (forward === 0 && right === 0 && up === 0) return
      const pose = cameraPose(camera)
      const step = seconds * FLIGHT_SPEED * (held.has('ShiftLeft') || held.has('ShiftRight') ? FLIGHT_BOOST : 1)
      const move = (i: 0 | 1 | 2): number =>
        (pose.forward[i] * forward + pose.right[i] * right + (i === 2 ? up : 0)) * step
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
