// node re/fxcheck_mat.mjs mat.json : engine3d tables/matrix helpers vs oracle_mat.py (0x4088df, 0x408fbb, 0x409065)
import fs from 'fs'; import * as E from '../web/fx/engine3d.js';
const O = JSON.parse(fs.readFileSync(process.argv[2])); const st = {};
const cmp = (name, a, b) => { const s = st[name] ??= { n: 0, bad: 0, mx: 0 }; a.forEach((x, i) => { s.n++; const d = Math.abs(x - b[i]); if (d) s.bad++; if (d > s.mx) s.mx = d; }); };
cmp('sin', E.SIN, O.sin); cmp('cos', E.COS, O.cos);
for (const o of O.objs) {
  cmp('euler', E.euler(...o.ang), o.M);
  const r = E.rotateNormals(Float32Array.from(o.mat), o.vn, o.fn);
  cmp('vn', r.vn.flat(), o.vo.flat()); cmp('fn', r.fn.flat(), o.fo.flat());
}
console.table(st);
// projection pass (oracle_proj.py): node re/fxcheck_mat.mjs mat.json proj.json
if (process.argv[3]) {
  const Q = JSON.parse(fs.readFileSync(process.argv[3])), s = {};
  const c2 = (name, a, b) => { const t = s[name] ??= { n: 0, bad: 0, mx: 0 }; a.forEach((x, i) => { t.n++; const d = Math.abs(x - b[i]); if (d) t.bad++; if (d > t.mx) t.mx = d; }); };
  for (const q of Q) {
    const r = E.project(q.P, Float32Array.from(q.M), q.T, q.fx, q.fy, q.cx, q.cy);
    c2('view', r.flatMap(o => o.v), q.out.flat()); c2('screen', r.flatMap(o => [o.sx, o.sy]), q.scr.flat());
    c2('uv', q.vn.flatMap(E.envUV), q.uv.flat()); c2('shade', q.fn.map(E.faceShade), q.sh);
  }
  console.table(s);
}
