# Critic 3: is the unification real, and would he feel it

Lens: the owner's fear ("a different model for each boat") and his goal (H-boat and Folkboat differ for reasons he recognises). Counts are mine. No web lookups used.

## 1. The honest count

"Mechanisms" counts every separately sourced force rule, companions and closures included. The current design has about seven.

|                 | Mechanisms                                                                                                                                                                                 | Not derived from geometry and mass                                                                                | Modes or flags in disguise                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** panels    | 7: hydrostatics; panel solve with wake; wave field; friction; circulation cap; bluff cross-flow; transom ventilation law                                                                   | Universal rules only: stall law, `C_D(bilge radius)`, half-angle sheet rule, the sharpness at which an edge sheds | `(1 − sharpness)` weight; "lattice on thin fins, source panels on thick bodies"; the negative image that only becomes a rigid lid if the wave field resolves it |
| **B** slices    | 11 to 12: the law; shed fraction; cross-flow growth; uptake η; loading limit; circulation lag; Kochin integral; slice waves; friction; hydrostatics; surge added mass; rudder wake deficit | Shed fraction on round sections (the author: "the one tunable I could not derive"); transom reduction function    | η per closed body; two added-mass tables (rigid lid for sideways, pressure release for vertical)                                                                |
| **C** water box | 6: grid pressure; wall friction; actuator strips with sectional stall law; tip correction; `p >= 0`; ambient sponge                                                                        | None per boat, but cell size is a hidden one: long-keel lift rests on numerical viscosity                         | Fin or resolved, by thickness in cells; `p >= 0`                                                                                                                |
| **D** strips    | 9 to 10: reactive; circulatory; separated plus friction; attachment state; hydrostatics; wake; Froude blend; suction cap; transom `X₀(Fn)`; wave resistance (absent)                       | `X₀(α)` and `C_d` for hull sections (no validated geometric source)                                               | Strip direction per body (discontinuous near aspect ratio 1); the Froude blend; the suction cap                                                                 |
| **E** compile   | 6 live terms, fed by 3 offline methods (panel code, 20 separated-flow anchor runs, integral boundary layer)                                                                                | Nothing by hand; thousands of fitted numbers per boat                                                             | Solver chosen by flow regime; clamps outside the sweep; "drop interference above a threshold of differential immersion"                                         |

By count nobody unified anything: seven pieces became six to twelve. What changed, in A to D, is that every piece is selected by **local shape and local flow**, never by boat family. That answers his fear, provided the shared rules stay shared.

Three seams recur under different names; the old puzzle survives there:

1. **The round-bilge rule.** A's rule 3, B's shed fraction, D's `X₀` for hull sections, E's anchor runs, C's numerical viscosity are the same unknown: how much sideways momentum a round section leaves behind. It is cross-flow drag renamed. If one sharpness rule does not hold across hulls, per-boat tuning returns in all five. B and D rightly made it their kill test.
2. **The fin stall law.** A, B, C and D import the same Kirchhoff separation function with a lag; E fits its equivalent. Report f ranks stall shape as the most perceptible parameter (5 to 10 percent). So what he notices most is the least derived part of every candidate.
3. **"What is a body."** B's η, D's strip direction, E's states and C's strip weight all depend on whether a keel was authored as its own closed body. That is hull family stored in the data. Only A is nearly indifferent.

## 2. Boats six to eight

- **Planing dinghy.** A is low on lift and needs a transom law and spray rule by hand. B and D are on home ground but chine separation, pile-up and the transom function are hand closures. C needs cell size and step rate set per boat. E needs a new sweep and has no wetted-length jumps.
- **Gaff schooner, deep forefoot.** No new code, but she lives on the round-bilge rule (seam 1) like the Joutsen. B and D get the forefoot's grip from section growth, which is right.
- **Trimaran.** Free in A, B, C; D has no wave interference; E's sweep multiplies.
- **Rowing-type hull.** B's best case. C has three cells across the beam and needs its own grid.
- **Canting keel and daggerboards.** Free in A, C, D. In B a canted fin crosses the slices obliquely and η needs rethinking. In E it is nine or ten sweep dimensions, over budget.

