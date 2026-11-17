import { tri } from '../web/fx/tri.js'; import fs from 'fs';
const j = JSON.parse(fs.readFileSync(process.argv[2])), b = { d: new Uint8Array(8000), pitch: 100, h: 80, w: 100 };
for (const t of j.tris) tri(b, ...t);
let bad = 0; for (let i = 0; i < 8000; i++) if (b.d[i] !== j.out[i]) bad++;
console.log('differing bytes', bad);
