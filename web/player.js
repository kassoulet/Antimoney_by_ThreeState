import { render, setRows, setMask, setStrips, setSlot11, setMask16, setStrips23 } from './fx/compose.js';
import { load } from './fx/fx13.js';
const cv = document.getElementById('cv'), g = cv.getContext('2d'), au = document.getElementById('au'), pp = document.getElementById('pp'), sk = document.getElementById('seek'), tm = document.getElementById('tm');
const img = g.createImageData(512, 384), px = new Uint32Array(img.data.buffer), idx = new Uint8Array(512 * 384);
let R = [0]; // first-pass time (ms) of each order*64+row
Promise.all([fetch('assets/rows.json').then(r => r.json()).then(r => { R = r; setRows(r); }), load('assets/fx13.bin'), fetch('assets/slot11.bin').then(r => r.arrayBuffer()).then(setSlot11)]);
// slot 4 mask: the original draws "3" (Arial, 255 px, bold; GDI via 0x40bd9a) into a 256x256 buffer and keeps pixels > 0x20; approximated with canvas text
{ const c = document.createElement('canvas'); c.width = c.height = 256; const t = c.getContext('2d'); t.fillStyle = '#fff'; t.font = 'bold 255px Arial, sans-serif'; t.textAlign = 'center'; t.textBaseline = 'top'; t.fillText('3', 128, -30);
  const d = t.getImageData(0, 0, 256, 256).data, m = new Uint8Array(65536); for (let i = 0; i < 65536; i++) m[i] = d[4 * i + 3] > 0x20 ? 0xff : 0; setMask(m); }
// slot 18 strips: Impact 160 px words centred in a 512x160 buffer, 0xc8 where there is text (0x4047b9)
setStrips(['work', 'consume', 'sleep'].map(w => { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const t = c.getContext('2d'); t.fillStyle = '#fff'; t.font = '160px Impact, sans-serif'; t.textAlign = 'center'; t.textBaseline = 'top'; t.fillText(w, 256, 0);
  const d = t.getImageData(0, 0, 512, 160).data, m = new Uint8Array(0x14000); for (let i = 0; i < 0x14000; i++) m[i] = d[4 * i + 3] ? 0xc8 : 0; return m; }));
// slot 16 mask: "anti" (Arial bold 31 px) centred in 128x32 (GDI via 0x40bd9a); slot 23 strips: five 1536x16 Courier 16 px lines (0x65 where there is text), approximated with canvas text
{ const c = document.createElement('canvas'); c.width = 128; c.height = 32; const t = c.getContext('2d'); t.fillStyle = '#fff'; t.font = 'bold 31px Arial, sans-serif'; t.textAlign = 'center'; t.textBaseline = 'top'; t.fillText('anti', 64, 0);
  const d = t.getImageData(0, 0, 128, 32).data; setMask16(Uint8Array.from({ length: 4096 }, (_, i) => d[4 * i + 3] > 0x7f ? 0xff : 0)); }
setStrips23(['This is me underneath a pile of naked, heaving, sweaty women -- the ticking center of a 12 megaton sex bomb, drugged, drunk, a Parliment filter cigarette dangling out of my mouth as the entire naked world writhes and licks and rubs itself all over me.  I\'m tempted, but somehow, I think that the full service, in-room entertainment might leave me feeling a bit empty.',
  'How I got here is a plane picked me up in Austin and dropped me off in the middle of the desert, and a taxi drove me into this little dinky oasis town called Las Vegas.   There are castles.  There are pirate ships.  There are lions and tigers.  It\'s Disneyland, except instead of giant stuffed cartoon characters on every corner, we\'ve got giant, stuffed hookers.',
  'I get to the hotel where my friends and I, we\'ve registered as \'the web geeks,\' and we\'ve all got suites that are larger than most of our apartments.  Each suite comes with a stocked bar and two televisions and there are signs everywhere for dial-a-hooker.  Hos-To-Gos.   Never let it be said that Vegas doesn\'t provide for it\'s visitors. ',
  'With an erect nipple caught on your eyelid, there isn\'t much you can do besides enjoy. This is me underneath a pile of naked, heaving, sweaty women -- the ticking center of a 12 megaton sex bomb, drugged, drunk, a Parliment filter cigarette dangling out of my mouth as the entire naked world writhes and licks and rubs itself all over me.',
  'Less than an  hour after I step off the plane, I\'ve got a cigarette in my mouth, a flask of wiskey in my pocket, and I\'ve already blown my entire life savings on the magical video poker machines which whisper to me as I walk by, You can Win, You can Win, You can Win, but as soon as I slide my crinkled $20 into the slot, it just winks at me in giant red letters:'].map(w => {
  const c = document.createElement('canvas'); c.width = 1536; c.height = 16; const t = c.getContext('2d'); t.fillStyle = '#fff'; t.font = '16px Courier New, Courier, monospace'; t.textBaseline = 'top'; t.fillText(w, 0, 0);
  const d = t.getImageData(0, 0, 1536, 16).data; return Uint8Array.from({ length: 0x6000 }, (_, i) => d[4 * i + 3] > 0x7f ? 0x65 : 0); }));
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
