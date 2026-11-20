"""Oracle for slot 23 (frame 0x40502b) from snap12.pkl. python3 oracle_slot23.py out.json N [seed]
Synthetic 5 text strips (1536x16, 0/0x65; GDI text is blank in the emulator) placed in our own memory with a zero guard before them, random start picture, N frames at random dt."""
import sys,json,random
from oc import *
N=int(sys.argv[2]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
fp32()
mu.mem_map(0x39000000,0x100000);strips=[]
for j in range(5):
    m=bytes(0x65 if R.random()<.3 and (x//7+j)%3 else 0 for y in range(16) for x in range(1536));strips.append(m)
    a=0x39000000+0x10000*(j+1);mu.mem_write(a,m);wr(0x42b890+4*j,a)
wr(0x42b88c,1);wr(0x42b8a8,0);t=1000;wr(NOW,t);call(0x40502b);t0=rd(0x42b8a8);frames=[]
for k in range(N):
    dt=40*R.randrange(0,5000);Y=R.choice([300,136,0,50.5]);wr(0x42b8a4,struct.unpack('<I',struct.pack('<f',Y))[0]);wr(NOW,t0+dt)
    st=bytes(R.randrange(256) for _ in range(W*Hh));mu.mem_write(BUF+0x1000,st);call(0x40502b)
    frames.append(dict(dt=dt,Y=Y,st=list(st),out=list(screen())));print('frame',k,dt,Y,flush=True)
json.dump(dict(strips=[list(m) for m in strips],t0=t0,frames=frames),open(sys.argv[1],'w'))
