// Per-object pass 0x4087df + sort/dispatch 0x40889b wired from the ported pieces (euler, mul, apply, project, queueFaces, tri, line).
// obj = {V:[[x,y,z]], faces:[{i:[a,b,c], flag3c, type}], ang:[ax,ay,az], pos:[x,y,z], euler, wire}; cam = {M: Float32Array(9) (cam+0x84), pos:[x,y,z] (cam+0x40), fx, fy, cx, cy, near}
// Face types: 6 = additive 0x3f triangle (0x409d67), 3 = wireframe (0x409ed5). Types 0/1 (0x409daf, 0x409e3b) and the near-plane clip are NOT ported.
import { mul, apply, euler, project } from './engine3d.js';
import { queueFaces } from './engine3d.js';
import { tri, line } from './tri.js';
const f = Math.fround;
export function renderScene(objs, cam, buf, rev = 0) {
  const all = [];
  for (const o of objs) {
    const Mo = o.euler ? euler(...o.ang) : o.M;                      // 0x408fbb (else the matrix at obj+0xa0 is left as it is)
    const M = mul(cam.M, Mo);                                         // 0x408f7d -> obj+0xc4
    const T = apply(cam.M, o.pos.map((p, k) => f(p - cam.pos[k])));   // 0x409020
    const P = project(o.V, M, T, cam.fx, cam.fy, cam.cx, cam.cy).map(p => ({ sx: p.sx, sy: p.sy, z: p.v[2], x: p.v[0], y: p.v[1] }));
    for (const fc of o.faces) all.push({ v: fc.i.map(i => P[i]), flag3c: fc.flag3c, type: fc.type, wire: o.wire });
  }
  const q = queueFaces(all, cam.near, rev, cam);
  for (const fc of q) {
    const [a, b, c] = fc.v;
    if (fc.type === 6) tri(buf, a.sx, a.sy, b.sx, b.sy, c.sx, c.sy, 0x3f, 1);
    else if (fc.type === 3) {
      if (fc.wire) line(buf, a.sx, a.sy, b.sx, b.sy, 0x3f);
      else {   // 0x409ed5 coloured branch (not verified: slot 12 only uses the constant-colour wire)
        const col = 255 - Math.min(255, Math.trunc(f(a.z * 0.6)) >>> 0);
        if (col) { line(buf, a.sx, a.sy, b.sx, b.sy, col); line(buf, a.sx, a.sy, c.sx, c.sy, col); line(buf, c.sx, c.sy, a.sx, a.sy, col); }
      }
    }
  }
  return q.length;
}
