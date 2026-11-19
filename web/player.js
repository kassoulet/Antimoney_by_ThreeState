import { render, setRows, setMask, setStrips } from './fx/compose.js';
import { load } from './fx/fx13.js';
const cv = document.getElementById('cv'), g = cv.getContext('2d'), au = document.getElementById('au'), pp = document.getElementById('pp'), sk = document.getElementById('seek'), tm = document.getElementById('tm');
const img = g.createImageData(512, 384), px = new Uint32Array(img.data.buffer), idx = new Uint8Array(512 * 384);
let R = [0]; // first-pass time (ms) of each order*64+row
Promise.all([fetch('assets/rows.json').then(r => r.json()).then(r => { R = r; setRows(r); }), load('assets/fx13.bin')]);
// slot 4 mask: the original draws "3" (Arial, 255 px, bold; GDI via 0x40bd9a) into a 256x256 buffer and keeps pixels > 0x20; approximated with canvas text
{ const c = document.createElement('canvas'); c.width = c.height = 256; const t = c.getContext('2d'); t.fillStyle = '#fff'; t.font = 'bold 255px Arial, sans-serif'; t.textAlign = 'center'; t.textBaseline = 'top'; t.fillText('3', 128, -30);
  const d = t.getImageData(0, 0, 256, 256).data, m = new Uint8Array(65536); for (let i = 0; i < 65536; i++) m[i] = d[4 * i + 3] > 0x20 ? 0xff : 0; setMask(m); }
// slot 18 strips: Impact 160 px words centred in a 512x160 buffer, 0xc8 where there is text (0x4047b9)
setStrips(['work', 'consume', 'sleep'].map(w => { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const t = c.getContext('2d'); t.fillStyle = '#fff'; t.font = '160px Impact, sans-serif'; t.textAlign = 'center'; t.textBaseline = 'top'; t.fillText(w, 256, 0);
  const d = t.getImageData(0, 0, 512, 160).data, m = new Uint8Array(0x14000); for (let i = 0; i < 0x14000; i++) m[i] = d[4 * i + 3] ? 0xc8 : 0; return m; }));
const grain = () => Math.random() * 32 | 0;   // slot 24 (rand() in the original: not reproducible)
function axAt(ms) { let lo = 0, hi = R.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (R[m] <= ms) lo = m; else hi = m - 1; } return ((lo >> 6) << 8) | (lo & 63); }
function draw() {
  const a = au.currentTime * 1000, ms = Math.floor(a / 40) * 40 + 800;   // video clock = audio + 800 ms on the 40 ms (25 fps) grid; the exact offset is machine dependent in the original
  const v = render(axAt(a), ms, idx, grain);
  for (let i = 0; i < idx.length; i++) px[i] = idx[i] < v ? 0xffffffff : 0xff000000;
  g.putImageData(img, 0, 0); tm.textContent = au.currentTime.toFixed(1); if (document.activeElement !== sk) sk.value = au.currentTime * 10;
  requestAnimationFrame(draw);
}
pp.onclick = () => { au.paused ? au.play() : au.pause(); pp.textContent = au.paused ? 'play' : 'pause'; };
sk.oninput = () => { au.currentTime = sk.value / 10; };
draw();
