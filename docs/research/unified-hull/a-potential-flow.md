# Angle A: body-exact potential flow on the real hull, live

Labels used below: **[E]** established in the literature, **[I]** my inference from it, **[S]** speculation.

## 1. The idea

Treat the whole wet boat (hull, keel, rudder, both hulls of a catamaran) as one body covered in a few hundred panels, and every tick ask one question: what must the water do so that none of it passes through the part of that body that is under water right now? The answer is a pressure on every wet panel. Summed, that pressure already contains buoyancy, the push of passing waves, the inertia of the water she drags along (which changes as she heels or lifts a hull), the lift of keel, rudder and hull as one wing with one wake, the drag that lift costs, and the squeeze between two hulls. The waves the boat herself makes are kept as a small patch of real, moving water surface around her that the panels pump and that pushes back on them a moment later: that push is wave-making resistance, and it comes out right at leeway, heeled, turning or going astern because nothing in it assumes she is going straight. Two things this picture cannot see, water rubbing along the skin and tearing away from it, are added as one thin layer on the same panels, using flow speeds the solve has already produced.

## 2. Formulation

### State carried

1. Rigid body: position, attitude, linear and angular velocity (13 numbers), plus mass state (crew, ballast, cant).
2. Wake: for each shedding edge segment, a short queue of shed doublet strengths convected with the flow (a few hundred numbers). This is the lift memory, replacing Wagner and Küssner lags **[E]**.
3. Wave memory field: surface elevation `η_w` and surface potential `φ_s` on a periodic N×N grid (128² or 256²) in a box about 4 hull lengths wide that follows the boat in whole-cell shifts, with a damping rim. This is the radiation memory.
4. Viscous companion: one separation fraction `f` in [0, 1] per lifting strip, with a first-order lag.

### The split

Linear time-domain theory writes the free-surface Green function as `G = 1/r − 1/r′ + (memory)`: a Rankine source, its negative image in the mean surface, and a convolution over the past **[E]** (Kring et al. 1997 describe the weak-scatterer Rankine alternative, with the body condition exact on the instantaneous hull). The memory term is, exactly, the surface wave field left behind by everything the body did earlier. So instead of convolving, carry that field **[I]**:

- Body potential `φ_b`: sources and doublets on the instantaneous wetted panels with negative images, so `φ_b = 0` on the surface plane.
- Wave potential `φ_w`: defined by `φ_s` on the plane, decaying as `e^{kz}` per Fourier mode.
- Incident sea `φ_I`: the existing 128 analytic components.

Per Fourier mode, in the earth frame:

```
dη_k/dt  = k·φ_s,k + w_b,k        (w_b = ∂φ_b/∂z on the plane, deposited from the panels)
dφ_s,k/dt = −g·η_k
```

integrated exactly (each mode is a forced oscillator with ω = √(gk); the sin and cos of ω·dt are a per-hull table built with the deterministic math in `core`). The body condition on each wet panel is

```
∂φ_b/∂n = (V + Ω×r − ∇φ_I − ∇φ_w) · n
```

with `∇φ_w` taken from the field at the previous step (inverse FFTs at about six depth layers, interpolated to panel centres). That is body-exact Neumann-Kelvin with nonlinear Froude-Krylov, the memory integral replaced by a field. The equivalence is established mathematics; a live panel solve coupled to an FFT patch is not something I found published. Nearest relatives: moving-pressure-patch ship waves on spectral solvers (Yao, Bingham and Zhang 2024, who show a static patch gives worse waves and resistance than one corrected for hull dynamics) and fundamental-solution wave methods in graphics (Schreck et al. 2019).

### Each step

