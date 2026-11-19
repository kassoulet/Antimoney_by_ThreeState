// Slot 22 (0x4068c5): zoom/glow post-process on the finished 512x384 screen. Halve it, then four quadrants (sample position walks outwards from the centre)
// each add LUT[0x80 + bilinear(screen)] to the pixel with signed saturation (max 127; in place, so later pixels sample earlier results), finally x2.
// S = step (cmd 6, default 0xfe), F = float32 (cmd 7, default 0.14). J = low bytes of mm0..mm3 at entry (junk: J[0] = last halved byte, J[1..3] x87 residue of the original (0 here)).
const P = 512, f32 = Math.fround, clamp = v => v < 0 ? 0 : v > 127 ? 127 : v;
export function glow(A, S = 0xfe, F = f32(0.14), J = null) {
  if (!J) J = [A[0x2fffc] >> 1, 0, 0, 0];   // mm0 byte 0 at entry = lane 0 of the last halved dword (mm1..3: x87 residue of the original, unknown, 0 here)
  const f = f32(F), L = new Uint8Array(0x100);
  for (let i = 0; i < 128; i++) { L[i] = clamp(Math.trunc(f32(i * f))); L[0x80 + i] = clamp(Math.trunc(f32(f32(1.1 - f) * i))); }
  for (let i = 0; i < 0x30000; i++) A[i] >>= 1;
  const s16 = v => v < -32768 ? -32768 : v > 32767 ? 32767 : v;
  const samp = (yf, xf) => {                                   // bilinear in 8.8 on words (v<<8 | junk), as the MMX code
    const o = (yf >> 8) * P + (xf >> 8), fx = xf & 255, fy = yf & 255;
    const a = A[o] << 8 | J[0], b = A[o + 1] << 8 | J[1], c = A[o + P] << 8 | J[2], d = A[o + P + 1] << 8 | J[3];
    const top = s16(a + (((b - a) >> 8) * fx << 16 >> 16)), bot = s16(c + (((d - c) >> 8) * fx << 16 >> 16));
    const r = s16(top + ((((bot - top) << 16 >> 16) >> 8) * fy << 16 >> 16)) >> 8;
    return r < 0 ? 0 : r > 255 ? 255 : r;
  };
  const W = 256, H = 192;
  const quad = (x0, y0, dx, dy, cols, xs, ys) => {             // x0,y0: first pixel; dx,dy: pixel direction; xs,ys: start of the sample position
    let yf = ys;
    for (let r = 0; r < H; r++) {
      let xf = xs, o = (y0 + r * dy) * P + x0;
      for (let k = 0; k < cols; k++) {
        const c = samp(yf, xf), s = A[o], v = L[0x80 + c] + L[s];
        A[o] = v > 127 ? 127 : v; xf += dx * S; o += dx;
      }
      yf += dy * S;
    }
  };
  quad(255, 191, -1, -1, 255, (W - 1) << 8, (H - 1) << 8);     // top-left, walking up/left
  quad(256, 191, 1, -1, 256, W << 8, (H - 1) << 8);            // top-right
  quad(255, 192, -1, 1, 255, (W - 1) << 8, H << 8);            // bottom-left
  quad(256, 192, 1, 1, 256, W << 8, H << 8);                   // bottom-right
  // the x2 loop is `punpcklbw mm0,[mem]; psrlw 7`: the low byte of each word is the previous dword's output byte in that lane, so out[p] = 2*s + (out[p-4] >> 7)
  const prev = [J[0], 0, 0, 0];
  for (let i = 0; i < 0x30000; i++) { const v = Math.min(255, A[i] * 2 + (prev[i & 3] >> 7)); A[i] = v; prev[i & 3] = v; }
  return A;
}
