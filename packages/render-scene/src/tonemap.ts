import { createBindGroup, createBindGroupLayout, createFullscreenPipeline, createUniformBuffer } from './pipeline.ts'

// Khronos PBR Neutral (github.com/KhronosGroup/ToneMapping, PBR_Neutral), then the sRGB transfer function (IEC
// 61966-2-1) by hand so the pass can write any canvas format. Its constants are the published curve's, not data.
const tonemapFragmentWgsl = /* wgsl */ `
struct Tonemap {
  scale: vec3f,
}

@group(0) @binding(0) var<uniform> tonemap: Tonemap;
@group(0) @binding(1) var hdr: texture_2d<f32>;

fn pbr_neutral(input: vec3f) -> vec3f {
  let start_compression = 0.8 - 0.04;
  let desaturation = 0.15;
  var color = input;
  let x = min(color.r, min(color.g, color.b));
  let offset = select(0.04, x - 6.25 * x * x, x < 0.08);
  color -= offset;
  let peak = max(color.r, max(color.g, color.b));
  if (peak < start_compression) { return color; }
  let d = 1.0 - start_compression;
  let new_peak = 1.0 - d * d / (peak + d - start_compression);
  color *= new_peak / peak;
  let g = 1.0 - 1.0 / (desaturation * (peak - new_peak) + 1.0);
  return mix(color, vec3f(new_peak), g);
}

fn srgb_encode(linear: vec3f) -> vec3f {
  let c = clamp(linear, vec3f(0.0), vec3f(1.0));
  return select(1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, 12.92 * c, c <= vec3f(0.0031308));
}

@fragment
fn main(in: FullscreenVarying) -> @location(0) vec4f {
  let radiance = textureLoad(hdr, vec2i(in.position.xy), 0).rgb;
  return vec4f(srgb_encode(pbr_neutral(radiance * tonemap.scale)), 1.0);
}
`

export interface TonemapPass {
  /** Per-channel scale from radiance to the curve's input: exposure over the white point. */
  setScale(scale: readonly [number, number, number]): void
  /** Rebinds the HDR source; call after the target is recreated. */
  setSource(resolve: GPUTextureView): void
  draw(pass: GPURenderPassEncoder): void
}

export const createTonemapPass = (device: GPUDevice, format: GPUTextureFormat): TonemapPass => {
  const layout = createBindGroupLayout(device, 'tonemap', GPUShaderStage.FRAGMENT, [
    { uniform: true },
    { texture: 'unfilterable-float' },
  ])
  const pipeline = createFullscreenPipeline(device, {
    label: 'tonemap',
    fragmentWgsl: tonemapFragmentWgsl,
    layouts: [layout],
    format,
  })
  const uniform = createUniformBuffer(device, 'tonemap', 16)
  let group: GPUBindGroup | undefined
  return {
    setScale: (scale) => {
      uniform.write(new Float32Array([...scale, 0]))
    },
    setSource: (resolve) => {
      group = createBindGroup(device, 'tonemap', layout, [uniform.buffer, resolve])
    },
    draw: (pass) => {
      if (group === undefined) return
      pass.setPipeline(pipeline)
      pass.setBindGroup(0, group)
      pass.draw(3)
    },
  }
}
