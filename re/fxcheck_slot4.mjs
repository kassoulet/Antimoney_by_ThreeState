// node fxcheck_slot4.mjs s4.json [s4i.json] (from oracle_slot4.py): sprite texture (init 0x401d11), particle table layout, and N consecutive frames (sprite blit 0x401b60, overlay 0x402118) vs the original under Unicorn
import { sprite, frame, particles } from '../web/fx/slot4.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])), T = sprite(); let bt = 0;
for (let i = 0; i < 65536; i++) if (T[i] !== J.tex[i]) bt++;
console.log('sprite texture differing bytes', bt, 'of 65536');
const tb = Buffer.from(J.tbl, 'hex'), P = new Int32Array(1024 * 5);
for (let i = 0; i < 1024; i++) for (let k = 0; k < 5; k++) P[5 * i + k] = tb.readInt32LE(24 * i + 4 * k);   // x,y,z,vx,vy at +0,+4,+8,+0xc,+0x10 (vz at +0x14 is unused)
let tot = 0;
J.frames.forEach((r, k) => {
  const buf = { d: new Uint8Array(512 * 384) };
  frame(P, k, r.now, J.t0, buf, J.mask, T, J.text);
  let bad = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== r.out[i]) bad++;
  tot += bad; if (bad || k < 3) console.log('frame', k, 'differing bytes', bad, 'of', r.out.filter(b => b).length, 'lit');
});
console.log('total differing bytes over', J.frames.length, 'frames:', tot);
if (process.argv[3]) {   // oracle_slot4init.py: the rand() loop of the init with a given seed
  const I = JSON.parse(fs.readFileSync(process.argv[3])), b = Buffer.from(I.tbl, 'hex'); let s = I.seed | 0;
  const P2 = particles(() => { s = (Math.imul(s, 0x343fd) + 0x269ec3) | 0; return (s >>> 16) & 0x7fff; }); let bad = 0;
  for (let i = 0; i < 1024; i++) for (let k = 0; k < 5; k++) if (P2[5 * i + k] !== b.readInt32LE(24 * i + 4 * k)) bad++;
  console.log('particle table differing ints', bad, 'of 5120');
}
