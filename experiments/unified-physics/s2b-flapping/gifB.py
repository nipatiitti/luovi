import outdir  # run in out/
import pickle, os, numpy as np
from PIL import Image, ImageDraw
from render import *
from man import *
k=dict(N=16,hz=480,variant='c',niter=2,rinf=0.8,crimp=0.002,linesearch=True)
r,o=go('tack',frame_hz=20,rec_hz=480,**k); print(r)
t=o['t']; W,H=900,600; os.makedirs('frB',exist_ok=True); fr=o['frames']
def phase(tt):
    if tt<3: return "On the first tack: sail full, sheet loaded"
    if tt<5.0: return "Turning through the wind: the luff lifts, the sail empties"
    if tt<7.0: return "Aback: the wind is on the other side, the boom is thrown across"
    return "The boom fetches up on the sheet and the sail fills on the new tack"
for i in range(len(fr)):
    tnow=fr[i]['t']; im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.text((12,8),"A tack: the wind swings across the bow, the sail goes aback and refills",font=font(19,True),fill=INK)
    d.text((12,34),"Watch the sail turn inside out, the boom cross, and the jerk in the sheet when it fetches up. 16 panels, 480 steps a second, 2 solver passes.",font=font(12),fill=INK)
    c_,s_=np.cos(-CL),np.sin(-CL); rot=lambda P_: np.stack([c_*P_[:,0]-s_*P_[:,1], s_*P_[:,0]+c_*P_[:,1]],1)
    g=dict(fr[i]); g['X']=rot(g['X']); g['wP']=rot(g['wP']) if len(g['wP']) else g['wP']
    import render as RR
    RR.ANCHOR=tuple(rot(np.array([[2.6,-1.2]]))[0])
    P=draw_sail(d,(8,58,892,58+380),g,scale=150,wind_arrows=False)
    # wind arrow at the luff, pointing where the wind blows to
    a=MAN['tack']['wdir'](tnow)-CL; lu=P((0,0)); L=45
    tail=(lu[0]-L*np.cos(a)-25*np.cos(a), lu[1]+L*np.sin(a)+25*np.sin(a)); head=(lu[0]-25*np.cos(a), lu[1]+25*np.sin(a))
    d.line([tail,head],fill=GREEN,width=5); ux,uy=np.cos(a),-np.sin(a)
    d.polygon([(head[0]+12*ux,head[1]+12*uy),(head[0]-8*uy,head[1]+8*ux),(head[0]+8*uy,head[1]-8*ux)],fill=GREEN)
    d.text((max(14,tail[0]-10),tail[1]-24),"wind",font=font(13,True),fill=GREEN)
    cl=(lu[0]+150*5.0, lu[1]); d.line([lu,cl],fill=(200,200,200),width=1); d.text((cl[0]-110,cl[1]+4),"boat's centreline",font=font(11),fill=GREY)
    d.text((200,66),phase(tnow),font=font(16,True),fill=INK)
    j=min(len(t)-1,int(tnow*480)-1); d.text((200,90),f"time {tnow:4.1f} s   sheet tension {o['Ts'][j]:.0f} N per metre of sail height",font=font(13),fill=GREY)
    trace(d,(8,444,892,444+140),t,[(t,o['Tmax'])],tnow,14.0,800,"sheet tension, N per metre of sail height",[ORANGE],ticks=[0,400,800])
    im.save(f'frB/f{i:04d}.png')
save_gif('frB','tack_aback_refill.gif',20)
