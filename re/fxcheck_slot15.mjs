// node fxcheck_slot15.mjs s15.json (from oracle_slot15.py): map + tables (init 0x407020, 0x406e20) and frames (0x407240 -> 0x406e70) vs the original under Unicorn
import { init, tables, params, render } from '../web/fx/slot15.js'; import fs from 'fs';
const J = JSON.parse(fs.readFileSync(process.argv[2])); let s = J.seed | 0;
const H = init(() => { s = (Math.imul(s, 0x343fd) + 0x269ec3) | 0; return (s >>> 16) & 0x7fff; }), T = tables();
let bad = 0; for (let i = 0; i < 65536; i++) if (H[i] !== J.map[i]) bad++; console.log('map differing bytes', bad, 'of 65536');
let ba = 0, bb = 0; for (let i = 0; i < 0x708; i++) { if (T.A[i] !== (J.A[i] | 0)) ba++; if (T.B[i] !== (J.B[i] | 0)) bb++; } console.log('tables differing', ba, bb, 'of 1800');
let tot = 0;
J.frames.forEach((r, k) => {
  const p = params(r.now, J.t0), d = new Uint8Array(512 * 384); render(d, J.map.length ? Uint8Array.from(J.map) : H, T, p.x, p.y, p.ang);
  let b = 0; for (let i = 0; i < d.length; i++) if (d[i] !== r.out[i]) b++; tot += b;
  console.log('frame', k, 'now', r.now, 'differing bytes', b, 'of', r.out.filter(v => v).length, 'lit; level', p.lvl, 'oracle', r.lvl);
});
console.log('total differing bytes', tot);
