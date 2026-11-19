// Slot 4: 1024 particles that sit on the pixels of a text mask and are drawn as scaled radial sprites (init 0x401d11, frame 0x401f98, sprite 0x401b60 via the
// clipper 0x401cc6, text overlay add 0x402118). x87 is single precision in the reference run: every op rounded with Math.fround.
// The mask (256x256, 0 / 0xff) and the overlay (512x100, 0 / 0x65) come from GDI text (blank in the emulator): the player passes canvas-rendered approximations.
const f = Math.fround;
// 0x401d11: radial sprite texture (256x256) = ftol(max(0, 255 - 2*sqrt(dx^2+dy^2)))
export function sprite() {
  const t = new Uint8Array(65536);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const d = (x - 128) ** 2 + (y - 128) ** 2, v = f(255 - f(2 * f(Math.sqrt(d)))); t[y * 256 + x] = v < 0 ? 0 : Math.trunc(v); }
  return t;
}
// particle table: x,y,z (<<8, 16 bit wrap) and vx,vy (vz is drawn by the original but never used); rand = MSVCRT-style () => 0..32767. rand order x,y,z,vx,vy,vz
export function particles(rand) {
  const P = new Int32Array(1024 * 5);
  for (let i = 0; i < 1024; i++) {
    for (let k = 0; k < 3; k++) P[5 * i + k] = Math.trunc(f(f(rand() * f(3.0518509447574615e-05)) * 256)) << 8;
    for (let k = 0; k < 3; k++) { const v = Math.trunc(f(f(f(rand() * f(3.0518509447574615e-05)) * 510) - 255)); if (k < 2) P[5 * i + 3 + k] = v; }
  }
  return P;
}
// 0x401b60 (after the clipper: no edge clipping needed): additive saturating scaled blit of the 256x256 texture, size sz, top-left (x, y) of the 512-wide buffer
function splat(d, x, y, sz, tex) {
  const step = Math.trunc(0x10000000 / sz) | 0; let u = 0, v = 0, o = x + y * 512;
  for (let r = 0; r < sz; r++) {
    for (let c = 0; c < sz; c++) { const t = tex[((u >>> 20) & 0xff) + ((v >>> 12) & 0xffffff00)]; d[o] = Math.min(255, d[o] + t); u = (u + step) | 0; o++; }
    o += 512 - sz; v = (v + step) | 0;
  }
}
// state after n enabled frames; now/t0 in ms (t0 = clock of the last disabled frame = when it was switched on), mask = 256x256, text = optional 512x100 overlay.
// Returns the sprite scale s. buf = {d: Uint8Array(512*384)}
export function frame(P, n, now, t0, buf, mask, tex, text = null) {
  let s = f(f(Math.sin(f(now * f(0.001))) * 0.5) + 1.2000000476837158);
  let a = f(16 - f(f(now - f(t0)) * f(0.005))); if (a < 0) a = 0;
  s = f(a + s);
  const c1 = Math.trunc(f(256 - f(s * 128))), c2 = Math.trunc(f(192 - f(s * 128))), d = buf.d;
  for (let i = 0; i < 1024; i++) {
    const x0 = P[5 * i], y0 = P[5 * i + 1], z0 = P[5 * i + 2], vx = P[5 * i + 3], vy = P[5 * i + 4];
    const x = (x0 + n * vx) & 0xffff, y = (y0 + n * vy) & 0xffff, z = (z0 + n * vy) & 0xffff;   // z grows by vy (not vz) in the original
    const xo = x >> 8, yo = y >> 8, sz = z >> 11;
    if (!mask[(yo << 8) + xo] || !sz) continue;
    const X = Math.trunc(f(f(xo * s) + c1)) - (sz >> 1), Y = Math.trunc(f(f(yo * s) + c2)) - (sz >> 1);
    if (X < 0 || Y < 0 || X > 500 - sz || Y > 370 - sz) continue;
    splat(d, X, Y, sz, tex);
  }
  if (text) for (let i = 0; i < 0xc800; i++) d[0x23800 + i] = (d[0x23800 + i] + text[i]) & 255;   // 0x402118 paddb
  return s;
}
