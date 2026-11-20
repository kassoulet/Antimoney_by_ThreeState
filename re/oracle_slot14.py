"""Oracle for slot 14 (300 walkers on 5 linked vertex grids + 5 boxes; init 0x406190, frame 0x40671a) from snap12.pkl.
python3 oracle_slot14.py out.json N [seed]   N frames on the 40 ms grid (the walker state is sequential: frame k at 1000+40k), rand = seeded MSVCRT LCG.
The GDI text overlay (0x4058d7, blank in the emulator) is replaced by a synthetic 0/0x65 buffer; [0x42ba14] (overlay on, command 6) and the tracker position are varied per frame.
Dumps: init state (5 vertex arrays with flags and links, 300 walker records, 5 boxes), then per frame the screen and the 600 walker vertices; walker records every 25th frame."""
import sys,json,random,struct
from oc import *
N=int(sys.argv[2]);S=int(sys.argv[3]) if len(sys.argv)>3 else 1;R=random.Random(S)
call(0x7f000340)   # fp32: the real run's FPU is single precision
OV=0x38100000;mu.mem_map(OV,0x31000)
ov=bytes(0x65 if R.random()<.05 else 0 for _ in range(0x30000));mu.mem_write(OV,ov)
mu.mem_write(0x7f000700,H('c705c0b94200')+struct.pack('<I',OV)+b'\xc3')           # 0x4058d7 stub: [0x42b9c0] = synthetic overlay
mu.mem_write(0x4061a0,b'\xe8'+struct.pack('<i',0x7f000700-0x4061a5))
seed(S);call(0x406190);call(0x406850,0,0x3f800000)   # init, then command 0 = enable (0x42b9bc = 1)
bases=[rd(0x42b9c4+4*k) for k in range(5)];cnt=[rd(0x42b9ec+4*k) for k in range(5)]
def enc(p):
    for k,b in enumerate(bases):
        if b<=p<b+24*cnt[k]:return [k,(p-b)//24]
    raise Exception(hex(p))
def arrays():
    out=[]
    for k in range(5):
        raw=bytes(mu.mem_read(bases[k],24*cnt[k]));a=[]
        for i in range(cnt[k]):
            r=raw[24*i:24*i+24];x,y=struct.unpack('<II',r[:8]);a.append([x,y,r[0x14],r[0x15]]+[enc(struct.unpack('<I',r[o:o+4])[0]) for o in (8,12,16)])
        out.append(a)
    return out
objs=rd(0x42b978);nobj=rd(0x42b97c);obj0=rd(objs);vb=rd(obj0+0x44);WK=rd(0x42b950)
def walkers():
    out=[]
    for w in range(300):
        r=bytes(mu.mem_read(WK+0x1c*w,0x1c));a,b,c,p,per,ts,off=struct.unpack('<IIIIIII',r)
        out.append([(a-vb)//0x30,(b-vb)//0x30,enc(c),enc(p),per,ts,off])
    return out
def box(o):
    nv=rd(o+0x5c);nf=rd(o+0x60);v=bytes(mu.mem_read(rd(o+0x44),nv*0x30));fc=bytes(mu.mem_read(rd(o+0x50),nf*0x40))
    return dict(V=[struct.unpack('<fff',v[48*i:48*i+12]) for i in range(nv)],F=[[struct.unpack('<H',fc[64*j+q:64*j+q+2])[0] for q in (0,8,16)] for j in range(nf)],flag=[struct.unpack('<I',fc[64*j+0x3c:64*j+0x40])[0] for j in range(nf)],mat=[struct.unpack('<I',fc[64*j+0x38:64*j+0x3c])[0] for j in range(nf)])
init=dict(arrays=arrays(),walkers=walkers(),boxes=[box(rd(objs+4*i)) for i in range(1,nobj)],nobj=nobj,nv0=rd(obj0+0x5c),nf0=rd(obj0+0x60))
cam=rd(rd(0x42b958+0x1c)) if False else rd(0x42b958+0x1c);frames=[]
for k in range(N):
    t=1000+40*k;pos=R.choice([0x100,0x21f,0x220,0x300,0x5ff,0x600,0x7ff]);ovl=R.random()<.3
    wr(NOW,t);wr(TRK,pos);wr(0x42ba14,1 if ovl else 0);clear();call(0x40671a)
    fr=dict(now=t,pos=pos,ov=ovl,V=bytes(mu.mem_read(vb,600*0x30)).hex(),M=bytes(mu.mem_read(cam+0x84,36)).hex(),fx=struct.unpack('<ff',bytes(mu.mem_read(0x431770,8))))
    if k<6 or k%10==0:fr['out']=list(screen())
    if k%25==0:fr['walkers']=walkers()
    frames.append(fr);print('frame',k,hex(pos),ovl,sum(1 for b in screen() if b),'lit',flush=True)
json.dump(dict(seed=S,overlay=ov.hex(),init=init,frames=frames),open(sys.argv[1],'w'))
