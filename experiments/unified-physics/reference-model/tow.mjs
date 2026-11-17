// tow.mjs: captive tow (from c1-holdout-rerun and c2-sideforce-fix). A hull is towed through the time-domain model at
// fixed speed, leeway and heel, sails down, rudder at 0, for four hull lengths of travel; the side force is averaged over
// the last length. Each sub-step the impulse the step gave the slices for the acceleration it computed is taken back and
// the motion is reset, so the hull never responds.
const RAD = Math.PI / 180, DT = 1 / 240;
export function tow(SM, bd, sails, U, betaDeg, heelDeg = 0) {
  const b = new SM.Boat(bd.data, sails, { u: U }), beta = betaDeg * RAD, u = U * Math.cos(beta), v = -U * Math.sin(beta), phi = -heelDeg * RAD;
  const hold = () => { b.u = u; b.v = v; b.r = 0; b.p = 0; b.phi = phi; };
  const tL = bd.data.L / U, nTot = Math.round((4 * tL) / DT), nAvg = Math.round(tL / DT);
  const acc = [[0, 0, 0], [0, 0, 0]]; // last transit and the one before: Y, X, N
  hold();
  for (let i = 0; i < nTot; i++) {
    const v0 = b.v, r0 = b.r, p0 = b.p;
    b.step(DT, { tillerDeg: 0, sails: false }, { wind: 0, windDir: 0 });
    const dv = b.v - v0, dr = b.r - r0, dp = b.p - p0;
    for (const m of b.markers) { const dP = m.G * m._c * (dv + dr * m._arm - dp * m._z); m.Plin -= dP; m.Patt -= dP * m._kf; }
    hold();
    const k = i >= nTot - nAvg ? 1 : i >= nTot - 2 * nAvg ? 0 : -1;
    if (k >= 0) { const o = b.out; acc[k][0] += o.keelY + o.rudderY; acc[k][1] += o.hullX; acc[k][2] += o.nRud + o.nHull; }
  }
  const [Y, X, N] = acc[1].map((a) => a / nAvg), Yp = acc[0][0] / nAvg;
  // what resists leeway, perpendicular to the track, and its centre measured from the bow
  return { side: Y * Math.cos(beta) + X * Math.sin(beta), xCLR: bd.xcg - N / Y, drift: Math.abs(Y / Yp - 1) };
}
