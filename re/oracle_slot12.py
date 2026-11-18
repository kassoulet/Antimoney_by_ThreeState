"""(base from oracle_scene.py) Oracle for the shared 3D engine's queue/sort/draw stage, from snap12.pkl (state after all inits).
Runs 0x408768 (camera focal 0x409aaf + list setup), 0x40946f (visibility + queue + 0x40933a), 0x40889b (radix sort 0x408b74 + dispatch 0x408991) on random
projected faces of slot 12's cube object (material type 6 = additive triangle 0x3f). python3 oracle_scene.py N seed out.json"""
import sys,struct,random,json,pickle
from unicorn import *; from unicorn.x86_const import *
SEED=int(sys.argv[1])
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
SC=0x42b408;f32=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
W,H=512,384;BUF=0x38000000;mu.mem_map(BUF,0x40000+0x2000)
wr(0x4319f0,BUF+0x1000);wr(0x4319f4,W);wr(0x4319f8,H);wr(0x4319fc,W);wr(SC+4,W);wr(SC+8,H)
# timeGetTime (0x410130) and rand (0x4100a8, MSVCRT LCG) stubs
mu.mem_write(0x7f000600,bytes.fromhex('a110100 07fc3'.replace(' ','')))
mu.mem_write(0x7f000640,bytes.fromhex('a1201000 7f 69c0fd430300 05c39e2600 a3201000 7f c1e810 25ff7f0000 c3'.replace(' ','')))
wr(0x410130,0x7f000600);wr(0x4100a8,0x7f000640);wr(0x7f001020,SEED)
T0=1000;wr(0x7f001010,T0);wr(0x42b6f0,1);mu.mem_write(0x42b700,struct.pack('<f',T0))   # slot 12 enabled by command 0 (p=1) at time T0
dump=[int(x) for x in sys.argv[3].split(',')];res=[]
for k in range(1,max(dump)+1):
    wr(0x7f001010,T0+250*k);mu.mem_write(BUF+0x1000,bytes(W*H))
    call(0x402da0)
    if k in dump:
        cam=rd(SC+0x1c);objs=[]
        tab=rd(0x42b428)
        for j in range(rd(SC+0x24)):
            o=rd(tab+4*j);nv=rd(o+0x5c);nf=rd(o+0x60)
            objs.append(dict(o=bytes(mu.mem_read(o,0x118)).hex(),V=bytes(mu.mem_read(rd(o+0x44),nv*0x30)).hex(),F=bytes(mu.mem_read(rd(o+0x50),nf*0x40)).hex(),vbase=rd(o+0x44),mats=[rd(rd(o+0x50)+0x40*i+0x38) for i in range(min(nf,1))],nv=nv,nf=nf))
        glob=dict(fx=struct.unpack('<ff',bytes(mu.mem_read(0x431770,8))),c=(rd(0x430300),rd(0x4302fc)),near=struct.unpack('<f',bytes(mu.mem_read(SC+0x60,4)))[0],rev=rd(SC+0x50))
        mats=rd(0x43130c);types=[rd(rd(mats+4*i)+0x2c) for i in range(9)]
        res.append(dict(k=k,cam=bytes(mu.mem_read(cam,0x100)).hex(),objs=objs,glob=glob,mattypes=types,matptrs=[rd(mats+4*i) for i in range(9)],out=list(bytes(mu.mem_read(BUF+0x1000,W*H)))))
        print('frame',k,'nobj verts',[o['nv'] for o in objs],'faces',[o['nf'] for o in objs],'nonzero',sum(1 for b in res[-1]['out'] if b),flush=True)
json.dump(res,open(sys.argv[2],'w'))
