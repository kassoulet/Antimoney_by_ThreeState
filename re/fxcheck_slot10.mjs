// node fxcheck_slot10.mjs s10.json (from oracle_slot10.py): sprites (init 0x4021a0) and frames (0x402290 -> 0x402510) vs the original under Unicorn
import { sprites, frame } from '../web/fx/slot10.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])), T = sprites(); let bs = 0, tot = 0;
for (let i = 0; i < T.length; i++) if (T[i] !== J.spr[i]) bs++;
console.log('sprite bytes differing', bs, 'of', T.length);
J.frames.forEach((r, k) => {
  const buf = { d: new Uint8Array(512 * 384) }; frame(buf, r.now, J.t0, T);
  let b = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== r.out[i]) b++; tot += b;
  if (b || k < 3) console.log('frame', k, 'now', r.now, 'differing bytes', b, 'of', r.out.filter(v => v).length, 'lit');
});
console.log('total differing bytes', tot);
