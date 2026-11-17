// check_captive.mjs: the time-domain marker law, held at a fixed drift, must give the steady
// law's side force and centre (same constants, shed fraction 1).
import { Boat } from './sim.mjs';
import { finBoat, longBoat } from './boats.mjs';
import { precompute, finKeelBoat, longKeelBoat } from './hulls.mjs';
import { marchSteady, CONSTANTS } from './slicelaw.mjs';
const rad = Math.PI / 180;
for (const [cfg, desc] of [[finBoat(), finKeelBoat()], [longBoat(), longKeelBoat()]]) {
  const body = precompute(desc);
  console.log(cfg.name, 'wetted', cfg.table.wetted.toFixed(2), 'm2');
  for (const beta of [2, 5, 10, 20]) {
    const U = 2.5, u = U * Math.cos(beta * rad), v = -U * Math.sin(beta * rad);
    const b = new Boat(cfg, { u });
    for (let i = 0; i < 240 * 8; i++) { b.u = u; b.v = v; b.step(1 / 240, { deltaCmdDeg: 0 }, { wind: 0, sails: false, captive: true }); }
    const Y = b.out.keelY + b.out.rudderY;
    const st = marchSteady(body, { U, betaDeg: beta, xRef: cfg.xcg }, { ...CONSTANTS, SHED_FRACTION: 1 });
    console.log(`  leeway ${beta}: normal force time-domain ${Y.toFixed(0)} N, steady ${st.normalForce.toFixed(0)} N; induced drag ${b.out.induced.toFixed(1)} vs ${(st.dragDueToSideForce*Math.cos(beta*rad) - st.sideForce*Math.sin(beta*rad)).toFixed(1)} (body axis); entrained ${b.out.entrained.toFixed(0)} kg, yaw added ${b.out.yawAdded.toFixed(0)} kg m2`);
  }
}
