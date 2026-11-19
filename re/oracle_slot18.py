"""Oracle for slot 18 (frame 0x404a12, curves 0x404bbc, spline 0x4055c6, brush) from snap12.pkl. python3 oracle_slot18.py out.json N [seed]
The GDI text strips (blank in the emulator) are replaced by synthetic ones; frames at random clocks / tracker positions (0x40c282 = [TRK]); dumps the camera matrix, the vertices and the palette level."""
import sys,json,random,struct
from oc import *
N=int(sys.argv[2]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
strips=[bytes(0xc8 if R.random()<.2 else 0 for _ in range(0x14000)) for _ in range(3)]
for a,s_ in zip((0x42b854,0x42b868,0x42b86c),strips):mu.mem_write(rd(a),s_)
fp32();wr(0x42b864,1);wr(0x42b874,0);wr(TRK,0x1000)
t=1000;wr(NOW,t);clear();call(0x404a12);t0=rd(0x42b870);frames=[]
SC=0x42b7f0
for k in range(N):
    t=1000+40*R.randrange(1,3000);pos=R.choice([0x1000,0x18ff,0x1900,0x19ff,0x1a00,0x1a05,0x1a3f,0x1b00,0x1b20,0x1bff,0x1c00,0x1c10])
    wr(NOW,t);wr(TRK,pos);wr(0x431964,0xdead);clear();call(0x404a12)
    o=rd(rd(0x42b810));nv=rd(o+0x5c);cam=rd(SC+0x1c)
    frames.append(dict(now=t,pos=pos,out=list(screen()),lvl=rd(0x431964),V=bytes(mu.mem_read(rd(o+0x44),nv*0x30)).hex(),M=bytes(mu.mem_read(cam+0x84,36)).hex(),
        fx=struct.unpack('<ff',bytes(mu.mem_read(0x431770,8))),ang=bytes(mu.mem_read(o+0x64,12)).hex(),pos3=bytes(mu.mem_read(o+0xec,24)).hex()))
    print('frame',k,'t',t,hex(pos),sum(1 for b in frames[-1]['out'] if b),'lit',hex(frames[-1]['lvl']),flush=True)
json.dump(dict(t0=t0,strips=[s_.hex() for s_ in strips],frames=frames),open(sys.argv[1],'w'))
