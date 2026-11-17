// node re/fxcheck22.mjs IN OUT S F : slot 22 port vs the Unicorn oracle (re/oracle22.py)
import fs from 'fs'; import { glow } from '../web/fx/fx22.js';
const [i, o, S, F] = process.argv.slice(2), A = new Uint8Array(fs.readFileSync(i)), G = fs.readFileSync(o);
glow(A, +S, Math.fround(+F)); let b = 0, m = 0; for (let k = 0; k < A.length; k++) if (A[k] !== G[k]) { b++; m = Math.max(m, Math.abs(A[k] - G[k])); }
console.log('differing bytes', b, 'of', A.length, 'max diff', m);
