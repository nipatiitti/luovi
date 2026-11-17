// chk_fit.mjs: the fitted blocks against the classical formula: error, limits, passivity; then heave decay at rest.
import { SM, makeBoat, tow, hydro, decay, KN, RAD } from './sealib.mjs';
for (const nb of [1, 2, 3]) { SM.C.MEM_BLOCKS = nb; const t0 = performance.now(); const b = makeBoat('hboat'); const ms = performance.now() - t0;
  const RF = SM.fitRadiation(nb); console.log(nb, 'blocks: fit time ms', ms.toFixed(0), 'relative rms error per tau:', RF.taus.map((t, i) => t.toFixed(3) + ':' + (RF.errs[i] * 100).toFixed(0) + '%').join(' '));
  if (nb === 2) for (const it of [8, 14, 18]) console.log(' tau', RF.taus[it].toFixed(3), 'kappa,a,Om0:', RF.tab[it].map((v) => Math.exp(v).toFixed(3)).join(' ')); }
