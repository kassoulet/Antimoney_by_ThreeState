// node re/fxcheck_compose.mjs [step] : full compositor vs golden fbs frames (N=20..735, clock 800+250*(N-20), music advancing). Reports palette level and binary agreement.
import fs from 'fs'; import { render, state } from '../web/fx/compose.js'; import { setImages } from '../web/fx/fx13.js';
setImages(new Uint8Array(fs.readFileSync(new URL('../web/assets/fx13.bin', import.meta.url))));
const R = JSON.parse(fs.readFileSync(new URL('../web/assets/rows.json', import.meta.url))), out = new Uint8Array(512 * 384), step = +process.argv[2] || 20;
const axAt = ms => { let i = 0; while (i + 1 < R.length && R[i + 1] <= ms) i++; return ((i >> 6) << 8) | (i & 63); };
for (let n = 20; n <= 735; n += step) {
  const f = fs.readFileSync(new URL(`./fbs/fb${n}.bin`, import.meta.url)), ms = 800 + 250 * (n - 20), ax = axAt(ms - 800);
  let w = 0; for (let i = 0; i < 256; i++) if (f[i * 4] === 255) w++;
  const lvl = render(ax, ms - 210, out, () => 15); let ok = 0;
  for (let i = 0; i < out.length; i++) if ((f[1024 + i] < w) === (out[i] < lvl)) ok++;
  console.log(n, 'ax', ax.toString(16), 'on', [...state(ax, ms).on].join(','), 'lvl gold', w, 'ours', lvl, 'agree', (100 * ok / out.length).toFixed(1) + '%');
}
