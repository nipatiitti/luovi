#!/bin/sh
# Frame-rate runs: headed Chrome, vsync and the frame-rate limit off, 1280 by 720 at device scale 1, each layout on its
# own fresh page, three rounds with the layout order reversed on the middle one so drift over the session does not
# favour a layout. Each run: 3 s warm-up, then 12 s recorded, per view.
OUT=/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual/fps
TOOL=/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario
VIEWS=bothnian.oblique-foam,helsinki.oblique-foam,bothnian.oblique
mkdir -p "$OUT"
for R in 0 1 2; do
  if [ "$R" = 1 ]; then ORDER="L4 L3 L2 L1 L0"; else ORDER="L0 L1 L2 L3 L4"; fi
  for L in $ORDER; do
    LAYOUT=$L DSF=1 node "$TOOL/shots/fps.ts" --out "$OUT/$L.r$R.json" --views $VIEWS --warmup 3 --seconds 12 2>&1 | grep -v favicon | sed "s/^/$L r$R: /"
  done
done
# A cross-check at 2560 by 1440 (device scale 2), where the per-pixel work weighs more: the storm oblique view with foam.
for R in 0 1; do
  if [ "$R" = 1 ]; then ORDER="L4 L3 L2 L1 L0"; else ORDER="L0 L1 L2 L3 L4"; fi
  for L in $ORDER; do
    LAYOUT=$L DSF=2 node "$TOOL/shots/fps.ts" --out "$OUT/$L.hi.r$R.json" --views bothnian.oblique-foam --warmup 3 --seconds 12 2>&1 | grep -v favicon | sed "s/^/$L hi r$R: /"
  done
done
