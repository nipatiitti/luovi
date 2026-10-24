#!/bin/sh
# Slope max per shift-distance annulus for every sea and layout; the candidates at band sizes 32 and 256.
cd "$(dirname "$0")"
for sea in storm gulf archipelago moderateOld; do
  ( for L in L0 L1 L2 L3 L4; do PROFILE=1 node --max-old-space-size=8000 search.mjs $sea $L 1,2,3 128 > out/profile-$sea-$L.jsonl.txt; done
    for L in L1 L2 L4; do node --max-old-space-size=8000 search.mjs $sea $L 1,2,3 32,256 > out/$sea-$L-N.jsonl.txt; done ) &
done
wait
