# B. Section momentum: the hull as a conveyor of water slices

Angle: slender-body, elongated-body and 2D+t theory. Labels used below: **[E]** established in the literature, **[I]** my inference from it, **[S]** speculation.

## 1. The idea

Cut the water into thin vertical slices lying across the boat's track. Each slice sees a hull section arrive, grow, change shape, shrink and leave. While the section is there it shoves that slice of water sideways and downwards, and the slice pushes back with a force equal to the rate at which its momentum changes. Add up all slices under the boat and you have the hydrodynamic force and moment. Leeway makes each slice get shoved sideways, and what the slice keeps after the keel has left is the side force. A flat stern pressing down on slices is planing lift. A bow dropping into a wave is a slam. A deep long keel grabs a lot of water per slice for a long time, a fin grabs it briefly, and a full-rigger's hull is the keel. Nothing in the rule knows what kind of boat it is; it only sees immersed section shapes and how fast they move relative to the water.

## 2. Formulation

### The one law

For a slice at station x, with all bodies' sections at that station unioned and cut at the local wave surface:

- `A(x,t)`: 2D added-mass tensor (sway, heave, roll) of the immersed section. **[E]**
- `w(x,t)`: section velocity in the slice plane minus the water's velocity there (wave orbital velocity plus what earlier sections left behind).
- `P(x,t) = A·w + P_shed`: the slice's fluid impulse, attached part plus shed part.

Force per unit length on the hull: `f = -DP/Dt`, with `D/Dt = ∂/∂t - U ∂/∂x` in body coordinates (U is the along-hull water speed, signed). This is Munk's and Jones's steady result, Lighthill's elongated-body law and Zarnick's planing strip law in one statement **[E]**. Expanding it gives:

| Term                                          | What it is                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `-A·∂w/∂t`                                    | added mass, following attitude and immersion automatically                   |
| `-(∂A/∂t)·w` with immersion changing          | von Karman and Wagner slamming                                               |
| `U·w·∂A/∂x`, lateral                          | Jones low-aspect lift, total `U·P_tail`; its first moment is the Munk moment |
| `U·∂(A₃₃w₃)/∂x`, vertical                     | dynamic lift and bow-up trim moment, momentum leaving at a dry transom       |
| x-weighted integrals with `w = v + r·x - p·z` | sway, yaw and roll damping (Y_r, N_r, N_v)                                   |

Hydrostatic and Froude-Krylov pressure are integrated over the same immersed section polygon, so buoyancy, righting moment and wave excitation use the section loop too.

### What a slice keeps: three closures

