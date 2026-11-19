// Slot 15: voxel "terrain" seen from a moving point (init 0x407020, tables 0x406e20, frame 0x407240, renderer 0x406e70). Single precision x87 = Math.fround after every op.
const f = Math.fround;
// 256x256 map: rand()&0x7f on a 16x16 lattice (step 16), then in place bilinear smoothing (weights /225 as +-0.0044444 constants and truncation); rand = () => 0..32767
export function init(rand) {
  const H = new Uint8Array(65536);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) H[r * 0x1000 + c * 16] = rand() & 0x7f;
  const k0 = f(0.004444444552063942), k1 = f(-0.004444444552063942), t = (d, m, k) => Math.trunc(f(f(d * m) * k));
  for (let y = 0; y < 256; y++) {
    const A = 15 - (y & 15), B = y & 15, Y0 = (y & 0xf0) << 8, Y1 = (((y & 0xf0) + 16) << 8) & 0xff00;
    for (let x = 0; x < 256; x++) {
      const xs = x & 0xf0, xl = x & 15, xr = 15 - xl, X1 = (xs + 16) & 0xff;
      let b = t(H[Y1 + X1], B * xl, k0) - t(H[Y0 + X1], A * xl, k1);
      b -= t(H[Y0 + xs], xr * A, k1); b -= t(H[Y1 + xs], xr * B, k1);
      H[y * 256 + x] = b & 255;
    }
  }
  return H;
}
// cos / sin tables (0x708 entries, 4096 * trig of i * 0.0034906585 rad), truncated
export function tables() {
  const A = new Int32Array(0x708), B = new Int32Array(0x708);
  for (let i = 0; i < 0x708; i++) { const x = f(i * 0.0034906585000000004); A[i] = Math.trunc(f(Math.cos(x) * 4096)); B[i] = Math.trunc(f(Math.sin(x) * 4096)); }
  return { A, B };
}
// camera and palette level of the frame at video clock `now` (ms) for a slot switched on at clock t0 (clock of the last disabled frame, 0x42ba34)
export function params(now, t0) {
  const dt = now - t0, x = f(dt * f(0.0010000000474974513));
  const lvl = Math.trunc(f(f(Math.sin(x) * 60) + 160));
  const px = Math.trunc(f(Math.sin(f(x * f(0.7360000014305115))) * 50)), py = Math.trunc(f(x * f(57.5)));
  const ang = Math.trunc(f(50 - f(Math.sin(f(x * f(0.6347000002861023))) * 40))) % 0x708;
  return { lvl, x: py, y: px, ang };
}
// 0x406e70: 511 columns, each a ray marched up to 200 steps over the map, writing the map byte (index colour) upwards from the bottom row while the terrain is above the ray
export function render(d, H, T, x, y, ang) {
  const S = 0x200, p1 = x << 12, p2 = y << 12, idx0 = ang + 150;
  for (let c = 0; c < 511; c++) {
    const m = (((idx0 - c) % 0x708) + 0x708) % 0x708, dx = 2 * T.A[m], dy = 2 * T.B[m];
    let X = p1, Y = p2, th = 0x4b0000, ecx = -384 * S, slope = 0, j = 0, cnt = 0, o = 0x2fe00 + c;
    while (j < 200) {
      const id = (((Y >> 12) & 0xff) << 8) + ((X >> 12) & 0xff), ed = H[id] << 15;
      if (ed > th) {
        for (;;) {
          d[o] = H[id]; ecx = (ecx + S) | 0; th = (th + slope) | 0; o -= 512; cnt++;
          if (cnt >= 384) { j = 200; break; }
          if (th > ed) break;
        }
      }
      X = (X + dx) | 0; Y = (Y + dy) | 0; th = (th + ecx) | 0; slope = (slope + S) | 0; j++;
    }
  }
}
