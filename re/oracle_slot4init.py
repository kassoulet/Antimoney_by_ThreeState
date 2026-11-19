"""Runs the particle half of slot 4's init (0x401e31..0x401f1f, the rand() loop) under Unicorn with a given rand seed and dumps the table: python3 oracle_slot4init.py out.json seed"""
import sys,json,struct
from oc import *
seed(int(sys.argv[2]));wr(RS,int(sys.argv[2]))
sp=0x7f00e000;mu.reg_write(UC_X86_REG_EBP,sp);mu.reg_write(UC_X86_REG_ESP,sp-12)
mu.mem_write(sp,struct.pack('<I',0));mu.mem_write(sp+4,struct.pack('<I',0x7f000000))   # saved ebp, return address; the 3 pops eat junk
mu.emu_start(0x401e31,0x7f000000,count=10000000)
json.dump(dict(seed=int(sys.argv[2]),tbl=bytes(mu.mem_read(rd(0x4273c4),1024*24)).hex()),open(sys.argv[1],'w'))
