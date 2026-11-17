import { makeBoat, run, SM, KN, RAD, HULLS } from './scen_lib.mjs';
for (const key of ['hboat', 'ifboat']) { const b = makeBoat(key, { u: 5 * KN }); run(b, 3, () => ({ tillerDeg: 0, sails: false }), () => ({ wind: 0 }));
  let m22 = 0, m22r = 0, m11 = 0, m11r = 0; const d0 = b.d; for (const m of b.markers) { const fr = b.cell(b.cR, m.x), arm = d0.xcg - m.x, g = 1000 * 0.05 * m.G; m11 += g; m22 += g * arm * arm; if (m.x > (key === 'hboat' ? 5.0 : 4.2)) { m22r += g * arm * arm; m11r += g; } }
  console.log(key, 'hull Iz', Math.round(d0.mass * d0.kYaw ** 2), 'entrained sway', Math.round(m11), 'kg, of which aft fin/rudder part', Math.round(m11r), '; entrained yaw', Math.round(m22), 'kg m2, aft part', Math.round(m22r)); }
