"""python3 fn.py START END : print img.dis instructions in [START,END) (hex)"""
import re,sys
a,b=int(sys.argv[1],16),int(sys.argv[2],16)
for l in open('img.dis'):
    m=re.match(r'\s+([0-9a-f]+):\t([0-9a-f ]+)\t(.*)',l)
    if m and a<=int(m.group(1),16)<b: print(m.group(1),m.group(3))
