reference-model: the consolidated reference hull model of the unified physics session (17 Nov 2026).
Throwaway JavaScript, not the simulator; nothing in packages/ imports it. Node 22. Run from any folder.

What is merged in model.js
  sailing-test-v3 (h4 slice model + r1-rudder + r2-broach, H-boat from the class offsets)
  + c2-sideforce-fix (C.C2): a steady tow reduces to the validated steady section law
  + v1-seaway and v2-radiation (C.SEA, C.MEMORY): heave and pitch on waves with per-section wave-making memory,
    and v2's fix of the sign with which the rig feels pitch rate.
  Every change is still a comparison switch in C. Defaults: R1, R2, C2 on; SEA 'auto' (heave and pitch run when a step is
  given a sea, or the boat is started with heave, pitch or heavePitch: true); MEMORY on. On flat water the default is the
  C2 model exactly. Checked on 17 Nov 2026: SEA=0 WAVE=delft gives c2-sideforce-fix's numbers-c2on.json back exactly, and
  SEA=1 C2=0 WAVE=delft gives v2-radiation's sea-mem.json back exactly.
  Wave drag is data: hull.waveDrag = { source, curve: [[Froude number, fraction of canoe-body weight], ...] }.
  wavedrag.mjs loads data/wave-slice.json (slice wave method, written by ../w2-slicewaves) when it exists and falls back
  to the Delft regression that gen_hulls.mjs writes. WAVE=delft in the environment forces the fallback.

Run
  node smoke.mjs            the headline cases, PASS or FAIL per line, about 35 s (the first run builds out/ first, 25 s)
  node build_data.mjs       class_hboat.mjs + gen_hulls.mjs + gen_sails.mjs -> out/hulls.json, out/sails.json
                            (20 s for the hulls, 5 s for the sail table, so neither is committed)
  node scen_m1.mjs <tag>    the whole sailing-test-v3 test list -> out/numbers-<tag>.json (45 s)
  node scen_sea.mjs <tag>   the reference sea, close-hauled and beam reach -> out/sea-<tag>.json (25 s)
  node check_geometry.mjs   the H-boat section stack against the class model's derived figures
  node build_page.mjs       page.html + model.js + draw.js + data -> out/sailing-test.html (the steerable page, flat water)
  node test_page.mjs        headless test of that page at desktop and phone size; needs Playwright with Chromium
                            (see ../README.md; or NODE_PATH pointing at a global install)
  node gen_holdout.mjs      rewrites data/holdout.json; needs the Delft tank data extracted by ../h1b-holdout

Files
  model.js                  the model, one dependency-free module for Node and the browser
  lib.mjs, wavedrag.mjs     load the model, the generated data and the wave-drag curves; environment switches
  scenarios.mjs             the scripted manoeuvres (hard over, tack, hands off, steady, puff, bear away)
  sealib.mjs, tow.mjs       towed heave and pitch helpers; captive tow at fixed leeway
  boats_def.mjs             H-boat (from out/hboat_class.json) and International Folkboat (published dimensions, estimates)
  class_hboat.mjs, section.mjs, gen_hulls.mjs, gen_sails.mjs   the generators
  page.html, draw.js        the steerable page's shell and drawing
  data/class/               hboat.json and derived.json: copies of the class H-boat model's files (offsets, rig, mass)
  data/holdout.json         three Delft hold-out hulls as section stacks with the steady law's and the tank's side force
  data/wave-slice.json      wave-drag curves from the slice wave method (written by ../w2-slicewaves, not by this folder)
  out/                      everything generated; git-ignored

Smoke bands. The physical bands (tack 6 to 9 s, long keel 1.1 to 1.5 times slower, 45 degrees of rudder out-turns 30,
puff broach and save, side force within 3% of the steady law) hold for either wave-drag curve. The regression bands
(close-hauled speed, leeway, heel and helm at five winds, decay periods and damping, sea pitch rms) are the values of
17 Nov 2026 and are kept per wave-drag curve in smoke.mjs; re-record them when the model or data/wave-slice.json is
changed on purpose.
