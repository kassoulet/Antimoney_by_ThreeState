import { frame, level } from './fx/fx03.js';
const cv = document.getElementById('cv'), g = cv.getContext('2d'), au = document.getElementById('au'), pp = document.getElementById('pp'), sk = document.getElementById('seek'), tm = document.getElementById('tm');
const img = g.createImageData(512, 384), px = new Uint32Array(img.data.buffer), idx = new Uint8Array(512 * 384), SCENE1_END = 13400; // order 2 (script time 512) at 13.4 s of audio
function draw() {
  const ms = au.currentTime * 1000 + 800;   // video clock = audio + 800 ms (golden run: script time 0 at clock 800; the exact offset is machine dependent in the original)
  if (au.currentTime * 1000 < SCENE1_END) {
    frame(Math.floor(ms / 40) * 40, idx); const v = level(ms);   // 25 fps grid like the golden run
    for (let i = 0; i < idx.length; i++) { const n = (idx[i] + (Math.random() * 32 | 0)) & 255; px[i] = n < v ? 0xffffffff : 0xff000000; }  // + slot 24 grain (approximate: Math.random)
  } else px.fill(0xff000000);
  g.putImageData(img, 0, 0); tm.textContent = au.currentTime.toFixed(1); if (document.activeElement !== sk) sk.value = au.currentTime * 10;
  requestAnimationFrame(draw);
}
pp.onclick = () => { au.paused ? au.play() : au.pause(); pp.textContent = au.paused ? 'play' : 'pause'; };
sk.oninput = () => { au.currentTime = sk.value / 10; };
draw();
