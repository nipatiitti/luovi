import outdir  # run in out/
import pickle, os, numpy as np
from PIL import Image, ImageDraw
from render import *
from sail import *
from ease import analyse
from batch import sched
s=Sim(N=16,hz=240,variant='c',niter=4,rinf=0.3); o=run(s,sched,34.0,frame_hz=10); a=analyse(o,win=0.4)
t=o['t']; N=16; y=a['res'][:,3*N//4]
# sliding flutter frequency: zero crossings of the fast part of the 3/4-chord deflection in a 1 s window
zc=np.concatenate([[0],(np.sign(y[1:])!=np.sign(y[:-1])).astype(float)]); zc[np.abs(y)<0.004]=0
k=240; fz=np.convolve(zc,np.ones(k),'same')/2.0
amp=np.sqrt(np.convolve(y*y,np.ones(k)/k,'same'))*100
aoa=a['aoa']
os.makedirs('fr2',exist_ok=True); W,H=900,640
def phase(tt):
    if tt<2: return "Sheeted in: the sail fills to a steady curve"
    if tt<12.4: return "Easing the sheet: the boom swings out, the sail stays full"
    if tt<13.3: return "The luff lifts first: the front of the sail goes inside out"
    if tt<27: return "Sheet slack: it flaps by itself, nothing shakes it (ripple size and rate depend on the time step)"
    return "Sheeting back in: the flogging stops and the sail fills again"
fr=o['frames']
for i in range(len(fr)):
    tnow=fr[i]['t']; im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.text((12,8),"One sail section: fill, luff, flog, sheet back in (air mass inside the solve)",font=font(19,True),fill=INK)
    d.text((12,34),"Watch the front of the sail when the sheet is eased, then the flapping and its frequency. 3 m chord, 8 m/s wind from the left.",font=font(12),fill=INK)
    draw_sail(d,(8,58,892,58+330),fr[i],scale=140)
    d.text((60,66),phase(tnow),font=font(17,True),fill=INK)
    j=min(len(t)-1,int(tnow*240)-1)
    d.text((60,90),f"time {tnow:4.1f} s   sheet {o['Ls'][j]:.2f} m   boom angle to the wind {aoa[j]:+.0f} deg   flapping {fz[j]:.1f} Hz, {amp[j]:.0f} cm",font=font(13),fill=GREY)
    trace(d,(8,394,892,394+74),t,[(t,o['Tmax'])],tnow,34,150,"sheet tension, N per metre of sail height",[ORANGE],ticks=[0,75,150])
    trace(d,(8,472,892,472+74),t,[(t,fz)],tnow,34,6,"flapping frequency at three-quarter chord, Hz",[BLUE],ticks=[0,3,6])
    trace(d,(8,550,892,550+74),t,[(t,amp)],tnow,34,20,"flapping size (root mean square), cm",[GREEN],ticks=[0,10,20])
    im.save(f'fr2/f{i:04d}.png')
save_gif('fr2','fill_luff_flog_sheet_in.gif',20)
