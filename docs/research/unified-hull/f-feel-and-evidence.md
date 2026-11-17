# F. Feel and evidence: what a hull model must get right, and how to tell

No force model is proposed here; this is a set of requirements and tests for judging the other five candidates.

Labels: **[E]** from a source I opened, **[K]** textbook knowledge not re-opened, **[I]** my inference, **[S]** speculation. "est." marks numbers from a throwaway script on rough dimensions.

## 1. What feel is made of

A sailor does not feel forces. He feels **rates, delays, orderings and the point where something lets go**. The steady polar is what he judges worst: without instruments nobody separates 5.6 from 5.9 knots, but everybody notices a boat that stops turning head-to-wind or a tiller that goes light.

Four findings from the simulator literature carry over:

- Pilots are more sensitive to the **shape** of a nonlinearity than to its timing. In a TU Delft stall experiment the just-noticeable change was 5 to 10 percent for stall abruptness but 20 to 30 percent for the flow-separation lag. **[E]**
- Mariners judge a ship model by "turn rate, rudder and engine response, acceleration and deceleration", and "will reject simulations they do not believe to be accurate". **[E]** (NRC, _Simulated Voyages_)
- A model tuned on its validation manoeuvres fails nearby: "performing slightly different maneuvers than those used for validation can result in quite inaccurate trajectories", and "field adjustments almost invariably introduce uncertainties and unanticipated inaccuracies". The weak regimes named are slow speed and reversing **[E]**, which for a sailing boat are the middle of a tack and sternway.
- Marine simulation has **no agreed numeric tolerance**. Practice is three to five days of expert mariners iterating; the NRC committee did not endorse that and proposed objective tests plus an impartial expert panel. **[E]**

From this, feel reduces to seven perceptual quantities **[I]**:

1. **Surge time constant**: how long way is carried, how fast a puff becomes speed.
2. **Yaw response**: turn rate per unit of helm; whether the turn continues with helm centred.
3. **The slip law**: leeway against speed and side load, and where it lets go.
4. **Helm load and its sign**: growing with heel, light at stall, reversed astern.
5. **Heel response** to a gust.
6. **Speed cost of turning**.
7. **Orderings between boats**.

Items 1 to 6 are mostly ratios of a force slope to an inertia. A model can miss absolute drag by 8 percent and still feel right; one that misses a ratio by 30 percent, or the shape of a stall, will not.

## 2. The physical effects, ranked by how much a sailor notices them

Rank 1 is the most noticed.

**1. Side force scales with speed squared, so slip explodes when slow.** At fixed sail side force, leeway angle goes as 1/U². For an H-boat carrying 800 N of side force: 3 degrees at 5.8 kn, 7 degrees at 3.9 kn, 12 degrees at 2.9 kn, past stall below that (est.). **[K, I]** This one law produces the feel of a bad tack, of pinching, and of bearing away to build speed. _Demand:_ lateral force from local flow velocity at each part of the body, no speed threshold, valid at any drift angle.

**2. How the lateral plane lets go.** A fin of aspect ratio about 2 stalls abruptly near 12 to 15 degrees. A long keel of effective aspect ratio under 1 has a third of the lift slope per unit area but keeps lifting to 30 degrees on leading-edge and tip vortex lift, at high drag. **[K]** For these two boats slope times area comes out similar (about 3 m² per radian each, est.), so close-hauled leeway is similar, but the H-boat bites or lets go while the Folkboat slides and never quite lets go. **[I]** The stall-noticeability result says this shape is the most perceptible parameter. _Demand:_ stall character follows from planform, not from a per-boat polar.

