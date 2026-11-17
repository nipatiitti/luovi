# Critic 1: the physics

Checks marked (script) were run in `/tmp/claude-0/-home-user/005e1c2d-09e2-5a19-913c-f6e461918c91/scratchpad/critic1/chk.py`; the rest is derivation, with no web lookups.

## The three claims everything hangs on

**1. Which free-surface image is right (A, B, D all depend on it).** For a surface-piercing vertical plate the sway added mass, and with it the slender-body side force, under a pressure-release surface is 0.404 of the rigid-lid value (script; a semicircle gives 4/π², the same). So the image choice is a factor of 2.5 on the Folkboat's and the Joutsen's side force, not a correction. A's field equations do recover the rigid lid: a mode forced at frequency kU responds quasi-statically when kU² ≪ g, giving φ_s = −w_b/k, which cancels the negative image exactly (derived). The flip sits at k ≈ g/U², a local Froude number of order one. Two consequences. A's patch can only hold the rigid-lid band if its Nyquist wavenumber exceeds g/U²: at 128² that fails below 1.7 kn for the H-boat and below 6 kn for the Joutsen (script), which is mid-tack and the Joutsen's whole manoeuvring range; below that, hull lift and sway added mass drift toward the 0.40 answer. And at sailing speed the draft Froude number is 0.72 to 0.80 for all three keelboats and 1.4 for the Class40 (script), at the edge of the transition, so B's and D's fixed rigid-lid tables are an assumption, defensible for the keelboats, wrong for the Class40.

