# First visual sailing test: two boats, real controls, flat water

Six GIFs (`g0` rudder, `g1` tack, `g2` puff, `g3` bear away, `g4` stop and start at 6x), `sailing-test.html`, `code/`. No constant was tuned to a manoeuvre.

## Real model and stand-ins

**Model (solid arrows):** h4 slice hull, 1/240 s. Global changes: slices averaged over their cell; suction fading as (held/linear loading)²; h1b attachment number as a lagged state per station; turned sections work in the velocity component normal to their surface (needed for 60° of rudder); wash felt at (1 + x/√(x²+s²))/2 of its far-wake value (half at the shedding edge, the lifting-line result; no constant). Entrained water not reduced. Boats differ only in data.

**Stand-ins (dashed arrows, strip on screen):** Delft wave drag; flat water, steady wind, no height profile; sails from a table. **The table is not from the s4 lattice**, which was too slow for 3330 cases a boat. I wrote a small steady horseshoe lattice (one vortex per strip, mirrored in the water) with the s4 strip separation state and plate law. Cloth rule: a strip struck on its lee face carries nothing; a jib sheeted to windward fills aback.

## Constants and sources

- Slice law and attachment number (1.25, 0.1): h1b, frozen. Lags 1.5 chord transits (Beddoes-Leishman). Sail separation suction 0.5 to 1.0, plate law, camber 10%: s4.
- Assumed: twist 10° plus 0.25° per degree of sheet; rudder 120°/s, sheets 25°/s; windage 1.2 m² and surge entrained water 5% (h4).
- Wave drag: Keuning and Katgert 2008 (research note dsyhs-hboat).
- H-boat: LWL 6.38 m, 1869 kg with 300 kg crew, P 8.70, E 3.00, I 7.94, J 2.47, 15.85 + 10.48 m² (ORC, research notes).
- Folkboat: LWL 6.03, beam 2.25, draft 1.21 m, 2150 + 240 kg, P 8.75, E 3.40, I 7.89, J 2.50 (goodoldboat.com saildata).
- Mine: keel and rudder planforms, mast position, GM 0.77 and 0.63 m, Folkboat hydrostatics.

## Numbers (12 knots unless stated; H-boat / Folkboat)

- **Close-hauled, 45°:** 6.5 / 6.1 kn, leeway 4.1 / 5.2°, heel 20 / 18°, 1.8 / 4.4° of **lee** helm.
- **ORC loose check, H-boat:** 5.39 kn against 4.55 at 8 kn; 6.56 against 5.42 at 16 kn. About 20% fast.
- **Rudder 30 / 45 / 60°, coasting from 5 kn (H-boat):** turn rate 14.5, 19.4, 21.2 °/s; speed lost in 4 s 36, 53, 68%; water angle on the rudder peaks at 21, 30, 39°, easing to 10, 16, 21°. **From 1 kn:** 3.0, 3.9, 4.2 °/s; speed lost 11, 20, 30%; attachment down to 0.31. Pass at speed; at 1 knot the brake triples for 40% more turn, yet 60° never turns worse than 30°.
- **Tack, helm 10 / 20 / 35°:** on the new course in 13.1, 7.8, 5.3 s / 16.2, 8.7, 5.9 s; speed lost 37, 35, 46% / 39, 40, 53%; lost to windward 1.0, 2.1, 5.4 m / 0, 2.8, 7.8 m.
- **Puff to 18 kn:** held, heel 43 / 38°; main eased, heel settles at 6 / 8°; tiller let go, luffs 8° in 17 s.
- **Bearing away:** on the broad reach in 4.9 / 4.4 s whether the main is pinned or eased.
- **Stop and start:** stopped 92 / 112 s after luffing; sternway 0.6 / 0.5 kn; backed jib and reversed helm swing the bow off in 6 s; 4 kn again after 17 / 22 s.
- **Keel wash** removes 81 / 94% of the steady rudder angle.
- **Page:** 0.2 to 0.45 ms of model per frame at 60 frames a second; headless test clean at desktop and phone size.

## What looks wrong to me

- Lee helm: let go, both boats bear away slowly. So the boat does **not** refuse to bear away with the main pinned, and barely rounds up in a puff. Mast and keel positions are my estimates.
- Too fast upwind and too much heel at 16 to 18 kn: sails have no friction drag and too little induced drag.
- The Folkboat turns as fast as the H-boat (h4 said 1.2 times slower) and tracks no better hands-off; it does slide more.
- Coasting to a stop takes a minute and a half: flogging sails have no drag.
- Hard turns shed much speed; peak rudder load 2900 N looks high.

## Could not do

The s4 lattice; wind height profile; a free-trailing tiller ("let go" centres it); cloth; a recheck of the hull changes against h1b's tank cases. Sail-table repairs after a fault: a slack main rolled the boat violently (hence the cloth rule); camber lift moved to mid-chord.
