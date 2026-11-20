// Slot 10: ~9140 additive 16x16 sprites per frame on a rotating, wobbling sphere-ish curve (init 0x4021a0, frame 0x402290, blit 0x402510).
// x87 is single precision in the reference run: every op rounded with Math.fround (fsin/fcos results stay double until the next op).
import { SIN, COS, mul, apply, rotX, rotY } from './engine3d.js';
const f = Math.fround, S = Math.sin, C = Math.cos;
// 0x4021a0: 64 sprites 16x16, sprite k has radius r = k/8: byte = 0x40 - trunc(min(1, dist/r) * 64) (k = 0: all zero)
export function sprites() {
  const T = new Uint8Array(64 * 256);
  for (let k = 0; k < 64; k++) { const r = f(k * 0.125);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let d = 1; if (r !== 0) { const dy = y - 8, dx = x - 8; d = f(f(Math.sqrt(f(f(dy * dy) + f(dx * dx)))) / r); if (d > 1) d = 1; }
      T[k * 256 + y * 16 + x] = (0x40 - Math.trunc(f(d * 64))) & 255;
    } }
  return T;
}
// 0x402510: paddusb of a 16x16 sprite, x 0..0x1f0, y 0..0x180 (rows past the 384-row surface are dropped)
function blit(d, x, y, k, T) {
  if (x < 0 || y < 0 || x > 0x1f0 || y > 0x180) return;
  for (let r = 0; r < 16 && y + r < 384; r++) for (let c = 0; c < 16; c++) { const o = (y + r) * 512 + x + c; d[o] = Math.min(255, d[o] + T[k * 256 + r * 16 + c]); }
}
// now, t0 in ms (t0 = clock of the first enabled frame ever, 0x402270)
export function frame(buf, now, t0, T) {
  const a1 = Math.trunc((now & 0xffff) / 20) & 0x3ff;
  const a2 = Math.trunc(f(f(S(f(now * f(0.001))) * 80) + 1024)) & 0x3ff;
  const M = mul(rotX(a2), rotY(a1));
  const a = f(f(now - t0) * f(0.0005)), b = f(a * f(1.87));
  for (let t = 0; t < f(1.371); t = f(t + f(0.00015))) {
    const c = f(b + t), u = f(t * 50), w = S(f(f(t * a) * 1.5)), sc = S(c);
    const v = [f(f(w * C(u)) * sc), f(C(c) * sc), f(S(u) * sc)];
    const p = apply(M, v);
    let k = 10 - Math.trunc(f(f(p[2] + 1) * -32)); k = k < 0 ? 1 : k > 0x3f ? 0x3f : k;
    const px = f(p[0] * 75), py = f(p[1] * 75), pz = f(f(p[2] * 50) - 120);
    if (pz < 0 && pz > -512) blit(buf.d, Math.trunc(f(f(f(px * 256) / pz) + 256)), Math.trunc(f(f(f(py * 256) / pz) + 192)), k, T);
  }
}
