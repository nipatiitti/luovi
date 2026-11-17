// build_page.mjs: inlines the model, the drawing and the data into one self-contained page -> out/sailing-test.html.
// The page sails on flat water, so the hulls go in without their heave and pitch section tables (hull.sea).
import fs from 'fs';
import { applyWaveDrag } from './wavedrag.mjs';
const rd = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const hulls = applyWaveDrag(JSON.parse(rd('./out/hulls.json'))), sails = JSON.parse(rd('./out/sails.json'));
for (const h of Object.values(hulls)) delete h.sea;
const slice = !hulls.hboat.waveDrag.source.startsWith('Delft');
const waveLabel = slice ? 'computed beforehand from the hull sections, slow near 5 knots' : 'Delft table, not the model';
const waveText = slice
  ? 'a curve computed beforehand for each hull from its sections by the slice wave method (upright, no sinkage or trim, keel and rudder left out). It is not part of the running model. On a typical heavy keelboat it comes out about 0.4 knots slow near 5 knots.'
  : "Delft series table from each hull's dimensions.";
let html = rd('./page.html');
html = html.replace('<!--WAVETEXT-->', () => waveText).replace('/*MODEL*/', () => rd('./model.js')).replace('/*DRAW*/', () => rd('./draw.js')).replace('/*DATA*/', () => JSON.stringify({ hulls, sails, waveLabel }));
fs.writeFileSync(new URL('./out/sailing-test.html', import.meta.url), html);
console.log('sailing-test.html', (html.length / 1024).toFixed(0), 'kB; wave drag:', waveLabel);
