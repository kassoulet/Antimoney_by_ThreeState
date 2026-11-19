"""Oracle for slot 4 (init 0x401d11, frame 0x401f98) from snap12.pkl. python3 oracle_slot4.py out.json N [seed]
Dumps the particle table / sprite texture of the original init and N consecutive frames (40 ms apart) of the real frame callback with the mask (GDI text, blank in the
emulator) replaced by a synthetic one and a synthetic overlay (so the sprite blitter and the overlay add are exercised). One disabled frame first (sets t0)."""
import sys,json,random
from oc import *
N=int(sys.argv[1+1]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
mask=bytes(255 if ((x//9+y//7)&1 and (x*y)%11) else 0 for y in range(256) for x in range(256))
text=bytes(0x65 if R.random()<.3 else 0 for _ in range(0xc800))
mu.mem_write(rd(0x4273e0),mask);mu.mem_write(rd(0x4273ac),text)
tbl=bytes(mu.mem_read(rd(0x4273c4),1024*24));tex=bytes(mu.mem_read(rd(0x4273cc),65536))
t=1000;wr(NOW,t);wr(0x4273b4,0);clear();call(0x401f98)
wr(0x4273b4,1);frames=[]
for k in range(N):
    t+=40;wr(NOW,t);wr(RS,R.randrange(1<<31));clear();call(0x401f98)
    frames.append(dict(now=t,out=list(screen()),lvl=rd(0x431964)))
    print('frame',k,sum(1 for b in frames[-1]['out'] if b),'lit',flush=True)
json.dump(dict(tbl=tbl.hex(),tex=list(tex),mask=list(mask),text=list(text),t0=1000,frames=frames),open(sys.argv[1],'w'))
