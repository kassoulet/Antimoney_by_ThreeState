// node fxcheck_s12model.mjs s12.json [AX]: slot 12 frame logic (web/fx/slot12.js) stepped from the oracle's initial state vs the Unicorn run (model data, then pixels)
import { frame, makeRand, model, CAM } from '../web/fx/slot12.js'; import { renderScene } from '../web/fx/scene3d.js'; import fs from 'fs'; import { mul, apply, euler, project } from '../web/fx/engine3d.js';
const D = JSON.parse(fs.readFileSync(process.argv[2])), AX = process.argv[3] ? +process.argv[3] : 0, f = Math.fround, H = h => Buffer.from(h, 'hex');
const I = D.init, w = H(I.walk), v0 = H(I.v0);
const S = { walk: [], V0: [], F0: [], nc: 0, cubes: [], V1: [], grid: Uint8Array.from(H(I.grid)), acc: [0, 0, 0], prev: D.T0, done: false, rand: makeRand(I.seed), enabled: true };
for (let i = 0; i < 16; i++) { const o = i * 0x28, r = k => w.readInt32LE(o + k); S.walk.push({ p: w.readFloatLE(o), cur: [r(4), r(8), r(12)], from: [r(16), r(20), r(24)], vf: r(0x1c), vt: r(0x20), ts: r(0x24) }); }
for (let i = 0; i < v0.length / 0x30; i++) S.V0.push([0, 4, 8].map(k => v0.readFloatLE(0x30 * i + k)));
let tot = 0;
const last = Math.max(...D.frames.map(r => r.k)), at = new Map(D.frames.map(r => [r.k, r]));
for (let k = 1; k <= last; k++) {
  frame(S, D.T0 + 250 * k, AX);
  const r = at.get(k); if (!r) continue;
  const m = r.m, bad = {}; const cnt = (n, c) => { if (c) bad[n] = (bad[n] || 0) + c; };
  const a = H(m.v0), nv0 = a.length / 0x30; if (nv0 !== S.V0.length) cnt('nv0', 1);
  for (let i = 0; i < nv0; i++) for (let j = 0; j < 3; j++) if (S.V0[i] && a.readFloatLE(0x30 * i + 4 * j) !== S.V0[i][j]) { cnt('v0', 1); if (process.env.DBG) console.log('v0', i, j, S.V0[i][j], a.readFloatLE(0x30 * i + 4 * j)); }
  const fa = H(m.f0); if (fa.length / 0x40 !== S.F0.length) cnt('nf0', 1);
  S.F0.forEach(([x, y], i) => { if (fa.readUInt16LE(0x40 * i) !== x || fa.readUInt16LE(0x40 * i + 8) !== y || fa.readUInt16LE(0x40 * i + 16) !== y) cnt('f0', 1); });
  const b = H(m.v1); if (b.length / 0x30 !== 8 * S.nc) cnt('nv1', 1);
  S.V1.flat().forEach((v, i) => v.forEach((c, j) => { if (b.readFloatLE(0x30 * i + 4 * j) !== c) cnt('v1', 1); }));
  const cb = H(m.cubes); if (m.ncubes !== S.nc) cnt('ncubes', 1);
  S.cubes.forEach((c, i) => { if (cb.readInt32LE(24 * i) !== c.t || cb[24 * i + 8] !== c.flag || [0, 1, 2].some(j => cb.readFloatLE(24 * i + 12 + 4 * j) !== c.c[j])) { cnt('cubes', 1); if (process.env.DBG) console.log('cube', i, JSON.stringify(c), cb.readInt32LE(24 * i), cb[24 * i + 8], cb.readFloatLE(24 * i + 12), cb.readFloatLE(24 * i + 16), cb.readFloatLE(24 * i + 20)); } });
  if (!H(m.grid).equals(Buffer.from(S.grid))) cnt('grid', 1);
  const ac = H(m.acc); S.acc.forEach((x, i) => { if (ac.readFloatLE([4, 8, 20][i]) !== x) cnt('acc', 1); });
  const o0 = H(m.o0); [0x64, 0x68, 0x6c].forEach((q, i) => { if (o0.readInt32LE(q) !== S.ang[i]) cnt('ang', 1); });
  S.walk.forEach((x, i) => { const o = i * 0x28, g = q => w2(m.walk).readInt32LE(o + q); if (g(4) !== x.cur[0] || g(8) !== x.cur[1] || g(12) !== x.cur[2] || g(0x1c) !== x.vf || g(0x20) !== x.vt || g(0x24) !== x.ts) { cnt('walk', 1); if (process.env.DBG) console.log('walker', i, JSON.stringify(x), 'oracle', g(4), g(8), g(12), g(16), g(20), g(24), g(0x1c), g(0x20), g(0x24)); } });
  const buf = { d: new Uint8Array(512 * 384), pitch: 512, w: 512, h: 384 };
  renderScene(model(S), CAM, buf, 0); let px = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== r.out[i]) px++;
  let behind = 0; for (const o of model(S)) { const P = project(o.V, mul(CAM.M, euler(...o.ang)), apply(CAM.M, o.pos.map((p, j) => f(p - CAM.pos[j]))), CAM.fx, CAM.fy, CAM.cx, CAM.cy); for (const fc of o.faces) if (fc.i.some(i => P[i].v[2] < CAM.near)) behind++; }
  console.log('frame', k, 'faces with a vertex behind near:', behind, 'verts', S.V0.length, 'edges', S.F0.length, 'cubes', S.nc, 'model diffs', JSON.stringify(bad), 'pixels differing', px, 'of', r.out.filter(x => x).length, 'lit');
}
function w2(h) { return w2.c === h ? w2.b : (w2.c = h, w2.b = H(h)); }
