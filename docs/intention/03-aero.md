# Sail aerodynamics and rig

Oct 22, 2026 · @Niilo

## Bottom line

No sail has a mode. Every sail is a cloth mesh, every triangle gets aerodynamic force from its own local apparent wind through one ±180° polar, and every rope is a constraint. Aback, in irons, sternway under backed headsails, yard bracing and spinnaker collapse are then what the equations do, not special cases. The authoritative sails and rig run on the CPU; the budget is under 2 ms per tick for a full-rigged ship's rig and sails and under 1 ms for the hero boat, and the coarse cloth is what sets it (ADR 0008).

## Sails: cloth plus per-panel aero

**Cloth.** Each sail's authoritative cloth is a coarse XPBD grid of 6 by 6 nodes (8 by 12 affordable for the hero rig) with realistic areal mass and structural and shear constraints only; bending constraints are dropped, since at sailcloth stiffness the sweep cannot hold them, and the 10×10 to 20×20 fine cloth is the visual upsample of the Separation of concerns tab (ADR 0008). Corners are rig nodes (halyard, tack, clew/sheet, brace); edges carry bolt-rope and leech-line stiffness so leech tension and twist behave. Battens are stiffer strips in the mesh. Sails are simulated in the ship's local frame; only the net force and moment go to the hull rigid body.

