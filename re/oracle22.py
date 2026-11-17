"""Oracle for slot 22 (0x4068c5: zoom/glow post-process) under Unicorn: python3 oracle22.py S F outprefix -> outprefix.in / outprefix.out (512x384 bytes). MMX regs start at 0 (junk bytes J=0)."""
import sys,struct,random
from unicorn import *; from unicorn.x86_const import *
S=int(sys.argv[1]);F=float(sys.argv[2]);pre=sys.argv[3]
img=open('image.bin','rb').read()
mu=Uc(UC_ARCH_X86,UC_MODE_32);mu.mem_map(0x400000,(len(img)+0xfff)//0x1000*0x1000);mu.mem_write(0x400000,img)
mu.mem_map(0x10000000,0x200000);mu.mem_map(0x7f000000,0x100000)
random.seed(5);scr=bytearray(512*384)
for y in range(384):
    for x in range(512):scr[y*512+x]=min(255,max(0,int(128+100*__import__('math').sin(x/23)*__import__('math').cos(y/17))+random.randrange(0,32)))
mu.mem_write(0x10000000,bytes(scr));mu.mem_write(0x10100000,struct.pack('<II',0x10000000,512))
mu.mem_write(0x42ba20,struct.pack('<I',0x10110000)) if False else None
mu.mem_write(0x42ba20,struct.pack('<I',0x10110000));mu.mem_write(0x42ba28,struct.pack('<I',S));mu.mem_write(0x42ba24,struct.pack('<f',F))
sp=0x7f0f0000;mu.mem_write(sp,struct.pack('<II',0x7f000000,0x10100000));mu.reg_write(UC_X86_REG_ESP,sp)
mu.mem_write(0x7f000000,b'\xf4')
mu.mem_write(0x7f000340,bytes.fromhex('83EC0C'+'D93C24'+'0FB70424'+'660D000C'+'6689442402'+'D96C2402'+'DF7C2404'+'D92C24'+'8B442404'+'8B542408'+'83C40C'+'C3'))
mu.mem_map(0x20000000,0x1000) if False else None
def hk(uc,a,sz,ud):
    if a==0x406997:print('ST',[uc.reg_read(r) for r in (UC_X86_REG_ST0,UC_X86_REG_ST1,UC_X86_REG_ST2,UC_X86_REG_ST3,UC_X86_REG_ST4,UC_X86_REG_ST5,UC_X86_REG_ST6,UC_X86_REG_ST7)], hex(uc.reg_read(UC_X86_REG_FPSW)))
mu.hook_add(UC_HOOK_CODE,hk,None,0x406997,0x406997)
CNT=[0];RES=[]
def hk2(uc,a,sz,ud):
    CNT[0]+=1
    if CNT[0]<=255*6: RES.append(uc.reg_read(UC_X86_REG_EAX)&255)
mu.hook_add(UC_HOOK_CODE,hk2,None,0x406a9d,0x406a9d)
try: mu.emu_start(0x4068c5,0x7f000000,count=200000000)
except UcError as e: print(e,hex(mu.reg_read(UC_X86_REG_EIP)),hex(mu.reg_read(UC_X86_REG_ESI)),hex(mu.reg_read(UC_X86_REG_EDI)),hex(mu.reg_read(UC_X86_REG_EBX)),hex(mu.reg_read(UC_X86_REG_ECX)));raise
open(pre+'.in','wb').write(bytes(scr));open(pre+'.out','wb').write(bytes(mu.mem_read(0x10000000,512*384)))
open(pre+'.lut','wb').write(bytes(mu.mem_read(0x10110000,0x100)));open(pre+'.res','w').write(','.join(map(str,RES)));print('ok',hex(mu.reg_read(UC_X86_REG_EIP)))
