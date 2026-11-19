// Slot 5: the textured sphere of orders 4-5 (init 0x404623, frame 0x4046df, generator 0x40a979, texture 0x408510 of material 0).
// Geometry = a subdivided icosahedron (n = 4: 162 vertices, 320 faces) of radius 150 built by 0x40a979 (edge points = slerp via acos/sin, the rows
// between two edge points are slerps again), UV (x/r*2, atan2(z/r, y/r)/pi*2) per vertex copied to the per-face UVs (0x408eb2), material 0 face type 0
// (0x409daf, texTri), texture = radial gradient. Frame: all three angles = ftol(timeGetTime*0.1) & 0x3ff, camera (0,0,-900) looking at the origin, fov =
// 35 + 6*(tracker & 3) degrees (0x409d49 stores the fov at cam+0x7c, the code calls it "colour"). x87 is single precision in the reference run: every op is rounded.
// Verified bit-exact against the original under Unicorn (re/oracle_slot5.py, re/fxcheck_slot5.mjs).
import { renderScene } from './scene3d.js';
import { camera } from './engine3d.js';
const f = Math.fround, imod = (a, b) => a - b * Math.trunc(a / b);
// 0x40a7ab: index of the lattice point (row, col) of face a of the n-subdivided icosahedron (faces 0-4 cap, 5-14 band, 15-19 bottom cap)
function vidx(n, a, row, col) {
  const m = n - 1;
  if (row === 0) return a < 5 ? 0 : a > 14 ? 11 : a - 4;
  if (row === n) {
    if (col === 0) return a < 5 ? a + 1 : a < 10 ? imod(a + 4, 5) + 6 : a < 15 ? imod(a + 1, 5) + 1 : imod(a + 1, 5) + 6;
    if (col === n) return a < 5 ? imod(a + 1, 5) + 1 : a < 10 ? a + 1 : a - 9;
    return a < 5 ? m * (a + 5) + col + 11 : a < 10 ? (imod(a + 4, 5) + 20) * m + col + 11 : a < 15 ? m * (a - 5) - col + n + 11 : m * (a + 5) - col + n + 11;
  }
  if (col === 0) return a < 5 ? m * a + row + 11 : a < 10 ? (imod(a, 5) + 15) * m + row + 11 : a < 15 ? (imod(a + 1, 5) + 15) * m - row + n + 11 : (imod(a + 1, 5) + 25) * m + row + 11;
  if (col === row) return a < 5 ? imod(a + 1, 5) * m + row + 11 : a < 10 ? (imod(a, 5) + 10) * m + row + 11 : a < 15 ? (imod(a, 5) + 10) * m - row + n + 11 : (imod(a, 5) + 25) * m + row + 11;
  return 30 * n + ((row - 2) * (row - 1) >> 1) + col + (((n - 2) * (n - 1) * a) >> 1) - 19;
}
// 0x40a979(scene, obj, n, r=150, S=2) -> {V: [[x,y,z]], UV: [[u,v]], F: [{i:[a,b,c], fuv:[u0,v0,u1,v1,u2,v2]}]}
export function sphere(n = 4, r = 150, S = 2) {
  const V = [[0, 0, r]], h = f(f(Math.sqrt(0.20000000298023224)) * r), R = f(2 * h);
  const trig = a => [f(Math.sin(a)), f(Math.cos(a))];
  for (let i = 0; i < 5; i++) { const [s, c] = trig(f(i * 1.2566370614359172)); V.push([f(c * R), f(s * R), h]); }
  for (let j = 1; j < 11; j += 2) { const [s, c] = trig(f(j * 0.6283185482025146)); V.push([f(c * R), f(s * R), -h]); }
  V.push([0, 0, -r]);
  const edge = (i, j, cnt) => {   // 0x40a591: cnt-1 slerp points between V[i] and V[j]
    if (cnt < 2) return;
    const A = V[i], B = V[j], AA = f(f(f(A[2] * A[2]) + f(A[1] * A[1])) + f(A[0] * A[0]));
    const d = f(f(f(B[2] * A[2]) + f(B[1] * A[1])) + f(B[0] * A[0]));
    let c = f(d / AA); if (c < -1) c = -1; if (c > 1) c = 1;
    const th = Math.acos(c), thf = f(th), sn = f(Math.sin(th));
    for (let m = 1; m < cnt; m++) {
      const a1 = f(f(m * thf) / cnt), a2 = f(f(f(cnt - m) * thf) / cnt), s1 = Math.sin(a1), s2 = Math.sin(a2);
      V.push([0, 1, 2].map(k => f(f(f(s1 * B[k]) + f(s2 * A[k])) / sn)));
    }
  };
  const m = n - 1;
  for (let k = 1; k < 6; k++) edge(0, k, n);
  for (let k = 1; k < 6; k++) edge(k, imod(k, 5) + 1, n);
  for (let k = 1; k < 6; k++) edge(k, k + 5, n);
  for (let k = 1; k < 6; k++) edge(k, imod(k + 3, 5) + 6, n);
  for (let k = 6; k < 11; k++) edge(k, imod(k - 5, 5) + 6, n);
  for (let k = 0; k < 5; k++) edge(11, k + 6, n);
  // rows between two edge points inside each face (0x40abd0..0x40ad53)
  const rows = (iStart, jStart, di, dj, cnt) => { for (let c = 2; c <= cnt; c++) edge(iStart + di * (c - 2), jStart + dj * (c - 2), c); };
  if (m > 1) {
    for (let k = 0; k < 5; k++) rows(13 + k * m, imod(k + 1, 5) * m + 13, 1, 1, m);
    for (let k = 0; k < 5; k++) rows(15 * m + 13 + k * m, 10 * m + 13 + k * m, 1, 1, m);
    for (let k = 0; k < 5; k++) rows((imod(k + 1, 5) + 15) * m + n + 9, n + 10 * m + 9 + k * m, -1, -1, m);
    for (let k = 0; k < 5; k++) rows((imod(k + 1, 5) + 25) * m + 13, 25 * m + 13 + k * m, 1, 1, m);
  }
  // 0x40ae48: UV per vertex
  const UV = V.map(p => [f(f(p[0] / r) * S), f(f(f(Math.atan2(f(p[2] / r), f(p[1] / r)) * 0.3183098861837907) * S))]);
  const F = [];
  for (let a = 0; a < 20; a++) for (let row = 0; row < n; row++) for (let col = 0; col <= row; col++) {
    const v0 = vidx(n, a, row, col), v1 = vidx(n, a, row + 1, col), v2 = vidx(n, a, row + 1, col + 1);
    F.push([v0, v1, v2]);
    if (col < row) F.push([v0, v2, vidx(n, a, row, col + 1)]);
  }
  return { V, UV, F: F.map(i => ({ i, fuv: i.flatMap(k => UV[k]) })) };
}
// 0x408510(buf, 0x140, 0xff, 0): radial gradient in a 256x256 byte texture (centre 128, radius 160, untouched (0) beyond it)
export function gradient(size = 0x140, hi = 0xff, lo = 0) {
  const t = new Uint8Array(65536), R = size >> 1;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const dy = f(y - 128), dx = f(x - 128), d = f(Math.sqrt(f(f(dx * dx) + f(dy * dy))));
    if (d < R) t[y * 256 + x] = lo + Math.trunc(f(f(1 - f(d / R)) * (hi - lo)));
  }
  return t;
}
let MODEL = null, TEX = null;
// now = timeGetTime (ms), trk = value returned by 0x40c282 (tracker position - 1, >= 0). buf = {d, pitch, w, h}; draws the sphere (textured pixels are SET)
export function frame(now, trk, buf) {
  const M = MODEL || (MODEL = sphere()), tex = TEX || (TEX = gradient());
  const a = Math.trunc(f(now * f(0.1))) & 0x3ff, fov = 0x23 + 6 * (trk & 3);
  const c = camera(512, 384, fov, 0.75);
  const cam = { M: Float32Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1), pos: [0, 0, -900], fx: c.fx, fy: c.fy, cx: c.cx, cy: c.cy, near: 1 };
  const obj = { V: M.V, faces: M.F.map(F => ({ i: F.i, flag3c: false, type: 0, fuv: F.fuv })), ang: [a, a, a], pos: [0, 0, 0], euler: true, wire: false, tex };
  return renderScene([obj], cam, buf, 0);
}