1. **Wet set.** Clip panels against the incident surface (weak-scatterer choice **[E]**); a partly wet panel is weighted by its wet fraction. The image plane is the best-fit plane of the incident surface under the hull **[I]**.
2. **Hydrostatics and Froude-Krylov** on the fine triangle mesh, exact under the incident surface **[E]**.
3. **Panel solve.** Low-order source and doublet panels (Morino form) on thick bodies, doublet lattice on thin fins, wake strips shed from every sharp edge with a Kutta condition. The matrix is `A = A_body + A_image(attitude) + A_wake`. `A_body` is fixed in the body frame and precomputed; only the image and near-wake parts are rebuilt. Right-hand sides: the actual onset flow, plus six unit accelerations (the acceleration-potential problem, same matrix) which give the instantaneous added mass `A∞(q)` and the `φ_t` pressure without differencing in time **[E]**.
4. **Pressure.** Unsteady Bernoulli on each wet panel, integrated as `(M + A∞(q))·v̇ = F_rest` so light hulls stay stable. The term `−(dA∞/dt)·v` appears by itself: slamming, the bow burying, first-order planing lift.
5. **Wave field.** Deposit `w_b` and step the modes. Diffraction of the incident sea enters the same way.
6. **Viscous companion** (below), then integrate.

### Lift and where the sheets leave

