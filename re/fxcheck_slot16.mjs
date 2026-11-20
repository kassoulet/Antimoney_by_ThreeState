// node fxcheck_slot16.mjs s16.json (from oracle_slot16.py): frames of 0x401660 (synthetic mask, random start picture) vs the original under Unicorn
import { frame } from '../web/fx/slot16.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])); let tot = 0;
J.frames.forEach((r, k) => {
  const buf = { d: Uint8Array.from(r.st) }; frame(buf, r.dt, J.mask, J.seeds);
  let b = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== r.out[i]) b++; tot += b;
  if (b || k < 3) console.log('frame', k, 'dt', r.dt, 'differing bytes', b);
});
console.log('total differing bytes', tot);
