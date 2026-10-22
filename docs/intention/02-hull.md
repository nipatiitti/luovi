# Hull hydrodynamics

Oct 22, 2026 · @Niilo

## Bottom line

There is no single formula that covers a dinghy, an H-boat, a 96 m full-rigger and a catamaran, but one architecture does: an MMG-style modular force sum where each module gets class-specific coefficients derived from the actual hull geometry. Coefficients come from published regressions wherever the hull sits inside a regression's family (most of the fleet does); offline CFD is a calibration step reserved for hull shapes no regression has seen. Every hull shares the same appendage, cross-flow, wave and wake modules.

Michell thin-ship theory is dropped from the leeway and wake paths: it assumes the hull is slender along the direction of motion, so any drift angle produces spurious source strengths and an oversold wake. It survives only as an optional upright resistance curve for very slender hulls with no other data.

## Force modules

```mermaid
flowchart LR
    subgraph hydro["Hydro (coefficients per hull class, structure shared)"]
        res["Hull resistance<br/>CFD surrogate or DSYHS/ORC"]
        lift["Hull + appendage lift<br/>VLM, weighted by stall"]
        cf["Cross-flow drag<br/>summed at every angle"]
        wave["Buoyancy + wave forces<br/>panel method on the 2D field"]
    end
    rb["6-DOF rigid body<br/>6x6 added mass<br/>non-lifting damping, Munk<br/>per hull, or per demihull<br/>60 Hz fixed tick"]
    subgraph env["Environment"]
        aero["Aero (sails, rig, hull)<br/>see Aero"]
        wake["Wake pressure patch<br/>reaction from the patch solver"]
        mass["Moving mass<br/>deck water, crew"]
        prop["Propeller, tug, mooring<br/>optional per boat"]
    end
    res --> rb
    lift --> rb
    cf --> rb
    wave --> rb
    aero --> rb
    wake --> rb
    mass --> rb
    prop --> rb
    style rb stroke-width:3px
```

Eight force modules sum into one rigid body.

Each module returns a force and moment in the body frame; the rigid body sees only the sum. Lift and cross-flow drag are both summed at every angle; a per-surface stall weight on the local inflow angle moves the share between them, and there is no speed threshold (ADR 0007).

## Resistance: regressions first, geometry at heel, CFD only where they fail

Upright resistance versus speed comes from the regression whose family the hull belongs to. The hydrostatics that regression needs (waterline length, displacement, wetted area, prismatic and midship coefficients) are the load condition's rest hydrostatics, computed once at load from the baked section stacks; recomputing them at the current heel, trim and sinkage every tick would double-count the heel the regression already corrects for (ADR 0006). Only the friction wetted area follows the attitude.

| Hull family                                          | Regression                                                                                           | Why it fits                                                                                                                                                                                                                                                           | Example boats                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Merchant-type displacement hulls, L/B 5–9, Fn < 0.35 | Holtrop–Mennen for resistance; Kijima/Inoue for sway–yaw derivatives                                 | Built on exactly this population of steel cargo hulls                                                                                                                                                                                                                 | Suomen Joutsen (1902 cargo hull)  |
| Traditional wooden workboats, full keel, L/B 4–5     | Holtrop–Mennen (marginal at low L/B but usable); Kijima; cross-flow drag                             | Low Froude, modest heel, hull itself is the lifting body                                                                                                                                                                                                              | Linden, Svanhild                  |
| Classic and modern fin-keel yachts                   | DSYHS (Keuning & Katgert 2008) with heel correction; ORC VPP residuary model                         | Hull sits inside the series                                                                                                                                                                                                                                           | H-boat and most procedural yachts |
| Long-keel classics with overhangs                    | DSYHS with effective-at-heel hydrostatics; keel treated as part of the hull                          | Regressions never saw an integral keel, and a hull whose sailing length grows when heeled (a J-Class with long overhangs) needs effective-at-heel hydrostatics the DSYHS form does not take; the Wolfson Unit J-Class VPP work shows standard VPPs need reformulation | J-Class                           |
| Wide, flat, planing maxis, Fn to 0.9                 | ORC 2013 LVR/BTR model for displacement speeds; Savitsky-type dynamic lift blended in above Fn ≈ 0.5 | Beyond DSYHS range and family; dynamic trim and planing lift dominate                                                                                                                                                                                                 | Volvo Open 70                     |

Where a hull leaves every regression's family, run offline CFD (OpenFOAM) to calibrate: a handful of heeled free-surface runs for the long-keel classic, about twenty speed × heel runs to set the planing blend for the maxi, and nothing for the rest of the fleet. The split is cheap because free surface matters only for resistance versus speed; the drift problem is calibrated with double-body runs or, usually, not at all (see Side force). The budget is set when a v2 hull needs calibration; Levin and Larsson 2017's 30 hours on 100 cores per equilibrium point is the scale of a full free-surface run, which is why a full grid of 60–100 points is never needed.

