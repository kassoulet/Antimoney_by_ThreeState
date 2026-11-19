// Slot 17 (orders 16-17): one 960-vertex wire curve (thin additive 0x3f lines) seen by a camera that jumps to random points. Frame 0x405385, keys 0x405141 (160 records, key i at
// position 6i, Hermite spline 0x4055c6 with tension 1.2, evaluated at 0..959), camera position lerped over 500 ms to a random target (0x405385, probability 1500/32768 per frame),
// look from (x, y, z-800) to (x, y, z), fov 95. x87 is single precision: Math.fround after every op (sin/cos results stay doubles until the next op).
// Verified bit-exact against the original under Unicorn (re/oracle_slot17.py, re/fxcheck_slot17.mjs; same seeded rand).
import { renderScene } from './scene3d.js';
import { camera } from './engine3d.js';
import { lookAt, hermite } from './slot18.js';
const f = Math.fround, CF = camera(512, 384, 95, 0.75);
// 0x405141: 160 key records {pos, p:[x,y,z]} at dt ms after the first enabled frame
export function keys(dt) {
  const T = f(dt * f(0.001)), R = [];
  for (let i = 0; i < 160; i++) {
    const a = f(f(f(i * f(0.006289307959377766)) * 36) * Math.PI), r = f(f(Math.sin(f(f(a * 10) + T)) * 80) + 100);
    R.push({ pos: 6 * i, p: [f(Math.sin(a) * f(r + r)), f(Math.cos(a) * r), f(Math.sin(f(a * f(2.4000000953674316))) * f(r * 3))] });
  }
  return R;
}
export const vertices = dt => { const R = keys(dt), V = []; for (let i = 0; i < 960; i++) V.push(hermite(R, i, 6, f(1.2000000476837158))); return V; };
const FACES = Array.from({ length: 959 }, (_, k) => ({ i: [k, k + 1, k + 1], flag3c: true, type: 3 }));
export const newState = () => ({ t0: null, cur: [0, 0, 0], prev: [0, 0, 0], tgt: [0, 0, 0], t1: 0, on: false });
// advances the camera state for the frame at clock `now` (rand = the C rand(), 0..32767) and draws into buf = {d, pitch, w, h}
export function step(S, now, rand) {
  if (S.t0 === null) S.t0 = now;
  if (rand() < 0x5dc) {
    S.prev = S.cur.slice();
    S.tgt = [f(rand() % 400 - 200), f(rand() % 200 - 100), f(rand() % 300)];
    S.t1 = now; S.on = true;
  }
  if (S.on) {
    let u = f((now - S.t1) * f(0.002));
    if (!(u < 1)) { S.on = false; u = 1; }
    const s = f(1 - u);
    S.cur = [0, 1, 2].map(k => f(f(s * S.prev[k]) + f(S.tgt[k] * u)));
  }
}
export function frame(S, now, rand, buf) {
  step(S, now, rand);
  const [x, y, z] = S.cur, pos = [x, y, f(z - 800)];
  const cam = { M: lookAt(pos, [x, y, z]), pos, fx: CF.fx, fy: CF.fy, cx: 256, cy: 192, near: 1 };
  return renderScene([{ V: vertices(now - S.t0), faces: FACES, ang: [0, 0, 0], pos: [0, 0, 0], euler: true, wire: true }], cam, buf, 0);
}
