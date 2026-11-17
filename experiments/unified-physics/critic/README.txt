Critic scripts. None modifies the result folders; all run in scratch copies.
  patch_sim.py      run in a copy of h4-tack/code: adds KNOB switches to sim.mjs (entrained-water scale, r*Iy scale, keel-wash scale, suction loss with loading)
  crit_tack.mjs     same folder, after the patch: tack with the surge impulse split by source.  node crit_tack.mjs '[{"gScale":0.5},{"hard":10}]'
  crit_chatter.mjs  same folder: surge/keel/rudder force jump between sub-steps against marker spacing and step
  michell_sys1.py   run in a copy of h3-waves/code: Michell drag in newtons for Delft hulls 1 and 3
