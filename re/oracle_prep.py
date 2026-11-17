"""Oracle for 0x409136 (face normals + averaged vertex normals): python3 oracle_prep.py N seed out.json -> N random objects (nv verts of 0x30 bytes, nf faces of 0x40 bytes)."""
import sys,struct,random,json
from unicorn import *; from unicorn.x86_const import *
N=int(sys.argv[1]);random.seed(int(sys.argv[2]))
img=open('image.bin','rb').read()
mu=Uc(UC_ARCH_X86,UC_MODE_32);mu.mem_map(0x400000,(len(img)+0xfff)//0x1000*0x1000);mu.mem_write(0x400000,img)
mu.mem_map(0x10000000,0x200000);mu.mem_map(0x7f000000,0x100000)
mu.mem_write(0x7f000000,b'\xf4')
# 0x40d79c -> sqrt(double) ; 0x40d790 (fabs-like import 0x4100a0) not needed here
mu.mem_write(0x40d79c,bytes.fromhex('dd442404d9fac3'))   # fld qword[esp+4]; fsqrt; ret
f=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
objs=[]
for i in range(N):
    nv=random.randrange(4,12);nf=random.randrange(1,16)
    V=[[f(random.uniform(-50,50)) for _ in range(3)] for _ in range(nv)]
    F=[random.sample(range(nv),3) for _ in range(nf)]
    obj=0x10000000;VA=0x10001000;FA=0x10010000;NA=0x10020000
    mu.mem_write(VA,b''.join(struct.pack('<3f',*v)+bytes(36) for v in V))
    mu.mem_write(FA,b''.join(struct.pack('<H6xH6xH',a,b,c).ljust(0x40,b'\0') for a,b,c in F))
    mu.mem_write(NA,bytes(12*nf))
    mu.mem_write(obj+0x44,struct.pack('<I',VA));mu.mem_write(obj+0x50,struct.pack('<II',FA,NA))
    mu.mem_write(obj+0x5c,struct.pack('<II',nv,nf))
    sp=0x7f0f0000;mu.reg_write(UC_X86_REG_ESP,sp)
    mu.mem_write(sp,struct.pack('<II',0x7f000000,obj))
    mu.emu_start(0x409136,0x7f000000,count=10000000)
    vn=[struct.unpack('<3f',bytes(mu.mem_read(VA+48*k+0x14,12))) for k in range(nv)]
    fn=[struct.unpack('<3f',bytes(mu.mem_read(NA+12*k,12))) for k in range(nf)]
    objs.append(dict(V=V,F=F,vn=vn,fn=fn))
json.dump(objs,open(sys.argv[3],'w'))
print('ok')
