// slicelaw.mjs
// The steady slice momentum law with its "what a slice keeps" closures, rigid-lid surface.
//
// Picture: the water is cut into thin slices lying across the hull. A slice enters at the bow
// and is passed by one hull section after another until it leaves at the stern. Each section
// pushes it sideways. The side force on the hull is the rate at which slices gain sideways
// impulse. What decides everything is how much impulse a slice still has when the hull has
// gone: that is what it "keeps".
//
// A body is a list of stations from bow (x = 0) to stern, each with
//   A      sway added mass of the immersed section per unit density [m^2]   (section.mjs)
//   T      local draft [m]
//   rOverT smallest edge or bilge radius over local draft                     (section.mjs)
// Nothing else. The law does not know what a keel, a rudder or a hull is.
//
// Slice state carried from station to station (this is the "conveyor"; a time-domain code
// carries the same numbers on water-fixed markers and replaces d/dx by U d/dt):
//   Plin   impulse the section is holding in the slice before the loading limit
//   Patt   the same after the loading limit (what the hull actually holds on to)
//   Pw     impulse left behind in the slice by potential shedding (the wake)
//   Pcf    impulse left behind by cross-flow drag
//   Aw     added mass of the widest section that shed into this slice (wake "size")
//   s      slice age: sideways travel so far over local draft
//   ell    contact length so far, weighted by added mass (the local "chord")
//
// All impulses and forces are per unit density until the final multiplication by rho.

export const CONSTANTS = {
  // The one sharpness rule: sharpness = exp(-(r/T)/K_SHARP), 1 for a knife edge, 0 for a
  // round bilge. It sets BOTH the shed fraction (= sharpness) and the cross-flow drag.
  // 0.1 is the corner radius over depth at which a square bar's cross-flow drag has fallen most
  // of the way from the sharp to the round value (Delany and Sorensen 1953; Hoerner 1965 ch. 3).
  K_SHARP: 0.1,
  // Cross-flow drag coefficient on draft: flat plate normal to the stream (Hoerner 1.98).
  CD_SHARP: 2.0,
  // Round section: between the supercritical (0.3 to 0.5) and subcritical (1.2) cylinder.
  CD_ROUND: 0.6,
  // Round sections need sideways travel before they separate (impulsive-start cylinder,
  // Sarpkaya 1966: about one diameter = two drafts of travel, so e-folding about one draft).
  S0_ROUND: 1.0,
  // Loading-up length in local spans: fixed by requiring the two-dimensional thin-foil slope
  // 2 pi for a short tall section. Derived, not fitted.
  LAMBDA: 0.25,
  // Largest side-force coefficient a section run can hold (thin symmetric foil, Re about 1e6).
  CL_MAX: 1.1,
};

/**
 * March one slice from bow to stern in steady motion.
 * @param body  { x[], A[], T[], rOverT[] }
 * @param cond  { U: speed [m/s], betaDeg: leeway [deg], r: yaw rate [rad/s, bow to leeward
 *                positive], xRef: pivot for yaw rate and yaw moment [m from bow], rho }
 * @param K     constants; override a field to switch a closure off (see run scripts)
 * Forces are returned as what resists leeway: positive side force points to windward.
 */
