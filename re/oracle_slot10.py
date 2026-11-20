"""Oracle for slot 10 (init 0x4021a0 via 0x402180, frame 0x402290, blit 0x402510) from snap12.pkl. python3 oracle_slot10.py out.json N [seed]
Dumps the 64 sprites of the original init and N frames (random clocks) of the real frame callback. First enabled frame sets t0."""
import sys,json,random
from oc import *
N=int(sys.argv[2]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
fp32();call(0x402180)
spr=bytes(mu.mem_read(0x4273ec,64*256))
wr(0x4273e8,1);t=1000;wr(NOW,t);clear();call(0x402290);t0=rd(0x42b3ec);frames=[]
for k in range(N):
    t=1000+40*R.randrange(0,6000);wr(NOW,t);clear();call(0x402290)
    frames.append(dict(now=t,out=list(screen())));print('frame',k,sum(1 for b in frames[-1]['out'] if b),'lit',flush=True)
json.dump(dict(spr=list(spr),t0=t0,frames=frames),open(sys.argv[1],'w'))
