"""Oracle for slot 17 (frame 0x405385: 960-vertex Hermite curve (keys 0x405141, spline 0x4055c6, tension 1.2) + random camera jumps) from snap12.pkl.
python3 oracle_slot17.py out.json N [seed]: N sequential frames, clock 1000 + 40*k ms (first frame sets t0), rand = the oc.py LCG seeded with `seed`; keeps the picture of every 7th frame
(hex), the vertices (hex) and the camera position of every frame."""
import sys,json,struct
from oc import *
N=int(sys.argv[2]);seed(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
fp32();wr(0x42b918,1);wr(0x42b94c,0);wr(NOW,1000);frames=[]
o=rd(rd(0x42b8d0))
for k in range(N):
    wr(NOW,1000+40*k);clear();call(0x405385)
    cam=bytes(mu.mem_read(0x42b924,12))
    fr=dict(k=k,cam=cam.hex(),tgt=bytes(mu.mem_read(0x42b934,12)).hex(),V=bytes(mu.mem_read(rd(o+0x44),960*0x30)).hex())
    if k%7==0:fr['out']=screen().hex()
    frames.append(fr)
json.dump(dict(t0=1000,frames=frames),open(sys.argv[1],'w'))
print('ok',[sum(1 for b in bytes.fromhex(f['out']) if b) for f in frames if 'out' in f][:6])
