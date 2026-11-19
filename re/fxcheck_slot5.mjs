// node fxcheck_slot5.mjs s5.json (from oracle_slot5.py): generator 0x40a979 (vertices, UVs, faces), texture 0x408510 and the whole frame vs the original under Unicorn
import { sphere, gradient, frame } from '../web/fx/slot5.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])), I = J.init, H = h => Buffer.from(h, 'hex'), f32 = Math.fround;
const vb = H(I.V), fb = H(I.F), M = sphere();
let bv = 0, bu = 0, bf = 0, bt = 0;
M.V.forEach((p, i) => { for (let k = 0; k < 3; k++) if (!Object.is(p[k], vb.readFloatLE(0x30 * i + 4 * k)) && p[k] !== vb.readFloatLE(0x30 * i + 4 * k)) bv++; if (M.UV[i][0] !== vb.readFloatLE(0x30 * i + 0x20) || M.UV[i][1] !== vb.readFloatLE(0x30 * i + 0x24)) bu++; });
M.F.forEach((F, i) => { for (let k = 0; k < 3; k++) if (F.i[k] !== fb.readUInt16LE(0x40 * i + 8 * k)) bf++; for (let k = 0; k < 6; k++) if (F.fuv[k] !== fb.readFloatLE(0x40 * i + 0x1c + 4 * k)) bf++; });
const T = gradient(); for (let i = 0; i < 65536; i++) if (T[i] !== I.tex[i]) bt++;
console.log('verts', M.V.length, 'of', I.nv, 'faces', M.F.length, 'of', I.nf, '| differing: vertex floats', bv, 'UV', bu, 'face fields', bf, 'texture bytes', bt);
let tot = 0;
for (const [k, r] of J.frames.entries()) {
  const buf = { d: new Uint8Array(512 * 384), pitch: 512, w: 512, h: 384 };
  frame(r.now, r.ax, buf);
  let bad = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== r.out[i]) bad++;
  tot += bad; if (bad || k < 3) console.log('frame', k, 'now', r.now, 'ax', r.ax.toString(16), 'differing bytes', bad, 'of', r.out.filter(b => b).length, 'lit');
}
console.log('total differing bytes over', J.frames.length, 'frames:', tot);
