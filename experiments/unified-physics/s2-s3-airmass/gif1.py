import outdir  # run in out/
import pickle, os, numpy as np
from PIL import Image, ImageDraw
from render import *
tags=[('a','a) air force from the previous step (explicit)'),('b','b) air mass lumped per node, inside the solve'),
      ('c','c) lattice air-mass matrix inside the solve'),('d','d) no air mass: pressure polar per panel')]
R={k:pickle.load(open(f'run_{k}_240_4_03.pkl','rb')) for k,_ in tags}
W,H=900,790; pw,ph,th=438,235,82
os.makedirs('fr1',exist_ok=True)
nf=270; first=R['c']['frames'][0]
for i in range(nf):
    tnow=(i+1)*0.1
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.text((12,8),"Four ways to couple the air to the cloth, same sail, same wind, sheet eased slowly",font=font(19,True),fill=INK)
    d.text((12,34),"Watch which ones fill, which blow up, and how each one flaps once the sheet is eased. Sail section seen from above, 8 m/s wind from the left.",font=font(12),fill=INK)
    d.text((12,51),f"time {tnow:4.1f} s    sheet length {R['c']['Ls'][min(len(R['c']['Ls'])-1,int(tnow*240)-1)]:.2f} m    (240 steps per second, 4 solver passes, strong numerical damping)",font=font(12),fill=GREY)
    for j,(k,title) in enumerate(tags):
        r=R[k]; x0=8+(j%2)*446; y0=72+(j//2)*358
        fr=r['frames']; blown=r['res']['blown'] and tnow>r['res']['t_end']
        f=fr[min(i,len(fr)-1)] if len(fr) else first
        if blown and k=='a': f=first
        draw_sail(d,(x0,y0+20,x0+pw,y0+20+ph),f,blown=blown)
        d.text((x0+2,y0),title,font=font(14,True),fill=INK)
        if blown:
            d.text((x0+60,y0+30),f"BLEW UP at {r['res']['t_end']:.2f} s",font=font(17,True),fill=RED)
        m=r['t']<=min(tnow,r['res']['t_end'])
        trace(d,(x0,y0+20+ph+4,x0+pw,y0+20+ph+4+th),r['t'],[(r['t'],r['Tmax'])],tnow,27.0,150,"sheet tension, N per metre of sail height",[ORANGE],ticks=[0,75,150])
    d.text((12,H-18),"blue line: cloth    grey: boom    orange: sheet (thin when slack)    dots: vortices shed from the leech (red and blue spin opposite ways)",font=font(12),fill=INK)
    im.save(f'fr1/f{i:04d}.png')
save_gif('fr1','couplings_side_by_side.gif',20)
