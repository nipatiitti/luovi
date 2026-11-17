import outdir  # run in out/
import pickle, os, numpy as np
from PIL import Image, ImageDraw
from render import *
from man import MAN, CL
tags=[('b16_480','b) lumped air mass, 16 panels, 480 steps a second',"the boom swings wide and the sheet snatches"),
      ('c16_480','c) lattice air mass, 16 panels, 480 steps a second',"fine ripple only, the boom hardly moves, no snatch"),
      ('ref16_1920','resolved: 1920 steps a second, 6 solver passes',"the boom swings a little, no snatch")]
R={k:pickle.load(open(f'sn_{k}.pkl','rb')) for k,_,_ in tags}
W,H=900,800; os.makedirs('frC',exist_ok=True)
fr0=R['b16_480']['frames']; idx=[i for i,f in enumerate(fr0) if f['t']>=6.0]
for q,i in enumerate(idx):
    tnow=fr0[i]['t']; im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.text((12,8),"Sheet tension inside a flogging sail, head to wind, sheet slowly hauled in",font=font(19,True),fill=INK)
    d.text((12,34),"Watch for the sheet snapping taut (orange spikes). The three versions should agree and do not.",font=font(12),fill=INK)
    j0=min(len(R['b16_480']['Ls'])-1,int(tnow*240)); d.text((12,51),f"time {tnow:4.1f} s   sheet length {R['b16_480']['Ls'][j0]:.2f} m   wind along the boat's centreline",font=font(12),fill=GREY)
    for r,(k,title,note) in enumerate(tags):
        y0=72+r*242; rr=R[k]; f=rr['frames'][min(i,len(rr['frames'])-1)]
        d.text((10,y0),title,font=font(13,True),fill=INK)
        # rotate the picture so the wind comes from the left: rotate points by -CL
        c,s_=np.cos(-CL),np.sin(-CL); rot=lambda P_: np.stack([c*P_[:,0]-s_*P_[:,1], s_*P_[:,0]+c*P_[:,1]],1)
        g=dict(f); g['X']=rot(f['X']); g['wP']=rot(f['wP']) if len(f['wP']) else f['wP']
        import render as RR
        a0=RR.ANCHOR; RR.ANCHOR=tuple(rot(np.array([[2.6,-1.2]]))[0]); draw_sail(d,(8,y0+20,440,y0+232),g,scale=62); RR.ANCHOR=a0
        d.text((60,y0+26),note,font=font(12,True),fill=BLUE)
        t=rr['t']; trace(d,(446,y0+20,892,y0+232),t,[(t,rr['Tmax'])],tnow,18.0,2000,"sheet tension, N per metre of sail height",[ORANGE],ticks=[0,1000,2000],tmin=6.0)
    im.save(f'frC/f{q:04d}.png')
save_gif('frC','sheet_tension_flogging.gif',20)
