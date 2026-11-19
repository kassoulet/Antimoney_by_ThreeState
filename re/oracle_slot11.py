"""Oracle for slot 11 (frame 0x403e30, keyframe camera 0x404010, scene 0x42b708 = 102 meshes built by the 3DS loader 0x407d80 at init) from snap12.pkl.
python3 oracle_slot11.py out.json N [seed] [asset.bin]: N frames at random clocks (t0 = the first enabled frame, 1000 ms); dumps pixels, palette level, camera.
With asset.bin: writes the scene geometry (u32 nobj; per object u32 nv, u32 nf, nv*3 f32 positions, nf*3 u16 indices) for web/assets/slot11.bin."""
import sys,json,random,struct
from oc import *
N=int(sys.argv[2]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1);fp32=lambda:call(0x7f000340)
SC=0x42b708;n=rd(0x42b72c);ot=rd(0x42b728)
if len(sys.argv)>4:
    b=struct.pack('<I',n)
    for i in range(n):
        o=rd(ot+4*i);nv=rd(o+0x5c);nf=rd(o+0x60);V=rd(o+0x44);F=rd(o+0x50);b+=struct.pack('<II',nv,nf)
        for k in range(nv):b+=bytes(mu.mem_read(V+0x30*k,12))
        for k in range(nf):b+=struct.pack('<3H',*[struct.unpack('<H',bytes(mu.mem_read(F+0x40*k+8*j,2)))[0] for j in range(3)])
    open(sys.argv[4],'wb').write(b);print('asset',len(b))
fp32();wr(0x42b770,1);wr(0x42b774,0);wr(NOW,1000);clear();call(0x403e30);frames=[]
for k in range(N):
    t=1000+R.randrange(1,60000);wr(NOW,t);wr(0x431964,0xdead);clear();call(0x403e30)
    cam=rd(rd(SC+0x1c)*0+SC+0x1c)
    frames.append(dict(now=t,out=list(screen()),lvl=rd(0x431964),idx=rd(0x42b778),M=bytes(mu.mem_read(cam+0x84,36)).hex(),pos=bytes(mu.mem_read(cam+0x40,12)).hex(),
        fx=struct.unpack('<ff',bytes(mu.mem_read(0x431770,8))),cx=struct.unpack('<ff',bytes(mu.mem_read(0x431778,8)))))
    print('frame',k,t,'lit',sum(1 for b in frames[-1]['out'] if b),'lvl',frames[-1]['lvl'],flush=True)
json.dump(dict(t0=1000,frames=frames),open(sys.argv[1],'w'))
