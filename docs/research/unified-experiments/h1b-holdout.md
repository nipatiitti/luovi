# H1b hold-out: the repaired round-bilge rule on hulls it had not seen

## 1. Verdict

**Hulls: survived, with two stated gaps. Fins: killed.** On 35 unseen Delft models no hull's mean side force is more than 15% off and no hull's mean centre more than 0.10 L off, with every constant frozen. Single runs do go outside: at leeway under 3° and in fast runs (Froude 0.40 and above). An isolated fin is 15 to 23% too strong and never lets go with a drop.

## 2. What was run

Frozen: sharpness constant 0.1, shed fraction 1 everywhere, cross-flow drag 2.0 to 0.6, separation travel 1 draft, loading length span/4, largest loading 1.1. Nothing was changed.

- **Hold-out hulls:** every Delft model with keel, rudder and upright yawed tests except Sysser 1: 35 models, 396 runs, leeway 0.5 to 12°, Froude 0.20 to 0.45 (DOI 10.4121/21501402; particulars from 10.4121/21501375). The data stops at 12°, not 23° as I said before. Heeled runs exist but the code cannot heel a section; not run.
- **Tanker:** real KVLCC2 lines exist only as IGES surfaces, which I could not read in the time. Instead the reference was verified against Yasukawa and Yoshimura 2015 (it matched my memory exactly), and every guessed feature of the caricature hull was varied.
- **Fin:** foil-shaped fins of aspect ratio 1, 2, 3 against Whicker and Fehlner 1958 (their fitted lift curve; stall points recalled, the scanned plots were unreadable).

## 3. Numbers

| Delft hold-out, model against tank        | Result                                                |
| ----------------------------------------- | ----------------------------------------------------- |
| Mean side force per hull, 35 hulls        | −7% to +13%                                           |
| All 396 runs: side force mean, scatter    | +3.9%, 10.3%                                          |
| Normal speed, leeway 3° and up (223 runs) | 7 runs beyond 15%; centre worst 0.095 L               |
| Normal speed, leeway under 3° (113 runs)  | 17 beyond 15%; 15 centres beyond 0.10 L               |
| Froude 0.40 and above (60 runs)           | 13 beyond 15%; 20 centres beyond 0.10 L, worst 0.31 L |
| Drag due to side force                    | 23% low on average                                    |
| Original rule on the same runs            | −2.1%, 8.8%: no worse                                 |

| Tanker, seven hull variants | Original rule  | Repaired rule                   |
| --------------------------- | -------------- | ------------------------------- |
| Centre, worst error         | 0.20 to 1.59 L | 0.03 to 0.08 L                  |
| Side force, worst error     | 17 to 64%      | 6 to 37% (17% as first guessed) |

| Fin, aspect ratio 3 / 2 / 1 | Tank               | Frozen             | With attachment number |
| --------------------------- | ------------------ | ------------------ | ---------------------- |
| Lift slope per radian       | 3.15 / 2.46 / 1.43 | 3.63 / 2.91 / 1.76 | same                   |
| Stall angle                 | 23 / 29 / 38°      | none below 40°     | 19 / 23 / 33°          |
| Peak lift                   | 1.25 / 1.33 / 1.24 | no peak            | 1.17 / 1.20 / 1.16     |

## 4. GIFs

- `holdout_hulls.gif`: each of the 35 hulls in turn, model line against tank dots, and a growing model-against-measured plot.
- `fin_stall.gif`: three fins turned to 40°; tank curve, frozen rule, and the rule with one attachment number.

Every run is in `holdout_cases.csv`, every hull in `holdout_hulls.md`.

## 5. Surprises, and next

- The Delft hulls cannot tell the repair from the original rule: their round canoe bodies carry too little. Only the tanker separates them, and there the original fails the centre in all seven variants. The earlier kill stands, still on a caricature.
- The measured centre sits 4% L further forward at small leeway and up to 0.3 L further forward in fast runs. That is speed dependent, so it is missing free-surface physics, not a constant.
- The frozen rule cannot make a fin drop. One attachment number per slice run does, and brings no seam: the stall angle moves smoothly with aspect ratio and through the keel morph (29° rising to none). It adds one constant, chosen once, and stalls 4 to 6° early.
- Next: read the IGES lines (Delft and KVLCC2); cross-flow drag acting only near the tip of a tall fin.

## 6. Caveats

- Canoe bodies are ellipses from main particulars, fore-and-aft symmetric.
- Ten models list the rudder at ordinate 0; I placed it there. Five of the eight worst centres are among them.
- The tanker's repaired side force swings with its bilge radius (6 to 37%): the cross-flow drag rule is not settled on box sections.
- Part of the fin's excess slope is foil thickness entering the section added mass.
