"""Draw GIF frames with PIL from run_*.pkl. Light background, dark text."""
import pickle, sys, os, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; FR='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(sz,b=False):
    try: return ImageFont.truetype(FB if b else FR, sz)
    except Exception: return ImageFont.load_default()
INK=(25,30,40); GREY=(120,125,135); BLUE=(20,90,200); RED=(200,50,40); GREEN=(20,140,80); ORANGE=(225,130,20); BG=(250,249,245); PANEL=(255,255,255)
ANCHOR=(2.6,-1.2)
def draw_sail(d, box, fr, blown=False, show_wake=True, scale=None):
    x0,y0,x1,y1=box; d.rectangle(box, fill=PANEL, outline=(205,205,205))
    sc=scale or (x1-x0)/6.2; ox=x0+0.45*sc; oy=(y0+y1)/2-0.05*sc
    P=lambda p:(ox+p[0]*sc, oy-p[1]*sc)
    # wind arrows
    for k in range(3):
        yy=y0+18+k*((y1-y0-36)/2); d.line([(x0+6,yy),(x0+30,yy)],fill=GREY,width=2); d.polygon([(x0+30,yy-4),(x0+38,yy),(x0+30,yy+4)],fill=GREY)
    if fr is None: return P
    X=fr['X']
    if show_wake and len(fr.get('wG',[])):
        wP=fr['wP']; wG=fr['wG']; g=np.abs(wG); gm=max(g.max(),1e-9)
        for p,gg in zip(wP[::2],wG[::2]):
            q=P(p)
            if q[0]>x1-3 or q[1]<y0+3 or q[1]>y1-3: continue
            r=1.5+2.5*min(1,abs(gg)/gm)
            d.ellipse([q[0]-r,q[1]-r,q[0]+r,q[1]+r],fill=(235,150,140) if gg>0 else (140,170,235))
    a=P(ANCHOR); c=P(X[-1]); taut=fr['Ts']>0.5
    def clip(p): return (min(max(p[0],x0+2),x1-2), min(max(p[1],y0+2),y1-2))
    d.line([clip(P(X[0])),clip(c)],fill=(170,170,170),width=3)          # boom
    d.line([a,clip(c)],fill=ORANGE if taut else (230,200,150),width=3 if taut else 1)   # sheet
    d.rectangle([a[0]-4,a[1]-4,a[0]+4,a[1]+4],fill=INK)
    d.line([clip(P(p)) for p in X],fill=RED if blown else BLUE,width=4,joint='curve')
    lu=P(X[0]); d.ellipse([lu[0]-5,lu[1]-5,lu[0]+5,lu[1]+5],fill=INK)
    return P
def trace(d, box, t, series, tnow, tmax, ymax, ylabel, colors, labels=None, ticks=None, tmin=0.0):
    x0,y0,x1,y1=box; d.rectangle(box, fill=PANEL, outline=(205,205,205))
    px=lambda tt: x0+34+(x1-x0-42)*(tt-tmin)/(tmax-tmin); py=lambda v: y1-18-(y1-y0-30)*min(max(v,0),ymax)/ymax
    f=font(11)
    for v in (ticks or [0,ymax/2,ymax]):
        d.line([(x0+34,py(v)),(x1-8,py(v))],fill=(232,232,232)); d.text((x0+3,py(v)-6),f"{v:g}",font=f,fill=GREY)
    d.text((x0+38,y0+2),ylabel,font=f,fill=GREY); d.text((x1-70,y1-15),"time, s",font=f,fill=GREY)
    for (tt,yy),col in zip(series,colors):
        m=tt<=tnow
        if m.sum()>1:
            pts=[(px(a),py(b)) for a,b in zip(tt[m],yy[m])]
            d.line(pts,fill=col,width=2)
    if labels:
        xx=x0+150
        for lab,col in zip(labels,colors):
            d.line([(xx,y0+9),(xx+16,y0+9)],fill=col,width=3); d.text((xx+20,y0+2),lab,font=f,fill=INK); xx+=26+int(d.textlength(lab,font=f))+10
def save_gif(frames_dir, out, fps):
    pal=os.path.join(frames_dir,'pal.png')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(fps),'-i',os.path.join(frames_dir,'f%04d.png'),'-vf','palettegen=max_colors=64',pal],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(fps),'-i',os.path.join(frames_dir,'f%04d.png'),'-i',pal,'-lavfi','paletteuse=dither=none',out],check=True)
    print(out, round(os.path.getsize(out)/1e6,2),'MB')
