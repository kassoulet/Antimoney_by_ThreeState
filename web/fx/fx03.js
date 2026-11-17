// Slot 3 of 3s-money (init 0x401220, frame 0x401390, star lines 0x401000): a 256x256 byte texture gets additive (saturating, +0x3f) horizontal and vertical
// lines every frame; the screen is that texture seen through a 512x384 polar warp table (angle -> row, radius -> column). Times are timeGetTime()/10 (centiseconds).
// The picture shown at clock T is the texture drawn at T-40 ms (draw after the warp, shown next frame). x87 intermediates are doubles here (original: 80-bit).
const f32 = Math.fround, LG = Array.from({ length: 120 }, (_, i) => f32(Math.log10(i + 1)));
export const W = new Uint16Array(512 * 384);
for (let y = 0; y < 384; y++) { const Y = f32((y - 192) * f32(0.003125)); for (let x = 0; x < 512; x++) {
  const X = f32((x - 256) * f32(0.003125));
  W[y * 512 + x] = (Math.trunc(Math.sqrt(X * X + Y * Y) * 255) - (Math.trunc((Math.atan2(Y, X) + Math.PI / 2) * (4 / Math.PI) * -255) << 8)) & 0xffff; } }
export function tex(t, len5c = 0, noText = true) {          // t = centiseconds; returns the 64 KB texture
  const T = new Uint8Array(65536), add = i => { T[i] = Math.min(255, T[i] + 0x3f); };
  const hl = (y, n) => { if (y >= 0 && y <= 255) for (let i = 0; i < n; i++) add((y << 8) + i); };
  const vl = (x, n) => { if (x >= 0 && x <= 255) for (let i = 0; i < n; i++) add(x + 256 * i); };
  const a = t * 0.005, C = Math.sin(a) * 40 + 50, D = Math.cos(a) * 40 + 50, ebx = 100 - Math.trunc(Math.sin(t * 0.01) * -50);
  for (let k = 1; k <= 120; k++) {
    const v = LG[119] - LG[120 - k], n0 = 100 - Math.trunc(Math.sin(f32(k * f32(0.01)) + a) * -128), ebp = Math.trunc(v * C);
    if (noText) { hl(ebx - ebp, n0); hl(ebx + ebp, n0); }
    const n = len5c > 0 ? Math.trunc(len5c) : n0, e = Math.trunc(v * D); vl(ebx - e, n); vl(e + ebx, n);
  }
  return T;
}
export function frame(ms, out) { const T = tex(Math.floor((ms - 40) / 10)); for (let i = 0; i < out.length; i++) out[i] = T[W[i]]; return out; }
// Palette (0x40c691(v)): indices < v white, the rest black; v = clamp(trunc(320 - 0.02 * (ms - t0)), 100, 255) while the music position is < 0x500; t0 = clock when slot 3 was enabled (800 ms in the golden run).
export const level = (ms, t0 = 800) => Math.max(100, Math.min(255, Math.trunc(320 - 0.02 * (ms - t0))));