**Aero per triangle.** For each triangle, every substep: apparent wind at its centroid (true wind from the wind field with a log height profile, minus the triangle's own velocity), angle of attack from the triangle normal, then pressure = ½ρV²·Cp(α, sail class). The triangle's own velocity makes the force velocity dependent, so evaluating it once per tick diverges on flapping cloth (ADR 0008). Integrate over the sail for the force on the cloth and on the rig.

**The polar.** One Cp(α) curve per sail class across the full ±180°: lift rising to its peak around 15–25°, a stall region, drag plateauing near 1.2–1.3 at 90°, and the mirror on the backwinded side. A backwinded sail therefore gives negative lift and reversed thrust with no code path for "aback". Wing versus push is the same curve read at different α; nothing switches. Polars are generated, not guessed: a vortex-lattice run on each sail's flying shape (mirrored at the deck, wake shed from the leech) gives the attached-flow part, and Fujiwara's NMRI wind-tunnel work shows this holds even for square sails with low aspect ratio and very large camber; the stalled and backwinded parts come from tunnel data. Coefficients are scaled down with local turbulence intensity from the gust layer, because tunnel tests in a simulated natural boundary layer measured lift 16–44% and drag 11–42% lower than in steady flow; without this everything is overpowered in gusts.

**Luffing.** Near α ≈ 0 the pressure vanishes, the sheet constraint goes slack and the cloth flutters from unbalanced tension plus a small noise term; the flutter frequency scales with leech tension. **Camber control** (outhaul, cunningham, backstay via mast bend, vang) changes constraint rest lengths; the cloth finds the new shape and the polar reads the new local angles.

## Rig classes

Each class differs only in its polar, camber and attachment pattern; the behaviour differences follow.

| Sail class                     | Aspect ratio, camber                      | Polar character                                                                | Resulting behaviour                                                                                             |
| ------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Square sail (Joutsen)          | \~1:1 per sail, flattish, deep when eased | Lower peak CL, soft stall, wide useful α band                                  | Efficient reaching and running, cannot point above \~65–70° apparent, backs cleanly for box-hauling and tacking |
| Bermudan main and jib (H-boat) | 3–4, controllable camber                  | Sharp, high CL peak near 15–20°, abrupt stall                                  | Points high, sensitive to trim, luffs cleanly                                                                   |
| Gaff main (schooner)           | \~2, gaff twist                           | Between the two; head stalls first as the gaff sags to leeward                 | Powerful reaching, poorer upwind, vang-dependent                                                                |
| Spinnaker / gennaker           | Low, very deep                            | Shape held by internal pressure only; sensible Cp near stagnation is essential | Fills and collapses from pressure alone; gybes without scripted events                                          |

Spinnakers are the stress test: with no luff tension the cloth is held only by pressure, so areal mass, stagnation Cp and the sheet/guy constraints must be realistic or the sail oscillates. The reference work couples a membrane FEM to RANS and validates against photogrammetry of the flying shape; this plan is the cheap version of that structure. Take its measured sailcloth constants (elasticity and damping of Nylon Superkote 75) and its forced-oscillation flutter case as the luff-flutter test, and the ORC VPP spinnaker and code-zero coefficients as the force sanity check.

## Rigging as a constraint graph

Masts, yards and every rope form one constraint graph solved with the sails; the Rigging tab holds the model. What matters here: sail corners are rig nodes, so cloth tension and rope tension share a solver and the aero force is evaluated every substep (ADR 0008); a running line is a single length constraint through its blocks, so hauling a brace or a sheet is a rest-length change and the yard or clew follows; backstay and runner tension bend a yacht mast and flatten the main, which is the tuning layer.

## Wind input and sail-to-sail interaction

True wind at each sail triangle comes from the runtime 2D wind field in the ocean tab, with a logarithmic height profile and the procedural gust layer. The hull's own motion, heel and pitch enter through the triangle's velocity, so apparent wind twist with height and sail-induced apparent wind at speed are automatic.

Sail-to-sail interaction is a cheap upstream model, not CFD: each sail casts a wake deficit and an upwash/downwash correction on sails behind it (jib upwash on the main, square sails shadowing each other, mainsail backwinding the jib when oversheeted). Fujiwara's measurements of four sails in line, with and without the hull, set the deficit per sail spacing and the sail–hull term. A sail's cloth sim shadows the wind grid locally only for the player's own hull; other boats' sails are not shadowed by each other beyond a per-boat lee cone.

## Benchmarks as tests

- [ ] H-boat polar: two benchmarks against the ORC 2026 certificates, main and jib against the non-spinnaker certificate at ten points within 5% as the gate for build step 3, spinnaker against the club certificate at four; three of the six fixed-angle points are spinnaker points, and a miss is reviewed as a whole before anything moves (ADR 0010)
- [ ] Suomen Joutsen: \~14 kn best, poor pointing; tacking fails without backing the headsails, succeeds with them
- [ ] Sternway: head to wind, yards braced square or jib backed; 1–2 kn astern, rudder sense reversed, no special case
- [ ] Yard turning: brace haul rotates the yard until the lee brace is taut; sails fill or back accordingly
- [ ] Gennaker: fills, collapses and refills through a gybe with no scripted event; no sustained oscillation on a reach
- [ ] Luffing: sheet eased past α ≈ 0 produces flutter and slack running rigging; sheeting in stops it
- [ ] Broach ingredient: spinnaker heeling moment rises sharply when apparent wind swings forward in a gust

## Sources

- [ORC VPP Documentation 2023 (aero model, sail coefficients, depowering)](https://orc2.orc.org/rules/ORC%20VPP%20Documentation%202023.pdf)
- [ORC Superyacht VPP 2026 (gaff rig aero coefficients)](https://orc.org/uploads/files/Rules-Regulations/2026/ORC-SY-VPP-documentation2026.pdf)
- [Fujiwara et al., square soft sail: wind tunnel and vortex-lattice](https://nippon.zaidan.info/seikabutsu/2003/00574/contents/0422.htm)
- [Fujiwara, Hearn et al. 2005, sail–sail and sail–hull interaction](https://eprints.soton.ac.uk/23875)
- [Zeng & Zhang 2018, sail aerodynamics in natural wind](https://doaj.org/article/bf840e2070104ed9a62b7eb61eb5a0e8)
- [Calì et al. 2018, downwind sailcloth fluid–structure interaction](https://eurekamag.com/research/104/708/104708808.php)
- [Unsteady numerical simulations of downwind sails (ISIS-CFD + ARA)](https://hal.archives-ouvertes.fr/hal-01203190)
- [Wind-field gradients per hull part in real-time ship simulators (Flanders Hydraulics)](https://marineinfo.org/id/publication/359139)
