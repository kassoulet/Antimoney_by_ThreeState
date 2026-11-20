// node fxcheck_slot23.mjs s23.json (from oracle_slot23.py): frames of 0x40502b (synthetic strips, random start picture, several Y) vs the original under Unicorn
import { frame } from '../web/fx/slot23.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])), S = J.strips.map(s => Uint8Array.from(s)); let tot = 0;
J.frames.forEach((r, k) => {
  const buf = { d: Uint8Array.from(r.st) }; frame(buf, r.dt, S, r.Y);
  let b = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== r.out[i]) b++; tot += b;
  if (b || k < 3) console.log('frame', k, 'dt', r.dt, 'Y', r.Y, 'differing bytes', b);
});
console.log('total differing bytes', tot);