**3. Yaw inertia against yaw damping, and where the damping sits.** Yaw damping goes as lift slope times area times distance from the pivot squared. The H-boat keel sits at the pivot and adds almost none; nearly all damping and all control come from a spade rudder 2.9 m aft. The Folkboat's lateral plane spreads over 3.8 m with the rudder as a flap on its trailing edge: about twice the yaw damping and nearly twice the total yaw inertia (est.). Its sway added mass is about 9,000 kg, four times its own mass, against roughly 2,000 kg for the H-boat (est., slender-body). **[I]** That entrained water is what "tracks as if on rails" means. _Demand:_ added mass and yaw damping computed from the geometry's lengthwise distribution; a constant 6x6 matrix borrowed from a family cannot separate these two boats.

**4. Surge time constant.** Mass plus surge added mass, over the slope of resistance. H-boat about 8 s linearised at 5 kn, half speed lost in about 3.5 boat lengths of coasting; Folkboat about 9 s and 4.1 lengths (est.). **[I]** The straight-line difference is only about 15 percent, close to unnoticeable. So "the long keel carries her way" is probably not about coasting; it would come from less drag per degree turned (items 2 and 6) and more momentum per wave impact. This prediction can prove me wrong and is a good first check of any candidate.

**5. Rudder load, stall and reversal.** A spade rudder is a separate foil in the keel's downwash; it stalls near 15 degrees of local incidence and ventilates when heeled hard. A keel-hung rudder is a flap that cambers the whole plane: weak at low speed, no clean stall, poor astern. **[K]** In the AC45 simulator study, too much rudder too fast slowed the turn and raised speed loss through rudder stall; the best tack used a 7 s rudder stroke. **[E]** _Demand:_ rudder incidence includes yaw rate times arm and keel downwash; helm torque is an output; the same equations give reversed helm astern.

**6. Drag in the turn.** Tack loss is induced drag at large drift, rudder drag and windage while the sails are empty. Measured on a keelboat from NMEA logs: typical good tacks cost 1 to 3 boat lengths, bad ones 6 or more, with recovery taken at 90 percent of prior speed. **[E]** _Demand:_ drag due to side force at all angles, which the current design leaves unowned.

**7. Heel coupling.** Heel moves the sail force outboard and makes the waterplane asymmetric, both giving weather helm; a gust therefore arrives as heel, then helm, then speed. **[K]** _Demand:_ forces integrated on the actual heeled wetted geometry.

**8. Wave response in surge and pitch.** Hobby-horsing, punching through chop, surfing onset. **[I]**

**9. Absolute steady speed.** Noticed only against instruments or another boat.

**Safe to approximate** **[I]**: resistance humps under about 5 percent, frequency dependence of added mass at manoeuvring time scales, the exact wave pattern, the flow-separation lag.

## 3. The five boats: what each must do

Dimensions: H-boat from the ORC one-design certificate **[E]**: LOA 8.28 m, 1,456 kg, draft 1.26 m, wetted surface 10.64 m², GPH 749.1. Folkboat figures are from memory **[K]** (IF-boat: LOA 7.87 m, about 2,150 kg, draft 1.21 m) and must be checked against class rules.

**H-boat.** Must tack in roughly 6 to 8 s with moderate helm (my recollection of the type, unverified), losing 1 to 3 boat lengths. Slammed over, the rudder must stall and the tack get worse. Coming out slow and sheeted hard, the keel must stall and the boat slide until the helmsman bears away. Weather helm must rise with heel.

**International Folkboat.** Must do everything more slowly in yaw and need more helm for longer. The turn can be stalled head-to-wind in light air and chop. No sharp keel stall, only a rising slide. Holds course hands-off better than the H-boat; nearly unsteerable astern. Against the H-boat it must lose in light air (more wetted area per sail area, more mass) and close up upwind in breeze and chop (higher ballast ratio from memory, more momentum per wave). If these outcomes need a Folkboat-specific coefficient, the candidate has failed the owner's main concern.