Viscous resistance is ITTC-57 friction under the regression family's own convention (for DSYHS, Reynolds number on 0.7 LWL and form factor 1), with the wetted area from the geometry at the current heel and sinkage; there is no free-standing form factor (ADR 0006). Resistance is evaluated for both surge directions so sternway is drag-limited, never undefined; the residuary table is read on |Fn|. Added resistance in waves comes from the panel method, not from a regression.

## Side force: lift at small drift, cross-flow drag at large

Side force, yaw moment and induced drag at leeway are a lifting-body problem. Solve it live with a vortex-lattice method (VLM) on the submerged hull, keel and rudder: about 150 panels per lattice on the H-boat, mirrored at the free surface with a rigid-wall image at every Froude number plus Slooff's per-strip pressure relief (κ about 1.5), which also lowers the centre of lateral resistance (ADR 0007). Geometry is rigid, so the influence matrix is inverted once at load, per heel bin, to produce about 30 basis solutions and then dropped; the per-tick solve is a weighted sum of those bases. Heel-induced side force comes from building the carried-over lattice on the heeled mid-surface of each heel bin, and keel–rudder upwash and rudder behaviour in the keel wake come at the same price. The same solver covers every keel topology without special cases: a fin keel and spade rudder (H-boat), a low-aspect keel integral with the hull (J-Class, the schooners, where the hull itself is the lifting surface), and a canting keel with daggerboards and twin rudders (Volvo Open 70), where the keel is simply a lifting body at its own cant angle and the windward rudder's panels lose weight as they lift clear of the water.

Cross-flow drag is always present alongside the lift, with no drift or speed threshold (ADR 0007). The hull module integrates ½ρ·C\_D(x)·T(x)·|v\_n|·v\_n over the union of hull and non-lifting appendage sections, with T(x) the local submerged section height, C\_D from section shape and the 0.52 finite-length factor, in the strip form Obokata 1987 gives. The linear manoeuvring derivatives (Y\_v, N\_v, Y\_r, N\_r) are derived from the VLM basis at load, so a separate derivative term never duplicates the VLM's lift; Kijima regressions are the fallback for a hull with no VLM-derived source. Beyond stall a cited C\_N(α) appendage polar over 0 to 90° carries a fin's force, because the v\_n² plate law gives a quarter to a half of the measured normal force between stall and 40 to 55°.

The stall weight is the one place to tune carefully: per surface, on the local inflow angle, with onset and end set by aspect ratio (rudder about 20°, keel beyond 30°), smooth enough that the handoff is invisible when a boat stalls out of a tack or gathers sternway (ADR 0007).

## Rigid body, buoyancy and damping

Six-DOF rigid body per boat with an explicit 6×6 added-mass matrix (sway and roll added mass are large for keeled hulls, largest for a long-keel classic) and roll, pitch and yaw damping terms for the non-lifting remainder; the VLM supplies the lift part of the damping from p, q and r in its right-hand side, and the Munk yaw moment is the Kirchhoff term of the 6×6 added mass, owned by the rigid body and by nothing else (ADR 0007). Without these the drift onset is too snappy and heel overshoots on every gust. Righting moment is never a coefficient: it comes from the panel buoyancy against the mass distribution, so a canted keel bulb, pumped water ballast or crew on the rail change stability by moving mass, nothing else.

Buoyancy and wave excitation come from the panel method defined in the ocean tab: hydrostatic plus Froude–Krylov pressure on each submerged panel using the sampled local surface height, orbital velocity in the relative-velocity term, and slamming impulses at panel entry; orbital velocity also enters the VLM right-hand side, with a two-state Wagner and Küssner lag per lifting surface (ADR 0007). The calm-water CFD surrogate never sees waves; wave forces are always added by the panel method so the two do not double-count.

Moving mass from the deck shallow-water sim, crew positions, water ballast and a canting keel is added to the rigid body each tick.

## Wake

The wake source is the hull's hydrostatic pressure footprint (the Yao, Bingham & Zhang moving-pressure model), rasterised from the actual submerged shape each tick and applied to the dispersive patch solver as a forcing term advected along the hull's true velocity vector. The footprint rotates with the hull, so leeway, heel and sternway all produce the right pattern, and the same array feeds buoyancy. The Kelvin feather pattern and its narrowing at high Froude number come from the dispersive solver, not from a separate wake model.

## Multihulls

Every module above is per-hull, so a catamaran is two hull modules plus their interference. Resistance: a CFD surrogate of the full platform where it matters, otherwise a demihull resistance with Insel–Molland wave and viscous interference factors as functions of separation and Fn. Side force: VLM panels on both hulls and all appendages. Flying a hull is just one hull's buoyancy and wetted area going to zero in the panel method. Cross-flow drag integrates over both hulls independently.

## Emergent cases

All three are emergent if the modules below are present; none is scripted.

