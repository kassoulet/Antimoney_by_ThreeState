// node fxcheck_slot18.mjs s18.json (from oracle_slot18.py): camera matrix, 300 curve vertices, palette level and the picture (brush lines + text strip add) vs the original under Unicorn
import { vertices, CAM_M, render, strip, level } from '../web/fx/slot18.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])), S = J.strips.map(h => Buffer.from(h, 'hex')); let tot = 0;
J.frames.forEach((r, k) => {
  const T = r.now - J.t0, V = vertices(T), ov = Buffer.from(r.V, 'hex'); let bv = 0;
  for (let i = 0; i < 300; i++) for (let a = 0; a < 3; a++) if (V[i][a] !== ov.readFloatLE(48 * i + 4 * a)) bv++;
  const om = Buffer.from(r.M, 'hex'); let bm = 0; for (let i = 0; i < 9; i++) if (CAM_M[i] !== om.readFloatLE(4 * i)) bm++;
  const d = new Uint8Array(512 * 384); render(T, { d });
  const s = r.pos < 0x1900 ? S[0] : r.pos < 0x1a00 ? S[1] : r.pos < 0x1c00 ? S[2] : null; if (s) strip(d, s);
  let b = 0; for (let i = 0; i < d.length; i++) if (d[i] !== r.out[i]) b++; tot += b;
  const lv = level(r.pos);
  console.log('frame', k, 'T', T, 'vertex floats differing', bv, 'matrix', bm, 'pixels differing', b, 'of', r.out.filter(v => v).length, 'lit; level', lv ?? 'untouched', r.lvl === 0xdead ? 'untouched' : r.lvl);
});
console.log('total differing bytes', tot);
