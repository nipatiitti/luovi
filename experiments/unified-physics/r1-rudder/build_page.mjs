// build_page.mjs: inlines the model, the drawing and the data into one self-contained page.
import fs from 'fs';
const rd = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const hulls = JSON.parse(rd('./out/hulls.json')), sails = JSON.parse(rd('./out/sails.json'));
let html = rd('./page.html');
html = html.replace('/*MODEL*/', () => rd('./model.js')).replace('/*DRAW*/', () => rd('./draw.js')).replace('/*DATA*/', () => JSON.stringify({ hulls, sails }));
fs.writeFileSync(new URL('./out/sailing-test.html', import.meta.url), html);
console.log('sailing-test.html', (html.length / 1024).toFixed(0), 'kB');
