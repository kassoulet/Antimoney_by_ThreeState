// Slot 14: 300 "walkers" crawling over 5 linked vertex grids (4 straight grids of 75x3 points, 1 spiral of 150x3), each drawn as a tiny additive line (colour 0x8f),
// plus 5 flat-shaded boxes (SET triangles, colour = trunc(rotated face normal z * 255)). Init 0x406190, walker update 0x40657e / step 0x406673, frame 0x40671a, command 0x406850.
// Single precision x87 = Math.fround after every op (the init's sin/cos too: the angle i*0.0418879 is rounded to f32 first). rand = () => 0..32767.
import { renderScene } from './scene3d.js';
import { camera, prepare } from './engine3d.js';
import { lookAt } from './slot18.js';
import { tri } from './tri.js';
const f = Math.fround, CNT = [225, 225, 225, 225, 450], NW = 300;
// links are codes k*1024 + index
function grids() {
  const X = CNT.map(n => new Float32Array(n)), Y = CNT.map(n => new Float32Array(n)), F = CNT.map(n => new Uint8Array(n)), L = CNT.map(n => new Int32Array(3 * n));
  const link = (k, n, m, j) => {   // links to row m, (+8,+0xc,+0x10): array 0: [(m,1),(m,0),(m,0)] / [(m,2),(m,1),(m,0)] / [(m,2),(m,1),(m,1)]; all other arrays in the reverse order
    const b = 3 * m, a = (j === 0 ? [b + 1, b, b] : j === 1 ? [b + 2, b + 1, b] : [b + 2, b + 1, b + 1]).map(v => k * 1024 + v);
    if (k) a.reverse();
    for (let q = 0; q < 3; q++) L[k][3 * n + q] = a[q];
  };
  for (let k = 0; k < 4; k++) for (let i = 0; i < 75; i++) for (let j = 0; j < 3; j++) {   // 0x405adb, 0x405bf0, 0x405d05, 0x405e1a
    const n = 3 * i + j, jx = f(j * 5), g = k === 0 || k === 3 ? f(1265 - f(i * 15)) : f(f(i * 15) - 1265);   // arrays 0, 3: 1265 - 15i (fsubr), arrays 1, 2: 15i - 1265 (fsub)
    if (k < 2) { X[k][n] = jx; Y[k][n] = g; } else { X[k][n] = g; Y[k][n] = jx; }
    link(k, n, (i + 1) % 75, j);
  }
  for (let i = 0; i < 150; i++) for (let j = 0; j < 3; j++) {   // 0x405f2f: spiral of radius 95 + 5j
    const n = 3 * i + j, a = f(i * 0.041887902047863905), r = f(f(j * 5) + 95), s = Math.sin(a), c = Math.cos(a);
    X[4][n] = f(f(s + c) * r); Y[4][n] = f(f(c * r) - f(s * r));
    link(4, n, (i + 1) % 150, j);
  }
  // 0x4059ed(k), k = 0..3: a vertex of array k with a vertex in another array that is strictly closer (f32 distance) than its first link gets it as all three links
  for (let k = 0; k < 4; k++) for (let n = 0; n < CNT[k]; n++) {
    const sx = X[k][n], sy = Y[k][n], dist = (x, y) => { const dy = f(y - sy), dx = f(x - sx); return f(Math.sqrt(f(f(dx * dx) + f(dy * dy)))); };
    const l8 = L[k][3 * n]; let best = dist(X[l8 >> 10][l8 & 1023], Y[l8 >> 10][l8 & 1023]), pick = l8;
    for (let e = 0; e < 5; e++) { if (e === k) continue; for (let v = 0; v < CNT[e]; v++) { const d = dist(X[e][v], Y[e][v]); if (d < best) { best = d; pick = e * 1024 + v; } } }
    if (pick !== l8) L[k][3 * n] = L[k][3 * n + 1] = L[k][3 * n + 2] = pick;
  }
  return { X, Y, F, L };
}
// init: grids, 300 walkers (rand draws per walker: period%30+20, grid%4, vertex%50, advancing to a free vertex), then 20 steps of every walker.
// walker = {per (f32 ms/segment, + 80 in the update), ts, cur, prev (codes)}; vertices V[2w] = head, V[2w+1] = tail (z = 0)
export function init(rand) {
  const G = grids(), W = [];
  for (let w = 0; w < NW; w++) {
    const per = 20 + rand() % 30, a = rand() % 4; let j = rand() % 50;
    while (G.F[a][j]) j = (j + 1) % CNT[a];
    G.F[a][j] = 1; W.push({ per, ts: 0, cur: a * 1024 + j, prev: a * 1024 + j });
  }
  const S = { G, W, V: new Float32Array(NW * 6), started: false };
  for (let s = 0; s < 20; s++) for (const w of W) step(G, w);
  for (let w = 0; w < NW; w++) { S.V[6 * w] = S.V[6 * w + 3] = -50; S.V[6 * w + 1] = S.V[6 * w + 4] = -250; }
  return S;
}
// 0x406673: move to the first linked vertex that is free (flag 0); the flag of the vertex left (previous one) is cleared
function step(G, w) {
  const k = w.cur >> 10, n = w.cur & 1023;
  for (let q = 0; q < 3; q++) {
    const c = G.L[k][3 * n + q];
    if (!G.F[c >> 10][c & 1023]) { G.F[c >> 10][c & 1023] = 1; G.F[w.prev >> 10][w.prev & 1023] = 0; w.prev = w.cur; w.cur = c; return; }
  }
}
// 0x4066e8 + 0x40657e for every walker at clock `now` (ms, the 40 ms grid in the player): timers start at the first frame; p = (now - ts) / (period + 80) as f32, one step per unit of p
export function update(S, now) {
  const { G, W, V } = S;
  if (!S.started) { S.started = true; for (const w of W) w.ts = now; }
  W.forEach((w, i) => {
    let p = f(f((now - w.ts) >>> 0) / f(w.per + 80));
    while (p > 1) { step(G, w); p = f(p - 1); w.ts = now; }
    const T = [G.X[w.cur >> 10][w.cur & 1023], G.Y[w.cur >> 10][w.cur & 1023]], P = [G.X[w.prev >> 10][w.prev & 1023], G.Y[w.prev >> 10][w.prev & 1023]];
    const ax = f(f(f(T[0] - P[0]) * p) + P[0]), ay = f(f(f(T[1] - P[1]) * p) + P[1]);
    const dx = f(P[0] - T[0]), dy = f(P[1] - T[1]), a1 = f(Math.atan2(dx, 50)), a2 = Math.atan2(dy, 50);
    V[6 * i] = ax; V[6 * i + 1] = ay; V[6 * i + 2] = 0;
    V[6 * i + 3] = f(f(a1 * 0.7) + ax); V[6 * i + 4] = f(f(a2 * 0.7) + ay); V[6 * i + 5] = 0;   // tail: head + 0.7 * atan2(delta, 50)
  });
}
// 0x4060f6 / 0x40aeb3: box (x0,y0,z0)-(x1,y1,z1): vertex i = (x[i&1], y[i>>1&1], z[i>>2]), 12 triangles
const BOXES = [[-50, -50, 0, 50, 50, 250], [-25, -190, 75, 40, -200, 50], [-25, 190, 75, 40, 200, 50], [-190, -25, 75, -200, 40, 50], [190, -25, 75, 200, 40, 50]];
const BF = [[0, 6, 2], [0, 4, 6], [4, 7, 6], [4, 5, 7], [5, 3, 7], [5, 1, 3], [1, 2, 3], [1, 0, 2], [1, 4, 0], [1, 5, 4], [2, 7, 3], [2, 6, 7]];
const boxes = BOXES.map(([a, b, c, d, e, g]) => {
  const V = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [i & 1 ? d : a, i & 2 ? e : b, i & 4 ? g : c]);
  const { fn, vn } = prepare(V, BF);
  return { V, fn, vn, faces: BF.map(i => ({ i, flag3c: false, type: 201 })), ang: [0, 0, 0], pos: [0, 0, 0], euler: true, shade: true };
});
const camFor = pos => pos >= 0x220 && pos < 0x600 ? { p: [100, 100, 350], roll: 120, fov: 60 } : { p: [-100, -50, 350], roll: 30, fov: 100 };
export const cameraAt = pos => { const c = camFor(pos & 0xffff), cf = camera(512, 384, c.fov, 0.75); return { M: lookAt(c.p, [0, 0, 0], c.roll), pos: c.p, fx: cf.fx, fy: cf.fy, cx: 256, cy: 192, near: 1 }; };
const WF = Array.from({ length: NW }, (_, i) => ({ i: [2 * i, 2 * i + 1, 2 * i + 1], flag3c: true, type: 200 }));
// pos = what 0x40c282 returns (tracker position - 1); buf = {d}; overlay = 512x384 bytes (GDI text in the original) added with wrap when on
export function render(S, pos, buf, overlay = null) {
  const V = Array.from({ length: 2 * NW }, (_, i) => [S.V[3 * i], S.V[3 * i + 1], S.V[3 * i + 2]]);
  renderScene([{ V, faces: WF, ang: [0, 0, 0], pos: [0, 0, 0], euler: true }, ...boxes], cameraAt(pos), { d: buf.d, pitch: 512, w: 512, h: 384 }, 0, false);
  if (overlay) for (let i = 0; i < overlay.length; i++) buf.d[i] = (buf.d[i] + overlay[i]) & 255;
}
