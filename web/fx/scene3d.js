// Per-object pass 0x4087df + sort/dispatch 0x40889b wired from the ported pieces (euler, mul, apply, project, queueFaces, tri, line).
// obj = {V:[[x,y,z]], faces:[{i:[a,b,c], flag3c, type}], ang:[ax,ay,az], pos:[x,y,z], euler, wire}; cam = {M: Float32Array(9) (cam+0x84), pos:[x,y,z] (cam+0x40), fx, fy, cx, cy, near}
// Face types: 6 = additive 0x3f triangle (0x409d67), 3 = wireframe (0x409ed5), 0 = textured with per-face UVs (0x409daf, fc.fuv = 6 floats at face+0x1c), 1 = textured with per-vertex env UVs + wire (0x409e3b, o.UV[i] = transformed vertex +0x20/+0x24).
// Textured faces use material texture o.tex (256x256 bytes). Clipped textured faces (vertex behind the near plane) are dropped: their UV clipping is not ported.
import { mul, apply, euler, project } from './engine3d.js';
import { queueFaces } from './engine3d.js';
import { tri, line, texTri } from './tri.js';
const f = Math.fround;
function wire(buf, fc, a, b, c, br = false) {   // 0x409ed5
  if (fc.wire) line(buf, a.sx, a.sy, b.sx, b.sy, 0x3f, br);
  else {   // coloured branch: 255 - min(255, ftol(v0.z*0.6)); edges v0v1, v0v2, v2v0 (verified through face type 1)
    const col = 255 - Math.min(255, Math.trunc(f(a.z * f(0.6))) >>> 0);
    if (col) { line(buf, a.sx, a.sy, b.sx, b.sy, col, br); line(buf, a.sx, a.sy, c.sx, c.sy, col, br); line(buf, c.sx, c.sy, a.sx, a.sy, col, br); }
  }
}
export function renderScene(objs, cam, buf, rev = 0, brush = false) {   // brush = flag 0x42f2f2 (slot 18)
  const all = [];
  for (const o of objs) {
    const Mo = o.euler ? euler(...o.ang) : o.M;                      // 0x408fbb (else the matrix at obj+0xa0 is left as it is)
    const M = mul(cam.M, Mo);                                         // 0x408f7d -> obj+0xc4
    const T = apply(cam.M, o.pos.map((p, k) => f(p - cam.pos[k])));   // 0x409020
    const P = project(o.V, M, T, cam.fx, cam.fy, cam.cx, cam.cy).map(p => ({ sx: p.sx, sy: p.sy, z: p.v[2], x: p.v[0], y: p.v[1] }));
    if (o.UV) P.forEach((p, i) => { p.uv = o.UV[i]; });
    for (const fc of o.faces) all.push({ v: fc.i.map(i => P[i]), flag3c: fc.flag3c, type: fc.type, wire: o.wire, fuv: fc.fuv, tex: o.tex });
  }
  const q = queueFaces(all, cam.near, rev, cam);
  for (const fc of q) {
    const [a, b, c] = fc.v;
    if (fc.type === 6) tri(buf, a.sx, a.sy, b.sx, b.sy, c.sx, c.sy, 0x3f, 1);
    else if (fc.type === 199) tri(buf, a.sx, a.sy, b.sx, b.sy, c.sx, c.sy, 0x82, 0);   // slot 11 custom draw 0x403d30: flat 0x82, pixels SET
    else if (fc.type === 3) wire(buf, fc, a, b, c, brush);
    else if (fc.type === 0 && fc.fuv) {
      const u = fc.fuv.map(x => f(x * 255));
      texTri(buf, fc.tex, a.sx, a.sy, u[0], u[1], b.sx, b.sy, u[2], u[3], c.sx, c.sy, u[4], u[5]);
    } else if (fc.type === 1 && a.uv && b.uv && c.uv) {
      const t = (p, k) => f(p.uv[k] * 255);
      texTri(buf, fc.tex, a.sx, a.sy, t(a, 0), t(a, 1), b.sx, b.sy, t(b, 0), t(b, 1), c.sx, c.sy, t(c, 0), t(c, 1));
      wire(buf, fc, a, b, c, brush);
    }
  }
  return q.length;
}
