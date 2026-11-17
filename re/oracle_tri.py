"""Oracle for 0x407370 (triangle filler) under Unicorn: python3 oracle_tri.py N seed out.json -> random triangles (f32 coords, some off-screen) drawn in sequence on a 100x80 buffer (pitch 100)."""
import sys,struct,random,json
from unicorn import *; from unicorn.x86_const import *
N=int(sys.argv[1]);random.seed(int(sys.argv[2]))
img=open('image.bin','rb').read()
mu=Uc(UC_ARCH_X86,UC_MODE_32);mu.mem_map(0x400000,(len(img)+0xfff)//0x1000*0x1000);mu.mem_write(0x400000,img)
mu.mem_map(0x10000000,0x200000);mu.mem_map(0x7f000000,0x100000)
W,H,P=100,80,100
mu.mem_write(0x10100000,struct.pack('<IIII',0x10000000,P,H,W))
mu.mem_write(0x7f000000,b'\xf4')
mu.mem_write(0x7f000250,bytes.fromhex('dd442404 d97c24fc 668b4424fc 660d0008 6625fffb 6689 4424fe d96c24fe d9fc d96c24fc c3'.replace(' ','')))
mu.mem_write(0x7f000340,bytes.fromhex('83EC0C'+'D93C24'+'0FB70424'+'660D000C'+'6689442402'+'D96C2402'+'DF7C2404'+'D92C24'+'8B442404'+'8B542408'+'83C40C'+'C3'))
f=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
tris=[]
for i in range(N):
    c=lambda:f(random.uniform(-30,130) if random.random()<.3 else random.uniform(0,100))
    d=lambda:f(random.uniform(-30,110) if random.random()<.3 else random.uniform(0,80))
    t=[c(),d(),c(),d(),c(),d()]
    if random.random()<.1:t[3]=t[1]
    col=random.randrange(1,256);mode=random.randrange(2);tris.append(t+[col,mode])
    sp=0x7f0f0000;mu.reg_write(UC_X86_REG_ESP,sp)
    mu.mem_write(sp,struct.pack('<I6fIIB',0x7f000000,*t,0x10100000,col,mode)[:4+24+4]+struct.pack('<II',col,mode))
    try: mu.emu_start(0x407370,0x7f000000,count=10000000)
    except UcError as e: print(e,hex(mu.reg_read(UC_X86_REG_EIP)));break
json.dump({'tris':tris,'out':list(mu.mem_read(0x10000000,W*H))},open(sys.argv[3],'w'))
print('ok')
