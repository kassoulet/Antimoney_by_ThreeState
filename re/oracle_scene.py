"""Oracle for the shared 3D engine's queue/sort/draw stage, from snap12.pkl (state after all inits).
Runs 0x408768 (camera focal 0x409aaf + list setup), 0x40946f (visibility + queue + 0x40933a), 0x40889b (radix sort 0x408b74 + dispatch 0x408991) on random
projected faces of slot 12's cube object (material type 6 = additive triangle 0x3f). python3 oracle_scene.py N seed out.json"""
import sys,struct,random,json,pickle
from unicorn import *; from unicorn.x86_const import *
N=int(sys.argv[1]);random.seed(int(sys.argv[2]))
s=pickle.load(open('snap12.pkl','rb'))
mu=Uc(UC_ARCH_X86,UC_MODE_32)
for a,b in s['mem']:
    if a==0x7e000000:continue
    mu.mem_map(a,(len(b)+0xfff)//0x1000*0x1000);mu.mem_write(a,b)
mu.mem_map(0x7f000000,0x10000);mu.mem_map(0x30000000,0x2000000)
rd=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
wr=lambda a,v:mu.mem_write(a,struct.pack('<I',v))
mu.mem_write(0x7f000000,b'\xf4')
mu.mem_write(0x7f000500,bytes.fromhex('dd442404d9fec3'));mu.mem_write(0x7f000520,bytes.fromhex('dd442404d9ffc3'))
mu.mem_write(0x7f000250,bytes.fromhex('dd442404 d97c24fc 668b4424fc 660d0008 6625fffb 66894424fe d96c24fe d9fc d96c24fc c3'.replace(' ','')))
mu.mem_write(0x7f000340,bytes.fromhex('83EC0C'+'D93C24'+'0FB70424'+'660D000C'+'6689442402'+'D96C2402'+'DF7C2404'+'D92C24'+'8B442404'+'8B542408'+'83C40C'+'C3'))
mu.mem_write(0x7f000400,bytes.fromhex('a1001000 7f 8b4c2404 01c1 890d001000 7f c3'.replace(' ','')));wr(0x7f001000,0x30000000)  # malloc: bump
mu.mem_write(0x7f000440,b'\xc3');mu.mem_write(0x7f000390,bytes.fromhex('dd442404d9fac3'));mu.mem_write(0x7f0003e0,bytes.fromhex('dd442404dd44240cd9f3c3'))
for a,v in ((0x4100a4,0x7f000400),(0x410068,0x7f000440),(0x4100a0,0x7f000340),(0x410060,0x7f000500),(0x4100bc,0x7f000520)):wr(a,v)
def call(addr,*args):
    sp=0x7f00f000;mu.reg_write(UC_X86_REG_ESP,sp);mu.mem_write(sp,struct.pack('<I',0x7f000000)+b''.join(struct.pack('<I',a&0xffffffff) for a in args))
    try: mu.emu_start(addr,0x7f000000,count=50000000)
    except UcError as e: print('ERR',hex(addr),e,hex(mu.reg_read(UC_X86_REG_EIP)));raise
SC=0x42b408;f32=lambda v:struct.unpack('<f',struct.pack('<f',v))[0];bits=lambda v:struct.unpack('<I',struct.pack('<f',v))[0]
W,H=512,384;BUF=0x38000000;mu.mem_map(BUF,0x40000+0x2000)
wr(0x4319f0,BUF+0x1000);wr(0x4319f4,W);wr(0x4319f8,H);wr(0x4319fc,W)
wr(SC+4,W);wr(SC+8,H)
# camera: slot 12 setup (focal 135 deg, look-at (75,75,-500)->(75,75,0))
call(0x409d49,SC,0x43070000);call(0x409a71,SC,bits(75),bits(75),bits(-500),bits(75),bits(75),0)
tab=rd(0x42b428);o=struct.unpack('<2I',bytes(mu.mem_read(tab,8)))[1]   # slot 12's cube object
mats=rd(0x43130c);mat6=rd(mats+0x14);assert rd(mat6+0x2c)==6
nv=rd(o+0x5c) or 300;V2=rd(o+0x48);FA=rd(o+0x50)
# object state: only the queue stage is under test, so write screen-space vertices and the face table directly
verts=[]
for i in range(60):
    v=[f32(random.uniform(-100,600)),f32(random.uniform(-100,480)),f32(random.uniform(-5,300))]
    verts.append(v);mu.mem_write(V2+0x30*i,struct.pack('<3f',v[0],v[1],v[2])+struct.pack('<2f',f32(random.uniform(-50,560)),f32(random.uniform(-50,430))))
faces=[]
for k in range(N):
    idx=[random.randrange(60) for _ in range(3)];fl=random.randrange(2)
    for j,i in enumerate(idx):
        mu.mem_write(FA+0x40*k+8*j,struct.pack('<H',i));wr(FA+0x40*k+8*j+4,V2+0x30*i)
    wr(FA+0x40*k+0x38,mat6);wr(FA+0x40*k+0x3c,fl);faces.append(idx+[fl])
wr(o+0x5c,60);wr(o+0x60,N);wr(o+0x10c,1)
rev=random.randrange(2);wr(SC+0x50,rev)
call(0x408768,SC);call(0x40946f,o,SC)
qn=rd(SC+0x30);call(0x40889b,SC)
out=bytes(mu.mem_read(BUF+0x1000,W*H))
fx=struct.unpack('<ff',bytes(mu.mem_read(0x431770,8)));cc=(rd(0x430300),rd(0x4302fc))
json.dump(dict(W=W,H=H,verts=verts,sv=[struct.unpack('<5f',bytes(mu.mem_read(V2+0x30*i,20))) for i in range(60)],faces=faces,rev=rev,near=struct.unpack('<f',bytes(mu.mem_read(SC+0x60,4)))[0],queued=qn,fx=fx,c=cc,
 cam=[W,H,135.0,struct.unpack('<f',bytes(mu.mem_read(SC+0xc,4)))[0]],out=list(out)),open(sys.argv[3],'w'));print('ok queued',qn,'fx',fx,'c',cc,'nonzero',sum(1 for b in out if b))
cam=rd(SC+0x1c);print('cam',[ (hex(o_),struct.unpack('<f',bytes(mu.mem_read(cam+o_,4)))[0]) for o_ in (0x64,0x68,0x6c,0x70,0x74,0x78,0x7c,0x40,0x44,0x48,0x4c,0x50,0x54)])
