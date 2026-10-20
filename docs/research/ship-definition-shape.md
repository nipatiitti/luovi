# Ship definition shape from the H-boat and Suomen Joutsen models

Research for issue #2, 2026-10-20. Question: what the hull, aero and rigging force models need from a ship definition, what the two parametric models already carry, and one hull geometry representation and one ship definition structure that both models fit without loss.

## Answer in brief

- **Hull geometry: a section stack.** Each closed body (canoe body, keel fin, stub, skeg, rudder, cabin trunk, flooding void) is an ordered list of transverse sections, each a polyline of body-frame points from the bottom centreline to the top centreline. The authored form keeps every printed point with its provenance. The compiled form uses the same type with an equal point count on every section. That makes it a closed, outward-wound triangle mesh by construction, and it keeps the station structure that the sectional-area, cross-flow and lattice calculations need.
- **Lofting is a build step in `data-*`, never a runtime step.** The H-boat lofts by girth and the Joutsen by fixed heights. Each data package runs its own loft rule offline and commits the compiled stack, so `sim-hull` reads one format and never evaluates a spline.
- **Ship definition structure:** `hull` (section stacks), `liftingSurfaces` (chord stacks plus a hull-as-lifting-body flag), `hydro` (regression family and cited coefficients, added mass, damping, VLM build settings), `mass` (items and load conditions), `rig` (spars, named points, joints, standing and running constraints), `sails` (outline, attachments, sail-class reference to a sail polar, cloth constants) and `controls` (endpoint, unit, range, rate limit). §3.2 has the sketch.
- **Main trade-off.** The compiled stack is a resampling. It reproduces each model's own loft to resampling error, not bit for bit, and it fixes the physics resolution at build time. In return the per-tick hydrostatics are one clip-and-sum pass over about 2,000 to 3,000 triangles. On a synthetic stack that costs about 55 µs (§3.4), well inside the 1 ms hero budget. The H-boat's default 23,000-triangle body set would cost about 0.4 ms.
- **Neither model carries a performance polar of its own.** The H-boat model cites the ORC 2020 One Design certificate, and that certificate's appendix holds a full ORC VPP speed table, reproduced in §4.1. The Joutsen package has only anecdotal and newspaper speed records, its own simulated polar, and an unsourced "Jean Bart reference" column (§4.2).

## What was read

