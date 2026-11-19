"""Oracle for slot 5 (0x404623 init / 0x4046df frame / generator 0x40a979) from snap12.pkl (all inits already ran, so the object, its UVs and the textures are the original's).
python3 oracle_slot5.py out.json N [seed]: dumps the initial model (vertices, faces, texture of material 0) and N frames of the real frame callback with random clock / tracker position."""
import sys,struct,random,json,pickle
from unicorn import *; from unicorn.x86_const import *
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
mu.mem_write(0x7f000400,bytes.fromhex('a1001000 7f 8b4c2404 01c1 890d001000 7f c3'.replace(' ','')));wr(0x7f001000,0x30000000)
mu.mem_write(0x7f000440,b'\xc3');mu.mem_write(0x7f000390,bytes.fromhex('dd442404d9fac3'));mu.mem_write(0x7f0003e0,bytes.fromhex('dd442404dd44240cd9f3c3'))
for a,v in ((0x4100a4,0x7f000400),(0x410068,0x7f000440),(0x4100a0,0x7f000340),(0x410060,0x7f000500),(0x4100bc,0x7f000520)):wr(a,v)
def call(addr,*args):
    sp=0x7f00f000;mu.reg_write(UC_X86_REG_ESP,sp);mu.mem_write(sp,struct.pack('<I',0x7f000000)+b''.join(struct.pack('<I',a&0xffffffff) for a in args))
    try: mu.emu_start(addr,0x7f000000,count=50000000)
    except UcError as e: print('ERR',hex(addr),e,hex(mu.reg_read(UC_X86_REG_EIP)));raise
W,H=512,384;BUF=0x38000000;mu.mem_map(BUF,0x40000+0x2000)
wr(0x4319f0,BUF+0x1000);wr(0x4319f4,W);wr(0x4319f8,H);wr(0x4319fc,W)
mu.mem_write(0x7f000600,bytes.fromhex('a110100 07fc3'.replace(' ','')))   # timeGetTime
wr(0x410130,0x7f000600)
SC=0x42b788
N=int(sys.argv[2]);R=random.Random(int(sys.argv[3]) if len(sys.argv)>3 else 1)
o=rd(rd(SC+0x20));nv=rd(o+0x5c);nf=rd(o+0x60);mat=rd(rd(o+0x50)+0x38)
init=dict(nv=nv,nf=nf,V=bytes(mu.mem_read(rd(o+0x44),nv*0x30)).hex(),F=bytes(mu.mem_read(rd(o+0x50),nf*0x40)).hex(),
  tex=list(bytes(mu.mem_read(rd(mat+0x20),0x10000))),tex2=list(bytes(mu.mem_read(rd(mat+0x24),0x10000))),mattype=rd(mat+0x2c),mat=mat,mat0=rd(rd(0x43130c)))
mu.mem_write(0x40c282,bytes.fromhex('a130100 07fc3'.replace(' ','')))
wr(0x42b7ec,1)   # enabled (command 0, p = 1)
frames=[]
for k in range(N):
    now=R.randrange(1000,200000);ax=R.randrange(0,0xc00)
    wr(0x7f001030,ax)   # tracker position (0x40c282 is patched once to return [0x7f001030]; the real one returns pos-1, clamped at 0; rewriting code would hit Unicorn's translation cache)
    wr(0x7f001010,now);mu.mem_write(BUF+0x1000,bytes(W*H))
    call(0x4046df)
    cam=rd(SC+0x1c)
    frames.append(dict(now=now,ax=ax,cam=bytes(mu.mem_read(cam,0x100)).hex(),obj=bytes(mu.mem_read(o,0x118)).hex(),glob=dict(fx=struct.unpack('<ff',bytes(mu.mem_read(0x431770,8))),c=(rd(0x430300),rd(0x4302fc))),out=list(bytes(mu.mem_read(BUF+0x1000,W*H)))))
    print('frame',k,now,hex(ax),'lit',sum(1 for b in frames[-1]['out'] if b),flush=True)
json.dump(dict(init=init,frames=frames),open(sys.argv[1],'w'))
