# Critic 1: physics and buildability

Verdict: A (vortex sheet on the cloth) and B (implicit tension structure) are the right pair, and they are one design. Neither is buildable as written: the place where they meet is exactly where light-cloth simulations fail. Numbers marked **[N]** are from my throwaway script, `/tmp/claude-0/-home-user/005e1c2d-09e2-5a19-913c-f6e461918c91/scratchpad/critic1/chk.py` (2D lumped-vortex plate, 3 m chord, 0.3 kg/m² cloth). No web lookups; statements about papers are from memory.

## 1. Checks on the claims everything hangs on

**Added mass size: confirmed, with a caveat that matters.** The lattice-derived added-mass matrix sums to 8.9 kg per metre of span against the theoretical ρπc²/4 = 8.66 **[N]**. B's lumped formula integrates to the same total. But the air's mass is not a diagonal: it depends on wavelength, roughly 2ρ/k. Modal values **[N]**: whole-chord half sine 3.2 kg/m², two half waves 1.3, four 0.6, six 0.4. B's diagonal gives 2.9 to 3.4 for all of them. So B's lumped mass is right for a sail filling and five to seven times too heavy for flogging ripples, which would then flog two to three times too slowly. "Ten times the cloth" holds only for the first mode.

**Explicit coupling fails: confirmed.** Feeding the air's inertial reaction back one step late has an amplification of 10.8 per step **[N]**. A's "hold the pattern, add −ρA⁻¹aₙ" only works if that term sits on the left-hand side of B's solve.

**Over- and under-estimating the implicit mass [N].** With an approximate mass M̃ in the solve and the remainder lagged, the error iteration has spectral radius 0.88 to 0.92 for B's diagonal (stable, but the correction converges slowly, so fast modes keep the wrong mass), 0.87 to 0.91 at half of it, and 2.2 at a quarter (unstable). Rule: M̃ must bound the true operator from above on every mode, or equal it.

**The matrix A hands over is not symmetric.** The discrete operator ρ·C·A⁻¹ is 24 to 45% asymmetric at 32 and 8 panels **[N]** (the continuous one is symmetric). B's LDLᵀ needs it symmetrised and checked positive.

**B's "factor of twenty" is the wrong mechanism.** The arithmetic holds (19 N/m against 412 N/m). But adding mass to B's equation only raises the threshold to (m + mₐ)U² ≈ 170 N/m **[N]**, and for the wrong reason. The 1.75ρU²L figure is, as I recall the membrane papers, a divergence threshold for a flat pretensioned membrane held at both ends: the air's _stiffness_ (pressure in phase with displacement, about 2ρU²k) beating tension. That is a sail filling, not luffing. A per-triangle polar gives pressure in phase with slope instead, so it has this physics wrong in kind, and no mass term repairs it. The "convected added mass" B proposes is that stiffness term in disguise; a lattice already supplies it through U·∇Γ. Add both and it is double counted. Luffing onset is set by the sign of the luff pressure (A's S), not by tension against ρU²L.

**One Newton iteration through slack to taut [N].** A mass on a raw tension-only thread (3.3·10⁵ N/m), forced through slack at 4 Hz: peak snatch tension at 240 Hz is 33 kN with backward Euler and 90 kN with linearised midpoint, against 5 to 10 kN when resolved. Midpoint does not damp the stiff modes it excites. And 20 rad/s of rotation per 1/240 s step gives 0.35% spurious strain, the size of the working strain; 0.09% at 480 Hz. So B's step gives wrong sheet snatch and ringing exactly in the tack.

**Close sails [N].** Block Gauss-Seidel between two parallel sheets: spectral radius 0.14 at a gap of a third of a chord, 0.52 at a tenth, 0.86 at 3%. Two or three sweeps suit a non-overlapping jib and stacked square sails; an overlapping genoa needs the pair solved as one block.

## 2. Model A

Sound: circulation, the slot, backwinding, symmetry aback, image plane, Wagner lag, twist response, normals from an interpolant. Limits:

