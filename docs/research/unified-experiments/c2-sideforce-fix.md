# c2: side-force fix

## Verdict

**Upright hold-out: repaired. Rudder wash: failed, and worse. Heeled: fails.** In a steady tow the model is now h1b's steady law, and that law leaves the rudder almost fully washed out.

## Cause (measured)

- **Wash rule.** The steady law is right. The "half at the line" factor counts the trailing vortices only; with the bound vortex a horseshoe gives (1 + √(x²+s²)/x)/2 in the wake plane, never below the far-wake value.
- **Attachment number.** Neither the number nor its lag was at fault (it changes the steady law by 0.6%). The "station has let go" test ran before the slice loaded up, so any fall in the number shed a rounding-size amount. That set the wake's size at the keel's widest section and lowered the wash at the rudder from 0.96 to 0.87 of the boat's sideways speed.

## Numbers

| Upright, 35 hulls, 396 runs | Hull means  | All runs | Centre   | Wide hulls 24/26/31/33 |
| --------------------------- | ----------- | -------- | -------- | ---------------------- |
| h1b steady law              | −7.0…+13.4% | +3.9%    | +0.031 L | 3/13/3/3%              |
| v3                          | −0.6…+32.8% | +10.8%   | +0.060 L | 21/33/21/21%           |
| C2 (R1, R2 off or on)       | −6.2…+13.5% | +3.7%    | +0.028 L | 2/12/2/2%              |

C2 against h1b's own predictions: −0.2%, scatter 0.7%.

| Heeled, 205 runs, median (mean) | 10°                   | 20°                   |
| ------------------------------- | --------------------- | --------------------- |
| v3 base / R2                    | +16 (22)% / +15 (20)% | +23 (37)% / +18 (28)% |
| C2 base / R2                    | +10 (14)% / +9 (12)%  | +16 (28)% / +9 (18)%  |
| Centre, C2 with R2              | 0.10 L aft            | 0.14 L aft            |

Hulls 24, 26, 28, 31, 46 are 50 to 160% over at 20°. Heel and close-hauled speed are unchanged.

| Keel wash removed at rudder, leeway 3/6/9° | v3        | C2        | Tank      |
| ------------------------------------------ | --------- | --------- | --------- |
| H-boat                                     | 86/86/85% | 95/95/95% | 20 to 60% |
| Folkboat                                   | 80/79/82% | 81/80/83% |           |

| H-boat (C2 off = v3 exactly)     | Before                 | After                  |
| -------------------------------- | ---------------------- | ---------------------- |
| Close-hauled 4.1…12.3 m/s: knots | 5.5/6.4/6.6/6.5/6.2    | 5.5/6.4/6.7/6.5/6.2    |
| leeway °                         | 2.6/2.6/2.2/2.7/4.0    | 2.7/2.7/3.1/4.1/5.7    |
| helm °                           | −0.3/3.1/7.9/11.5/15.4 | −0.1/3.1/7.2/10.5/14.5 |
| Tack 20/35°, s                   | 7.1/5.1                | 6.1/4.1                |
| Hands off 15 s                   | luffs 16°              | luffs 18°              |
| 5 kn 30/45/60°: °/s              | 18.2/25.6/33.0         | 18.9/25.9/31.3         |
| 1 kn: heading after 8 s          | 32/46/56°              | 31/45/55°              |
| Reach puff 22/28/32: off course  | 10/22/36°              | 9/29/40°               |
| Bear away pinned 20/24           | goes / 76° off         | goes / 166° off        |

## GIF

`c2-wash-old-vs-new.gif`: Sysser 33 at 6°, old above new. Old +17%, centre 0.58; new −1%, centre 0.50; tank 0.54.

## Surprises, next

- Rigid-lid lifting line gives no relief: these keels turn about 0.9 of the water, and the rudder sits inside the wake's depth.
- The two tank sources disagree under this law. Force and centre on 35 hulls want a nearly dead rudder; keel-rudder tests want 20 to 60% wash. The tank centre lies between old and new. So keel and hull are probably about 10% strong, hidden by the dead rudder.
- Next: the free surface. A pressure-release surface over the wake leaves 0.42 of the wash on a rudder 0.85 of the keel's depth (my integral, not run). A slice-by-slice estimate says the surface has rebounded by the rudder at 5 knots, so I did not adopt it.

## Caveats

- Heeled tank force taken as Ff + Fa, horizontal (assumed); three runs per hull and heel.
- Leeway is larger only above 6 m/s.

## Change to the model (`code/model.js`, `C.C2`; no new constant)

1. **Wash:** `near = 1` wherever `m.Aw > 0` (was `(1 + xw/√(xw²+sw²))/2`).
2. **Hold test:** the block `if (|Plin·kf| < |Patt|) {shed…}` ahead of the loading test is skipped. After the loading-up block, `else if (loading && |Plin·kf| < |Patt|)`: `shedNow += Patt − Plin·kf; Patt = Plin·kf; if (A0 > Aw) {Aw = A0; xw = 0}`.

Sources: Delft data DOI 10.4121/21501402 (one lookup).
