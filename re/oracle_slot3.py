"""Oracle for slot 3's texture routine 0x401000 (star lines, no grain) from snap12.pkl: python3 oracle_slot3.py out.json -> texture bytes for several clocks/params (timeGetTime stubbed)."""
import sys,struct,json,pickle
from unicorn import *; from unicorn.x86_const import *
s=pickle.load(open('snap12.pkl','rb'));mu=Uc(UC_ARCH_X86,UC_MODE_32)
for a,b in s['mem']:
    if a==0x7e000000:continue
    mu.mem_map(a,(len(b)+0xfff)//0x1000*0x1000);mu.mem_write(a,b)
mu.mem_map(0x7f000000,0x10000)
rd=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0];wr=lambda a,v:mu.mem_write(a,struct.pack('<I',v))
mu.mem_write(0x7f000000,b'\xf4')
mu.mem_write(0x7f000250,bytes.fromhex('dd442404d97c24fc668b4424fc660d00086625fffb66894424fed96c24fed9fcd96c24fcc3'))
mu.mem_write(0x7f000340,bytes.fromhex('83EC0C'+'D93C24'+'0FB70424'+'660D000C'+'6689442402'+'D96C2402'+'DF7C2404'+'D92C24'+'8B442404'+'8B542408'+'83C40C'+'C3'))
mu.mem_write(0x7f000500,bytes.fromhex('dd442404d9fec3'));mu.mem_write(0x7f000520,bytes.fromhex('dd442404d9ffc3'))
mu.mem_write(0x7f000600,bytes.fromhex('a1001000 7fc3'.replace(' ','')))
for a,v in ((0x4100a0,0x7f000340),(0x410060,0x7f000500),(0x4100bc,0x7f000520),(0x410130,0x7f000600),(0x410064,0x7f000250)):wr(a,v)
out=[]
for ms,l5c,flag in [(1000,0,0),(1234,0,0),(5000,0,0),(20000,0,0),(77777,0,0),(3456,0,1),(40000,0,1),(60000,100,1),(61230,0x437a0000,1),(90000,0x42c80000,0)]:
    wr(0x7f001000,ms);wr(0x42725c,l5c);mu.mem_write(0x427269,bytes([flag]));mu.mem_write(rd(0x427264),bytes(65536))
    sp=0x7f00f000;mu.reg_write(UC_X86_REG_ESP,sp);mu.mem_write(sp,struct.pack('<I',0x7f000000))
    mu.emu_start(0x401000,0x7f000000,count=50000000)
    out.append(dict(ms=ms,l5c=struct.unpack('<f',struct.pack('<I',l5c))[0],flag=flag,tex=list(mu.mem_read(rd(0x427264),65536))))
json.dump(out,open(sys.argv[1],'w'));print('ok')
