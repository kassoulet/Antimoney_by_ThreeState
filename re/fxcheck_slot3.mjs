// node fxcheck_slot3.mjs out.json (from oracle_slot3.py): slot 3 texture (no grain) vs the original routine 0x401000 under Unicorn
import fs from 'fs'; import { tex } from '../web/fx/fx03.js';
for (const r of JSON.parse(fs.readFileSync(process.argv[2]))) {
  const T = tex(Math.floor(r.ms / 10), r.l5c, !r.flag); let bad = 0; for (let i = 0; i < 65536; i++) if (T[i] !== r.tex[i]) bad++;
  console.log('ms', r.ms, 'len5c', r.l5c, 'text flag', r.flag, 'differing bytes', bad, 'of', r.tex.filter(b => b).length, 'lit');
}
