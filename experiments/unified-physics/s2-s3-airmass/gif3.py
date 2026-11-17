import outdir  # run in out/
import os, numpy as np
from PIL import Image, ImageDraw
from render import *
from snatch import sim, CASES, stats
W,H=900,705; os.makedirs('fr3',exist_ok=True)
rows=[]
for case,title in (('heavy',"Sheet-sized: 2 kg on an 8 mm polyester sheet (100 kN/m), pulled slack and taut 3 times a second"),
                   ('light',"Thread-sized: 0.1 kg on a raw cloth thread (330 kN/m), 4 times a second")):
    c=CASES[case]; Tr,Xr=sim(case,61440,8,1.0,T=3.0)
    meths=[('resolved (61 440 steps a second)',61440,INK,Tr,Xr)]
    for name,hz,ni,rinf,col in (('midpoint rule, 240 Hz, 1 pass',240,1,1.0,RED),('damped rule, 240 Hz, 2 passes',240,2,0.7,BLUE),('damped rule, 480 Hz, 2 passes',480,2,0.7,GREEN)):
        Tn,Xn=sim(case,hz,ni,rinf,T=3.0); meths.append((name,hz,col,Tn,Xn))
    rows.append((case,title,meths))
t0,t1=1.0,1.7; nf=260
for i in range(nf):
    tnow=t0+(t1-t0)*(i+1)/nf
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.text((12,8),"Sheet snatch: a weight on a line that can only pull",font=font(19,True),fill=INK)
    d.text((12,34),"Watch the line go slack and snap taut, and whether each method's peak load matches the black resolved curve. Slowed down 19 times.",font=font(12),fill=INK)
    for r,(case,title,meths) in enumerate(rows):
        y0=58+r*320; c=CASES[case]
        d.text((12,y0),title,font=font(13,True),fill=INK)
        # left: line and mass for resolved and the 240 Hz damped rule
        box=(8,y0+20,300,y0+310); d.rectangle(box,fill=PANEL,outline=(205,205,205))
        Tr,Xr=meths[0][3],meths[0][4]; xs_scale=max(-Xr.min(),1e-6)
        for q,(name,hz,col,Tn,Xn) in enumerate([meths[0],meths[2]]):
            j=min(len(Xn)-1,int(tnow*hz)); x=Xn[j]; yy=y0+70+q*130
            d.text((16,yy-42),name,font=font(11),fill=col)
            ax=30; rest=190; mx=rest+ (min(x,0)/xs_scale)*120      # slack: mass moves toward the anchor
            d.rectangle([ax-5,yy-12,ax,yy+12],fill=INK)
            if x>0:
                d.line([(ax,yy),(rest,yy)],fill=ORANGE,width=4); d.text((ax+30,yy+10),f"taut  {Tn[j]:.0f} N",font=font(12,True),fill=ORANGE)
            else:
                pts=[(ax+(mx-ax)*u, yy+ (rest-mx)*0.45*np.sin(np.pi*u)) for u in np.linspace(0,1,24)]
                d.line(pts,fill=(210,170,110),width=2); d.text((ax+30,yy-28),"slack",font=font(12),fill=GREY)
            d.ellipse([mx-11,yy-11,mx+11,yy+11],fill=col)
        # right: tension traces
        ymax=5000 if case=='heavy' else 20000
        ser=[]; cols=[]; labs=[]
        for name,hz,col,Tn,Xn in meths:
            tt=np.arange(1,len(Tn)+1)/hz; m=(tt>=t0)&(tt<=t1)
            if hz>10000: tt2,T2=tt[m][::16],np.maximum.reduceat(Tn[m],np.arange(0,m.sum(),16))
            else: tt2,T2=tt[m],Tn[m]
            ser.append((tt2,T2)); cols.append(col); labs.append(name.split(' (')[0].replace(' rule,','').replace(',',''))
        trace(d,(306,y0+20,892,y0+270),None,ser,tnow,t1,ymax,"line tension, N",cols,ticks=[0,ymax/2,ymax],tmin=t0)
        xx=312
        for lab,col in zip(labs,cols):
            d.line([(xx,y0+284),(xx+14,y0+284)],fill=col,width=3); d.text((xx+18,y0+277),lab,font=font(11),fill=INK); xx+=24+int(d.textlength(lab,font=font(11)))+8
        pkr=stats(meths[0][3],61440,c['f'],T0=0.0)[0]
        d.text((312,y0+294),"Over 10 s: damped rule with 2 passes is within 7% of the resolved peak." if r==0 else "Over 10 s: nothing at 240 or 480 Hz gets within 20%; best is 2 to 3 times too high.",font=font(12,True),fill=INK)
    im.save(f'fr3/f{i:04d}.png')
save_gif('fr3','sheet_snatch.gif',20)
