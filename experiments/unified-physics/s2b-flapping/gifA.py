import outdir  # run in out/
import pickle, os, numpy as np
from PIL import Image, ImageDraw
from render import *
tags=[('n16','16 panels, 480 steps a second, real cloth stiffness'),('n32','32 panels, 960 steps a second, real cloth stiffness'),
      ('n64','64 panels, 960 steps a second, real cloth stiffness'),('n16stiff','16 panels, 480 steps, cloth made 100 times stiffer to bend')]
R={k:pickle.load(open(f'gA_{k}.pkl','rb')) for k,_ in tags}
W,H=900,770; pw,ph,th=438,215,90; os.makedirs('frA',exist_ok=True)
# slow motion: 6.0 to 9.0 s of flapping shown at one fifth speed (60 frames per simulated second, played at 12 a second... use every frame at 20 fps = 1/3 speed)
i0=int(6.0*60); n=int(3.0*60)
for i in range(n):
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    tnow=R['n16']['frames'][i0+i]['t']
    d.text((12,8),"Does the flapping depend on how finely the sail is cut up?",font=font(19,True),fill=INK)
    d.text((12,34),"Same sail, same wind, sheet let go. Watch whether the four flap at the same rate and size. Slowed down 3 times.",font=font(12),fill=INK)
    d.text((12,51),f"time {tnow:5.2f} s   3 m chord, 8 m/s wind from the left, boom free to swing",font=font(12),fill=GREY)
    for j,(k,title) in enumerate(tags):
        r=R[k]; x0=8+(j%2)*446; y0=74+(j//2)*345
        f=r['frames'][min(i0+i,len(r['frames'])-1)]
        draw_sail(d,(x0,y0+20,x0+pw,y0+20+ph),f)
        d.text((x0+2,y0),title,font=font(13,True),fill=INK)
        m=r['m']; d.text((x0+50,y0+26),f"{m['f_peak']:.1f} Hz, {m['rms_cm']:.0f} cm" if m else "blew up",font=font(18,True),fill=BLUE)
        t=r['t']; trace(d,(x0,y0+24+ph,x0+pw,y0+24+ph+th),t,[(t,r['y']*100+30)],tnow,9.0,60,"cloth at three-quarter chord, cm off the boom line (+30)",[BLUE],ticks=[0,30,60],tmin=6.0)
    d.text((12,H-18),"blue line: cloth    grey: boom    dots: vortices shed from the leech    number: main flapping rate and its size over 5 s",font=font(12),fill=INK)
    im.save(f'frA/f{i:04d}.png')
save_gif('frA','resolutions_side_by_side.gif',20)
