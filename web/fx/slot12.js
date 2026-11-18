// Slot 12 frame logic (init 0x402a40, frame 0x402da0..0x4034c0, walker step 0x4034c0, cube list 0x402840/0x4028c0): wire "snake" walkers
// on a 7x7x7 grid (obj0, type 3 lines) that reveal 171 additive cubes (obj1, type 6) once all 12 edges of a 150-unit cell exist.
// State is plain data; model(S) feeds scene3d.renderScene. Verified against re/oracle_slot12.py (re/fxcheck_s12model.mjs).
// The reference emulator runs x87 in SINGLE precision (its _ftol stub does fnstcw/fldcw with a control word of 0, Unicorn's reset value, which
// selects a 24-bit mantissa): every x87 add/sub/mul result is therefore rounded to f32 (Math.fround after each operation), not just stores.
import { renderScene } from './scene3d.js';
const f = Math.fround, K01 = f(0.1), K002 = f(0.002), K001 = f(0.001);
export const N = 7, MAXCUBES = 171;
// faces of one cube relative to its first vertex (0x4025d0); vertex j = (x+-s, y+-s, z+-s) with bit0 = +x, bit1 = +y, bit2 = +z (0x4028c0)
export const CUBE_F = [[2, 6, 0], [6, 4, 0], [6, 7, 4], [7, 5, 4], [7, 3, 5], [3, 1, 5], [3, 2, 1], [2, 0, 1], [0, 4, 1], [4, 5, 1], [3, 7, 2], [7, 6, 2]];
// constant camera (0x409a71 (75,75,-500)->(75,75,0), focal 0x409aaf with fov 135)
export const CAM = { M: Float32Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1), pos: [75, 75, -500], fx: Math.fround(106.03868103027344), fy: Math.fround(106.03868103027344), cx: 256, cy: 192, near: 1 };
// tracker position ax (order<<8|row, 0x40c282) -> rotation direction signs, 0x402dcc..0x402ef8
const SIGNS = [[0x820, 0x900, -1, 1, -1], [0x900, 0x920, 1, -1, -1], [0x920, 0xa00, -1, -1, 1], [0xa00, 0xa20, 1, -1, -1], [0xa20, 0xb00, 1, 1, -1], [0xb00, 0xb20, -1, 1, 1]];
export const signs = ax => { let s = [1, 1, 1]; for (const [a, b, x, y, z] of SIGNS) if (ax >= a && ax < b) s = [x, y, z]; return s; };
export function makeRand(seed) { let s = seed | 0; return () => { s = (Math.imul(s, 0x343fd) + 0x269ec3) | 0; return (s >>> 16) & 0x7fff; }; }
const GB = 512, gi = (x, y, z) => GB + (z * N + y) * N + x, P150 = c => (c - 3) * 150;

