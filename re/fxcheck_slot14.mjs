// node fxcheck_slot14.mjs s14.json (from oracle_slot14.py): init state (grids, links, flags, walkers), per-frame walker vertices and pictures vs the original under Unicorn
import { init, update, render } from '../web/fx/slot14.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])); let s = J.seed | 0;
const S = init(() => { s = (Math.imul(s, 0x343fd) + 0x269ec3) | 0; return (s >>> 16) & 0x7fff; });
const bits = x => { const b = Buffer.alloc(4); b.writeFloatLE(x); return b.readUInt32LE(); }, flt = u => new Float32Array(new Uint32Array([u]).buffer)[0];
let bad = 0, nv = 0, bf = 0;
J.init.arrays.forEach((a, k) => a.forEach((v, i) => { nv++;
  if (bits(S.G.X[k][i]) !== v[0] || bits(S.G.Y[k][i]) !== v[1]) bad++;
  for (let q = 0; q < 3; q++) if (S.G.L[k][3 * i + q] !== v[4 + q][0] * 1024 + v[4 + q][1]) bad++;
  if (S.G.F[k][i] !== v[2]) bf++; }));
console.log('grid vertices', nv, 'differing fields (xy + 3 links)', bad, 'flags differing', bf);
let bw = 0; J.init.walkers.forEach((w, i) => { const W = S.W[i]; if (W.per !== flt(w[4]) || W.cur !== w[2][0] * 1024 + w[2][1] || W.prev !== w[3][0] * 1024 + w[3][1]) bw++; });
console.log('walkers differing (period, cur, prev)', bw, 'of 300');
let tot = 0, tv = 0;
J.frames.forEach((r, k) => {
  update(S, r.now);
  const ov = Buffer.from(r.V, 'hex'); let bvx = 0; for (let i = 0; i < 600; i++) for (let a = 0; a < 2; a++) if (S.V[3 * i + a] !== ov.readFloatLE(48 * i + 4 * a)) bvx++; tv += bvx;
  let line = 'frame ' + k + ' now ' + r.now + ' vertex floats differing ' + bvx;
  if (r.out) {
    const d = new Uint8Array(512 * 384); render(S, r.pos, { d }, r.ov ? Uint8Array.from(Buffer.from(J.overlay, 'hex')) : null);
    let b = 0; for (let i = 0; i < d.length; i++) if (d[i] !== r.out[i]) b++; tot += b; line += ' pixels differing ' + b + ' of ' + r.out.filter(v => v).length + ' lit';
  }
  if (r.walkers) { let b2 = 0; r.walkers.forEach((w, i) => { const W = S.W[i]; if (W.cur !== w[2][0] * 1024 + w[2][1] || W.prev !== w[3][0] * 1024 + w[3][1] || W.ts !== w[5]) b2++; }); line += ' walkers differing ' + b2; }
  console.log(line);
});
console.log('total differing bytes', tot, 'vertex floats', tv);
