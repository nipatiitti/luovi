# c1: h1b hold-out rerun through the current model

## Verdict

**Upright: not survived. The break is in the base model, not in R1 or R2.** With both flags off, the hull means run from −1% to +33% (h1b: −7% to +13%). Against h1b's steady law the model reads +7% on side force, with the centre 0.03 L aft. R1 and R2 each lower side force by about 1%. **Heeled: cannot be scored.** There is no heeled tank data here, and h1b ran none.

## Run

- **Cases:** h1b's 35 hulls (Sysser 1 excluded), 396 upright runs, built with h1b's own hull code and tank file.
- **Model:** `sailing-test-v3/code/model.js`, unchanged, towed captive (r2 method) with sails down and rudder at 0. Each tow ran 4 hull transits and averaged the last one; the last two transits agree within 1% (3.6% on Sysser 26).
- **Scale:** Froude-scaled to full size, because 0.05 m slices give a model rudder only 2. At model scale the error is 1.2 points lower.
- **Scoring:** as in h1b.

| Upright vs tank | Hull means, side | All runs: mean, scatter | Centre mean (worst) |
| --------------- | ---------------- | ----------------------- | ------------------- |
| h1b steady law  | −7.0…+13.4%      | +3.9%, 9.5%             | +0.031 L (0.31)     |
| base            | −0.6…+32.8%      | +10.8%, 10.8%           | +0.060 L (0.39)     |
| R1 only         | −1.8…+33.0%      | +9.9%, 11.0%            | +0.056 L (0.39)     |
| R2 only         | −1.3…+26.0%      | +9.8%, 10.1%            | +0.056 L (0.36)     |
| both            | −2.4…+27.8%      | +9.1%, 10.4%            | +0.053 L (0.37)     |

The wide, shallow hulls do worst (beam/draft 11 to 16; Syssers 24, 26, 31, 33): +21% to +33%, against +3% to +13% in h1b.

## Cause

I ran diagnostic copies of the base model on 8 hulls (53 runs). Against h1b's law, the base model is +6.6% and 0.026 L aft. Undoing one change at a time:

- **Lagged attachment number:** +2.7%, 0.007 L.
- **Wash rule (replaced by far-wake wash):** +3.8%, 0.013 L.
- **Squared suction fade:** no change.

The two effects overlap, so their drops do not add up.

## Heeled (flag against flag)

Side force against upright, on one run per hull at about 6° leeway:

- **10° heel:** −2.7% in the base model, −3.1% with R2.
- **20° heel:** −10.6% in the base model, −14.3% with R2 (−25% on the wide hulls).
- **R2 centre shift at 20°:** 0.04 L forward.
- **R1:** no effect at heel.

Scoring these needs the heeled blocks of the Delft data (DOI 10.4121/21501402), which are not stored here.

## Files

- `code/tow.mjs`: the tows.
- `code/score.mjs`: scoring, written to `out/score.txt`.
- `code/diag.mjs`: the diagnostic copies, written to `out/diag.txt`.
- `out/tow.json`: every run.