// init 0x402a40: 16 walkers on random cells, one obj0 vertex each. now = timeGetTime at init.
export function init(rand, now) {
  const S = { walk: [], V0: [], F0: [], nc: 0, cubes: [], V1: [], grid: new Uint8Array(2048), acc: [0, 0, 0], prev: f(now), done: false, rand, enabled: false };
  for (let i = 0; i < 16; i++) {
    const c = [rand() % 7, rand() % 7, rand() % 7];
    S.walk.push({ p: 0, cur: c.slice(), from: c.slice(), vf: S.V0.length, vt: S.V0.length, ts: now });
    S.V0.push(c.map(P150));
  }
  return S;
}
// 0x402840 + 0x4028c0: add a cube (8 vertices, 12 faces) / write its 8 vertices
function cubeVerts(S, i, x, y, z, s) {
  const a = f(x - s), d = f(x + s), b = f(y - s), e = f(y + s), c = f(z - s), g = f(z + s);
  S.V1[i] = [[a, b, c], [d, b, c], [a, e, c], [d, e, c], [a, b, g], [d, b, g], [a, e, g], [d, e, g]];
}
function addCube(S, now) {
  const i = S.nc++; S.cubes.push({ t: now, flag: 0, c: [0, 0, 0] });
  if (S.nc === MAXCUBES) S.done = true;   // 0x402864: nfaces == 0x804
  return i;
}
// 0x4034c0: pick the next cell. Candidates are the 6 directions sorted by squared distance to the grid centre (exchange sort, not a plain sort).
function step(S, w, now) {
  const { rand } = S;
  w.ts = now; w.vt = S.V0.length; S.V0.push([0, 0, 0]);   // vertex slot (filled below; stays 0,0,0 if the walker reseeds)
  rand();   // result unused by the original
  const [X, Y, Z] = w.cur, dir = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
  const D = dir.map(([a, b, c]) => (X + a - 3) ** 2 + (Y + b - 3) ** 2 + (Z + c - 3) ** 2);
  const P = [0, 1, 2, 3, 4, 5];
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) if (!(D[P[b]] <= D[P[a]])) { const t = P[b]; P[b] = P[a]; P[a] = t; }
  // tried: P0, P0, P1, P2, P3, P4 (the pointer is read before it is advanced); P5 is only left in ebp
  const order = [P[0], P[0], P[1], P[2], P[3], P[4]];
  let nx = [X, Y, Z], ebp = P[5], found = false;
  for (const d of order) {
    const n = [X + dir[d][0], Y + dir[d][1], Z + dir[d][2]];
    if (n.every(v => v >= 0 && v < N) && !(S.grid[gi(X, Y, Z)] & (1 << d))) { nx = n; ebp = d; found = true; break; }
  }
  const old = w.cur.slice();
  if (!found) {   // trapped: new random cell (new vertex there), target stays the old cell
    const c = [rand() % 7, rand() % 7, rand() % 7];
    w.cur = c.slice(); w.p = 0; w.vf = w.vt = S.V0.length; S.done = false;
    S.V0.push(c.map(P150));
    nx = old.map((v, k) => v + dir[P[5]][k]); ebp = P[5];   // the last loop head already applied direction P[5]; marking below runs with it on the NEW cell
  }
  w.from = w.cur.slice();
  // mark the edge on both cells (ebp = chosen direction, or P[5] after a reseed)
  const c = w.cur, g = S.grid, a = ebp >> 1, sgn = ebp & 1 ? 1 : -1, nb = c.slice(); nb[a] += sgn;
  g[gi(c[0], c[1], c[2])] |= 1 << ebp;
  if (nb[a] >= 0 && nb[a] < N) g[gi(nb[0], nb[1], nb[2])] |= 1 << (ebp ^ 1);
  w.cur = nx;
  if (found) S.V0[w.vt] = S.V0[w.vf].slice();   // new vertex starts at the old one
  S.F0.push([w.vf, w.vt]);
}
// frame callback 0x402da0 (when enabled): now = timeGetTime (ms), ax = tracker position (order<<8|row)
export function frame(S, now, ax) {
  if (!S.enabled) { S.prev = f(now); return; }
  const sg = signs(ax);
  for (let k = 0; k < 3; k++) S.acc[k] = f(S.acc[k] + f((now - S.prev) * K01) * sg[k]);
  S.prev = f(now);
  S.ang = S.acc.map(a => Math.trunc(a) & 0x3ff);
  const g = S.grid;
  for (const w of S.walk) {
    if (S.done) continue;
    if (!(w.p < 1)) {
      S.V0[w.vt] = w.cur.map(P150);
      for (let z = 0; z < 6; z++) for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
        const i = gi(x, y, z);
        if (g[i] & 0x40) continue;
        if ((g[i] & 0x2) && (g[i] & 0x8) && (g[i] & 0x20) && (g[i + 0x39] & 0x15) === 0x15 && (g[i + 0x32] & 0x11) === 0x11 && (g[i + 0x38] & 0x14) === 0x14 && (g[i + 0x8] & 0x5) === 0x5) {
          g[i] |= 0x40;
          const c = [f(150 * x - 450 + 75), f(150 * y - 450 + 75), f(150 * z - 450 + 75)], n = addCube(S, now);
          cubeVerts(S, n, c[0], c[1], c[2], 75); S.cubes[n].c = c;
        }
      }
      w.vf = w.vt; step(S, w, now);
    }
    const p = f((now - w.ts) * K002), F = S.V0[w.vf], T = w.cur.map(P150);
    w.p = p;
    const dy = f(T[1] - F[1]), dz = f(T[2] - F[2]);
    S.V0[w.vt] = [f(f(f(T[0] - F[0]) * p) + F[0]), f(f(dy * p) + F[1]), f(f(dz * p) + F[2])];
  }
  S.cubes.forEach((cb, i) => {
    if (cb.flag) return;
    let t = f((now - cb.t) * K001);
    if (t > 1) { t = 1; cb.flag = 1; }
    cubeVerts(S, i, cb.c[0], cb.c[1], cb.c[2], f(t * 75));
  });
}
// objects for scene3d.renderScene (both objects share the angles; euler, camera constant)
export function model(S) {
  const ang = S.ang || [0, 0, 0], F1 = [];
  for (let i = 0; i < S.nc; i++) for (const t of CUBE_F) F1.push({ i: t.map(v => v + 8 * i), flag3c: false, type: 6 });
  return [
    { V: S.V0, faces: S.F0.map(([a, b]) => ({ i: [a, b, b], flag3c: true, type: 3 })), ang, pos: [0, 0, 0], euler: true, wire: true },
    { V: S.V1.flat(), faces: F1, ang, pos: [0, 0, 0], euler: true, wire: false },
  ];
}
export const render = (S, buf) => renderScene(model(S), CAM, buf, 0);

// Seekable player entry: slot 12 is a function of the frame count since it was enabled (40 ms grid, seeded rand), replayed from the start when
// seeking backwards. tOn = clock (ms) of the enabling command, axOf(ms) = tracker position at a clock time.
let C = null;
export function at(ms, tOn, axOf, buf, seed = 12345) {
  const k = Math.max(0, Math.round((ms - tOn) / 40));
  if (!C || k < C.k) { C = { S: init(makeRand(seed), 840), k: -1 }; C.S.enabled = false; frame(C.S, tOn - 40, 0); C.S.enabled = true; C.k = -1; }
  while (C.k < k) { C.k++; const now = tOn + 40 * C.k; frame(C.S, now, axOf(now)); }
  return render(C.S, buf);
}
