Reproduce (Node 22, playwright and ffmpeg for the GIFs), from this folder. Results, frames and GIFs go to out/:
  node validate.js                       # elliptic wing against Helmbold / lifting line (edit the AR and panel lists at the bottom)
  node fujin.js twist; node fujin.js slot; node fujin.js angle
  node fbsweep.js                        # fallback, three resolutions
  node sweep.js pw '{"k0":1}' 30,60,90,105,120,135,150,165,180     # luff shedding, panel-wide cores (headline)
  node sweep.js base '{}'                # cores 0.1 panel at birth: diverges at 120 and 135 deg
  node probe.js 180 6 12 '{"selfRows":18}'   # wake self-induction over two chords: drag 1.27, noise 26%
  node slotfb.js; node kbench.js
  node capture.js sweep 15; node capture.js res 12; node capture.js twist 15; node capture.js slot 15
