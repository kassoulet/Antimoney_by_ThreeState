"""Oracle for slot 3's whole frame callback 0x401390 including the text overlay (mode 7) from snap12.pkl. python3 oracle_slot3text.py out.json N [seed]
The GDI text buffer [0x427270] (3584x200, 0 / 0x65) is blank in the emulator: a synthetic mask replaces it. Each sample: frame at clock ms-40 (draws the star texture), then frame at clock ms
from a random start picture -> screen = warp(texture(ms-40)) + overlay(ms - t0), added with byte wrap at rows 92..291, scrolled by ftol(dt*0.2f) % 3072."""
import sys,json,random
from oc import *
N=int(sys.argv[2]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
fp32();wr(TRK,0x600)
mask=bytes(0x65 if ((x//9+y//7)&1 and (x*y)%5) or x%11==0 else 0 for y in range(200) for x in range(3584))
mu.mem_write(rd(0x427270),mask)
mu.mem_write(0x427268,b'\1');mu.mem_write(0x427269,b'\1');wr(0x42725c,0)
t0=1040;wr(0x427274,t0);out=[]
for k in range(N):
    dt=R.choice([0,1,39,40,41,199,5000,15359,15360,15361,20000])+R.randrange(0,3000) if k>2 else [0,40,5000][k]
    ms=t0+dt;ms-=ms%10
    wr(NOW,ms-40);call(0x401390)
    st=bytes(R.randrange(256) for _ in range(W*Hh));mu.mem_write(BUF+0x1000,st);wr(NOW,ms);call(0x401390)
    out.append(dict(ms=ms,st=list(st),out=list(screen())));print('sample',k,ms,flush=True)
json.dump(dict(mask=list(mask),t0=t0,samples=out),open(sys.argv[1],'w'))