**Suomen Joutsen.** Close-hauled about six points off the wind with about a point of leeway. Tacking takes minutes, loses most of the way, and normally passes through sternway with the helm reversed; in light air or head sea she misses stays and must wear, giving up ground to leeward. **[K]** A Japanese simulation of a single-square-sail trader showed the failure mode: rudder over, speed falls, leeway rises rapidly, the ship stops head to wind; its wearing simulation matched full-scale trials. **[E]** The hull is the lifting body, aspect ratio around 0.1, and the sails do much of the steering, so the hull model must give sensible forces at any drift angle near zero speed.

**Beach catamaran.** Two slender hulls far apart give high yaw inertia and damping against a small rudder moment and little momentum, so it stops in irons unless the jib is backed. Flying a hull roughly halves hull drag (500 N to 220 N at 10 kn on an AC45 **[E]**) and removes one hull's side force and damping. The transition must be continuous in immersion; there is no "flying" state.

**Class40.** Must show no hard hull-speed wall, bow-up trim with speed, and surfing: on a wave face, slope force plus sail drive exceeds resistance and the boat accelerates to wave speed and stays there. Broaching must appear when the rudders unload. A fast-craft study found that heel-induced yaw moment changes sign along the wave and that calm-water values gave the opposite conclusion on broaching. **[E]** So forces must be evaluated on the instantaneous wetted body in the wave.

## 4. Feel: the transients, as observable sequences

A candidate should reproduce these orderings without tuning **[I]**.

- **Tack:** helm over; yaw rate builds within a second (H-boat) or two to three (Folkboat); drift swings to the outside of the turn; speed falls fastest between luff and head-to-wind; on the new tack leeway is large until speed returns.
- **Puff:** heel first (1 to 2 s), weather helm with it, speed last. If speed arrives before heel the model is wrong.
- **Broach:** heel, helm load rising, rudder stalls or ventilates, helm goes light, the boat rounds up regardless of tiller.
- **Sternway:** speed through zero, bow falls off, rudder sense reversed, way gathers. The H-boat recovers in seconds; the Folkboat needs the backed jib.

## 5. Cost and determinism, as requirements

Section 7 needs about 200 scripted manoeuvres per candidate change, so the worker should run headless at 20 times real time. Same-machine determinism is required; cross-machine bit equality is not, the bands being far wider than floating-point drift.

## 6. Where this angle breaks

- **There is very little open measured manoeuvring data for these boats.** I found no full-scale tack record for an H-boat or Folkboat, no measured long-keel against fin-keel turning comparison, and no open tall-ship tacking logs. The Masuyama and Keuning tacking papers exist but I could not get their content. Most of section 2's numbers are my estimates.
- **ORC polars are a rating instrument, not truth.** They are equilibrium VPP output from a regression-based hull model with idealised crew and trim; ORC itself is running a review with one builder into "consistent offsets in speed or polars" and where the model is "extrapolating beyond its validated domain". **[E]** My judgement: good to roughly 3 percent for mainstream fin-keel boats in 8 to 16 kn, worse in light air, weakest for types far from the Delft-series parents, which includes a long keel. **[I]** A hard 5 percent gate against ORC can fail a correct model on the Folkboat and pass a wrong one on the H-boat.
- Perception thresholds are borrowed from aviation with motion cues; on a screen my bands may be stricter than needed. **[S]**

## 7. Proposed "good enough" tests

Tiers A and B are pass or fail; C and D are scored and judged jointly.

**A. Structural tests (binary, no data needed).**

1. No boat-type switch: swap the two section stacks and mass files and the behaviours swap.
2. Geometry morph: stretch the H-boat keel chord in ten steps toward the Folkboat profile. Tack time, stall angle and helm-free stability change monotonically and smoothly.
3. Captive sweep, drift 0 to 180 degrees, speed −2 to +8 kn: force and moment continuous, no kinks.
4. Energy: with sails off, speed only decays.

**B. Ordering tests (binary).** The event orderings of section 4 for tack, puff, broach and sternway; helm sense reversed astern; leeway at fixed side force rising as speed falls; the Joutsen missing stays in light air and tacking in a fresh breeze; the catamaran tacking only with way on or jib backed; the Class40 surfing on a wave the H-boat cannot catch.

