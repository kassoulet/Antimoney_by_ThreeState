"""Shared Unicorn harness for the slot oracles (oracle_slot4.py ...): loads snap12.pkl (state at the first call of slot 12's frame callback, all slot inits already ran)
and stubs the imports the effect code uses. x87 runs in single precision after the first _ftol stub call (like the reference run); `fp32()` forces that.
Stubs: timeGetTime = [NOW], rand = MSVCRT LCG with state [RS] (set with seed()), malloc = bump allocator, sin/cos/sqrt/atan2/ftol/memset, palette set (0x40c691) = ret,
tracker position (0x40c282) = [TRK] (patched once: rewriting code later would hit Unicorn's translation cache)."""
import struct,pickle
from unicorn import *; from unicorn.x86_const import *
s=pickle.load(open('snap12.pkl','rb'))
mu=Uc(UC_ARCH_X86,UC_MODE_32)
for a,b in s['mem']:
    if a==0x7e000000:continue
    mu.mem_map(a,(len(b)+0xfff)//0x1000*0x1000);mu.mem_write(a,b)
mu.mem_map(0x7f000000,0x10000);mu.mem_map(0x30000000,0x2000000)
rd=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
wr=lambda a,v:mu.mem_write(a,struct.pack('<I',v&0xffffffff))
NOW,RS,TRK=0x7f001010,0x7f001020,0x7f001030
H=lambda h:bytes.fromhex(h.replace(' ',''))
mu.mem_write(0x7f000000,b'\xf4')
mu.mem_write(0x7f000500,H('dd442404d9fec3'));mu.mem_write(0x7f000520,H('dd442404d9ffc3'))   # fsin, fcos (host double results)
mu.mem_write(0x7f000250,H('dd442404 d97c24fc 668b4424fc 660d0008 6625fffb 66894424fe d96c24fe d9fc d96c24fc c3'))
mu.mem_write(0x7f000340,H('83EC0C D93C24 0FB70424 660D000C 6689442402 D96C2402 DF7C2404 D92C24 8B442404 8B542408 83C40C C3'))   # _ftol (truncate, fldcw back)
mu.mem_write(0x7f000400,H('a1001000 7f 8b4c2404 01c1 890d001000 7f c3'));wr(0x7f001000,0x30000000)   # malloc: bump
mu.mem_write(0x7f000440,b'\xc3');mu.mem_write(0x7f000390,H('dd442404d9fac3'));mu.mem_write(0x7f0003e0,H('dd442404dd44240cd9f3c3'))   # free, sqrt, atan2
mu.mem_write(0x7f000640,H('a1201000 7f 69c0fd430300 05c39e2600 a3201000 7f c1e810 25ff7f0000 c3'))   # rand
mu.mem_write(0x7f000660,H('8b7c2404 8b442408 8b4c240c f3aa 8b442404 c3'))   # memset
mu.mem_write(0x7f000600,H('a110100 07f c3'.replace(' ','')))   # timeGetTime
for a,v in ((0x4100a4,0x7f000400),(0x410068,0x7f000440),(0x4100a0,0x7f000340),(0x410060,0x7f000500),(0x4100bc,0x7f000520),(0x4100b4,0x7f000390),(0x41006c,0x7f0003e0),(0x4100a8,0x7f000640),(0x4100b0,0x7f000660),(0x410130,0x7f000600)):wr(a,v)
mu.mem_write(0x40c282,H('a1301000 7f c3'));mu.mem_write(0x40c691,b'\xc3')
def seed(x):wr(RS,x)
def call(addr,*args):
    sp=0x7f00f000;mu.reg_write(UC_X86_REG_ESP,sp);mu.mem_write(sp,struct.pack('<I',0x7f000000)+b''.join(struct.pack('<I',a&0xffffffff) for a in args))
    try: mu.emu_start(addr,0x7f000000,count=200000000)
    except UcError as e: print('ERR',hex(addr),e,hex(mu.reg_read(UC_X86_REG_EIP)));raise
    return mu.reg_read(UC_X86_REG_EAX)
W,Hh=512,384;BUF=0x38000000;mu.mem_map(BUF,0x40000+0x2000)
wr(0x4319f0,BUF+0x1000);wr(0x4319f4,W);wr(0x4319f8,Hh);wr(0x4319fc,W)   # screen descriptor used by the effects
def screen():return bytes(mu.mem_read(BUF+0x1000,W*Hh))
def clear():mu.mem_write(BUF+0x1000,bytes(W*Hh))
