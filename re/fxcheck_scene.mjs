// node fxcheck_scene.mjs sc.json  (from oracle_scene.py): camera globals + queue/sort/triangle dispatch vs the original under Unicorn
import { camera, drawFaces } from '../web/fx/engine3d.js'; import { tri } from '../web/fx/tri.js'; import fs from 'fs';
const j = JSON.parse(fs.readFileSync(process.argv[2])), c = camera(j.cam[0], j.cam[1], j.cam[2], j.cam[3]);
console.log('camera', c, 'oracle', j.fx, j.c);
const f = Math.fround, V = j.sv.map(([x, y, z, sx, sy]) => ({ sx: f(sx), sy: f(sy), z: f(z) }));
const buf = { d: new Uint8Array(j.W * j.H), pitch: j.W, h: j.H, w: j.W };
const n = drawFaces(j.faces.map(([a, b, c2, fl]) => ({ v: [V[a], V[b], V[c2]], flag3c: fl })), j.near, buf, tri, j.rev);
let bad = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== j.out[i]) bad++;
console.log('queued', n, 'oracle', j.queued, 'differing bytes', bad);
