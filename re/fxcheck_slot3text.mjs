// node fxcheck_slot3text.mjs s3t.json (from oracle_slot3text.py): slot 3 frame with the text overlay (warped star + paddb text window) vs the original frame callback under Unicorn, synthetic mask
import { frame, overlay } from '../web/fx/fx03.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])); let tot = 0;
J.samples.forEach((r, k) => {
  const star = frame(r.ms, new Uint8Array(512 * 384), 0, false), d = Uint8Array.from(r.st);   // flag on: no horizontal lines; the star replaces the start picture only after the add
  // original: screen = warp(texture) (SET), then + overlay
  d.set(star); overlay(d, r.ms, J.t0, J.mask);
  let b = 0; for (let i = 0; i < d.length; i++) if (d[i] !== r.out[i]) b++; tot += b;
  console.log('sample', k, 'dt', r.ms - J.t0, 'differing bytes', b);
});
console.log('total differing bytes over', J.samples.length, 'samples:', tot);