**C. Ratio and time-constant bands (scored).** Bands suggested by the noticeability evidence: stall shape and angle within 10 percent, time constants within 25 percent, steady quantities within 8 percent. The boat-specific figures below are my starting guesses, to be replaced by measurement.

- H-boat: tack loss 1 to 3 boat lengths, 6 or more when slammed.
- Folkboat against H-boat: a 90-degree heading change takes 1.3 to 2 times as long; hands-off course holding lasts longer; coasting distance within 25 percent of each other; no lift drop above 10 percent below 25 degrees of drift.
- Speed against ORC: H-boat within 5 percent at 8 to 16 kn upwind and reaching, 8 percent elsewhere; Folkboat within 8 percent. More important: the **difference** between the two boats has the right sign wherever ORC and class racing experience agree on who is faster.

**D. Blind sailing judgement (the agreed judgement).** The owner sails unlabeled pairs: true H-boat build against the same with one quantity changed by 0, 15 or 30 percent (yaw damping, stall angle, surge inertia, rudder area). If he cannot pick the 15 percent case, that band is widened; if he picks it and prefers the altered boat, the model is wrong there. This turns his memory into a measurement.

**Hold-out rule,** from the NRC warning: candidates are tuned, if at all, on straight-line and steady-turn cases only, never on tacks, sternway or surfing.

**The cheapest experiment (one day).** Collect the missing truth: a phone logging GPS, gyro and compass through twenty tacks and a few coast-downs on a real H-boat, or old tracker and NMEA logs if the boat is ashore. That yields surge time constant, yaw rate history and speed loss; the same on a Folkboat gives the tier C ratios. Before that, run test A2 on each candidate with a toy planform: if morphing the keel does not move the tack and the stall the right way, the candidate is dead whatever its polar says.

## 8. Sources

Read in part, through a summarising fetch; quotes are as returned by it:

- NRC, _Simulated Voyages_ (1996), chapter on validation: https://www.nationalacademies.org/read/5065/chapter/9
- ORC one-design certificate, H-boat (dimensions, polar): https://data.orc.org/public/od/2020/hboat.od.pdf
- Giovannetti, Lidtke, Taunton, AC45 tacking simulator (2014): https://eprints.soton.ac.uk/372719/1/1_s2.0_S1877705814006535_main.pdf
- Numerical simulation of tacking, Naniwa-maru (Nippon Foundation library): https://nippon.zaidan.info/seikabutsu/2003/00574/contents/0424.htm
- Tack and gybe loss from NMEA logs (blog, 2015): https://ddieffen.blogspot.com/2015/05/automatic-tacksjibes-performance.html
- ORC and X-Yachts VPP review note (2026): https://blog.getboat.com/news/transparent-scientific-review-orc-x-yachts-2026
- Bonci et al., heel-induced sway and yaw in following waves (2020): https://link.springer.com/article/10.1007/s00773-019-00637-0

Abstract only:

- Subjective noticeability of stall dynamics variations, TU Delft: https://research.tudelft.nl/en/publications/subjective-noticeability-of-variations-in-quasi-steady-aerodynami
- Kerdraon et al., 6-DOF dynamic VPP for offshore racing yachts: https://oskar-bordeaux.fr/handle/20.500.12278/75995?show=full
- SINTEF, validation of ship manoeuvring simulation models (2015): https://sintef.brage.unit.no/sintef-xmlui/handle/11250/2728799

Leads, not evidence. Records opened but no content obtained: Keuning and Vermeulen's tacking model (2005), tack speed loss (2004) and yaw balance (2003) at repository.tudelft.nl; a Kaiwo Maru sailing performance record on CiNii; an ORC certificate that may be a Folkboat. Never opened: Masuyama and Fukasawa's Fair V tacking papers, Harland's _Seamanship in the Age of Sail_, the Delft series database, Class40 polars. Statements resting on these are marked [K].
