"""Oracle for slot 16 (frame 0x401660) from snap12.pkl. python3 oracle_slot16.py out.json N [seed]
Synthetic 128x32 mask (the GDI text is blank in the emulator), the real 64-entry seed table of the snapshot, a random start picture (exercises the dword carries), N frames at random dt."""
import sys,json,random
from oc import *
N=int(sys.argv[2]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
mu.mem_write(0x7f000680,H('8b442404 a3201000 7f c3'));wr(0x4100ac,0x7f000680)   # srand
fp32()
mask=bytes(255 if ((x//5+y//4)&1 or (x*y)%7==0) and 20<x<110 else 0 for y in range(32) for x in range(128));mu.mem_write(rd(0x427388),mask)
seeds=[rd(0x427278+4*i) for i in range(64)]
wr(0x42737c,0);t=1000;wr(NOW,t);call(0x401660);t0=rd(0x42738c);wr(0x42737c,1);frames=[]
for k in range(N):
    dt=40*R.randrange(0,3000);wr(NOW,t0+dt)
    st=bytes(R.randrange(256) for _ in range(W*Hh));mu.mem_write(BUF+0x1000,st);call(0x401660)
    frames.append(dict(dt=dt,out=list(screen())));print('frame',k,dt,flush=True)
    frames[-1]['st']=list(st)
json.dump(dict(mask=list(mask),seeds=seeds,t0=t0,frames=frames),open(sys.argv[1],'w'))
