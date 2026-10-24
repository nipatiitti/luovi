# Raw WebGPU, no scene library

The visual layer is mostly compute passes (FFT cascades, dispersive patch, fine cloth upsample) feeding one custom sea surface and a few ships, under a 5 ms GPU budget at 1440p on an RTX 4060 class card. We render with raw WebGPU behind a thin in-house layer for pipelines and bind groups rather than three.js or Babylon, because a scene graph would wrap none of the hard parts and would take pass ordering and resource control out of our hands. The cost is writing camera, sky and lighting by hand in render-scene.

## Amendment, 2026-10-24

The millisecond budget this ADR names is dropped by `docs/adr/0013`; the decision above stands without it.