- Repo: `AGENTS.md`, `GLOSSARY.md` and `docs/adr/0001` to `0003` (present in the main checkout, not yet committed on `main`), `docs/agents/domain.md` (on `main`), and `docs/intention/00` to `05`.
- H-boat Model artifact (https://claude.ai/artifact/8GXU2RTYXeE4CezLk3YRGb, version 1792502085-f25d): the page in full, plus `data/sources.json`, `docs/*.md`, `model/hboat.json`, `model/derived.json` and the generators `src/hboat/{model,hull,sections,mesh,hydro,foil,appendages,rig}.ts`. The data modules `src/hboat/data/*.ts` and `srcdata/*.json` were read through their JSON export, `model/hboat.json`, which is built from them. Not opened: `dist/hboat.js` (a bundle of the same sources), `tools/build-page.ts`, the page's viewer script and stylesheet, and the two generated SVG drawings.
- Suomen Joutsen Model artifact (https://claude.ai/artifact/9FTdgjTnVcs5ftNkPfzri6, version 1792499113-7093): the page in full, plus `README.md`, `model/*.json`, `data/hull-verified.json`, `src/ship/{schema,hull,aero}.ts` and `docs/{auvinen-2026,m11-mass,m1-physics,m1-aero,physics-accuracy}.md`. The remaining docs and data files were searched, not read line by line. Not opened: the 43 scan images in `plans/` (catalogued from their provenance records instead), the `*.test.ts` files and `preview/lines-plan.svg`.
- External: the ORC Club One Design certificate H-boat 2020 (https://data.orc.org/public/od/2020/hboat.od.pdf), both pages viewed.

Citations use the form [H-boat: section or file], [Joutsen: section or file] and [design doc: chapter].

## 1. What the force models need from a ship definition

| Force model | What it needs from the definition | When it is consumed | Source |
| --- | --- | --- | --- |
| Hydrostatics at heel, the input to the resistance regression | Closed geometry of the canoe body, separate from the appendages, so that LWL, BWL, draft, displacement, wetted area, LCB, LCF, waterplane area and the prismatic and midship coefficients can be recomputed at the current heel, trim and sinkage. Cp and Cm need the sectional area curve, so station structure is needed. | Every tick | [design doc: 02-hull, Resistance] |
| Resistance regression | The family id (DSYHS for the H-boat, Holtrop-Mennen for Joutsen) and its coefficient set with a citation. Form factor, ITTC-57 friction and the roughness allowance. Both surge directions. | Coefficients at load, evaluation every tick | [design doc: 02-hull, Resistance], [AGENTS.md: no magic coefficients] |
| Panel buoyancy and Froude-Krylov (Kerner) | A closed, outward-wound triangle set covering every buoyant body, with a sign for voids that flood. Per panel: centroid, area and normal. The same submerged set rasterises the wake pressure footprint. | Every tick | [design doc: 01-ocean, Physics coupling], [design doc: 02-hull, Rigid body and Wake] |
| VLM side force | Lifting surfaces: the keel fin and rudder as planforms (leading and trailing edge per span station), plus the submerged hull as a lifting body for integral keels (Joutsen, the schooners). Movable surfaces need a pivot axis. Heel bins for the precomputed inverse, and a free-surface image rule by Froude number. | Lattice and inverse offline per heel bin, matrix-vector product every tick | [design doc: 02-hull, Side force] |
| Cross-flow drag (Hooft and Obokata) | Hull sections, so that C_D(x) can come from section shape. Linear manoeuvring derivatives Y_v, N_v, Y_r and N_r from Kijima or a CFD grid. | Every tick, below about 0.3 kn or beyond 15 to 20 degrees of drift | [design doc: 02-hull, Side force] |
| 6-DOF rigid body | Mass, CG and inertia tensor from a mass distribution. Movable masses (crew, water ballast, canting keel, flooding) as separate items. A 6x6 added-mass matrix, plus roll, pitch and yaw damping. The righting moment is never a coefficient. | At load, and movable items every tick | [design doc: 02-hull, Rigid body] |
| Sail aero (cloth with per-triangle sail polar) | Per sail: outline and corners, the sail class (which selects the sail polar over the full plus and minus 180 degrees), areal mass, cloth stiffness and damping, bolt-rope and leech-line stiffness, battens, mesh resolution, and the rig constraint each corner attaches to. The flying shape is needed offline to generate the attached-flow part of the sail polar by VLM. | Sail polar offline, cloth every tick | [design doc: 03-aero, Sails and Rig classes] |
| Sail interaction | Sail order and spacing, plus the sail-hull term (Fujiwara). Geometry only. | Every tick | [design doc: 03-aero, Sail interaction] |
| Rig (XPBD constraint graph) | Spars as rigid bodies, or Cosserat chains for yacht masts and gaffs (bending stiffness, segments). Named attach points on spars and hull. Joints: parrel or truss of yard to mast, gooseneck, heel. Standing rigging: stiffness EA, pretension, optional break load. Running rigging: an ordered path through fairleads and blocks, zero compressive stiffness, purchase, and optionally capstan friction at the lead. | Every tick | [design doc: 04-rigging] |
| Windage of hull and rig | Spar and line diameters and lengths, hull topsides. Derivable from the above. | Every tick | [design doc: 02-hull, Force modules ("Aero (sails, rig, hull)")] |
| Controls | Named endpoints: rudder angle, each sheet, brace and halyard target length, cant angle and ballast. Each with a unit, a range and a rate limit. A tallship order is a bundle of these with an execution time. | Every tick | [design doc: 05-separation-of-concerns, Contracts], [design doc: 00-overview, Crew and control] |

Frame rule: SI, radians, world z up, body x forward, y port, z up. Heel is positive to starboard. Conversion happens at the boundary, never inside a model [AGENTS.md: Units and frames].

## 2. What each model contains

### 2.1 H-boat Model

- **Frames and units.** SI. The body origin is at station 5 on KVL, the construction waterline. +x forward, +y up, +z starboard (right-handed, glTF style). Heel is positive starboard down, trim positive bow down, rudder positive trailing edge to port. Every object carries a `_src` provenance map flagged p (printed), m (measured on a scan), t (tuning guide), e (estimate) or d (derived) [H-boat: Frames and units; docs/decisions.md D1].
- **Hull.** The printed table of offsets from plan A.1.2 (12.8.1974), kept verbatim: 26 stations by 22 columns. That is half-breadths at 10 waterlines, 3 buttocks, 4 diagonals (their lines re-derived on the scan, D2), sheer height, centreline deck height and the keel line with stacked lower values [H-boat: Hull; model/hboat.json `hull.offsets`]. `sections.ts` turns every printed cell on a station into a point of that station's section, tagged keel, waterline, buttock, diagonal or sheer. The loft is a centripetal Catmull-Rom curve per section, resampled by normalised girth, with monotone cubics in x for each girth sample [H-boat: src/hboat/sections.ts, hull.ts]. The stem profile is a 7-point polyline. The transom is a retroussé plane at 25 degrees that cuts the extended stations (D4).
- **Appendages.** The iron keel below VL8 (D5) is a foil spec: chords as leading and trailing edge per height, the printed root thickness distribution, thickness scaled linearly with depth, nose radius, square trailing edge and flat bottom. Derived: volume 0.1026 m³, centroid, inertia, and lateral area 0.898 m² [H-boat: Appendages]. The stub and fillet are GRP hull moulding taken from the offsets' extra columns (D6). The skeg is a section stack. The rudder has its planform from A.3.3, a vertical stock at station ½, a NACA four-digit thickness form scaled to the printed maximum (D9), and pre-1972 and post-1972 variants. Each body is a separate closed mesh, so **the canoe body alone is available for the resistance regressions** (D6).
- **Rig.** Mast 116 by 80 mm with I_fore-aft 1.3e-6 m⁴, I_athwart 6.6e-7 m⁴ and E 70 GPa. These are scaled from a Seldén section and flagged as estimates. The model also carries the taper, the measurement bands, named attach points on the mast (forestay tang, upper and lower tangs, spreader roots, sheaves, gooseneck, backstay crane) and swinging spreaders with stops at 5 degrees forward and 35 degrees aft [H-boat: Rig; model/hboat.json `rig.spars`]. Standing wire properties: 4 mm 1x19 with MBL 13 kN, metal area 9.6e-6 m² and E_eff 130 GPa; the 3 mm backstay likewise. Pretension presets for five wind ranges (Fritz Segel) and three (North Sails) are given in **Loos PT-1M gauge units with no conversion to newtons** [H-boat: `rig.standing_rigging`]. Running rigging: 14 lines with diameter, purchase and a path of named points [H-boat: `rig.running_rigging`]. The rake is solved from the forestay length. `RIG_PARAM_RANGES` bounds every tuning parameter by its class rule [H-boat: src/hboat/rig.ts].
- **Sails.** Main and jib at the class maxima in the measurement pose. The main outline comes from the rule girths, with four battens; the jib is a triangle without roach. The spinnaker is its flat measurement layout. Areal mass is given as class minimum and default (main 200 and 270 g/m², jib 200 and 250, spinnaker 35 and 40), the defaults flagged estimates. `shape_defaults` holds camber and draft position at four heights as estimates, with twist targets from the tuning guides [H-boat: docs/rig.md, Sails; D11]. There is no sail polar and no cloth stiffness.
- **Deck.** Cabin trunk, cockpit well (a void that floods), coamings, toe rail, 15 fittings, bulkheads, floors and keel bolts [H-boat: Deck and structure].
- **Mass.** 26 items, each with mass, CG, radii of gyration and a flag. The keel, rudder, spars and wires come from geometry. Laminate masses come from the schedule over the lofted areas. Interior and fittings are estimates at plus or minus 30 %. Corrector lead brings the total to the class minimum of 1450 kg (D10). The inertia tensor about the CG is in `model/derived.json`. There are five crew presets with per-person positions [H-boat: Mass; `massBudget`, `crew.presets`].
- **Hydrostatics.** `submerged(bodies, attitude)` clips every triangle of every closed body against the inclined water plane and sums signed tetrahedra. It returns volume, centre of buoyancy, wetted area, waterplane area and centroid, waterline x extent, half beam and draft. `equilibrium` solves free trim, and `gzCurve` gives the righting-arm curve [H-boat: src/hboat/mesh.ts, hydro.ts]. A separate `hullHydrostatics(loft, attitude)` slices the canoe body into 240 sections, which gives sectional areas [H-boat: src/hboat/hull.ts]. At the default resolution the bodies total about 23,000 triangles, 16,800 of them in the hull [H-boat: model/derived.json `meshes`].
- **Open items.** LOA is 34 mm short of the class figure. The chainplate assignment is open. Immersion is 2 % low against ORC. Interior masses are estimates, so VCG sits 0.143 m below the waterline against ORC's 0.120. Sail camber and flying shapes are not modelled [H-boat: Open items].
- **Sources.** Eleven class plans with URLs and sha256, the 2022 and 2007 class rules, the ORC certificates and three tuning sources [H-boat: data/sources.json]. Listed in §4.1.

### 2.2 Suomen Joutsen Model

- **Frames and units.** SI. Angles in the description are in degrees; the runtime takes radians. The body origin is midships (station 6) on the 1937 design waterline. +X forward, +Y up, +Z starboard. A load condition moves the still water, never the frame. Positive brace means the starboard yardarms go aft, with a limit of 56 degrees [Joutsen: Frames and units]. Per-cell flags are m, e or d, and per-sail confidence is h, m or l [Joutsen: src/ship/schema.ts].
- **Hull.** An offsets grid with 20 stations (including pseudo-stations at the taffrail, the overhang and the stem head) by 17 fixed heights above the moulded base, from the 1937 lines plan FMV467:48. 135 of the 340 cells are measured; the rest are estimates or derived values. A profile of bottom, rail and deck polylines, a bar keel of 0.275 by 0.1 m, the bulwark thickness and the deck camber complete it [Joutsen: Hull; data/hull-verified.json]. The loft runs a monotone cubic along x at each height, then a second one through the heights: z(x, h) [Joutsen: src/ship/hull.ts `hullSurface`]. Two meshes come out of it: a visual loft, and a 1,588-triangle closed **proxy** whose rows are 0.4 m apart in a band 2 m either side of the load waterlines [Joutsen: hull.ts `proxyRows`; model/derived.json `proxyMesh`]. `submergedVolume` clips against a level plane only, `y <= waterY`; heel is handled in the separate tallship physics code, which is not in the package [Joutsen: hull.ts]. The verification notes that the bottom rows are ambiguous by about 0.04 m in height, which means 0.15 to 0.4 m in half-breadth on the flat floor [Joutsen: data/hull-verified.json, offsets provenance].
- **Rudder.** An unbalanced blade on the sternpost: stock x and rake, a chord table against Y, 7.3 m² in total and 5.7 m² immersed. The 35 degree maximum angle is assumed and flagged [Joutsen: Hull; schema.ts `RudderDef`]. There is no thickness form.
- **Rig.** A grammar of point references (`hull.chan.F.3.s`, `M.LT.arm.p`, `M.C.clew.s` and so on), resolved by the compiler [Joutsen: schema.ts `PointRef`]. Three masts with sections, yards (with lowered heights for hoisting yards, brace leads and limits), the bowsprit with dolphin striker, the spanker boom and the signal gaff. Standing rules generate shrouds, futtocks, backstays and stays. Running rigging comes from gear presets per sail type: a list of [function, ...point refs] per line. The result is 481 compiled lines in 17 functions, 15 stays and 18 ratline sets [Joutsen: Rig; model/derived.json `rig`]. Diameters, materials and wire gauges are era assumptions [Joutsen: Open items]. There is no stiffness, pretension or block friction.
- **Sails.** 29 sails: 17 square, 4 headsails, 7 staysails and 1 jib-headed spanker. Each has head width, foot, depth, foot roach, reef bands, area from the album, a single design camber value and a confidence [Joutsen: Sails; schema.ts `SquareSail`, `StaySail`, `GaffSail`]. Canvas is taken as 1.2 kg/m² for mass [Joutsen: docs/m11-mass.md]. The 1939 inventory gives cloth length and canvas number per sail, not g/m² [Joutsen: docs/verify-sails-rudder-deck.md §2.3]. `sailAeroInputs` gives each sail as one flat panel with its centre of effort, chord, span and normal. The coefficient tables `SQUARE_TABLE` and `STAYSAIL_TABLE` live in the tallship physics code, which is not published here [Joutsen: src/ship/aero.ts; docs/m1-aero.md].
- **Deck.** 39 fittings as footprints with heights. Helm: a double wheel 1.5 m in diameter, 3 turns lock to lock (a render choice) [Joutsen: Deck].
- **Sailing and stability facts.** Top speed 17 kn (eyewitness officer) against 16.5 kn in the literature. GM 0.699 m determined 11 September 1948, condition not stated. Best point of sail a broad reach, about TWA 135. Heel to about 45 degrees. Poor to windward [Joutsen: Sailing characteristics; docs/auvinen-2026.md].
- **Derived.** For each of the two load conditions: displacement from the loft, CB 0.640, CM 0.883 and CWP 0.825, wetted area 1,373 m², lateral area 400 m², KB, KM and KG, where **KG is set to KM minus GM** [Joutsen: Derived quantities; docs/m1-physics.md §2.1]. Rig mass is 78.3 t by group, with second moments [Joutsen: `rigMass`]. Rig windage C_D·A is given [Joutsen: `rigWindage`]. Clarke manoeuvring derivatives and a Holtrop-derived residuary table `crFn` with form factor 1.230 are included [Joutsen: model/derived.json `manoeuvring`]. The `physicsParams` block also carries added-mass fractions and tuned knobs such as `munkFactor`, `clrShiftAft`, `crossflowCd` 0.5, `rollQuad`, `rigEffClose` and `blanketK`, plus the rates: rudder 7 deg/s, brace 4 deg/s, sheet 10 deg/s and set 0.1 per second [Joutsen: `conditions.school1932.physicsParams`].
- **Runtime state in the schema.** `SailState { set, fill }`, where `fill` runs from minus 1 (aback) through 0 (luffing) to 1 (full) [Joutsen: schema.ts `SailState`].
- **Mass.** There is no itemised hull mass. Total mass is the loft displacement at the condition draught, and KG comes from KM minus GM. The roll radius of the hull alone is chosen as 0.38 B with no source [Joutsen: docs/m11-mass.md].
- **Sources.** Every drawing comes from Forum Marinum via Finna under the Public Domain Mark, with sha256. Newspaper, archive and literature records are kept with ids and links [Joutsen: Sources; docs/physics-accuracy.md §2]. Listed in §4.2.

### 2.3 Coverage against the needs

| Need (§1) | H-boat | Suomen Joutsen |
| --- | --- | --- |
| Canoe-body geometry for hydrostatics at heel | **Satisfied.** The canoe body is a separate closed body. Heeled, trimmed clipping with free trim exists. Sectional areas are available. It is too dense for a per-tick budget at the default resolution. | **Partial.** The surface is complete and a closed proxy exists, but its clipping in the package is level-plane only. The bar keel is part of the hull, which suits a Holtrop-family hull. |
| Resistance family and coefficients | **Lacks.** DSYHS is not in the model. The canoe-body inputs can be computed but are not exported. | **Partial.** CB, CM, CWP, lcb%, form factor and a residuary table derived by Holtrop, but the regression code and its coefficients are not published. |
| Panel buoyancy mesh with flooding voids | **Satisfied.** Closed bodies, with the cockpit well at sign minus 1. | **Satisfied.** The 1,588-triangle proxy. There are no voids or downflooding openings. |
| VLM lifting surfaces | **Satisfied for the fins.** The keel and rudder chord stacks with thickness. The rudder pivot is the stock axis. The skeg is a low-aspect body. | **Partial.** Rudder chord table and stock. Hull as lifting body: the lateral area and profile exist. No thickness on the rudder. |
| Cross-flow sections and manoeuvring derivatives | **Partial.** Sections yes; derivatives no. | **Partial.** Sections from the grid. Clarke derivatives, where the design doc names Kijima. One `crossflowCd` 0.5, below Tanaka and Kijima's 0.8 to 1.1 per its own review [Joutsen: docs/physics-accuracy.md H1]. |
| Mass distribution | **Satisfied.** 26 items with CG and radii, plus crew presets. | **Partial.** Rig itemised by group. The hull is a lump with KG from GM and an unsourced roll radius. |
| Added mass 6x6 and damping | **Lacks.** | **Partial.** Diagonal fractions and Clarke dot terms, tuned. Roll damping is tuned. |
| Spars and attach points | **Satisfied.** Named points, mast EI (estimate), spreaders with stops, boom. | **Satisfied for topology.** Spar diameters and materials are estimates. |
| Standing rigging constraints | **Partial.** EA and MBL are given, but pretension is only in gauge units. | **Partial.** Topology only: no EA, pretension or break load (gauges assumed in the mass model). |
| Running rigging as single constraints through blocks | **Partial.** 14 paths with purchase. No rope EA. Lengths come from geometry. | **Partial.** 481 paths with function, which is ideal topology. No EA and no friction. |
| Sail list with sail class and outline | **Satisfied.** Three sails with outlines, battens, corners. | **Satisfied.** 29 sails with corners as point refs, reefs, roach. |
| Sail polar | **Lacks.** | **Lacks** in the package. It cites the tunnel data (§4.2). |
| Cloth constants | **Partial.** Areal mass (estimates and class minima). No stiffness or damping. | **Partial.** Canvas 1.2 kg/m² assumed. No stiffness. |
| Control endpoints, units, ranges | **Partial.** Class ranges for the tuning parameters; rudder plus and minus 35 degrees in the viewer only. Sheeting is posed as angles. | **Partial.** Brace limit 56 degrees (sourced), rudder 35 degrees (assumed). |
| Rate limits | **Lacks.** | **Partial.** Rudder, brace, sheet and set rates, but in angle space and unsourced. The contract wants line-length rates. |

## 3. Proposal

### 3.1 Hull geometry: the section stack

```ts
// Luovi body frame: x forward, y port, z up, metres.
type V2 = readonly [y: number, z: number]
type V3 = readonly [x: number, y: number, z: number]
type Provenance = 'printed' | 'measured' | 'tuning' | 'estimate' | 'derived'

interface Section {
  readonly x: number
  /** One side, bottom centreline to top centreline, ordered by girth. Mirrored unless the body is asymmetric. */
  readonly points: readonly V2[]
  /** Authored form only: one entry per point (offsets column or cell, provenance). */
  readonly src?: readonly { readonly key: string; readonly flag: Provenance }[]
}

interface HullBody {
  readonly id: string
  readonly role: 'canoe' | 'fin' | 'stub' | 'skeg' | 'rudder' | 'superstructure' | 'void'
  /** -1 for a void that floods when immersed (H-boat cockpit well). */
  readonly sign: 1 | -1
  readonly symmetric: boolean
  /** Ordered aft to fore. Compiled form: every section has the same point count. */
  readonly sections: readonly Section[]
  /** Fan caps at the ends, or a cutting plane (H-boat retroussé transom). */
  readonly ends: { readonly aft: EndCap; readonly fwd: EndCap }
  /** Movable bodies (rudder, canting keel) rotate about this axis, driven by a control. */
  readonly pivot?: { readonly origin: V3; readonly axis: V3; readonly control: string }
}

interface HullGeometry {
  /** What the simulation reads: uniform section stacks at physics resolution. */
  readonly compiled: readonly HullBody[]
  /** Lossless record of the drawing: printed points per station with provenance. */
  readonly authored: readonly HullBody[]
  /** How compiled was produced from authored, so the build is reproducible. */
  readonly loft: { readonly rule: 'girth' | 'fixedHeights'; readonly tool: string; readonly hash: string }
}
```

Why this shape:

- **It is a mesh.** Consecutive compiled sections with equal point counts form quads, and the end caps close them. That closed, outward-wound triangle set is exactly what both models' own clip-and-sum hydrostatics consume [H-boat: src/hboat/mesh.ts `submerged`; Joutsen: hull.ts `submergedVolume`], what Kerner's panel method needs per panel [design doc: 01-ocean, Physics coupling], and what the wake footprint rasterises [design doc: 02-hull, Wake].
- **It keeps stations.** The sectional area curve is a per-section clip, which gives Cp and Cm for the regression [design doc: 02-hull, Resistance]. The Hooft cross-flow integral is a sum over the same sections, with C_D per section from its shape [design doc: 02-hull, Side force]. The hull-as-lifting-body lattice is built offline from the centreplane outline: the bottom and top points of each section.
- **It holds both sources without loss.** H-boat: `sections.ts` already turns every printed cell (waterline half-breadth, buttock height, diagonal distance, sheer, keel line) into a point on its station, tagged by kind and column [H-boat: src/hboat/sections.ts]. Those become `authored` points with `src` keys. The stub and skeg cells become their own bodies, as in D6. One caveat: the H-boat merges points closer than 3 mm (`MERGE_TOL`), so the authored form should keep the unmerged cells. Joutsen: each cell (hb_k, h_k) of a station becomes a point (y = hb, z = h + baseY), with its m, e or d flag. The bottom, rail and deck profile polylines become the bottom and top points per section, and the bar keel becomes its own body.
- **Lofting stays out of the simulation.** The two models interpolate between sections differently: by girth (H-boat) and by height (Joutsen). Running each model's own loft offline in `data-*` and committing the `compiled` stack means `sim-hull` carries no spline code. It also means no transcendental and no lofting choice sits on the determinism path [docs/adr/0002]. The generators may use `Math.*` because their output is committed data, not runtime state.
- **Frame conversion happens once, at import.** Both models are right-handed with y up and z starboard. Luovi is x forward, y port, z up. The mapping is (x, y, z)_model to (x, -z, y)_luovi, a proper rotation (determinant +1). Heel stays positive to starboard in all three. Each model's origin (H-boat station 5 on KVL; Joutsen midships on the 1937 DWL) can stay as it is, because the contract only needs one frame per definition. The definition records which origin it uses. H-boat offsets in millimetres and Joutsen description angles in degrees convert to metres and radians in the same step [AGENTS.md: Units and frames].

### 3.2 Ship definition structure

```ts
interface Cited<T> { readonly value: T; readonly src: string }

interface ShipDefinition {
  readonly schema: 'luovi.ship-definition'
  readonly version: 1
  readonly id: string
  readonly name: string
  readonly origin: string                     // "station 5 on KVL", "midships on the 1937 DWL"
  readonly sources: readonly SourceRef[]      // drawings, rules, certificates with URL and sha256

  readonly hull: HullGeometry
  readonly liftingSurfaces: readonly LiftingSurface[]
  readonly hydro: {
    readonly regression: { readonly family: 'dsyhs' | 'holtrop-mennen' | 'orc-lvr'; readonly coefficients: string } // id in data-*
    readonly formFactor?: Cited<number>
    readonly addedMass: Cited<readonly number[]>      // 6x6, row-major
    readonly damping: { readonly roll: Cited<number>; readonly pitch: Cited<number>; readonly yaw: Cited<number> }
    readonly crossFlow: { readonly cdBySection: string } // rule id plus coefficients in data-*
    readonly manoeuvring: Cited<{ readonly Yv: number; readonly Nv: number; readonly Yr: number; readonly Nr: number }>
    readonly vlm: { readonly panels: number; readonly heelBinsRad: readonly number[]; readonly artifact: string } // hash of the derived lattice and inverses
  }
  readonly mass: {
    readonly items: readonly MassItem[]       // fixed and movable
    readonly conditions: readonly LoadCondition[]
  }
  readonly rig: {
    readonly spars: readonly Spar[]           // rigid, or segmented with EI for Cosserat masts
    readonly points: Readonly<Record<string, { readonly on: string; readonly at: V3 }>> // on: spar id or 'hull'
    readonly joints: readonly Joint[]         // heel, gooseneck, parrel or truss, with limits
    readonly standing: readonly { readonly id: string; readonly from: string; readonly to: string; readonly via?: readonly string[]; readonly ea: Cited<number>; readonly pretension: Cited<number>; readonly breakLoad?: Cited<number> }[]
    readonly running: readonly { readonly id: string; readonly fn: LineFn; readonly path: readonly string[]; readonly ea: Cited<number>; readonly purchase: number; readonly friction?: Cited<number> }[]
  }
  readonly sails: readonly {
    readonly id: string
    readonly sailClass: string                // selects the sail polar in data-*
    readonly corners: Readonly<Record<string, string>> // corner name to rig point or constraint id
    readonly outline: readonly V3[]           // in the measurement pose
    readonly battens?: readonly { readonly from: V3; readonly to: V3; readonly ei: Cited<number> }[]
    readonly cloth: string                    // cloth constants id in data-*: areal mass, stretch, shear, bend, damping
    readonly grid: readonly [number, number]
    readonly reefs?: readonly number[]
  }[]
  readonly controls: readonly Control[]
}

interface LiftingSurface {
  readonly id: string
  readonly kind: 'fin' | 'rudder' | 'hullBody'
  readonly body: string                       // the HullBody it belongs to
  readonly chords?: readonly { readonly le: V3; readonly te: V3 }[] // root to tip; absent for hullBody
  readonly thickness?: { readonly xi: readonly number[]; readonly halfT: readonly number[] }
}

interface MassItem {
  readonly id: string
  readonly mass: Cited<number>
  readonly cg: V3
  readonly inertia: readonly [number, number, number, number, number, number] // about own CG: xx yy zz xy yz zx
  readonly movable?: 'crew' | 'ballast' | 'cargo'
}

interface Control {
  readonly id: string
  readonly target:
    | { readonly kind: 'pivot'; readonly body: string }      // rudder, canting keel
    | { readonly kind: 'lineLength'; readonly line: string } // sheet, brace, halyard, clewline
    | { readonly kind: 'mass'; readonly item: string }       // water ballast, crew position preset
  readonly unit: 'rad' | 'm' | 'kg'
  readonly range: readonly [number, number]
  readonly rate: Cited<number>                // unit per second
}
```

Notes on the structure:

- **Coefficients are data with citations.** Every empirical value is `Cited` or a reference into `data-*`, as the repository rules require [AGENTS.md: No magic coefficients]. The VLM lattice and the per-heel-bin inverses are derived artifacts keyed by a hash of the geometry. They are not hand-written, and they are rebuilt when the hull changes.
- **Sail polars are referenced, not embedded.** A sail polar belongs to a sail class [GLOSSARY.md: Sail polar], so a sail names its `sailClass` and `data-*` holds one sail polar per class.
- **One structure for both rig styles.** Joutsen's point-reference grammar compiles into `rig.points`, and its gear presets compile into `running` paths [Joutsen: schema.ts `PointRef`, `LineRule`]. The H-boat's named mast, boom and hardware points map in directly [H-boat: src/hboat/rig.ts `CompiledRig`].
- **Controls target constraints.** They are line lengths, pivots or masses, never sail states, so no special-case branch can enter through the contract [AGENTS.md: No special cases for sailing states]. A tallship order belongs in the ship controls contract as a timed bundle of these endpoints.
- **Load conditions carry mass and ballast only.** Water density belongs to the environment, not the ship.
- **Ordered arrays give the state layout.** Sails, constraints and controls are ordered arrays with stable ids, so a definition determines its slice of the flat ship state buffer [docs/adr/0003].

### 3.3 How each model maps in, and what must not cross over

| Model content | Lands in | Treatment |
| --- | --- | --- |
| H-boat offsets table, stem, transom | `hull.authored`, then `hull.compiled` via the H-boat girth loft | Lossless. Keep the unmerged cells. |
| H-boat keel, stub, skeg, rudder, cabin, cockpit well | Separate `HullBody`; keel and rudder also as `LiftingSurface` | Rudder `pivot` on the stock at station ½. |
| H-boat mass items, crew presets | `mass.items`; crew as `movable: 'crew'` | Radii of gyration convert to an inertia tensor. |
| H-boat wires and lines | `rig.standing`, `rig.running` | EA = E_eff × metal area. Pretension needs a newton conversion of the Loos gauge readings, which no source gives yet. |
| H-boat `RIG_PARAM_RANGES` | Definition variants (mast step, forestay length, spreaders); `controls` only for live lines | Rake and spreader settings are set before a race, not trimmed per tick. |
| Joutsen offsets grid, profile, bar keel | `hull.authored`, then `hull.compiled` via the Joutsen fixed-height loft | Lossless. Cell flags kept. |
| Joutsen rig grammar and 481 lines | `rig.points`, `rig.joints`, `rig.running` | EA and pretension needed from wire and rope gauges, each cited. |
| Joutsen 29 sails | `sails` | Corners from point refs. Sail class: square, staysail or jib-headed spanker. |
| Joutsen rates (rudder 7, brace 4, sheet 10 deg/s, set 0.1/s) | `controls[].rate` | Convert brace and sheet angle rates to line-length rates through the posed rig at import. All of these are unsourced, so they need a citation or a flagged estimate. |
| Joutsen `physicsParams` knobs (`munkFactor`, `clrShiftAft`, `rigEffClose`, `blanketK`, `rollQuad` and others) | Nowhere as they stand | These are tuning parameters of a different force model. Each either becomes a cited coefficient of a luovi module or is dropped. |
| Joutsen `SailState.fill` (aback, luffing, full) | Nowhere | It is a sailing-state flag, which the project rules forbid. Fill is what the cloth does. |
| Joutsen `rho` in load conditions | Scenario environment | Not ship data. |

### 3.4 Cost under the per-tick budget

The hero ship has 1 ms of CPU for everything [AGENTS.md: Performance budgets]. Hydrostatics at heel are a single pass: clip each triangle against the plane, sum signed tetrahedra for volume and moments, and sum clipped areas for wetted surface. This uses only add, multiply, divide and `sqrt`, which are bit-identical across engines. The heel and trim normal needs one sin and one cos per tick from `core` [docs/adr/0002].

Synthetic benchmark (Node 26.1.0, Apple M1 Pro): a ring stack shaped like an H-boat-sized hull, clipped at 20 degrees of heel, computing volume, centroid and wetted area.

| Triangles | Time per call |
| --- | --- |
| 3,120 | 54.5 µs |
| 15,708 | 267.6 µs |

That is about 17 ns per triangle. A compiled canoe body of about 40 sections by 24 points, plus appendages, comes to roughly 2,000 to 3,000 triangles and about 5 % of the hero budget. Joutsen's proxy (1,588 triangles) is already in that range [Joutsen: `proxyMesh`]. The H-boat's default bodies (about 23,000 triangles) would take about 0.4 ms, so the H-boat needs a coarser compiled stack than its visual one. The panel method's per-panel wave sampling comes on top of this and is costed in the ocean work, not here. The visual hull in `render-ship` can be lofted finer from the same `authored` sections.

### 3.5 Alternatives rejected

- **The offsets grid z(x, h) as the contract (Joutsen style).** It cannot hold the H-boat's buttocks, diagonals and girth-ordered keel points without resampling. It is ill-conditioned on a flat floor, where the Joutsen verification already finds 0.15 to 0.4 m of half-breadth ambiguity in the bottom rows [Joutsen: data/hull-verified.json]. It cannot represent a section that doubles back in height. And it would put the loft rule into `sim-hull`.
- **An analytic surface function, the H-boat's `loft.at(x, s)`.** It is code, not data. It is too slow per tick: the H-boat's own canoe-body hydrostatics evaluate splines for 240 slices of about 55 points each [H-boat: src/hboat/hull.ts `hullHydrostatics`]. And it would put spline evaluation on the determinism path.
- **A bare triangle mesh (positions and indices).** It is the fastest to clip, but it drops the station structure that Cp, Cm, cross-flow per section and the hull-body lattice need, and it drops provenance. A compiled section stack is a mesh plus structure at the same cost, so it wins.
- **NURBS or B-spline surfaces.** No source supplies them, fitting adds error, and evaluation adds cost and determinism exposure. Both models already interpolate with monotone cubics.
- **Precomputed hydrostatic tables over heel, trim and sinkage** (the H-boat's `hydrostaticTable`, Bonjean curves). They are the fastest option, but they contradict "recomputed from the hull mesh at the current heel, trim and sinkage every tick" [design doc: 02-hull, Resistance]. They do not cover waves, where the panel method needs geometry anyway. They grow with heel, trim, sinkage and load condition, and they go stale when mass moves or a keel cants. They stay available as a cache if profiling ever demands one.
- **Two native formats with adapters in the simulation.** That duplicates loft code in `sim-hull`, and every new source format would grow the simulation [AGENTS.md: DRY, SOLID].

### 3.6 Open questions this raises

- **Rudder in the VLM.** The influence-matrix inverse assumes rigid geometry per heel bin [design doc: 02-hull, Side force], but the rudder turns. Rotating its panel normals in the right-hand side keeps the inverse valid. This needs settling in the VLM ticket.
- **Memory for the inverses.** An 800-panel inverse in f64 is 5.1 MB per heel bin; 300 panels is 0.72 MB. Ten bins at 800 panels is about 51 MB per ship, before using port and starboard symmetry. The panel count and bin spacing should be chosen with this in view.
- **Joutsen GM and KG.** Mass items need a hull KG. Joutsen's only figure is KM minus 0.699 m, and its own itemised check gives GM 1.1 to 2.0 m for the 1930s loading [Joutsen: docs/m11-mass.md]. Since luovi derives the righting moment from geometry against the mass distribution, an itemised Joutsen mass budget is needed. It is not just a data import.
- **Design doc wording.** The design doc lists "VLM lattice" and "sail list with polars" as ship definition content [design doc: 05-separation-of-concerns, Contracts]. This proposal keeps both as references to derived or shared data: a lattice artifact by hash, and a sail polar by sail class. That matches the glossary, but the doc wording should be confirmed rather than silently reinterpreted.

## 4. Reference data, rules, drawings and citations in the models

### 4.1 H-boat: for the performance polar target ticket

**ORC Club One Design Certificate H-boat 2020, No. 21590, issued 10 January 2020, VPP version 2020 1.00**: https://data.orc.org/public/od/2020/hboat.od.pdf. The H-boat model cites it [H-boat: data/sources.json `ratings.ORC2020`]. I viewed both pages for this note. The certificate is stamped "Invalid for Racing" and watermarked TEST: it is the class's reference One Design certificate, not a certificate for an individual H-boat. Page 2, "Velocity Prediction in Knots for True Wind Speeds", is an ORC VPP performance polar:

| TWS (kt) | 6 | 8 | 10 | 12 | 14 | 16 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Beat angle | 43.5° | 42.8° | 42.0° | 39.8° | 39.4° | 39.0° | 39.8° |
| Beat VMG | 2.75 | 3.32 | 3.79 | 4.12 | 4.24 | 4.28 | 4.27 |
| 52° | 4.22 | 5.08 | 5.62 | 5.89 | 6.02 | 6.07 | 6.08 |
| 60° | 4.47 | 5.35 | 5.80 | 6.04 | 6.20 | 6.28 | 6.32 |
| 75° | 4.65 | 5.52 | 5.95 | 6.20 | 6.43 | 6.62 | 6.79 |
| 90° | 4.82 | 5.75 | 6.17 | 6.44 | 6.59 | 6.80 | 7.20 |
| 110° | 4.84 | 5.79 | 6.24 | 6.65 | 7.02 | 7.31 | 7.70 |
| 120° | 4.67 | 5.66 | 6.15 | 6.56 | 6.99 | 7.41 | 8.21 |
| 135° | 4.18 | 5.15 | 5.89 | 6.28 | 6.68 | 7.10 | 8.13 |
| 150° | 3.54 | 4.48 | 5.33 | 5.94 | 6.30 | 6.67 | 7.47 |
| Run VMG | 3.07 | 3.88 | 4.63 | 5.32 | 5.86 | 6.22 | 6.93 |
| Gybe angle | 148.0° | 152.0° | 152.0° | 166.0° | 180.0° | 180.0° | 180.0° |

- **The design doc's benchmark points** (VMG upwind and TWA 60, 90 and 120 at 8 and 16 kn true [design doc: 02-hull, Validation targets; 03-aero, Benchmarks]) read from this table as:
  - 8 kt: 3.32, 5.35, 5.75 and 5.66 kn.
  - 16 kt: 4.28, 6.28, 6.80 and 7.41 kn.
- **Loading behind the VPP.** Page 1 gives displacement 1,456 kg and a default crew weight of 338 kg (maximum 300 kg and minimum 215 kg "when applied by the NoR and SI"). A benchmark scenario has to match this loading. The model's "sailing" condition (1,777 kg, three crew at 100 kg plus sails and gear) is not the same [H-boat: Hydrostatics and stability].
- **Other page 1 data:**
  - Rating: GPH 749.1. Time allowances on page 2.
  - Hull: LOA 8.280 m, MB 2.188 m, draft 1.260 m, IMSL 6.465 m, RL 5.831 m, LSM0 6.077 m, VCGD -0.154 m, VCGM -0.120 m, sink 7.30 kg/mm, WS 10.64 m², displacement/length ratio 6.4877. Stability: limit of positive stability 120.1° (estimated), stability index 118.2.
  - Rig: P 8.700, E 3.000, I 7.940, J 2.470, ISP 8.040, SPL 2.415, BAS 0.900, MUW 0.65, MTW 1.11, MHW 1.81. Mast DiaL 0.116 and DiaT 0.080.
  - Sails: main 15.55 m², headsail 10.48 m², symmetric spinnaker 32.12 m².

Other H-boat references in the model:

- **ORC 2026 club certificates of individual H-boats.** SUI 174, SUI 159, DEN 555, G-989 and NED 94, via the ORC public API: https://data.orc.org/public/WPub.dll. The model records displacement in measurement and sailing trim, WSS, IMSL and crew weight for each [H-boat: data/sources.json `ratings.ORC2026`; model/hboat.json `massBudget.orcComparison.individualBoats`]. I did not fetch these. As ORC club certificates they are the same certificate family as the One Design one, so each is expected to carry its own speed table, but that is unverified.
- **Model against certificate.** A comparison table (displacement, draft, immersion, wetted surface, beam, LOA, VCG, keel mass, I, ISP, sail areas, limit of positive stability) [H-boat: Against the certificates; model/derived.json `comparison`].
- **Class rules.**
  - International H-Boat Class Rules, effective 17 August 2022: https://h-boat.org/files/data/documents-rules/hbt_cr_20220805.pdf
  - Class rules 2007 (FFVoile copy): https://umbraco.ffvoile.fr/media/ou4b0ab2/hboat-2007-gbr.pdf
- **Class plans.** Index: https://h-boat.org/en/documents-rules/drawings
  - A.1.1 Lines drawing: https://h-boat.org/files/data/documents-rules/drawings/A-1-1-Lines-drawing.pdf
  - A.1.2 Sectional drawing with the table of offsets: https://h-boat.org/files/data/documents-rules/drawings/A-1-2-Sectional-drawing.pdf
  - A.1.3 Keel: https://h-boat.org/files/data/documents-rules/drawings/A-1-3-Keel.pdf
  - A.2.1 General arrangement: https://h-boat.org/files/data/documents-rules/drawings/A-2-1-General-arrangement.pdf
  - A.3.1 Lamination: https://h-boat.org/files/data/documents-rules/drawings/A-3-1-Lamination-drawing.pdf
  - A.3.2 Spars: https://h-boat.org/files/data/documents-rules/drawings/A-3-2-Spars.pdf
  - A.3.3 Rudder: https://h-boat.org/files/data/documents-rules/drawings/A-3-3-Rudder.pdf
  - A.3.4 Details: https://h-boat.org/files/data/documents-rules/drawings/A-3-4-Details.pdf
  - A.3.5 Alternative main bulkhead: https://h-boat.org/files/data/documents-rules/drawings/A-3-5-Alternative-main-bulkhead.pdf
  - A.4.1 Sail plan: https://h-boat.org/files/data/documents-rules/drawings/A-4-1-Sail-Plan.pdf
  - A.5.1 Measurement plan: https://h-boat.org/files/data/documents-rules/drawings/A-5-1-Measurement-Plan.pdf
- **Tuning guides.** Their mast, spreader and pretension settings, purchases and jib lead positions are in `rig.presets` [H-boat: data/sources.json `tuning`].
  - North Sails H-Boat tuning guide: https://northsails.com/sailing/en/resources/h-boat-tuning-guide
  - Fritz Segel, Das H-Boot Trimmbuch: https://fritz-segel.com/wp-content/uploads/2024/11/hboottrimm.pdf
  - Fritz Segel, Trimhandbok (SV, 21 April 2025): https://media.h-boat.se/2026/02/Fritz-Trimhandbok_swe_2025-04-21.pdf
  - H-vene.net wiki: https://h-vene.net/hwiki/
  - Seldén mast sections (candidate section properties): https://www.seldenmast.com/

### 4.2 Suomen Joutsen: records, comparison data and drawings

- **Performance polar.** None from a published source.
  - The package's own simulated polars at TWS 9 m/s (all plain sail) and 15 m/s (topgallants and royals furled) are model output, not targets [Joutsen: docs/m1-physics.md §3.4, §3.5].
  - The same tables include a "Jean Bart reference" column: 8.0, 10.5, 9.0 and 7.5 kn at TWA 70, 90, 135 and 180, TWS 9 m/s. Its provenance is not in the published files. It points at an unpublished "report 04" in the tallship repository. It should not be used as a target until it is traced.
  - Heel at the beam is compared with "Glebov", also unsourced in the package.
- **Historian's account.** Visa Auvinen, personal communication, 20 October 2026: GM 0.699 m determined 11 September 1948 (1955 seaworthiness survey); ballast in 1955; top speed 17 kn (eyewitness) against 16.5 kn in the literature; best point of sail about TWA 135; heel to about 45 degrees; poor to windward, coming about by wearing [Joutsen: docs/auvinen-2026.md].
- **Benchmark candidates.** Records R1 to R15 give targets and tolerances for pointing, helm and heel, speed ratios, top speed, windward progress, tack, wear, heave-to drift, storm survival, roll steadying, static wind heel, the drift curve, the rudder, wave response and passage averages [Joutsen: docs/physics-accuracy.md §5]. These overlap the design doc's Joutsen, sternway and drift benchmarks [design doc: 02-hull, Validation targets].
- **Speed and behaviour records.** Ids are as used in `docs/physics-accuracy.md`.
  - J1 Wikipedia: https://en.wikipedia.org/wiki/Suomen_Joutsen
  - J2 Yle 2024, highest measured speed 16.4 kn: https://yle.fi/a/74-20248926
  - J3 French registry dimensions and passages: https://forum.pages14-18.com/viewtopic.php?t=46653
  - J4 newspaper chronology (ballast, heel): https://jamikko.fi/Purjelaivat_Suomen%20Joutsen.htm
  - J5 to J16 and N1 to N18 are Finnish and Swedish newspaper reports on digi.kansalliskirjasto.fi, each with a link in the package. Highlights:
    - J6, passage average 7.4 kn: https://digi.kansalliskirjasto.fi/sanomalehti/binding/1831143?page=1
    - J9, windward VMG about 1.5 to 1.7 kn: https://digi.kansalliskirjasto.fi/sanomalehti/binding/1839800?page=5
    - J10, drift lying to 1.7 to 2.1 kn (the master's account): https://digi.kansalliskirjasto.fi/sanomalehti/binding/1982017?page=5
    - J11, hurricane heel 10 to 25 degrees, often 50: https://digi.kansalliskirjasto.fi/sanomalehti/binding/1873394?page=2
    - N2 (1932), about 13 kn and pointing about 5 points: https://digi.kansalliskirjasto.fi/sanomalehti/binding/1105044?page=25
    - N5, 13.7 kn logged several ways: https://digi.kansalliskirjasto.fi/sanomalehti/binding/1110017?page=33
- **Comparable-ship performance data**, a route to a full-rigger performance polar [Joutsen: docs/physics-accuracy.md §2]:
  - Nippon Maru full scale, Amemiya and Ohsugi 1988: https://www.jstage.jst.go.jp/article/jin/79/0/79_KJ00004841281/_pdf
  - Nippon Maru towing tank and MMG, Yoshimura et al. 1991: https://www.jstage.jst.go.jp/article/jin/84/0/84_KJ00004841428/_pdf
  - Statsraad Lehmkuhl measured time series, Ølberg et al. 2023: https://arxiv.org/pdf/2310.03101 and NOAA NCEI 0254645: https://www.ncei.noaa.gov/archive/accession/0254645
  - Boston Teapot records: https://en.wikipedia.org/wiki/Boston_Teapot_Trophy
  - Dar Pomorza: https://en.wikipedia.org/wiki/Dar_Pomorza
- **Square-sail aero data**, for the sail polar work:
  - Amemiya et al. 1991: https://www.jstage.jst.go.jp/article/jin/84/0/84_KJ00004841426/_pdf
  - Tatano et al. 1991: https://www.jstage.jst.go.jp/article/jin/84/0/84_KJ00004841427/_pdf
  - Amemiya et al. 1992, per-mast coefficients: https://www.jstage.jst.go.jp/article/jin/87/0/87_KJ00004721517/_pdf
  - Szymański and Specht 2023, brace and apparent-wind limits: https://doi.org/10.1017/S0373463323000103
  - Willis 2003: https://www.cnrs-scrn.org/northern_mariner/vol13/tnm_13_4_29-39.pdf
- **Hull and stability references** [Joutsen: docs/physics-accuracy.md §2]:
  - Tanaka and Kijima 1993, cross-flow C_D: https://www.jstage.jst.go.jp/article/jjasnaoe1968/1993/174/1993_174_357/_pdf
  - TSB Concordia knockdown report: https://www.tsb.gc.ca/sites/default/files/rapports-reports/marine/M10F0003/eng/M10F0003.pdf
  - MCA sailing stability booklet: https://assets.publishing.service.gov.uk/media/5a7ce30fe5274a2c9a484b8d/sib_sailing_13_may_10.pdf
- **Drawings**, Forum Marinum via Finna, Public Domain Mark, with sha256 in `data/plans-sources.json` [Joutsen: Sources]:
  - Lines 1937, FMV467:48: https://finna.fi/Record/tmk.177934630787800
  - Docking plan 1932, FMV467:110: https://finna.fi/Record/tmk.177969273969700
  - Dockungsplan, FMV467:17: https://finna.fi/Record/tmk.177926794272400
  - Rigging plan with line schedule, FME562:1: https://finna.fi/Record/tmk.163272697247600
  - Spar profile 1:100, FMV467:109: https://finna.fi/Record/tmk.177969250640700
  - GA 1931, FMV395:305: https://finna.fi/Record/tmk.174308184003900
  - GA 1936, FMV467:37: https://finna.fi/Record/tmk.177934224945700
  - Sail album 1934, FME619:1, 19 sheets: https://finna.fi/Record/tmk.174340761639400
  - Crossjack, FMV395:315: https://finna.fi/Record/tmk.174341199870600
  - Spanker, FMV395:313: https://finna.fi/Record/tmk.174341272827600 and FMV395:312: https://finna.fi/Record/tmk.174341313380000
  - Storm spanker, FMV395:314: https://finna.fi/Record/tmk.174341144405500
  - Outer jib, FMV395:308: https://finna.fi/Record/tmk.174341385415600
  - Inner jib, FMV395:309: https://finna.fi/Record/tmk.174341342661600
  - Sail inventory 1939, FMV395:306, with cloth length and canvas number per sail: https://finna.fi/Record/tmk.174341860355300
  - Sternpost and rudder 1937, FMV467:83: https://finna.fi/Record/tmk.177935596216300
  - Oldenburg alterations, FMV467:61: https://finna.fi/Record/tmk.177934976147200
- **Code and documents.** The tallship repository, commit de87b906f987: https://github.com/nipatiitti/tallship

### 4.3 For the DSYHS coefficients ticket

- **Regression sources** named in the design doc [design doc: 02-hull, Sources]:
  - Keuning and Katgert 2008: https://research.tudelft.nl/en/publications/a-bare-hull-resistance-prediction-method-derived-from-the-results
  - TU Delft 2016 series: https://repository.tudelft.nl/file/File_b89cddac-c130-429c-9b24-b71e453a1061
  - ORC VPP Documentation 2023: https://orc2.orc.org/rules/ORC%20VPP%20Documentation%202023.pdf
- **What the H-boat model offers as inputs.** The canoe body is a separate closed body (D6), and `hullHydrostatics(loft, attitude)` returns volume, LCB, VCB, waterplane area, LCF, wetted area, LWL, BWL, canoe draft and sectional areas at any attitude [H-boat: src/hboat/hull.ts]. However, `model/derived.json` reports hydrostatics of all bodies together, appendages included: at 1,456 kg, LWL 6.058 m, BWL 1.743 m, draft 1.263 m, wetted area 12.08 m² and volume 1.4205 m³ [H-boat: model/derived.json `conditions.measurement`]. The DSYHS canoe-body inputs (Tc, Cp, Cm, canoe-body wetted area) still have to be computed and are not exported.
- **Appendage inputs** for the DSYHS keel and rudder terms [H-boat: model/derived.json `appendages`]:
  - Keel: lateral area 0.898 m², root chord 1.569 m, t/c 9.6 % at the root to 16 % at the template.
  - Rudder: area 0.305 m², span 0.820 m, mean chord 0.372 m.
- **Cross-checks** against the ORC certificate: WS 10.64 m² against the model's 12.08 m², because ORC's is the One Design figure, and the individual SUI 174 certificate lists 12.11 m². IMSL is 6.465 m [§4.1; H-boat: Against the certificates].