Fins shed from their trailing edge and tip. The hull sheds from every edge that is geometrically sharp: the keel line of a long keel, a sternpost, a transom edge, a hard chine. Zou (1994, 1997) did this for ships at drift, with vortices leaving the trailing and lower edges at half the drift angle (Bollay's model), and got the nonlinear growth of side force with drift angle **[E]**. So what the current plan books as cross-flow drag on a sharp-keeled hull is vortex lift from the keel-line sheet, arriving with its own induced drag, centre of effort and time lag **[I]**. Sharpness is a number from the section stack (edge radius over local draft).

### The smallest viscous companion

Three rules, all fed by the panel solve's own velocities:

1. **Friction.** `τ = ½ρ·C_f(Re_s)·|u_t|·u_t` with the panel's tangential velocity and a turbulent flat-plate line on the running length `s`. Form effect, wetted area at heel and sternway come free. SPLASH fed potential-flow wetted area and length to a viscous strip in the same spirit **[E]**.
2. **Circulation cap.** Each lifting strip's bound circulation relaxes toward what the Kutta condition asks for, but the section lift it implies is limited by a Kirchhoff-type separation fraction `f(α_eff)` set by thickness and Reynolds number; the lost lift reappears as separated normal force. This is the decambering family of post-stall lattice methods (Narsipur et al. 2020) **[E]**, with `f` lagged for dynamic stall **[I]**. No stall flag: `f` is continuous.
3. **Bluff cross-flow.** On sections that are not sharp, where no sheet is shed, a separated-flow normal drag `½ρ·C_D(bilge radius)·|v_n|·v_n` on the local panel normal velocity, weighted by `(1 − sharpness)` so it never doubles the sheet **[I]**. This is the one place a shape-to-coefficient rule survives, and it is the model's weakest joint.

### Precomputed per hull (minutes, not hours)

Panelisation, `A_body`, a preconditioner (inverse at a few reference attitudes), mode tables. Optionally `A∞` tabulated over sinkage, heel and trim as an accelerator, checked against the live solve. Nothing is keyed on hull family.

## 3. The five boats

**H-boat.** Fin and spade rudder are high-aspect lattices with strong, clean Kutta lift; the canoe body adds a little and acts as an end plate whose effectiveness falls as speed rises, because the wave field relieves the pressure near the surface. Rudder sits in the keel's shed wake. Weak: stall angle rests on the `f` law.

**International Folkboat.** One long low-aspect body. Lift comes mostly from the keel-line sheet, so it builds slowly (lift needs several chords of travel and the chord is most of the boat), sway added mass and yaw damping are large, and the rudder is a flap on the keel's trailing edge, changing the circulation of the whole keel rather than acting alone. Risk: the half-angle sheet rule.

**Suomen Joutsen.** Bar keel, deadwood and sternpost shed; the round bilge amidships does not, so rule 3 carries part of the load. At her Froude numbers the wave field is nearly a rigid lid. Large `A∞` in sway and yaw against small rudder lift gives the slow, way-losing tack. Missing: viscous pressure drag of a full stern, perhaps 10 to 25 percent of resistance **[I]**.

**Beach catamaran.** Both hulls and all boards are in one matrix and pump one wave field, so wave and lift interference need no factor (SPLASH did this across hull separations). As the windward hull lifts, its panels leave the wet set: buoyancy, added mass, lift and wave-making all go together, and `dA∞/dt` gives the slap on re-entry. Missing: ventilation.

**Class40.** Transom and chine sheets plus the negative-image body solve, which is the correct high-Froude limit, give dynamic lift and bow-up trim that grow continuously with speed; surfing is Froude-Krylov on the wave face plus falling wave drag as the boat's own wave lengthens. Missing: spray root and pile-up (planing lift likely low by tens of percent) and the dry transom, which appears only if the wet set also uses the boat's own `η_w` **[S]**; otherwise a continuous transom ventilation law is needed, a second surviving empirical rule.

Canting keel and water ballast: geometry and mass move, nothing else changes. A moving rudder or keel rebuilds only its cross block of the matrix. Foils are more lifting sheets.

## 4. Feel

**Tack.** Speed falls, the wake queue still holds the old circulation, so side force lags; leeway builds as lift per degree falls with speed squared; `A∞` in sway and yaw sets how far she carries. The Folkboat's long keel has several times the sway and yaw added mass and a slower lift build-up, and its keel-line sheet dissipates energy in the turn: she turns slower, loses more way, and settles more gradually. The H-boat pivots on a small fin and reloads it within a couple of chord lengths.

**Puff.** Heel changes the wet set, so waterplane, added mass and lifting geometry move together; weather helm comes from the heeled, asymmetric wet hull, not a coefficient.

**Broach.** Stern lifts on a face, rudder panels leave the wet set, hull-in-wave yaw moment (Munk plus Froude-Krylov) is uncontested, heel moves the centre of the wet body: a sequence, not a script.

**Sternway.** Every sheet's convection reverses with the flow; the rudder becomes a leading-edge surface and its `f` drops early, so it bites weakly and backwards.

## 5. Cost and determinism

Measured in a throwaway Node 22 script (constant-source panels with image on a half spheroid, plain JS doubles, one thread). Added mass against Lamb: surge 0.083 against 0.082, sway 0.87 against 0.860, with crude point quadrature.

| Panels | Image matrix rebuild | One matrix-vector product | Dense LU |
| ------ | -------------------- | ------------------------- | -------- |
| 384    | 2.7 ms               | 0.5 ms                    | 27 ms    |
| 768    | 1.7 ms               | 0.6 ms                    | 177 ms   |
| 1536   | 6.7 ms               | 3.1 ms                    | 1.4 s    |
| 3072   | 41 ms                | 21 ms                     | 13 s     |

2D FFT: 0.8 ms at 128², 4.5 ms at 256².

A dense factorisation every tick is out above roughly 300 panels. An iterative solve is in: plain fixed-point sweeps converged in 5 to 6 for pure sway but about 30 for a mixed case, so it needs GMRES preconditioned with the precomputed inverse (I expect 3 to 6 products per right-hand side; not measured). With seven right-hand sides that is about 40 products: 25 ms at 768 panels, too slow at 60 Hz; refreshing one of the six acceleration solves per tick in a fixed rotation (added mass changes slowly) brings it to about 10 ms. So **400 to 800 panels live per tick in plain JS, 1,500 with Wasm SIMD or a 30 Hz hydro step**. The wave field needs about ten transforms per step: 8 ms at 128² every tick, or 256² at 15 to 20 Hz.

All of it is IEEE add, multiply, divide and sqrt with fixed iteration counts, so it is bit-reproducible under ADR 0002. A GPU dense solve of 3,000 panels is realistic in speed but not reproducible across machines; replays would have to log forces instead of inputs, losing lockstep and server validation. I recommend CPU.

## 6. Where it breaks

1. **No viscous pressure drag.** Full sterns and stalled wakes exist only through the companion's rules.
2. **Separation location on smooth hulls is prescribed by a sharpness rule.** Round bilges at large drift are the worst case; rule 3 is strip cross-flow drag by another name.
3. **Linearised free surface.** No breaking, spray, pile-up or dry transom. Neumann-Kelvin overstates humps for full hulls **[E]**; Zou notes potential flow misses the surface jump behind a surface-piercing trailing edge at higher Froude number, and Hori and Tanaka show the wave part of side force shifts its humps with drift angle and can even reverse sign.
4. **Planing proper** is under-predicted; semi-planing is unproven.
5. **Waterline noise.** Panels entering and leaving the wet set make force chatter a helmsman would feel; partial-wet weighting must be shown to cure it.
6. **Coupling stability.** The explicit one-step lag between panels and wave field, and the field's resolution of the near-hull local flow (which is what turns the negative image back into a rigid lid at low speed), are untested. If the field cannot hold that flow, low-speed lift and added mass are wrong by the image sign. This is the biggest risk.

Confidence: high on added mass with attitude, hull and fins as one lifting body, interference and lift memory; medium on live wave-making through the field; low on planing.

## 7. The cheapest experiment

One day, NumPy, outside the repo: a Wigley hull, about 500 panels, negative image, 128² wave field, towed at fixed attitude.

1. Run Froude numbers 0.15 to 0.5 and plot steady wave resistance from panel pressure. Pass: humps and hollows in the right places and within a factor of 1.5 of published Wigley curves. Fail: no hump structure, or the coupled loop is unstable at dt = 1/60 s.
2. At Froude number 0.1, compare sway added mass and side force at 5° drift with the same hull solved with a rigid-lid (positive) image. Pass: within 10 percent. Fail means risk 6 is real.
3. Add a keel-line sheet at 10° drift and compare side force with Zou's Wigley results.

If only the double-body part survives, the fallback is still worth having: live body-exact added mass and unified lift, with wave drag from elsewhere.

## 8. Sources

- [Kring, Huang, Sclavounos, Vada, Braathen 1997, Nonlinear ship motions and wave-induced loads by a Rankine method (21st Symp. Naval Hydrodynamics)](https://www.nationalacademies.org/read/5870/chapter/5): read in part.
- [Zou 1994, Berechnung der Potentialströmung um einen schräg fahrenden Schiffsrumpf, TUHH report 541 (German)](https://tore.tuhh.de/bitstreams/1ab81831-6df1-4ac5-89f9-347947cd1d22/download): read in part.
- [Zou 1997, Hydrodynamic forces on a surface-piercing plate in steady maneuvering motion](https://www.nationalacademies.org/read/5870/chapter/68): read in part.
- [Hori and Tanaka 1987, 斜航する船に働く造波横力について (Japanese)](https://www.ship.nias.ac.jp/personnel/horiken/Paper_PDF/Wave-Lateral-Force_No-75.pdf): read in part.
- [Rosen et al. 1997, SPLASH nonlinear and unsteady free-surface analysis code for grand prix yacht design](https://next.sciencegate.app/document/10.5957/csys-1997-014): abstract only.
- [South Bay Simulations, SPLASH catamaran interference page](https://www.panix.com/~brosen/catamarans.html): read in part.
- [Yao, Bingham and Zhang 2024, static versus dynamic pressure distribution strategies for ship waves (JFM)](https://orbit.dtu.dk/en/publications/the-influence-of-static-versus-dynamic-pressure-distribution-stra/): abstract only.
- [Schreck, Hafner and Wojtan 2019, Fundamental solutions for water wave animation](https://visualcomputing.ist.ac.at/publications/2019/FundamentalSolutionForWaterWave/): abstract only.
- [Subramanian and Beck et al. 2019, An improved body-exact method to predict the maneuvering of ships in a seaway (OMAE)](https://next.sciencegate.app/document/10.1115/omae2019-96441): abstract only. It keeps viscous and lifting forces as a separate systems-based model.
- [Narsipur, Hosangadi, Gopalarathnam, Edwards 2020, A low-order method for prediction of separation and stall on unswept wings](https://arxiv.org/abs/2006.00107): abstract only.

Not opened, used from memory only: Lamb's spheroid coefficients, Bollay's low-aspect wing theory, the transient Green function literature, Wagner and von Kármán impact theory. Three pages failed to load and are not relied on.

Sanity script: `/tmp/claude-0/-home-user/005e1c2d-09e2-5a19-913c-f6e461918c91/scratchpad/pf/bench.mjs`.
