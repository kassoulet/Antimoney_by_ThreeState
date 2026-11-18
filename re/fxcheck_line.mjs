// node fxcheck_line.mjs line.json (from oracle_line.py): line drawer vs the original under Unicorn
import { line } from '../web/fx/tri.js'; import fs from 'fs';
const L = JSON.parse(fs.readFileSync(process.argv[2])), f = Math.fround; let bad = 0, badl = 0, tot = 0;
for (const o of L) {
  const buf = { d: new Uint8Array(512 * 384), pitch: 512, w: 512, h: 384 }; line(buf, ...o.p.map(f), o.col);
  const g = new Uint8Array(512 * 384); for (const [i, b] of o.px) g[i] = b;
  let n = 0; for (let i = 0; i < g.length; i++) if (g[i] !== buf.d[i]) n++; bad += n; if (n) badl++; tot++;
}
console.log('lines', tot, 'with differing pixels', badl, 'differing bytes', bad);
