"""Oracle for 0x4097fe (transform + perspective projection of the vertices) and 0x4098e4 (env UVs from rotated normals, face shade = ftol(nz*255)).
python3 oracle_proj.py N seed out.json"""
import sys,struct,random,json
from unicorn import *; from unicorn.x86_const import *
N=int(sys.argv[1]);random.seed(int(sys.argv[2]))
img=open('image.bin','rb').read()
mu=Uc(UC_ARCH_X86,UC_MODE_32);mu.mem_map(0x400000,(len(img)+0xfff)//0x1000*0x1000);mu.mem_write(0x400000,img)
mu.mem_map(0x10000000,0x200000);mu.mem_map(0x7f000000,0x100000)
mu.mem_write(0x7f000000,b'\xf4')
mu.mem_write(0x7f000700,bytes.fromhex('d92d1007007f'+'c3'));mu.mem_write(0x7f000710,b'\0\0');mu.emu_start(0x7f000700,0x7f000706)   # fldcw [0]: x87 precision = single (24 bit), as in the reference run
mu.mem_write(0x7f000340,bytes.fromhex('83EC0C'+'D93C24'+'0FB70424'+'660D000C'+'6689442402'+'D96C2402'+'DF7C2404'+'D92C24'+'8B442404'+'8B542408'+'83C40C'+'C3'))
mu.mem_write(0x4100a0,struct.pack('<I',0x7f000340))
f=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
def call(addr,*args):
    sp=0x7f0f0000;mu.reg_write(UC_X86_REG_ESP,sp)
    mu.mem_write(sp,struct.pack('<I',0x7f000000)+b''.join(struct.pack('<I',a) for a in args))
    mu.emu_start(addr,0x7f000000,count=10000000)
res=[]
for i in range(N):
    obj=0x10000000;VA,V2,FA,FN2=0x10001000,0x10002000,0x10003000,0x10004000
    nv=random.randrange(1,9);nf=random.randrange(1,9)
    P=[[f(random.uniform(-20,20)) for _ in range(3)] for _ in range(nv)]
    M=[f(random.uniform(-1,1)) for _ in range(9)];T=[f(random.uniform(-10,10)),f(random.uniform(-10,10)),f(random.uniform(40,200))]
    fx,fy=f(random.uniform(100,400)),f(random.uniform(100,400));cx,cy=random.randrange(100,400),random.randrange(100,300)
    vn=[[f(random.uniform(-1,1)) for _ in range(3)] for _ in range(nv)];fn=[[f(random.uniform(-1,1)) for _ in range(3)] for _ in range(nf)]
    mu.mem_write(VA,b''.join(struct.pack('<3f',*p)+bytes(0x24) for p in P)); mu.mem_write(V2,bytes(0x30*nv))
    mu.mem_write(FA,bytes(0x40*nf)); mu.mem_write(FN2,b''.join(struct.pack('<3f',*n) for n in fn))
    for k,n in enumerate(vn): mu.mem_write(V2+48*k+0x14,struct.pack('<3f',*n))
    mu.mem_write(obj+0x44,struct.pack('<II',VA,V2)); mu.mem_write(obj+0x50,struct.pack('<I',FA)); mu.mem_write(obj+0x58,struct.pack('<I',FN2))
    mu.mem_write(obj+0x5c,struct.pack('<II',nv,nf)); mu.mem_write(obj+0xc4,struct.pack('<9f',*M)); mu.mem_write(obj+0xf4,struct.pack('<3f',*T)); mu.mem_write(obj+0x104,struct.pack('<I',1))
    mu.mem_write(0x431770,struct.pack('<f',fx)); mu.mem_write(0x431774,struct.pack('<f',fy)); mu.mem_write(0x430300,struct.pack('<I',cx)); mu.mem_write(0x4302fc,struct.pack('<I',cy))
    call(0x4097fe,obj); call(0x4098e4,obj)
    out=[struct.unpack('<3f',bytes(mu.mem_read(V2+48*k,12))) for k in range(nv)]
    scr=[struct.unpack('<2f',bytes(mu.mem_read(V2+48*k+0xc,8))) for k in range(nv)]
    uv=[struct.unpack('<2f',bytes(mu.mem_read(V2+48*k+0x20,8))) for k in range(nv)]
    sh=[struct.unpack('<i',bytes(mu.mem_read(FA+0x40*k+0x18,4)))[0] for k in range(nf)]
    res.append(dict(P=P,M=M,T=T,fx=fx,fy=fy,cx=cx,cy=cy,vn=vn,fn=fn,out=out,scr=scr,uv=uv,sh=sh))
json.dump(res,open(sys.argv[3],'w'));print('ok')
