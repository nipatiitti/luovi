import { SM, makeBoat } from './sealib.mjs';
const b = makeBoat('hboat'); const RF = SM.fitRadiation(2), it = 14, tau = RF.taus[it], p = RF.tab[it];
console.log('tau', tau.toFixed(3), ': Om, target b, fitted b, added-mass shift from target (Kramers-Kronig), from the fitted blocks (closed form), blocks by the same integral; unit rho B^2/4. Semicircle a(inf) = 1.57');
for (const Om of [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2, 3]) { let cf = 0; for (let j = 0; j < 2; j++) { const k = Math.exp(p[3 * j]), a = Math.exp(p[3 * j + 1]), o2 = Math.exp(2 * p[3 * j + 2]); cf += k * (o2 - Om * Om) / ((o2 - Om * Om) ** 2 + a * a * Om * Om); }
  console.log(Om, SM.radTarget(Om, tau).toFixed(3), SM.radBlocks(p, 2, Om).toFixed(3), SM.kkOf((x) => SM.radTarget(x, tau), Om).toFixed(3), cf.toFixed(3), SM.kkOf((x) => SM.radBlocks(p, 2, x), Om).toFixed(3)); }
