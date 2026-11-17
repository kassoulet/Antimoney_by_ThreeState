// node re/fxcheck03.mjs : slot 3 vs golden frames re/fbv (frame N at clock 800+40*(N-20) ms). The golden screen = slot 3 + slot 24 grain (rand()&31 added, wraps), so we count
// pixels whose (golden - ours) & 255 is outside 0..31.
import fs from 'fs'; import { frame } from '../web/fx/fx03.js';
let bad = 0, tot = 0; const out = new Uint8Array(512 * 384);
for (const n of [30, 50, 100, 101, 300, 600]) {
  const g = fs.readFileSync(new URL(`./fbv/fb${n}.bin`, import.meta.url)).subarray(1024); frame(800 + 40 * (n - 20), out); let b = 0;
  for (let i = 0; i < out.length; i++) if (((g[i] - out[i]) & 255) > 31) b++;
  console.log(n, 'outside grain range:', b, (100 * b / out.length).toFixed(2) + '%'); bad += b; tot += out.length;
}
console.log('total', (100 * bad / tot).toFixed(2) + '%');
import { level } from '../web/fx/fx03.js';
let pb = 0; for (const n of [21, 100, 150, 200, 300, 600]) { const p = fs.readFileSync(new URL(`./fbv/fb${n}.bin`, import.meta.url)); let w = 0; for (let i = 0; i < 256; i++) if (p[i * 4] === 255) w++; const l = level(800 + 40 * (n - 20)); if (l !== w) { pb++; console.log('palette', n, 'gold', w, 'ours', l); } }
console.log('palette mismatches', pb);
