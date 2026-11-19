"""Oracle for slot 15 (init 0x407020, frame 0x407240, renderer 0x406e70) from snap12.pkl. python3 oracle_slot15.py out.json N [seed]
Runs the original init with a seeded rand (dumps the 256x256 map and the 0x708-entry cos/sin tables), then N frames (random clocks, 40 ms grid) of the real frame callback."""
import sys,json,random
from oc import *
N=int(sys.argv[2]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
seed(R.randrange(1<<31));sd=rd(RS)
call(0x407020)
hp=rd(0x42f27c);hm=bytes(mu.mem_read(hp,65536));assert rd(0x42f280)==hp
A=[rd(0x42d65c+4*i) for i in range(0x708)];B=[rd(0x42ba3c+4*i) for i in range(0x708)]
fp32()
t=1000;wr(NOW,t);wr(0x42ba38,0);clear();call(0x407240);t0=rd(0x42ba34);wr(0x42ba38,1);frames=[]
for k in range(N):
    t=1000+40*R.randrange(0,6000);wr(NOW,t);clear();call(0x407240)
    frames.append(dict(now=t,out=list(screen()),lvl=rd(0x431964)));print('frame',k,sum(1 for b in frames[-1]['out'] if b),'lit',flush=True)
json.dump(dict(seed=sd,map=list(hm),A=A,B=B,t0=t0,frames=frames),open(sys.argv[1],'w'))