export function marchSteady(body, cond, K = CONSTANTS) {
  const { x, A, T } = body;
  const n = x.length;
  // One sharpness number per station sets both closures. K_SHED and SHED_FRACTION exist only
  // so the run scripts can ask "what would this hull have wanted"; the model leaves them unset.
  const sharp = body.rOverT.map((q) => Math.exp(-q / K.K_SHARP));
  const shedFrac = K.SHED_FRACTION !== undefined
    ? sharp.map(() => K.SHED_FRACTION)
    : K.K_SHED !== undefined ? body.rOverT.map((q) => Math.exp(-q / K.K_SHED)) : sharp;
  const beta = (cond.betaDeg * Math.PI) / 180;
  const u = cond.U * Math.cos(beta);
  const v = cond.U * Math.sin(beta);
  const r = cond.r ?? 0;
  const xRef = cond.xRef ?? 0.5 * x[n - 1];
  const rho = cond.rho ?? 1000;

  let Plin = 0, Patt = 0, Pw = 0, Pcf = 0, Aw = 0, s = 0, ell = 0;
  let Fpot = 0, Fcf = 0, Mpot = 0, Mcf = 0;
  const kept = new Float64Array(n); // impulse the slice has been left with, at each station
  const held = new Float64Array(n); // impulse the section is holding on to
  const fy = new Float64Array(n); // side force per metre at each step

  for (let i = 1; i < n; i++) {
    const dx = x[i] - x[i - 1];
    const xm = 0.5 * (x[i] + x[i - 1]);
    const w = v + r * (xRef - xm); // section's sideways speed through still water
    const A1 = A[i], A0 = A[i - 1];
    // Water already moving sideways (the wake left by sections upstream) is seen as less
    // cross-flow. Only the shed wake counts: the drag coefficient already describes a section
    // dragging through its own separated water.
    const wash = Aw > 0 ? (Pw / Aw) * Math.min(1, A1 > 0 ? Aw / A1 : 1) : 0;
    const wrel = w - wash;
    const target = A1 * wrel;
    const Teff = Math.sqrt((2 * A1) / Math.PI); // draft of the plate with the same added mass
    ell = (A1 > A0 && A1 > 0 ? ell * (A0 / A1) : ell) + dx;
    const cap = 0.5 * u * K.CL_MAX * Teff * ell;
    const limit = (p) => (cap > 0 && Number.isFinite(K.CL_MAX) ? cap * Math.tanh(p / cap) : p);

    const before = Patt;
    let shedNow = 0;
    const loading = target * Plin >= 0 && Math.abs(target) >= Math.abs(Plin);
    if (!loading) {
      // The section can no longer hold what it held: it lets go. A sharp section leaves the
      // excess in the water (Kutta, Jones); a round one takes it back (d'Alembert).
      const base = target * Plin > 0 ? target : 0;
      const newAtt = Math.abs(limit(base)) < Math.abs(Patt) ? limit(base) : Patt;
      shedNow = shedFrac[i - 1] * (Patt - newAtt);
      Plin = base;
      Patt = newAtt;
      if (shedNow !== 0) Aw = Math.max(Aw, A0);
    }
    if (target * Plin >= 0 && Math.abs(target) > Math.abs(Plin)) {
      // Loading up takes distance: a quarter of the local span (2 Teff) per e-fold.
      const gain = K.LAMBDA > 0 ? 1 - Math.exp(-dx / (K.LAMBDA * 2 * Teff)) : 1;
      Plin += (target - Plin) * gain;
      const newAtt = limit(Plin);
      if (Math.abs(newAtt) < Math.abs(Patt)) {
        const lost = shedFrac[i - 1] * (Patt - newAtt);
        shedNow += lost;
        if (lost !== 0) Aw = Math.max(Aw, A0);
      }
      Patt = newAtt;
    }
    Pw += shedNow;

    // Cross-flow growth: the separated pair is fed while the section drags sideways.
    const Tm = 0.5 * (T[i] + T[i - 1]);
    const sh = 0.5 * (sharp[i] + sharp[i - 1]);
    if (Tm > 0) s += (Math.abs(wrel) / u) * (dx / Tm);
    const cd = K.CD_ROUND + (K.CD_SHARP - K.CD_ROUND) * sh;
    const s0 = K.S0_ROUND * (1 - sh);
    const grown = s0 > 1e-9 ? 1 - Math.exp(-s / s0) : 1;
    const fcf = 0.5 * cd * grown * Tm * Math.abs(wrel) * wrel; // per metre
    Pcf += (fcf * dx) / u;

    const dFpot = u * (Patt - before + shedNow);
    const dFcf = fcf * dx;
    Fpot += dFpot; Fcf += dFcf;
    Mpot += dFpot * (xRef - xm); Mcf += dFcf * (xRef - xm);
    fy[i] = (dFpot + dFcf) / dx;
    kept[i] = Pw + Pcf;
    held[i] = Patt;
  }
  // Whatever the last section still holds is let go at the stern end.
  // (Bodies here end with A = 0, so this is zero; a dry transom would shed here.)

  const Fn = Fpot + Fcf; // normal to the centreline
  const energy = Aw > 0 ? (Pw * Pw) / (2 * Aw) : 0; // kinetic energy left per metre of track
  // Potential part: drag equals the energy left behind (full leading-edge suction).
  const liftPot = Fpot / Math.cos(beta) - energy * Math.tan(beta);
  const lift = liftPot + Fcf * Math.cos(beta);
  const dragSide = energy + Fcf * Math.sin(beta);
  const moment = Mpot + Mcf;
  return {
    sideForce: rho * lift, // perpendicular to the track [N]
    normalForce: rho * Fn, // perpendicular to the centreline [N]
    dragDueToSideForce: rho * dragSide, // along the track [N]
    yawMoment: rho * moment, // about xRef, positive turns the bow to windward [N m]
    xCLR: Math.abs(Fn) > 1e-12 ? xRef - moment / Fn : NaN, // centre of lateral resistance
    potentialPart: rho * Fpot, crossFlowPart: rho * Fcf,
    kept, held, fy, wakeImpulse: Pw, crossImpulse: Pcf, wakeSize: Aw,
  };
}
