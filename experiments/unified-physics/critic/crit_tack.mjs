import { finBoat, longBoat } from './boats.mjs';
import * as S from './scenarios.mjs';
import { KNOB, Boat } from './sim.mjs';
const rad=Math.PI/180;
function tackDecomp(cfg, rate){
  const { b, steady } = S.settle(cfg, 12, 70);
  // steady force levels
  const o=b.out; const s0={Xs:o.XsAll,Xc:o.Xc,Rf:o.Rf,Rw:o.Rw,rMv:o.rMv,rIy:o.rIy};
  const U0=steady.speedKn*S.KN; let over=false; const lead=1;
  const acc={Xs:0,Xc:0,Rf:0,Rw:0,rMv:0,rIy:0}; let minSp=1e9,tMin=0,t90=null; let maxRud=0;
  const dt=S.DT; let frozen=null;
  for(let i=0;i<240*30;i++){
    const t=b.t; let ctl;
    const wrap=(a)=>Math.atan2(Math.sin(a),Math.cos(a));
    if(t<lead) ctl={deltaCmdDeg:S.helmTo(b,-45),rateDegPerS:25};
    else if(!over && wrap(b.psi+45*rad)/rad<65) ctl={deltaCmdDeg:(KNOB.hard??30),rateDegPerS:rate};
    else {over=true; ctl={deltaCmdDeg:S.helmTo(b,45),rateDegPerS:rate};}
    b.step(dt,ctl,{wind:12*S.KN});
    const sp=Math.hypot(b.u,b.v);
    if(sp<minSp){minSp=sp;tMin=b.t-lead; frozen={...acc};}
    if(t90===null && b.psi/rad>=42) t90=b.t-lead;
    if(t>=lead){ const o=b.out; acc.Xs+=(o.XsAll-s0.Xs)*dt; acc.Xc+=(o.Xc-s0.Xc)*dt; acc.Rf+=-(o.Rf-s0.Rf)*dt; acc.Rw+=-(o.Rw-s0.Rw)*dt; acc.rMv+=(o.rMv-s0.rMv)*dt; acc.rIy+=(o.rIy-s0.rIy)*dt; }
  }
  return {U0kn:steady.speedKn, lee:steady.leewayDeg, rud:steady.rudderDeg, rudF:steady.rudderForceN, entr:steady.entrainedKg, t90, lostPct:100*(1-minSp/U0), tMin, imp:frozen};
}
const show=(tag,r)=>console.log(tag.padEnd(34), `U0 ${r.U0kn.toFixed(2)}kn lee ${r.lee.toFixed(1)} rud ${r.rud.toFixed(1)}deg ${r.rudF.toFixed(0)}N entr ${r.entr.toFixed(0)}kg | t90 ${r.t90?.toFixed(1)}s lost ${r.lostPct.toFixed(0)}% at ${r.tMin.toFixed(1)}s | impulse to min speed [N s]: sails ${r.imp.Xs.toFixed(0)} slices ${r.imp.Xc.toFixed(0)} fric ${r.imp.Rf.toFixed(0)} wave ${r.imp.Rw.toFixed(0)} r*M*v ${r.imp.rMv.toFixed(0)} r*Iy ${r.imp.rIy.toFixed(0)}`);
const cases = JSON.parse(process.argv[2] ?? '[{}]');
for (const k of cases){
  Object.assign(KNOB,{gScale:1,iyScale:1,washScale:1,suctionLoss:false,hard:30},k);
  for (const [nm,cfg] of [['fin',finBoat()],['long',longBoat()]]) for (const rate of (k.rates??[25])) show(`${nm} rate${rate} ${JSON.stringify(k)}`, tackDecomp(cfg,rate));
}
