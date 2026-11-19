// node re/fxcheck_slot11.mjs o11.json [../web/assets/slot11.bin]: slot 11 (keyframe camera + 102 meshes + palette level) vs the original under Unicorn (re/oracle_slot11.py)
import fs from 'fs'; import { parse, render, cameraAt, level } from '../web/fx/slot11.js';
const J = JSON.parse(fs.readFileSync(process.argv[2])), b = fs.readFileSync(process.argv[3] || new URL('../web/assets/slot11.bin', import.meta.url));
const M = parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); let tot = 0, lv = 0, cm = 0;
for (const [k, r] of J.frames.entries()) {
  const dt = r.now - J.t0, c = cameraAt(dt), H = Buffer.from(r.M, 'hex'), P = Buffer.from(r.pos, 'hex');
  for (let i = 0; i < 9; i++) if (c.M[i] !== H.readFloatLE(4 * i)) cm++;
  for (let i = 0; i < 3; i++) if (c.pos[i] !== P.readFloatLE(4 * i)) cm++;
  if (level(dt) !== r.lvl) lv++;
  const buf = { d: new Uint8Array(512 * 384), pitch: 512, w: 512, h: 384 }; render(M, dt, buf);
  let bad = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== r.out[i]) bad++;
  tot += bad; if (bad || k < 3) console.log('frame', k, 'dt', dt, 'differing bytes', bad, 'of', r.out.filter(x => x).length, 'lit');
}
console.log('total differing bytes', tot, '| camera floats differing', cm, '| level mismatches', lv, 'over', J.frames.length, 'frames');
