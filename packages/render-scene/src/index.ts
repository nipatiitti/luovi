// What a tool wires: the GPU, the scene renderer and the layer contract it takes the sea through, the camera and the
// viewer's settings. The passes, pipelines and atmosphere are the renderer's own.

export { acquireGpu, type Gpu, WebGpuUnavailableError } from './gpu.ts'
export {
  type Camera,
  cameraPose,
  type CameraPose,
  clampPitch,
  type FreeCamera,
  NEAR_PLANE,
  type OrbitCamera,
  type Vec3,
} from './camera.ts'
export type { AtmosphereConstants } from './atmosphere/constants.ts'
export type { RenderSettings } from './settings.ts'
export {
  createSceneRenderer,
  type LayerTarget,
  type LayerView,
  type SceneContent,
  type SceneLayer,
  type SceneRenderer,
} from './scene.ts'
