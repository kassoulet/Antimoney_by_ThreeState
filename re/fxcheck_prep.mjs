// node re/fxcheck_prep.mjs prep.json : engine3d.prepare vs oracle_prep.py (0x409136); reports max abs diff and count of differing floats.
import fs from 'fs'; import { prepare } from '../web/fx/engine3d.js';
const O = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/NaN/g, 'null')); let n = 0, bad = 0, mx = 0;
for (const o of O) { const r = prepare(o.V, o.F);
  for (const [a, b] of [[r.fn, o.fn], [r.vn, o.vn]]) a.forEach((v, i) => v.forEach((x, k) => { n++; const y = b[i][k] === null ? NaN : b[i][k]; if (Number.isNaN(x) && Number.isNaN(y)) return; const d = Math.abs(x - y); if (d) bad++; if (d > mx) mx = d; })); }
console.log('floats', n, 'differ', bad, 'max abs', mx);