Pure potential slender theory hands all momentum back where the section shrinks (d'Alembert). The physics is in what is not handed back.

1. **Shedding rule.** Where the section shrinks in slice time (`dA < 0` along the flow), the impulse `-dA·w` is left in the water as `P_shed`, not recovered. For a sharp trailing edge this is Jones's Kutta argument **[E]**. For a round canoe body the shed fraction should fall towards zero (Allen and Perkins apply the potential term to the base area only) **[E]**. I propose one geometric sharpness measure per section (keel-edge or bilge radius over local draft) that sets both the shed fraction and the cross-flow drag coefficient below **[S]**. Because the rule keys on the sign of `dA` in slice time, it reverses by itself in sternway.
2. **Cross-flow growth.** The shed pair keeps being fed while the section drags sideways through the slice: `f_cf = -½ρ·C_D(s; shape)·h·|w|w`, where `s` is the slice's accumulated cross-travel over local draft and `C_D(s)` is the impulsive-start growth curve (the Allen-Perkins analogy) **[E]**. At small leeway s is small and the force is the near-linear lift above plus a quadratic vortex-lift term; lying ahull s is unbounded and C_D reaches the full bluff value. No stall weight, no speed threshold; the transition from lift to drag is a slice getting older.
3. **Uptake.** See fins below.

`P_shed` and `s` are fields advected along the hull at U (a conveyor on the station grid). A slice that passed the keel arrives at the rudder d/U seconds later still carrying its sidewash, so keel-rudder downwash and its lag are free.

Surge force is energy bookkeeping: drag equals energy left behind per metre of track. Induced drag is `|P_shed|²/(2A)` at the shedding section, which reproduces the classic effective-draft formula `D = L²/(πρU²T²)` for a mirrored hull **[I]** and makes effective draft fall with heel because A does. Friction is the ITTC line on each section's wetted girth at its local speed.

### Fins: where slenderness breaks

Slender theory says lift depends on span squared and not on chord. For the H-boat keel (effective aspect ratio about 3 with the hull mirror) that overpredicts the lift slope by about 40%, and for the rudder by about a factor of two (ratio of `πAR/2` to Helmbold's `2πAR/(2+√(4+AR²))`). The least foreign fix: lifting-line theory is also a statement about slice impulse (the Trefftz plane), differing only in how completely a short chord can fill a tall slice with momentum. So multiply the impulse a body imparts by an uptake factor `η = 4/(2+√(4+AR²))`, AR from each closed body's own span²/area (η is 0.99 for a full-rigger hull, about 0.97 for a Folkboat keel, 0.7 for a fin, 0.5 for a spade rudder) **[I]**. Two more things slender theory cannot know, both chordwise:

- **Loading limit.** Sectional loading saturates smoothly near the profile's C_Lmax (a Kirchhoff separation function with a lagged separation state, as in dynamic-stall models) **[E]**. Applied to every body alike, this stalls the rudder near 20° and the fin later, and never triggers on a long keel whose loading per chord is a fifth as large. Stall is then a consequence of aspect ratio, not a per-surface setting.
- **Circulation lag.** One uptake state per body relaxing over a few chords of travel (Wagner). At 1 m/s in a tack this is about a second for an H-boat keel and matters.

These three scalars per body are the foreign part. They are continuous in geometry, so a keel that is neither long nor fin gets intermediate behaviour.

### Waves the hull makes

2D+t proper cannot make transverse waves; Tulin and Wu call this its principal deficiency **[E]**, and transverse waves carry the resistance at Froude numbers 0.25 to 0.4 where both keelboats live. The fill uses the same slice quantities as far-field multipoles **[E for sources, I for the rest]**:

- slice area rate `U·dS/dx` is a source (Michell and slender-ship theory),
- slice lateral impulse is a horizontal dipole (wave drag due to side force, the term with no owner today),
- slice vertical impulse is a vertical dipole (wave drag of dynamic lift).

Wave resistance is the Havelock energy integral, over wave angle, of the Kochin function summed over sections. Sections are indexed along the track, so leeway does not create the spurious sources that made the hull chapter drop Michell. Two hulls enter with a lateral phase offset, so catamaran interference and its disappearance when a hull flies are geometry. A dry transom is a section whose area does not close, plus the hydrostatic deficit on the transom face.

Sanity check run for this report (Node, scratchpad): Michell integral from a 41-section Wigley stack gives C_w ×10³ of 1.1, 2.2, 1.3, 2.8, 4.5, 3.9 at Fn 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, the known hump-and-hollow curve, converged at 64 angles, 0.37 ms per evaluation unoptimised.

What this does not give is the near-field: sinkage and trim through hump speed come from the hull sitting in its own wave trough. Proposal **[S]**: each conveyor slice also carries a linear transverse free-surface state (a few dozen Cauchy-Poisson modes driven by the section's source), whose elevation at the hull side feeds the hydrostatic integral of later sections. This is linearised 2D+t and captures the divergent system that dominates above Fn 0.5. How to avoid counting divergent-wave drag twice (once through pressure, once through Kochin) is unresolved.

### State, step, precompute

State: rigid body; per station (about 40) `P_shed` (2), `s`, optional wave modes; per closed body two lag states. Roughly 200 to 400 doubles without wave modes.

Per step: cut sections at the wave surface; look up A; form w; advect the conveyor; apply the law and closures; integrate hydrostatics; evaluate the Kochin integral (can run at 10 to 20 Hz).

Precompute per hull: 2D boundary-element added-mass tensors per station over immersion and heel relative to the local surface (rigid-lid mirror for the horizontal modes, zero-potential surface for vertical impact, both standard limits **[E]**), plus the sharpness measure. A canting keel adds one table axis. Seconds to minutes.

Upgrade path: replace closures 1 and 2 with discrete vortices in each slice, as Fuwa (1973) and Park (2001) did for ships at drift **[E]**. It removes the sharpness parameter at the price of a separation criterion on round bilges.

## 3. The five boats

**H-boat.** A(x) is small along the canoe body and spikes at the fin and rudder. Lift is U times the impulse left by two short tall sections, scaled by η, limited by C_Lmax. The rudder sees slices the keel has already pushed, late by d/U. Low yaw added inertia and damping, so it pivots. Wrong or missing: fin lift accuracy rests on the Helmbold closure, and post-stall fin force rests on young-vortex C_D(s), which is unvalidated here.

**Folkboat.** A(x) grows steadily to the sternpost; every slice is loaded over metres of travel, η near 1, loading far below C_Lmax so it never stalls, it slides and cross-flow drag grows smoothly. Large `∫A x² dx` gives yaw inertia and damping. The rudder is the last part of the section run. Wrong: slender theory makes a trailing flap fully effective; real keel-hung rudders work in a thick wake and are weaker. This needs a boundary-layer deficit on the conveyor.

**Suomen Joutsen.** The hull is the only section: lift `½ρU²πT²α` at aspect ratio 0.1, so large leeway; a large unstabilised Munk moment; shed fraction at the deadwood and cross-flow growth along 96 m dominate at 10° of leeway. Huge sway and yaw added mass and lost way explain missing stays. Missing: form drag of a full hull and bow wave breaking; thin-ship wave theory is poor for full forms, though at Fn 0.2 waves are a minor share.

**Beach catamaran.** Two section stacks; flying a hull is A, hydrostatics and sources of one stack going to zero. Slender demihulls at Fn near 1 are the best case for both the momentum law and Michell. Boards and rudders are high-aspect, so they lean entirely on the fin closures. Missing: ventilation of surface-piercing foils, spray.

**Class40.** Wide flat aft sections have large vertical A; `U·∂(A₃₃w₃)/∂x` up to a dry transom gives dynamic lift and trim with no planing switch. Heeled, the sections are asymmetric and the law couples sway, roll and yaw, as in the oblique 2D+t planing work of Dashtimanesh and of Marleaux **[E]**. Surfing is Froude-Krylov plus orbital velocity in w. Wrong: Marleaux needs an empirical reduction function near the transom and still overpredicts lift by 13%; pile-up and spray are closures; hump-speed trim depends on the speculative slice wave.

## 4. Feel

- **Tack.** Side force is `U·P`, so as speed drops the impulse per slice needed for the same sail force rises as 1/U and leeway angle as 1/U². The H-boat's fins hit the loading limit if sheeted hard at low speed and then recover with the circulation lag; the Folkboat never stalls but carries more yaw inertia and turns slower while keeping way through momentum of boat plus entrained water. Rudder force arrives before the keel's changed sidewash reaches it.
- **Puff.** Heel changes A at once: effective draft drops, leeway rises, and weather helm emerges from heeled section asymmetry plus the Munk term.
- **Broach.** Stern sections lift out on a wave face, their A and the rudder's vanish from the sum, the remaining forward sections carry the Munk moment unopposed.
- **Sternway.** U changes sign, the conveyor runs backwards, shedding happens at the bow end, the rudder is the first section to load the slices.

## 5. Cost and determinism

Forty stations, a handful of bodies, table lookups and polygon clipping: tens of thousands of floating-point operations per step, well under a millisecond in TypeScript (estimate, not measured). The Kochin integral is at most 0.4 ms (measured). The discrete-vortex upgrade is perhaps 1 to 3 ms (guess). Everything is CPU arithmetic with `exp`, `sin`, `cos` from `core`; no GPU, so replays are bit-exact under the existing contract. Precompute is 2D boundary-element solves, about 20,000 small systems per hull, under a minute.

## 6. Where it breaks

- High-aspect fins are outside the theory; η, C_Lmax and the lag are imported lifting-surface knowledge. For the H-boat most of the side force therefore comes from the closures, not from the law. A critic can fairly say the fins need a lifting line and this model merely hosts it.
- The shed fraction on round sections is the one tunable I could not derive. If it must be tuned per boat the idea fails its own test.
- Near-field waves, sinkage and hump trim are speculative. Michell exaggerates humps and hollows and fails for full hulls.
- No radiation memory or wave damping (added mass uses the two frequency limits). No surge added mass from sections; it needs a small ellipsoid estimate.
- Blunt bows, short fat hulls and the stern region need end corrections. Form drag, spray, ventilation and Reynolds effects are absent.
- Letcher's result that free-surface corrections to side force are a few percent at low Froude number supports the rigid-lid mirror only there; at Fn above 0.4 it is unproven.

## 7. The cheapest experiment

One day, Node, no repo code. Implement the law with closures 1 to 3 and the Kochin sources on three section stacks: an H-boat-like fin hull, a long-keel hull of the same length, and a published drift-test hull (Series 60 or van der Kolk's wind-assist hulls). Check: (a) side-force slope, nonlinear growth to 20° drift and centre of lateral resistance against the tank data with one sharpness rule for all three; (b) effective draft of the fin hull against the Delft series value; (c) C_w against Delft residuary resistance at Fn 0.25 to 0.45; (d) a scripted tack for both keelboats, comparing turn time and speed lost. Kill it if (a) needs different shed fractions per hull, or if the centre of lateral resistance is off by more than a tenth of the length.

## 8. Sources

Opened through a summarising fetch, so none is "read in full".

- [Marleaux, Simonis, Abdel-Maksoud 2024, forced drift and yaw of planing hulls by numerical 2D+t](https://tore.tuhh.de/bitstreams/4b5e100d-1de4-404f-9b5c-62144d7f028f/download), read in part
- [Tulin and Wu 1997, Divergent bow waves (2D+t, misses transverse waves)](https://www.nationalacademies.org/read/5870/chapter/46), read in part
- [Milgram 1997, Hydrodynamics in advanced sailing design](https://www.nationalacademies.org/read/5870/chapter/45), read in part
- [Letcher 1966, Transverse hydrodynamic forces on slender bodies in free-surface flows at low speed (Caltech thesis)](https://thesis.library.caltech.edu/4512/1/Letcher_js_1966.pdf), read in part
- [van der Kolk et al. 2021, Low-aspect ratio appendages for wind-assisted ships](https://link.springer.com/article/10.1007/s00773-020-00777-8), read in part
- [Newman and Wu 1973, A generalized slender-body theory for fish-like forms](https://authors.library.caltech.edu/records/r5hvc-3j870), abstract only
- [Fuwa 1973, Hydrodynamic forces acting on a ship in oblique towing (Japanese)](https://www.jstage.jst.go.jp/article/jjasnaoe1968/1973/134/1973_134_135/_article/-char/ja), abstract only
- [Park 2001, Modelling trailing vortices from a slender ship hull for manoeuvring calculations (Newcastle thesis)](https://dspace.ncl.ac.uk/jspui/handle/10443/895), abstract only
- [Toxopeus 2006, Validation of slender-body method for linear manoeuvring coefficients](https://www.marin.nl/en/publications/validation-of-slender-body-method-for-prediction-of-linear-manoeuvring-coefficients-using-experiments-and-viscous-flow-calculations), abstract only
- [Dashtimanesh, Enshaei, Tavakoli, Oblique-asymmetric 2D+T model for sway, roll and yaw of planing hulls](https://figshare.utas.edu.au/articles/journal_contribution/Oblique-asymmetric_2D_T_model_to_compute_hydrodynamic_forces_and_moments_in_coupled_sway_roll_and_yaw_motions_of_planing_hulls/22973672), abstract only

Munk, Jones, Lighthill, Wagner, von Karman, Zarnick, Allen and Perkins, Helmbold, Michell and Kochin are used from textbook knowledge and were not opened. Searches were also made in Japanese, German and Russian; only the Japanese one returned usable material.
