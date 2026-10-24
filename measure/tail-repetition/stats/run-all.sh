#!/bin/sh
# One process per sea, layouts in turn; L0 at three band sizes, the candidates at 128.
cd "$(dirname "$0")"
for sea in storm gulf archipelago moderateOld; do
  ( node --max-old-space-size=8000 search.mjs $sea L0 1,2,3 32,128,256 > out/$sea-L0.jsonl
    for L in L1 L2 L3 L4; do node --max-old-space-size=8000 search.mjs $sea $L 1,2,3 128 > out/$sea-$L.jsonl; done ) &
done
wait