| Case                                          | Dominant modules                                                                                                                                                                                                                                                                                          | What must be true                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Lying ahull, drifting sideways from rest      | Cross-flow drag on hull, keel and rudder; sway added mass; aero side force                                                                                                                                                                                                                                | VLM weight is zero by inflow angle at pure sway, not by speed (ADR 0007); drift settles at roughly 0.5–1.5 kn with a little heel |
| Sternway (box-hauling, backing off a mooring) | Resistance table with negative surge; VLM on the reversed lattice with the Kutta condition on the leading edge, and cross-flow using the true inflow vector (ADR 0007); ±180° sail polars                                                                                                                 | Rudder lift and turning sense reverse automatically; wake advects bow-first                                                      |
| Broaching on a following sea                  | Panel buoyancy + Froude–Krylov (wave slope and orbital velocity); heel axis in the surrogate or heeled VLM geometry; rudder panels de-weighted by submergence and the appendage polar beyond stall, no branch (ADR 0007); roll damping and roll–yaw coupling; spinnaker heeling moment from the cloth sim | Surrogate covers β to \~40° and heel to \~45°, or hands off cleanly to cross-flow drag                                           |

The sequence a broach should produce: stern lifts on the wave face → rudder bite drops → heel builds from the spinnaker → heel-induced yaw adds to the wave yaw moment → round-up.

## Validation targets

- H-boat: two benchmarks against the ORC 2026 certificates (ADR 0010). Main and jib against the non-spinnaker certificate at ten points (VMG upwind and downwind, speeds at 60°, 90°, 120° TWA at 8 and 16 kn true) within 5% gates build step 3; spinnaker against the club certificate at the four spinnaker points follows, since three of the six fixed-angle points are spinnaker points. A miss is reviewed as a whole before anything moves, and a tolerance change is a map decision, never a tuning step.
- Suomen Joutsen: historical loggings (best around 14 kn, poor pointing); tacking fails without backing the headsails and succeeds with them.
- Sternway test: head to wind, yards braced square or jib backed, 1–2 kn astern with reversed rudder sense.
- Drift test: ahull in 20 kn, drift speed and heel against known values for the class.
- Volvo Open 70: 20+ kn reaching and 30+ kn surfing downwind in 25–30 kn true, with the planing blend calibrated so the speed–wind curve matches published race polars within \~10%; J-Class: heeled sailing length and speed against the J-Class Association VPP ratings. Where CFD calibration is run, its upright curve must agree with the regression within \~10% inside the regression's own range.

Sources:

- [Keuning & Katgert 2008, RINA Lorient, DSYHS bare hull resistance extended to higher speeds](https://research.tudelft.nl/en/publications/a-bare-hull-resistance-prediction-method-derived-from-the-results)
- [Keuning & Sonnenberg 1998, TU Delft report 1175-P, hydrodynamic forces on a sailing yacht from the DSYHS](https://research.tudelft.nl/en/publications/approximation-of-the-hydrodynamic-forces-on-a-sailing-yacht-based/)
- [TU Delft 2016, new systematic yacht series and regressions](https://repository.tudelft.nl/file/File_b89cddac-c130-429c-9b24-b71e453a1061)
- [Data-driven models beyond DSYHS, IEEE Access 2024](https://doaj.org/article/04405607232a44288e378d40243ba492)
- [ORC VPP Documentation 2023](https://orc2.orc.org/rules/ORC%20VPP%20Documentation%202023.pdf)
- [Obokata 1987, the cross-flow strip form (J-STAGE)](https://www.jstage.jst.go.jp/article/jjasnaoe1968/1987/161/1987_161_183/_pdf)
- [Masuyama et al. 1993, full-scale sea test of an ocean cruising yacht, Part 2: manoeuvrability and tacking (J-STAGE)](https://www.jstage.jst.go.jp/article/jjasnaoe1968/1993/174/1993_174_377/_pdf)
- [Masuyama & Fukasawa 2011, tacking simulation of sailing yachts (J. Sailboat Technology)](http://higherlogicdownload.s3.amazonaws.com/SNAME/1516f098-2760-4bff-86fa-9ca63a85f102/UploadedImages/2011-01.pdf)
- [Slooff 2015, The Aero- and Hydromechanics of Keel Yachts (free-surface image, pressure relief, wave drag due to side force)](https://doi.org/10.1007/978-3-319-13275-4)
- Hoerner 1965, Fluid-Dynamic Drag (appendage normal-force polars beyond stall)
- [Lindstrand Levin & Larsson 2017, coupled CFD and 6-DOF rigid body dynamics for sailing yacht performance (Ocean Engineering)](https://doi.org/10.1016/j.oceaneng.2017.09.052)
- [Insel & Molland, resistance components of catamarans](https://eprints.soton.ac.uk/462776/1/457354.pdf)
- [ELIGMOS, MMG-based time-domain manoeuvring](https://strathprints.strath.ac.uk/58361/1/Pollalis_etal_MSO2016_ELIGMOS_time_domain_simulation_of_the_maneuvering_of_ships.pdf)
- [Static vs dynamic pressure distribution for ship waves, Yao, Bingham & Zhang 2024](https://orbit.dtu.dk/en/publications/the-influence-of-static-versus-dynamic-pressure-distribution-stra/)
- [Kerner, water interaction model for boats (panel buoyancy)](https://gamedeveloper.com/programming/water-interaction-model-for-boats-in-video-games)
