// Sensitivity of the headline numbers to each constant (12 panels unless stated).
const { fixedRun } = require('./sim.js'); const { G } = require('./final.js');
function line(label, opt, N) { let s = label.padEnd(26); for (const [camber, a] of [[0.1, 0], [0.1, 10], [0.1, 20], [0.2, 0], [0.2, 16], [0.2, 30], [0, 90]]) { const r = fixedRun({ N: N || 12, camber, alpha: a, opt, transits: a >= 30 ? 80 : 40 }); s += ` ${camber}@${a}: ${r.cl.toFixed(2)}/${r.cd.toFixed(2)}`; } console.log(s); }
const v = o => Object.assign({}, G, o);
line('baseline', G);
line('Ksep 0.5', v({ Ksep: 0.5 })); line('Ksep 0.7', v({ Ksep: 0.7 }));
line('Stratford 0.35', v({ strat: 0.35 })); line('BL start 0.05', v({ x0: 0.05 })); line('BL start 0.2', v({ x0: 0.2 }));
line('lag 3', v({ Tlag: 3 }));
line('no decay', v({ decayChords: 0 })); line('decay 5', v({ decayChords: 5 })); line('decay 20', v({ decayChords: 20 }));
line('core 0.15 panel', v({ corePanels: 0.15 })); line('core 0.6 panel', v({ corePanels: 0.6 })); line('core 1.0 panel', v({ corePanels: 1 }));
line('fixed core .025c, N=8', v({ corePanels: 0, coreFrac: 0.025 }), 8); line('fixed core .025c, N=24', v({ corePanels: 0, coreFrac: 0.025 }), 24);
line('Scrit 0.15', v({ Scrit: 0.15 }));