- **Zero wind.** S divides by V. Write the test without division (Γ₁² against S_crit²·V_rel²·c·Δx) using speed relative to the cloth. In a calm with slatting sails nothing convects the wake away; it needs age-based decay or it accumulates.
- **Wind from astern or by the lee.** The leech is then the leading edge and "always Kutta" there means zero suction, which is right for a sharp cloth edge. With S_crit = 0 the model is Kutta at every edge, a standard fully separated vortex method; S_crit is all that makes a luff differ from a leech.
- **Is S_crit a hidden per-rig table?** Not per rig, but it is not one number either. In the literature (from memory) the critical value is calibrated per section shape and Reynolds number, and behind a mast it depends on rotation angle. Honest form: zero for wire and rope luffs, one curve in mast diameter over chord and entry angle from a 2D study. Never calibrate it against ORC polars; that is how it becomes a tuning table.
- **Edge-on.** Fine, it is a flag. But flogging drag comes from pressure on ripples that six chordwise panels cannot hold, so drag will read low.
- **Wake through a downstream sail.** Elements advected in finite steps tunnel through a lattice that only blocks flow at collocation points, and sit on the wrong side. Delete or re-inject on crossing, with panel-wide cores. Free 3D vortex particles are unstable without care; use ring wakes convected by wind plus sail-induced velocity, self-induction in the first chord only.
- **Stalled force on a coarse 3D lattice** is unproven; everything downwind rests on it.
- **Cost.** H-boat about 10 ms per flow step is fair. The ship is optimistic: cross terms about 15 ms, wake on 720 points 17 ms, wake self-advection up to 36 ms unless truncated. Call it 40 to 70 ms at 10 Hz, half a core, on a fixed tick schedule.
- A's pressure hold between flow steps lags shape by up to 45° of phase at 5 Hz, which can feed or kill flutter spuriously. Fix below.

## 3. Model B

Sound: direct factorisation for stiffness independence, thread net against locking, beams for spars, one line element per rope, fixed sparsity (keep the residual compression stiffness so the pattern never changes; give sliding luff nodes the whole mast block).

Unsound or unpriced: one iteration with midpoint (above); the cost table is a synthetic band and omits the rig stage, luff condensation and assembly, so expect 4 to 8 ms per tick for the hero boat, not 1 to 3; contact is absent.

## 4. Who owns what, and the coupled step

A owns the flow operator: lattice, factorised A, wake, Γ, S, and the added-mass matrix as a by-product. B owns all time integration and all inertia. A never applies a force proportional to cloth acceleration.

Per flow step (every 2 to 4 ticks, fixed schedule): rebuild and factorise A per sail (close pairs jointly); advect the wake; store wake-induced velocity at collocation points; form Mₐ = sym(ρ·C·A⁻¹) mapped to cloth nodes along normals.

Per substep (240 Hz):

1. Fresh right-hand side from current cloth normals and velocities, frozen wake velocity; back-substitute through the frozen factors for Γ. About 10⁴ operations per sail. This removes the phase lag.
2. Explicit load: ρ·U_t·∇Γ plus the part of ∂Γ/∂t not caused by normal acceleration (changing wind, wake, normals), plus luff suction and friction.
3. Solve (M + Mₐ + βh²K)Δv = h·f with generalised-α (spectral radius at infinity 0.6 to 0.8), two Newton iterations whenever any element changes slack state or rotation exceeds a threshold. Mₐ enters by Woodbury on the banded sail factor: exact rank (72 for a hero sail, about 1 to 2 ms per flow step), truncated to 8 to 12 smooth modes plus a diagonal upper bound for ship sails.

Aerodynamic damping can stay explicit: its rate is about 10 per second once the air mass is in, 0.04 per substep.

## 5. Cheapest staged path

1. B's structure with attached-flow lattice only (Kutta at leech, head and foot; wake rows convected by wind) and the implicit Mₐ. Upwind sailing, twist, slot, backstay, ease-to-luff, aback. C's tests 1 to 5.
2. Luff shedding with wind-convected wake and panel-wide cores: stall, reaching, running, spinnaker.
3. Near-field free wake, wake crossing sails, the ship with reduced modes.
4. Contact.

## 6. Experiments before committing

1. A's 2D sweep, plus panel-count independence (6, 12, 24) of stalled force and drag at 90° between 1.6 and 2.4 with S_crit = 0.
2. 2D chain plus lumped vortices: explicit against implicit Mₐ, diagonal against full; flag frequency and onset against Alben and Shelley.
3. Slack-to-taut snatch: one against two iterations, midpoint against generalised-α, error under 20% of resolved.
4. One 3D 6 by 12 sail at 60° to 120°: mean force, noise, cost.
5. Real assembled matrix for main, jib, mast and lines in Node: time per tick.
6. Overlapping pair: sweeps against joint solve.

Kill condition: experiment 1 or 4 fails with no single global constant. Then keep the lattice for attached flow and interaction, with a per-strip separation state.
