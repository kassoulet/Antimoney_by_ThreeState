import math,struct,numpy as np,sys
f32=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
def ftol(v):return int(v)  # truncate
# warp table (slot 3 init 0x401220)
def warp():
    W=np.zeros((384,512),np.uint16)
    for y in range(384):
        Y=f32((y-0xc0)*f32(0.003125))
        for x in range(512):
            X=f32((x-0x100)*f32(0.003125))
            ang=ftol((math.atan2(Y,X)+1.5707963267948966)*1.2732395447351628*-255.0)
            r=ftol(math.sqrt(X*X+Y*Y)*255.0)
            W[y,x]=(r-(ang<<8))&0xffff
    return W
LG=[f32(math.log10(i)) for i in range(1,121)]
def lines(t,flag2=0,L5c=0.0):
    tex=np.zeros(65536,np.int32)   # saturating add of 0x3f
    def hl(y,n):
        if 0<=y<=255:
            for i in range(n):tex[(y<<8)+i]=min(255,tex[(y<<8)+i]+0x3f)
    def vl(x,n):
        if 0<=x<=255:
            for i in range(n):tex[x+256*i]=min(255,tex[x+256*i]+0x3f)
    a=t*0.005
    C=math.sin(a)*40+50; D=math.cos(a)*40+50
    ebx=100-ftol(math.sin(t*0.01)*-50.0)
    for k in range(1,121):
        j=120-k
        v=(LG[119]-LG[j])
        ebp=ftol(v*C)
        n=100-ftol(math.sin(f32(k*f32(0.01))+a)*-128.0)
        if flag2==0:hl(ebx-ebp,n);hl(ebx+ebp,n)
        if L5c>0:n=ftol(L5c)
        e=ftol(v*D)
        vl(ebx-e,n);vl(e+ebx,n)
    return tex
if __name__=='__main__':
    W=warp();print(W[0,:4],W[200,250:254])
    N=int(sys.argv[1])
    g=lambda n:np.frombuffer(open(f'fbv/fb{n}.bin','rb').read()[1024:],np.uint8).reshape(384,512)
    for n in (N,N+1,N+5):
        tm=800+40*(n-1-20);t=tm//10
        tex=lines(t).astype(np.uint8)
        img=tex[W]
        G=g(n);print(n,'diff',(img!=G).sum(),'of',G.size,'gold nonzero',(G!=0).sum(),'mine nonzero',(img!=0).sum())
    for n in (N,N+1,N+5):
      for dt in (-1,0,1):
        tm=800+40*(n-1-20)+dt*40;t=tm//10
        img=lines(t).astype(np.uint8)[W];G=g(n)
        for th in (63,):
            a=img//63;b=G//63
            print(n,dt,'bands equal',(np.minimum(a,4)==np.minimum(b,4)).mean())
