#!/bin/sh
# Follow-up: evenly spread angles (L2b, L4b) on every sea, the doubly incommensurate probe (L5) where it applies.
cd "$(dirname "$0")"
for sea in storm gulf archipelago moderateOld; do
  ( for L in L2b L4b; do
      node --max-old-space-size=8000 search.mjs $sea $L 1,2,3 128 > out/$sea-$L.jsonl
      PROFILE=1 node --max-old-space-size=8000 search.mjs $sea $L 1,2,3 128 > out/profile-$sea-$L.jsonl.txt
    done
    case $sea in storm|moderateOld)
      node --max-old-space-size=8000 search.mjs $sea L5 1,2,3 128 > out/$sea-L5.jsonl
      PROFILE=1 node --max-old-space-size=8000 search.mjs $sea L5 1,2,3 128 > out/profile-$sea-L5.jsonl.txt;;
    esac ) &
done
wait
node variance.mjs > out/variance.txt
