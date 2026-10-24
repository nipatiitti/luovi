#!/bin/sh
# Captures every view in every layout with the worktree's shots script, one run (one fresh page) per layout.
OUT=/private/tmp/claude-502/-Users-niilojaakkola-projects-luovi/13e248e8-19fc-4c78-8792-faa277084d9d/scratchpad/visual/shots
TOOL=/Users/niilojaakkola/projects/luovi/.claude/worktrees/agent-a2339e346504c5316/packages/tool-scenario
for L in L0 L1 L2 L3 L4; do
  LAYOUT=$L node "$TOOL/shots/shots.ts" --out "$OUT/$L" || echo "layout $L failed"
done
