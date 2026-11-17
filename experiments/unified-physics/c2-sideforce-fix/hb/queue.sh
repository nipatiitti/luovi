#!/bin/bash
# runs one after another: heeled Delft tows, then the v3 test list without and with C2
cd "$(dirname "$0")"
while pgrep -f tow_c2.mjs > /dev/null; do sleep 3; done
(cd .. && node tow_heeled.mjs > out/tow_heeled.log 2>&1)
C2=0 node scen_m1.mjs c2off > ../out/scen_c2off.log 2>&1
node scen_m1.mjs c2on > ../out/scen_c2on.log 2>&1
echo done > ../out/queue.done
