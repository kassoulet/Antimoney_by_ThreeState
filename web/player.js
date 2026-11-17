import { render } from './fx/compose.js';
import { load } from './fx/fx13.js';
const cv = document.getElementById('cv'), g = cv.getContext('2d'), au = document.getElementById('au'), pp = document.getElementById('pp'), sk = document.getElementById('seek'), tm = document.getElementById('tm');
const img = g.createImageData(512, 384), px = new Uint32Array(img.data.buffer), idx = new Uint8Array(512 * 384);
let R = [0]; // first-pass time (ms) of each order*64+row
Promise.all([fetch('assets/rows.json').then(r => r.json()).then(r => { R = r; }), load('assets/fx13.bin')]);
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
