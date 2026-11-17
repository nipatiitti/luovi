# Critic 2: does it answer the owner (unification and feel)

Reasoning from the three reports only; no web lookups. **[I]** marks my own unchecked inference.

## Verdict

A plus B is the right direction and clearly beats the per-triangle polar: slot, backwinding, luffing from the front, aback forces and backstay-to-forestay coupling come from one flow solve and one structure solve. It is not yet the unified model the owner asked for. Three holes would be felt within ten minutes: **no contact** (B), **no leech stall** (A), and **no route from a sail plan to a moulded shape** (B). The first is also a unification failure: without contact, mast, shrouds and stays limit nothing, so each rig needs hand-set stops.

## 1. Honest count of what is not geometry or material

**A (aero).** Per rig: nothing, as claimed. But:

- **A luff type per sail edge** (three or four classes, each with an S_crit curve). This is the sail class coming back as an enum.
- **Global constants that shape feel**: skin friction, wake core growth, shed-circulation decay (A admits it sets bluff drag and "could turn into a per-rig knob"), merge distance, the two-chord lumping distance, core width against panel size.
- **The fallback** (a separation state "blending toward a separated-plate normal force") is a mode in disguise, with a time constant to tune.
- The S_crit rule itself is acceptable: a threshold with a continuous response, like the Kutta condition.

**B (structure).** Not derived from rope and spar properties:

- **The moulded shape of every sail** (the largest item by far).
- Bias (shear) stiffness (B has no data); residual compression stiffness; the laminate film term.
- **No damping or friction anywhere**: blocks, winches, hanks, cloth hysteresis. The air is the only energy sink, so flogging amplitude and sheet snatch follow whatever the aero damping happens to be **[I]**.
- No bending stiffness. Resinated Dacron holds its shape in a calm; this cloth will hang like a bedsheet **[I]**.

## 2. Further rigs: what must be added by hand

| Rig | Needs |
| --- | --- |
| Staysail schooner | Nothing new |
| Junk | Sail lies on the mast on one tack: contact |
| Lug, lateen | Mast crosses the sail mid-chord. "Luff type" has no answer; needs contact, and a mast the flow sees |
| Wing mast | A thick section is not one panel with a number; needs thickness, or S_crit from nose radius |
| Kite | Inflated tube is a fifth luff type |
| Square sail aback | The sail should lie on mast and stays and load them; without contact it balloons through |

Two changes remove most of this: S_crit as one function of **edge radius over chord** (wire, bolt rope, mast, wing nose and tube become one geometric number), and **contact as a core element**.

## 3. Moulded shape for thirty sails and many boats

As written, B needs data nobody has; class rules give girths, not moulds. The route I would require **[I]**: a "virtual sailmaker" bake step. Inputs: the planform from the sail plan, cloth and panel layout, and two or three defaulted design numbers (depth, draft position, design mast bend). The bake form-finds the mould by inflating the planform to that depth, adds luff round equal to design mast bend plus the depth lens, and measures thread rest lengths. Square sails need only cut fullness. That fits the repo's authored-field-with-default rule. Without it the burden is unrealistic.

## 4. A sailor's session through A plus B

- **Hoisting.** Fake. No contact, stowed cloth, reefing or furling. Sails exist hoisted; the halyard is only luff tension.
- **Sheeting in from a luff.** The best part. The luff bubbles first, top first if twisted, and the telltale is a state of the model. One artefact: flow is solved at 20 to 30 Hz and cloth at 240 Hz, so a 3 to 5 Hz flog gets about six flow samples per cycle; flog frequency may follow the flow rate, not the wind **[I]**.
- **Sheeting too far.** Dead wrong. No trailing-edge separation, so a strapped main with a hooked leech keeps pulling. The real boat goes dead, heels and slows, and the leech telltales hide. This is **the thing he would notice first as fake**.
- **Traveller and backstay in a puff.** Right, if the mould carries luff round. Traveller down changes angle without twist, backstay flattens the main and firms the forestay in one solve, and force lags the puff.
- **Tack with the jib aback.** The force is right and pushes the bow, but jib and clew pass through mast and shrouds.
- **Bearing away, spinnaker up.** The boom can swing past the shrouds, since only the sheet stops it. Running is fully separated flow, the regime A trusts least, with drag set by a decay constant. Curl and refill are unproven (A) and smoothed (B). Rhythmic rolling could emerge from the shed wake, a real win if it does.
- **Gybe.** Boom arriving with momentum and air mass: right.
- **Broach.** Nobody owns the boom end and spinnaker in the water, which is what pins a broached boat down.
- **Ship: bracing round, missing stays.** Braces as lines and aback forces are right, and a 10 Hz flow is fine at ship pace. Yard stops against stays and lee shrouds need contact or a hand limit. With no clewing up or furling the ship cannot shorten sail, so it has no throttle.

## 5. Handing forces to the hull

Good in A: cloth velocity is in the boundary condition, so heel rate, pitch and boat motion feed back (roll damping and pitching hysteresis should emerge), and the world-frame mirror plane lets heel open the foot gap.

Missing in both:

- **The interface is never stated.** I would make the hull one rigid body inside B's matrix (B already has rigid spars), attached at mast step, chainplates, stay fittings, tracks, leads and winches. The water team supplies what B already demands of the air: force, a damping operator and an added-mass operator. Stiff shrouds and a light hull are then solved together, not as lagging partners.
- **Rig mass, inertia and air added mass** must reach the hull by that route, counted once.
- **Added mass is defined twice** (A from its matrix, B lumped). One owner: A.
- The image plane is the water, but a jib seals against the **deck**; hull and deck are not flow bodies.
- Sails and boom touching water is unowned.

## 6. Report C

Strong on mechanism. Problems:

- **Unverified load-bearing numbers**: Fujin figures come from a machine summary (the 0.9 to 1.6 lift band in test 2 especially); the 76% roll added mass is abstract only; rows 6 and 9 are from memory. Re-open before any becomes a pass band.
- **Tests 5, 7 and 9 need the hull model**; they cannot judge sail candidates alone. Test 11 decides, but only after two candidates and a hull exist. Add an early owner-in-the-loop version: a rig on a fixed, turnable hull showing sheet load and heeling moment.
- **Missing tests**: overtrim, steering by sails (ease the main to bear away), rake against helm balance, light air and slatting, a gybe, a broach, rhythmic rolling, hoist and douse, being covered.
- Test 3 should demand hysteresis in stall but not in luffing.

## 7. Top changes

1. Make contact (node against spar, wire, deck and water) a first-class element in B. It replaces every stop.
2. Add leech separation to A as one state per strip driven by the lattice's own pressure recovery, global constants only.
3. Replace luff types with S_crit as a function of edge radius over chord.
4. Specify the virtual sailmaker bake.
5. Put the hull in the rig matrix with a force, damping and added-mass contract from the water side.
6. Add physical friction and cloth damping; run A's two-dimensional day first.

## 8. The model I would want, in a sailor's words

Give me a boat I rig from the drawing: spars, wire, rope and cloth, cut like a sailmaker would cut them, and nothing else. When I pull a string, a real string gets shorter and whatever it leads to moves. The backstay bends the stick, the main goes flat and the forestay comes up hard, and I never see a number called depth. The air knows the whole sail plan at once, so the jib and main work as a pair, the luff lifts before the leech, a strapped main goes dead, and a sail aback leans on the mast and shoves the bow. Cloth cannot pass through wire, wood or water. The hull hangs off the same chainplates and sheets as the rig, so when she heels, pitches or rolls, the sails feel it. If I rig a lugger or a ship tomorrow, I draw it, and nobody writes a line for it.
