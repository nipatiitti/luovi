# D. What other fields already do: one strip law with a separation state and a wake

Labels: **[E]** established in the cited field, **[I]** my inference, **[S]** speculation.

## 1. The idea

Aerobatic flight simulators, missile and airship aerodynamics, robot-fish models and wind-turbine codes independently reached the same recipe: cut every body into strips, give each strip only its own local water velocity, and let it exchange momentum with the water in three ways at once. First, the water a strip has to shove aside has mass, and whatever sideways or downward momentum the strip has given that water is either handed back further aft or left behind in the wake (this is how a fish's body makes thrust, how an airship hull makes lift, and how a flat stern makes planing lift). Second, a strip with a sharp downstream edge keeps the flow attached and makes wing lift. Third, a strip the flow has let go of makes plain bluff drag. One number per strip, "how attached is the flow here", between 0 and 1 and always lagging the truth by a few chord-lengths of travel, slides the strip between those behaviours. Nothing in it knows what a keel, a tack or a stall is. A fin keel is tall thin strips that stay attached; a Folkboat keel and a full-rigger's hull are long deep strips that hand momentum to a wake; a Class40 stern is wide shallow strips whose momentum goes downward. The free surface is what none of those fields faced; section 6 lists what it adds.

## 2. Formulation

### What the other fields contribute (mechanism, not application)

| Field | Transferable mechanism | Status |
| --- | --- | --- |
| RC and UAV full-envelope simulators (Selig; Khan and Nahon) | Component strips, each fed its own local velocity (body rates, slipstream, upstream downwash), coefficients valid over ±180°, summed. Spins and tail slides emerge with no modes. | [E], but table-driven, quasi-steady, and Selig's blanketing uses hand-tuned "shadow maps" |
| Upset and high-alpha flight dynamics (Goman and Khrabrov, TsAGI; MAI follow-ups in Russian) | One state X per surface, the degree of attachment: τ₁ Ẋ + X = X₀(α − τ₂ α̇), Kirchhoff lift ∝ ((1+√X)/2)². Stall, hysteresis and recovery are one ODE; τ₁ ≈ 4.2 c/U. | [E] for aerofoils at Re 10⁵ to 10⁶ |
| Wind turbine codes (Øye one-state, Hansen-Gaunaa-Madsen four-state, in OpenFAST) | Force = f·(attached) + (1−f)·(fully separated), f lagged by 3 to 6 half-chords of travel, in production use. Rotor "dynamic inflow" replaces a free wake by a few lag states. | [E] |
| Missiles, airships (Allen, Jorgensen 0° to 180°; Jones and DeLaurier) | Body normal force = slender-body potential term (from the lengthwise change of section added mass) + viscous cross-flow term, valid nose-first to tail-first. | [E], static only |
| Fish and eel robots (Lighthill; Boyer, Porez, Leroyer; Candelier) | Reactive force per unit length = −(∂/∂t + u ∂/∂s)(m_a w), momentum flux leaving the tail as boundary term, plus Morison drag. Within 10% of RANS for forward, turning and stopping gaits, faster than real time on a 2005 PC. | [E]; known flaw is the trailing-edge term (no Kutta condition), which overestimates force |
| Planing craft (Zarnick): the same law at a free surface | The Lighthill term with m_a a function of section immersion gives planing lift and slamming. | [E] |
| Kites (vortex step method) | Nonlinear section law iterated against a cheap wake at the three-quarter chord. | [E]; warning: non-unique past stall |
| Robotics and RL (MuJoCo ellipsoid model) | Stateless added mass + drag + sin 2α "Kutta" lift on a fitted ellipsoid. | [E]; warning: five coefficients refitted per robot, no wake |
| Low-speed ship manoeuvring (Yoshimura; Park; 2D+t at TUHH) | Confirms the gap: slender-body force is wrong aft, "often applied with the aft half excluded", because separated momentum stays in the water. | [E] |

The synthesis **[I]**: the missile, fish and planing terms are one law; the Goman-Khrabrov state is the continuous answer to "how much aft-body momentum is recovered"; the turbine blend is the same state on a foil section.

### Geometry and bake

Each closed body is cut into strips along its longest principal axis (hull with integral keel: along the length; fin, rudder, daggerboard: along the span), a property of the shape computed in the bake. Per strip, from a 2D boundary-element solve of the section polygon clipped at a waterline, tabulated over immersion and heel:

- added-mass tensor **M**(z, φ) for sway, heave and roll, for both free-surface limits (rigid lid and pressure-release, see section 6);
- submerged area, girth, depth, breadth; edge sharpness (bilge or keel-edge radius over depth) giving the section's cross-flow drag coefficient C_d and its static attachment curve X₀(α) (for foil sections from thickness and nose radius, optionally a 2D panel plus boundary-layer run).

About 60,000 small 2D solves: minutes on a laptop.

### State

Rigid body (13 numbers), then per strip: attachment X (1), two circulation lag states (Wagner-type, 2), and a short wake: per shedding strip a ring buffer of 16 to 32 trailing elements carrying shed circulation or shed cross-momentum, convected with the local water velocity (including wave orbital velocity).

### Per step, for every strip

Local water-relative velocity at the strip (body velocity + rates × arm − orbital velocity − wake-induced velocity) is split into u along the body axis and **w** in the section plane.

1. **Reactive** [E as Lighthill/Zarnick; the X-weighting is I]:
   **f_R** = −∂(**M w**)/∂t − u·[∂(**M w**)/∂s]₊ − X·u·[∂(**M w**)/∂s]₋
   where [·]₊ is the part where the section is growing in the direction of the flow and [·]₋ where it shrinks. With X = 1 this is d'Alembert (no net force, pure Munk moment); with X → 0 aft, the momentum is left in the water, which is Jones's slender-wing lift and Allen's forebody rule. The left-behind momentum (1−X)·u·**M w** is what the strip sheds into its wake buffer. **M** is evaluated at the strip's present immersion and heel, so ∂**M**/∂t contains slamming and ∂**M**/∂s on a wide flat stern contains planing lift. The constant 6×6 added mass disappears.
2. **Circulatory** [E, turbine form]: section lift in its own plane, ρ|**w**|Γ with Γ from the thin-section sin α cos α law at the three-quarter chord, lagged by the two Wagner states, multiplied by ((1+√X)/2)². Which edge is "trailing" is decided by the sign of the chordwise flow, through sin 2α, so reversed flow is the same expression.
3. **Separated** [E]: ½ρ C_d d |**w**|**w**·(1−X) normal to the section, plus skin friction on wetted girth along the full relative velocity.
4. **Attachment** [E for foils, S for hulls]: τ₁ Ẋ + X = X₀(α_eff − τ₂ α̇), τ₁ ≈ 4 × (strip length in flow direction)/|U|. For hull strips "length in flow direction" is distance from the upstream end, so attachment decays along the body.
5. **Hydrostatic and Froude-Krylov** pressure on the same clipped sections.
6. **Wake influence** [E]: Biot-Savart from all wake elements onto all strips, giving the downwash that turns Jones's and the 2D lift into finite-aspect values, keel wake on rudder, windward hull on leeward hull.

No iteration: wake-induced velocity comes from the previous step's wake, which sidesteps the vortex-step non-uniqueness past stall.

## 3. The five boats

**H-boat.** Keel and rudder are span-wise strips with X ≈ 1: ordinary lifting-line behaviour with real downwash on the rudder. The shallow canoe body has small **M** in sway, so it contributes mostly Munk moment. Hand check: keel area 1.0 m², effective aspect 1.7, 5.5 kn, 1.1 kN side force gives about 5° leeway. Missing: keel-hull junction carry-over is only as good as the wake image.

**International Folkboat.** One body; the keel is part of the hull sections, so strips are deep (1.2 m) along 3.5 m. Side force is the reactive term: Y ≈ (π/2)ρT²u²β, about 15 kN/rad at 5 kn, 5° to 7° leeway after the aspect-0.7 downwash correction. The rudder hung on the keel is the last strips' **w**: it changes the momentum flux leaving the trailing edge, exactly a fish's caudal fin, so it loads the whole after-keel instead of acting as a separate wing. Large sway and yaw added mass come from the same table. Wrong or missing: aspect 0.7 is where neither slender-body nor lifting-line limits are good; error perhaps 20% in lift slope.

**Suomen Joutsen.** Aspect ratio about 0.1: pure Lighthill territory. Hand check: T = 5.2 m, 10 kn, 130 kN sail side force gives 7° from the reactive term alone, less with cross-flow drag, in the right range. As speed falls in stays, u·**M w** collapses with u² while cross-flow drag does not, so leeway grows and the bow falls off. τ₁ scales with 90 m / U: minutes to rebuild attached flow [S]. Missing: whether X₀ for a full hull section can be had from geometry at all.

**Beach catamaran.** Two hull bodies and four foils, each strip clipped at its own waterline. Flying a hull is strips whose immersion goes to zero; the windward rudder and board unload the same way. Hull interference is each hull's wake seen by the other. Missing: surface-piercing foil ventilation is only the crude cap in section 6.

**Class40.** Wide aft strips have large heave added mass. Hand check: B = 4.5 m, 15.5 kn, 3° trim: L ≈ u²τ·(π/2)ρ(B/2)² ≈ 27 kN, about 60% of displacement. So the hull rises and wetted area falls with no planing switch; surfing onset on a wave face is the same term. Canting keel and water ballast are a rotated fin body and moved mass. Missing: spray drag, and transom-dry-out is the X of the last strip, which needs a Froude-dependent X₀ [S].

## 4. Feel

**Tack.** The rudder's X lags by about 4 chords (0.5 s at 5 kn), so hard-over helm overshoots, lets go, then recovers. Keel circulation decays and rebuilds through the Wagner states while its old wake still washes the rudder. Speed lost through the wind lengthens every τ₁, so a slow exit is mushy for seconds: at 2 kn the H-boat keel needs about 4 s to reattach. The Folkboat instead carries way on its larger added mass, turns slower because yaw added mass and the shed keel wake resist rotation, and regains grip gradually because its side force never depended on attachment.

**Puff.** Side force demand rises before speed does, so leeway steps up, then decays as u² grows. Heel changes each strip's clipped section, moving the reactive load forward: weather helm.

**Broach.** Stern lifts, rudder strips lose immersion, X drops, the ventilation cap removes the suction side; meanwhile the bow strips' reactive force (large **M**, large u) supplies the destabilising Munk moment with nothing aft to oppose it.

**Sternway.** u changes sign, so [·]₊ and [·]₋ swap ends: the rudder becomes the leading edge, its lift sense reverses through sin 2α, and the Folkboat's deepest sections now lead, making it directionally unstable backwards for a geometric reason.

## 5. Cost and determinism

About 100 strips, 2,000 to 3,000 wake elements: 3×10⁵ Biot-Savart evaluations per step, of order 1 to 3 ms in TypeScript, the dominant cost; table lookups and ODEs are negligible. Lumping far wake rows into lag states (the dynamic-inflow trick) would cut it tenfold. All CPU, fixed order, `core` math only: bit-reproducible. No GPU in the physics, no learned component, bake in minutes. The reactive term makes the mass matrix state-dependent, so the body needs a semi-implicit step (added mass on the left-hand side), as MuJoCo recommends for the same reason.

## 6. What the free surface adds, and where it breaks

None of the fields above had these.

1. **Wetted shape is a state.** Handled, and it is where planing and slamming come from.
2. **The surface boundary condition changes with speed.** Aerodynamics has only a rigid wall. Water behaves as a rigid lid at low Froude number and as a pressure-release surface at high, which changes sway added mass and flips the sign of the image for a foil near the surface. Proposal [S]: blend the two baked tables on a local Froude number.
3. **Energy radiates away as waves.** No analogue except, loosely, dynamic inflow. This model produces no wave-making resistance, no wave drag due to side force, no radiation memory. A hook [S]: the strips already know the live source strength u·∂A/∂s per hull; feed a Havelock or Michell wave integral, or the wake patch solver, and take the reaction. This is the largest hole here.
4. **Air can reach the low-pressure side.** Proposal [S]: cap a strip's suction at ρgh, weighted by (1−X).

Other risks. X₀ for bluff hull sections has no validated geometric source; the fish models fit drag constants per robot and MuJoCo users refit five coefficients per robot, exactly the surrogate-per-boat disease. The X-weighted recovery term is mine, untested. The strip-direction choice is discontinuous in design space near aspect ratio 1. Lighthill's trailing-edge term is known to overpredict. Resistance upright at hull speed is not credibly covered at all without item 3.

## 7. Cheapest experiment

One day, a throwaway script: implement terms 1, 3, 4 only, for a body under a rigid lid, and compute steady side force and yaw moment against drift angle from 0° to 180° for two published captive-test cases: a Wigley or Series 60 hull at drift (the cases Park used) and a low-aspect flat plate (aspect 0.2 to 1). Pass if, with C_d and X₀ taken from section geometry by one rule and no per-hull tuning, force and centre of pressure land within 20% over the whole range and the 0° to 30° slope is right for both. Fail if the two bodies need different constants: then the reactive unification is a relabelled surrogate, and a lattice should own the potential part, keeping only the X state from this report.

## 8. Sources

- [Selig 2010, full-envelope RC/UAV aerodynamics in real time (AIAA 2010-7635)](https://m-selig.web.engr.illinois.edu/pubs/Selig-2010-AIAA-2010-7635-FullEnvelopeAeroSim.pdf), read in part
- [Khan, dynamics modelling of agile fixed-wing UAVs (McGill thesis)](https://escholarship.mcgill.ca/downloads/dj52w7317), read in part (chapter 3)
- [Ayancik and Mulleners 2021, generalising the Goman-Khrabrov dynamic stall model](https://arxiv.org/pdf/2110.08516), read in part
- [Zakharov (MAI, in Russian), longitudinal coefficients at high angle of attack with separated flow](https://mai.ru/upload/iblock/3c1/matematicheskaya-model-koeffitsientov-aerodinamicheskikh-kharakteristik-v-prodolnom-dvizhenii-letatelnogo-apparata-na-bolshikh-uglakh-ataki-s-uchyetom-otryvnogo-obtekaniya.pdf), read in part
- [OpenFAST unsteady aerodynamics theory (Øye, Hansen-Gaunaa-Madsen)](https://openfast.readthedocs.io/en/v4.0.5/source/user/aerodyn/theory_ua.html), read in part
- [Jorgensen 1973, NASA TN D-6996, bodies at 0° to 180°](https://ntrs.nasa.gov/citations/19730006261), abstract only
- [Boyer, Porez, Leroyer et al., fast dynamics of a 3D eel-like robot against Navier-Stokes](https://core.ac.uk/download/50616759.pdf), read in part
- [Eloy and Michelin, flow associated with Lighthill's elongated-body theory](https://arxiv.org/html/2409.20162v2), read in part
- [Zarnick 1978, nonlinear model of planing boat motions (DTNSRDC)](https://apps.dtic.mil/sti/pdfs/ADA052039.pdf), read in part
- [Cayon, Gaunaa, Schmehl 2023, fast aero-structural kite model with the vortex step method](https://research.tudelft.nl/files/149869036/energies_16_03061_v2.pdf), read in part
- [MuJoCo fluid forces, ellipsoid model](https://mujoco.readthedocs.io/en/3.3.1/computation/fluid.html), read in full
- [Simple Models, Real Swimming: digital twins for underwater robots (2026)](https://arxiv.org/html/2602.23283v1), read in part
- [Yoshimura et al., MARSIM 2009, unified low-speed manoeuvring model](https://eprints.lib.hokudai.ac.jp/repo/huscap/all/42969/MARSIM09(Yoshimura)auther.pdf), read in part
- [Park 2001, trailing vortices from a slender ship hull (Newcastle thesis)](https://dspace.ncl.ac.uk/jspui/handle/10443/895), abstract only
- [Simonis et al. (TUHH), 2D+t dynamic stability of a ship at high speed](https://tore.tuhh.de/bitstreams/4109c342-6415-46bb-8880-9207e8446d22/download), read in part

Not opened, used only as common knowledge: Pitt-Peters dynamic inflow, Polhamus-Lamar (via Khan), Candelier 2011 (via Eloy and Michelin).