A and C add least. B and D add nothing per boat but a closure per new phenomenon (chine, spray, ventilation): a slower-growing list, but a list. E adds a new opaque model every time.

## 3. Would he feel it

Using f's ranks. Rank 3 (where yaw damping and entrained water sit) arises from geometry in all five: the solid win over the constant 6x6 matrix, and why the Folkboat will turn like one. Rank 1 (slip grows as speed falls) is free in all. Rank 2 (how she lets go) is seam 2.

- **A.** Difference arises for the right reason: one wing versus a fin and a rudder, keel-line sheet versus trailing edge, the rudder as a flap changing the whole keel. First fake: helm chatter as panels cross the waterline.
- **B.** The Folkboat is genuinely derived. The H-boat is not: the author concedes most of its side force comes from closures. First fake: a keel-hung rudder that is too powerful, and dead chop response (no radiation memory).
- **C.** Zero knobs, but the Folkboat is its admitted weakest case (errors of tens of percent on a two-cell keel) and the deterministic twin at L/48 is worse. First fake: a noisy tiller, and a long keel whose grip changes with resolution.
- **D.** Best transient story for his own boat (rudder lets go and recovers, real downwash from a wake). But no wave-making resistance means "why they won or lost in these conditions" cannot be answered at hull speed or in chop. First fake: no hull-speed wall.
- **E.** Probably fine inside the sweep, and he could never see why. "A model per boat as a tank test is per boat" is his fear restated, and its offline solver is candidate A, unwritten.

## 4. Report f

Strong: feel as rates, orderings and letting go; the hold-out rule; the keel morph test.

Weak:

- **Load-bearing and unverified.** Nearly every number in section 2 is a script estimate on Folkboat dimensions "from memory": the 9,000 against 2,000 kg of entrained water, the equal 3 m² per radian, the 6 to 8 s tack "recollection". The noticeability thresholds come from an abstract, from aviation with motion cues, yet they set the tier C bands and the verdict that separation lag is "safe to approximate".
- **Tests that discriminate nothing.** A1 (swap the files) and A4 (energy decays) pass for the current design too. The morph test A2 is the good one and cuts exactly at the "what is a body" seam, but f does not say how separate bodies are to be morphed.
- **Missing tests.** Bake a boat nobody tuned for and count hand edits, which measures his fear directly. One round-bilge rule across three published drift hulls. Resolution independence. The 20 times real time demand silently excludes C and strains A.
- **Missing from the sailor's list.** The groove when pinching; roll damping downwind, where a long keel differs most; stopping in chop, ranked eighth although it is the Folkboat's winning condition; the hull-speed wall, dismissed as a small hump; tiller torque; crew weight.

## 5. Ranking by how well each answers the owner

1. **A**: the only one where hull, keel and rudder are one thing; fewest additions per new boat. Least proven.
2. **B**: one law a sailor can follow, with wave drag included; honest that fins are hosted, not derived.
3. **D**: B's law with a better fin and wake, but no waves.
4. **C**: truly no knobs, but the Folkboat is its worst case and the helm is noisy.
5. **E**: a model per boat, opaque, and dependent on writing A first.

A, B and D are converging on one model; their order matters less than the shared seams.

## 6. The model I would want

Every wet surface of the boat is one body in one flow, and the water is asked a single question each instant: what have you been pushed, and what did you keep? Deep, sharp parts (fin, rudder, the edge of a long keel) leave a trail in the water behind them, and that trail is the grip, with its own delay, its own drag, and its wash on whatever follows (A's sheets, or D's wake as the cheap form). The body of the hull shoves each slice of water sideways and down as it passes, and what the slice keeps is leeway resistance, planing lift and the slam (B's law). One number per strip says how well the water is still following the surface, and it always lags (D). The waves she makes are read off the same slices (B's Kochin sum). One friction line, and one rule for round bilges proven on three published hulls first. Nothing in it knows the word keel.
