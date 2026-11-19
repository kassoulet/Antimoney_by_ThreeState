"""Oracle for the engine math helpers under Unicorn: python3 oracle_mat.py N seed out.json
 - sin/cos tables built by 0x4088df (host fsin/fcos like the golden run)
 - 0x408fbb (euler matrix obj+0xa0 from angles obj+0x64/68/6c, &0x3ff)
 - 0x409065 (rotate vertex normals [obj+0x44]+0x14 -> [obj+0x48]+0x14 and face normals [obj+0x54] -> [obj+0x58] by matrix)"""
import sys,struct,random,json
from unicorn import *; from unicorn.x86_const import *
N=int(sys.argv[1]);random.seed(int(sys.argv[2]))
img=open('image.bin','rb').read()
mu=Uc(UC_ARCH_X86,UC_MODE_32);mu.mem_map(0x400000,(len(img)+0xfff)//0x1000*0x1000);mu.mem_write(0x400000,img)
mu.mem_map(0x10000000,0x200000);mu.mem_map(0x7f000000,0x100000)
mu.mem_write(0x7f000000,b'\xf4')
mu.mem_write(0x7f000100,bytes.fromhex('dd442404d9fec3')); mu.mem_write(0x7f000110,bytes.fromhex('dd442404d9ffc3'))  # fsin / fcos stubs
# which IAT slot is sin / cos: 0x410060 = first call in 0x4088df (-> table 0x43030c = sin), 0x4100bc -> cos
mu.mem_write(0x410060,struct.pack('<I',0x7f000100)); mu.mem_write(0x4100bc,struct.pack('<I',0x7f000110))
def call(addr,*args):
    sp=0x7f0f0000;mu.reg_write(UC_X86_REG_ESP,sp)
    mu.mem_write(sp,struct.pack('<I',0x7f000000)+b''.join(struct.pack('<I',a) for a in args))
    mu.emu_start(addr,0x7f000000,count=10000000)
call(0x4088df)   # the tables are built at init in the default (extended) precision, like in the reference run
mu.mem_write(0x7f000700,bytes.fromhex('d92d1007007f'+'c3'));mu.mem_write(0x7f000710,b'\0\0');mu.emu_start(0x7f000700,0x7f000706)   # fldcw [0]: x87 precision = single (24 bit), as in the reference run
f=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
out=dict(sin=list(struct.unpack('<1024f',mu.mem_read(0x43030c,4096))),cos=list(struct.unpack('<1024f',mu.mem_read(0x42f2f8,4096))),objs=[])
for i in range(N):
    nv=random.randrange(3,9);nf=random.randrange(1,9);obj=0x10000000
    ang=[random.randrange(-2000,2000) for _ in range(3)]
    mu.mem_write(obj+0x64,struct.pack('<3i',*ang))
    call(0x408fbb,obj)
    M=struct.unpack('<9f',mu.mem_read(obj+0xa0,36))
    mat=[f(random.uniform(-1,1)) for _ in range(9)]
    vn=[[f(random.uniform(-1,1)) for _ in range(3)] for _ in range(nv)]; fn=[[f(random.uniform(-1,1)) for _ in range(3)] for _ in range(nf)]
    VA,V2,FN,FN2=0x10001000,0x10002000,0x10003000,0x10004000
    for k,n in enumerate(vn): mu.mem_write(VA+48*k+0x14,struct.pack('<3f',*n))
    mu.mem_write(FN,b''.join(struct.pack('<3f',*n) for n in fn))
    mu.mem_write(0x10005000,struct.pack('<9f',*mat))
    mu.mem_write(obj+0x44,struct.pack('<II',VA,V2)); mu.mem_write(obj+0x54,struct.pack('<II',FN,FN2)); mu.mem_write(obj+0x5c,struct.pack('<II',nv,nf))
    call(0x409065,obj,0x10005000)
    vo=[struct.unpack('<3f',bytes(mu.mem_read(V2+48*k+0x14,12))) for k in range(nv)]
    fo=[struct.unpack('<3f',bytes(mu.mem_read(FN2+12*k,12))) for k in range(nf)]
    out['objs'].append(dict(ang=ang,M=M,mat=mat,vn=vn,fn=fn,vo=vo,fo=fo))
json.dump(out,open(sys.argv[3],'w'))
print('ok')
