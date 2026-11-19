// Slot 18: three Hermite-spline curves drawn as thick (13-pixel brush) wire lines, camera at (0,0,350) looking at the origin, fov 95 (init 0x4047b9, frame 0x404a12,
// control points 0x404bbc, spline 0x4055c6 / 0x40578f). Single precision x87 = Math.fround after every op (sin/cos results stay doubles until the next op).
import { renderScene } from './scene3d.js';
import { camera } from './engine3d.js';
const f = Math.fround, K = { u0: f(0.0010000000474974513), w0: f(0.0012499999720603228), u1: f(0.0005000000237487257), w1: f(0.0011111111380159855), w2a: f(0.00039999998989515007), w2b: f(0.0005263157654553652), w2c: f(0.0020000000949949026) };
const sin = Math.sin, cos = Math.cos, A0 = 0.6981317007977318;
// 10 control points {pos, x, y, z} of curve c at time T ms since the slot was switched on (0x404bbc)
export function control(c, T) {
  const Tf = f(T), R = [], ang = k => f(k * A0);
  let rec;
  if (c === 0) {
    const u = f(T * K.u0), A1 = f(f(sin(u) * 50) + 250), w = f(Tf * K.w0), B1 = f(f(cos(w) * 1.5) + 2.5), B2 = f(f(sin(w) * 1.5) + 2.5), C1 = f(f(sin(u) * 100) + 200);
    rec = k => { const a = ang(k); return [f(f(sin(a) * B1) * A1), f(C1 + f(f(cos(a) * B2) * 200))]; };
  } else if (c === 1) {
    const u = f(T * f(0.0005000000237487257)), A1 = f(f(cos(u) * 50) + 250), w = f(Tf * K.w1), B1 = f(f(sin(w) * 1.5) + 2.5), B2 = f(f(cos(w) * 1.5) + 2.5), C1 = f(f(cos(u) * 100) - 200);
    rec = k => { const a = ang(k), x = f(f(f(sin(a) * B1) * A1)), y = f(f(cos(a) * B2) * 200); return [f(C1 + x), f(y + 20)]; };
  } else {
    const A1 = f(f(cos(f(Tf * K.w2a)) * 50) + 250), w = f(Tf * K.w2b), B1 = f(f(cos(w) * 1.5) + 2.5), B2 = f(f(sin(w) * 1.5) + 2.5), C1 = f(f(sin(f(Tf * K.w2c)) * 100) - 200);
    rec = k => { const a = ang(k), x = f(f(sin(a) * B1) * 100), y = f(f(cos(a) * B2) * A1); return [f(x + 20), f(C1 + y)]; };
  }
  for (let k = 0; k < 10; k++) { const [x, y] = rec(k); R.push({ pos: k * 10, p: [x, y, 0] }); }
  return R;
}
// 0x4055c6 / 0x40578f: cubic Hermite through the key records, evaluated at integer parameter i (key positions 0,10,..90), tension 0.5
function hermite(R, i) {
  const k1 = Math.min(Math.floor(i / 10), 9), P = [R[Math.max(k1 - 1, 0)], R[k1], R[Math.min(k1 + 1, 9)], R[Math.min(k1 + 2, 9)]];
  const a = i - P[1].pos, b = P[2].pos - P[1].pos;
  if (!b) return P[1].p.slice();
  const t = f(a / b), t2 = f(t * t), t3 = f(t2 * t);
  const h00 = f(f(f(2 * t3) - f(t2 * 3)) + 1), h01 = f(f(t2 * 3) + f(t3 * -2)), h10 = f(f(f(t3 - f(2 * t2))) + t), h11 = f(t3 - t2);
  return [0, 1, 2].map(ax => {
    const v = [P[1].p[ax], P[2].p[ax], f(f(P[2].p[ax] - P[0].p[ax]) * 0.5), f(f(P[3].p[ax] - P[1].p[ax]) * 0.5)];
    return f(f(f(f(h11 * v[3]) + f(h10 * v[2])) + f(h01 * v[1])) + f(h00 * v[0]));
  });
}
// 300 vertices (3 curves x 100)
export function vertices(T) { const V = []; for (let c = 0; c < 3; c++) { const R = control(c, T); for (let i = 0; i < 100; i++) V.push(hermite(R, i)); } return V; }
// look-at matrix of 0x409aaf (flag +0xb4 = 0 path, roll 0): angles from the direction, then the product of the three rotations (cam+0x84)
export function lookAt(pos, tgt) {
  const dx = f(tgt[0] - pos[0]), dy = f(tgt[1] - pos[1]), dz = f(tgt[2] - pos[2]), r = f(Math.sqrt(f(f(dz * dz) + f(dx * dx))));
  const a1 = f(-Math.atan2(dx, dz)), a2 = f(Math.atan2(dy, r)), a3 = 0, s1 = f(sin(a1)), c1 = f(cos(a1)), s2 = f(sin(a2)), c2 = f(cos(a2)), s3 = f(sin(a3)), c3 = f(cos(a3));
  const P = f(s3 * s2), Q = f(c3 * s2);
  return Float32Array.of(f(f(c3 * c1) + f(P * s1)), f(s3 * c2), f(f(c3 * s1) - f(P * c1)), f(f(Q * s1) - f(s3 * c1)), f(c3 * c2), f(f(-f(Q * c1)) - f(s3 * s1)), f(-f(c2 * s1)), s2, f(c2 * c1));
}
const CF = camera(512, 384, 95, 0.75), CAM = { M: lookAt([0, 0, 350], [0, 0, 0]), pos: [0, 0, 350], fx: CF.fx, fy: CF.fy, cx: 256, cy: 192, near: 1 };
export const CAM_M = CAM.M;
export const model = T => { const V = vertices(T), F = []; for (let c = 0; c < 3; c++) for (let i = 0; i < 99; i++) F.push({ i: [100 * c + i, 100 * c + i + 1, 100 * c + i + 1], flag3c: true, type: 3 }); return [{ V, faces: F, ang: [0, 0, 0], pos: [0, 0, 0], euler: true, wire: true }]; };
// T = ms since the first enabled frame; draws the curves into buf (512x384 index buffer, additive colour 0x3f lines with the diamond brush)
export const render = (T, buf, brush = true) => renderScene(model(T), CAM, buf, 0, brush);
// text strip (512x160 at row 96, 0xc8 where the text is, from GDI Impact 160 in the original) added with saturation
export function strip(d, s) { for (let i = 0; i < 0x14000; i++) d[0xc000 + i] = Math.min(255, d[0xc000 + i] + s[i]); }
// palette level (0x404b2f): after tracker position 0x1a00, min(255, ftol((pos - 0x1a00) * 2.5 + 100)); pos = what 0x40c282 returns
export const level = pos => pos < 0x1a00 ? null : Math.min(255, Math.trunc(f(f((pos - 0x1a00) * 2.5) + 100)));
