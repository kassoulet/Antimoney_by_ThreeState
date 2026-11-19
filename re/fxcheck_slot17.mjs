// node re/fxcheck_slot17.mjs o17.json [seed]: slot 17 (curve keys, spline, random camera, picture) vs the original under Unicorn (re/oracle_slot17.py, same seed, rand = MSVCRT LCG)
import fs from 'fs'; import { frame, newState } from '../web/fx/slot17.js';
const J = JSON.parse(fs.readFileSync(process.argv[2])); let x = +(process.argv[3] || 1) >>> 0;
const rand = () => (x = (Math.imul(x, 0x343fd) + 0x269ec3) >>> 0, (x >>> 16) & 0x7fff);
const S = newState(); let tot = 0, cv = 0, n = 0;
for (const r of J.frames) {
  const buf = { d: new Uint8Array(512 * 384), pitch: 512, w: 512, h: 384 }; frame(S, J.t0 + 40 * r.k, rand, buf);
  const c = Buffer.from(r.cam, 'hex'); for (let i = 0; i < 3; i++) if (S.cur[i] !== c.readFloatLE(4 * i)) cv++;
  if (r.out) { const o = Buffer.from(r.out, 'hex'); let bad = 0; for (let i = 0; i < o.length; i++) if (buf.d[i] !== o[i]) bad++; tot += bad; n++; console.log('frame', r.k, 'differing bytes', bad, 'of', o.filter(b => b).length, 'lit'); }
}
console.log('total differing bytes', tot, 'over', n, 'frames | camera floats differing', cv, 'over', J.frames.length * 3);