**2. Induced drag from pressure on a thin-fin lattice (A, and E's offline solver).** Summing panel pressure on a doublet lattice gives a force normal to the fin: drag = lift × α. Without leading-edge suction that is 2.4 to 3.7 times the true induced drag for aspect ratio 2 to 5 (script). A's "summed pressure already contains the drag that lift costs" is false unless suction is added or drag is taken in the wake plane. It lands on the H-boat's tack speed loss.

**3. B's energy bookkeeping.** Verified: lift U·A·w with drag |P|²/2A gives D = L²/(πρU²T²), the elliptic result, and B's uptake factor η equals the far-wake downwash ratio of the same Helmbold wing. B's core is internally consistent.

## A. Body-exact potential flow

- **Not produced by the stated equations:** `−(dA∞/dt)·v` does not "appear by itself" from six unit-acceleration solves on a frozen wet set; it needs the wet-set rate term or differencing, so slamming and planing lift have no source as written. The same applies to dΓ/dt in the unsteady pressure.
- **Unaddressed:** the wave field lives on the whole plane including the waterplane inside the hull, where w_b is meaningless and singular at the waterline. This is the time-domain form of irregular frequencies.
- **Transom:** hydrostatics are "exact under the incident surface", so a planing transom keeps its forward hydrostatic push while the Kutta sheet zeroes the dynamic pressure.
- **Doing the real work:** rule 3. For the Joutsen above 10° of leeway it is the side force, and round-bilge C_D is Reynolds dependent.

## B. Section momentum

- **Sound:** correct limits at zero speed, pure sway, sternway (shedding flips on the sign of dA), flying hull, and real squat.
- **No source:** radiation damping. At zero and low speed heave, pitch and roll have only friction and cross-flow drag, so the boat bobs. Hobby-horsing will be badly underdamped.
- **Not a force law:** surge as "energy left per metre" is a steady-state identity. In a tack it gives no surge added mass and diverges as L²/U² until the loading limit catches it.
- **Double count:** at high Froude number the vertical-impulse energy drag and the Kochin vertical-dipole wave drag are the same energy. One must be dropped.
- **Hidden mode:** the dry transom is assumed, not predicted.
- **Doing the real work:** for the H-boat, η, C_Lmax and the lag carry most of the side force. The shed fraction on round sections is the Joutsen's lift slope.
- **No free-surface effect on lift:** Kochin gives drag only.

## C. Simulated water

- **The equations are right; the Reynolds number is not.** At a grid Reynolds number near 10³ a streamlined body carries friction-like drag an order above the real C_f, and the wall model then adds the real friction on top. Drag is counted twice and the spurious half scales with cell size and time step, not physics.
- **Lift on resolved bodies has no Kutta condition.** The Folkboat keel and the Joutsen hull, the two boats whose lift is the hull, rest on numerical diffusion.
- **Blend zone double counts:** a keel between one and three cells thick is half solid, half actuator strip, each feeling the other. The CPU twin at L/48 and the GPU at L/96 put the Folkboat keel on opposite sides of this rule.
- **Hydrostatics from grid pressure:** the H-boat canoe body is four cells deep.

## D. Strip law with a separation state

- **X carries two opposite meanings.** On a foil, X = 1 is attached and gives lift. In the reactive term, X = 1 is d'Alembert and gives zero lift. A Folkboat keel at small leeway is attached, so as written it makes no side force. The hand checks silently assume X = 0 there, so the hull's lift slope is (1 − X₀(0)), a closure with no source.
- **Downwash counted twice.** Jones lift already contains its wake. Applying Biot-Savart from the shed wake to lengthwise hull strips removes it again.
- **Post-stall sum, not blend.** The Kirchhoff factor keeps a quarter of attached lift at X = 0 and the (1 − X) drag is added: C_L 0.79 plus C_N 1.0 at 45° (script).
- **No source:** wave resistance, radiation, wave drag of side force.

## E. Compiled reduced model

- The run-time structure (Cummins memory, convective circulation lag, workless lift) is sound. The physics is all in an offline solver that is A with a harder free surface, so it inherits claim 2 and A's holes.
- **Passivity is not by construction.** Power from the lift term is Γ·(ν·S W Γ); nothing constrains its sign, so a fitted W can make thrust.
- **Wetted state as three numbers** cannot describe a hull spanning a wave: bow buried, stern out. That is the broach.
- **Anchor runs:** "Reynolds insensitive" holds for sharp edges only. Without a wall model round-bilge separation is subcritical, about a factor of two on the Joutsen's dominant force.

## The five boats

| Boat | A | B | C | D | E |
| --- | --- | --- | --- | --- | --- |
| H-boat | tack loss too high (suction) | lift is the closures; no speed effect on effective draft | best case; drag high | fine as lifting line; no wave drag | fine if solver fine |
| Folkboat | lift drifts low below 2 kn; half-angle rule | best case; flap too strong | lift is numerical | zero lift as written | edge vortex uncertain |
| Suomen Joutsen | rule 3 and patch resolution | shed fraction is the answer | bilge separation, drag high | X₀ is the answer | anchor runs wrong regime |
| Catamaran | re-entry slap has no source | radiation absent, else good | under-resolved | fine | switch |
| Class40 | transom push, no pile-up | double-counted lift drag, assumed dry transom | pressure peak smeared | rigid-lid table wrong, no wave drag | needs unsolved solver |

## Ranking on physical soundness

1. **B**: every term derivable, limits right, holes named and fillable.
2. **A**: most complete, but three statements are not true as written and the low-speed image risk hits the tack.
3. **D**: B's law plus a real lifting line, spoiled by the X conflation and two double counts.
4. **E**: sound container, no physics of its own.
5. **C**: right equations at the wrong Reynolds number; errors are resolution artefacts.

## Compatible pieces

- B's section law for hull bodies, with D's span-wise lifting-line strips and wake for high-aspect fins.
- D's attachment state on fins only, in blend form.
- E's passive state-space memory, fitted per section from B's own 2D solves at several frequencies, supplies the missing radiation damping.
- B's Kochin integral for steady wave drag and drag due to side force.
- A's body-exact added mass as an offline check of B's tables, and D's local-Froude blend between the two baked limits.

## Must not be combined

- B's shed-impulse downwash with D's Biot-Savart on the same hull strips.
- B's vertical energy drag with a vertical-dipole Kochin term at high Froude number.
- η with any explicit wake on the same fin.
- Kirchhoff lift factor with additive (1 − X) drag.
- A wave-field or ζ memory with a low-frequency (rigid-lid) added mass table: memory needs the infinite-frequency table.
- Any grid or panel pressure drag with a wall friction law unless the resolved surface is free-slip.
- A's rule 3 or B's cross-flow growth with a keel-line vortex sheet on the same section.
