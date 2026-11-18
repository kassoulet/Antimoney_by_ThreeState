"""(base from oracle_scene.py) Oracle for the shared 3D engine's queue/sort/draw stage, from snap12.pkl (state after all inits).
Runs 0x408768 (camera focal 0x409aaf + list setup), 0x40946f (visibility + queue + 0x40933a), 0x40889b (radix sort 0x408b74 + dispatch 0x408991) on random
projected faces of slot 12's cube object (material type 6 = additive triangle 0x3f). python3 oracle_scene.py N seed out.json"""
import sys,struct,random,json,pickle
from unicorn import *; from unicorn.x86_const import *
random.seed(int(sys.argv[1]))
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
f32=lambda v:struct.unpack('<f',struct.pack('<f',v))[0];bits=lambda v:struct.unpack('<I',struct.pack('<f',v))[0]
W,H=512,384;BUF=0x38000000;mu.mem_map(BUF,0x40000+0x2000)
wr(0x4319f0,BUF+0x1000)
# line drawer 0x407f60(x0,y0,x1,y1,bufptr,colour,flag,flag): N random lines (some far outside the clip window), 1 line per run, additive 0x3f
out=[]
for k in range(int(sys.argv[2])):
    mu.mem_write(BUF+0x1000,bytes(W*H))
    r=lambda: f32(random.choice([random.uniform(-300,900),random.uniform(0,520),random.uniform(-3,6)]))
    p=[r() for _ in range(4)];col=random.choice([0x3f,0x20,255])
    call(0x407f60,*[bits(v) for v in p],0x4319f0,col,0,0)
    d=bytes(mu.mem_read(BUF+0x1000,W*H));out.append(dict(p=p,col=col,px=[[i,b] for i,b in enumerate(d) if b]))
json.dump(out,open(sys.argv[3],'w'));print('ok',sum(len(o['px']) for o in out))
