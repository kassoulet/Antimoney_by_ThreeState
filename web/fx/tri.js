// Port of 0x407370: flat triangle filler of the shared 3D engine (set or additive byte, ceil'd scanlines).
// buf = {d:Uint8Array, pitch, h, w}. The edge registers are statics in the original and are read stale when a
// segment is empty (they decide the left/right swap), so they persist across calls.
const f = Math.fround, G = { a: 0, as: 0, b: 0, bs: 0 }; // a/as: left x,slope (0x42f298/29c); b/bs: right (2a8/2ac)
const ce = Math.ceil;
function rows(buf, row, n, add, col) {
  for (let i = 0; i < n; i++, row += buf.pitch) {
    let l = ce(G.a), r = ce(G.b);
    if (r >= 0 && l < buf.w) {
      if (l < 0) l = 0; if (r > buf.w) r = buf.w;
      for (let x = l; x < r; x++) buf.d[row + x] = add ? (buf.d[row + x] + col) & 255 : col;
    }
    G.a = f(G.a + G.as); G.b = f(G.b + G.bs);
  }
  return row;
}
export function tri(buf, x0, y0, x1, y1, x2, y2, col, add) {
  let t;
  if (!(y0 <= y1)) { t = x0; x0 = x1; x1 = t; t = y0; y0 = y1; y1 = t; }
  if (!(y0 <= y2)) { t = x0; x0 = x2; x2 = t; t = y0; y0 = y2; y2 = t; }
  if (!(y1 <= y2)) { t = x1; x1 = x2; x2 = t; t = y1; y1 = y2; y2 = t; }
  const ya = ce(y0), yb = ce(y1), yc = ce(y2);
  let n1 = yb - ya, n2 = yc - ya;
  if (n1 > 0) { G.as = f((x1 - x0) * f(1 / (y1 - y0))); G.a = f((ya - y0) * G.as + x0); }
  if (n2 > 0) { G.bs = f((x2 - x0) * f(1 / (y2 - y0))); G.b = f((ya - y0) * G.bs + x0); }
  if (ya > buf.h || yc < 0 || (n1 === 0 && n2 === 0)) return;
  let row = ya < 0 ? 0 : buf.pitch * ya, cnt = n1, sw = false;
  if (!(G.as <= G.bs)) { t = G.a; G.a = G.b; G.b = t; t = G.as; G.as = G.bs; G.bs = t; sw = true; }
  if (yb < 0) { const k = yb - ya; G.a = f(G.as * k + G.a); G.b = f(G.bs * k + G.b); }
  else {
    if (ya < 0) { cnt += ya; G.a = f(G.as * -ya + G.a); G.b = f(G.bs * -ya + G.b); }
    if (yb > buf.h) cnt += buf.h - yb;
    row = rows(buf, row, cnt, add, col);
  }
  const m = yc - yb;
  if (!sw) { if (m > 0) { G.as = f((x2 - x1) * f(1 / (y2 - y1))); G.a = f((yb - y1) * G.as + x1); } }
  else if (m > 0) { G.bs = f((x2 - x1) * f(1 / (y2 - y1))); G.b = f((yb - y1) * G.bs + x1); }
  if (!(G.a <= G.b)) { t = G.a; G.a = G.b; G.b = t; t = G.as; G.as = G.bs; G.bs = t; }
  cnt = m;
  if (yb < 0) { cnt += yb; G.a = f(G.as * -yb + G.a); G.b = f(G.bs * -yb + G.b); }
  if (yc > buf.h) cnt += buf.h - yc;
  rows(buf, buf.pitch * Math.max(yb, 0), cnt, add, col);
}
// Port of 0x407f60 (Cohen-Sutherland clip to x 1..510, y 1..382, f32 intermediates) + 0x408280 (Bresenham, additive byte, pitch fixed 512).
// Thin line only: the 3x3 brush of the original (flag byte 0x42f2f2, set by another slot) is not ported.
const code = (x, y) => (y > 382 ? 8 : y < 1 ? 4 : 0) | (x > 510 ? 2 : x < 1 ? 1 : 0);
export function line(buf, x0, y0, x1, y1, col) {
  let c0 = code(x0, y0), c1 = code(x1, y1);
  while (c0 | c1) {
    if (c0 & c1) return;
    const c = c0 || c1; let x, y;
    if (c & 8) { y = 382; x = f((382 - y0) * (x1 - x0) / (y1 - y0) + x0); }
    else if (c & 4) { y = 1; x = f((1 - y0) * (x1 - x0) / (y1 - y0) + x0); }
    else if (c & 2) { x = 510; y = f((510 - x0) * (y1 - y0) / (x1 - x0) + y0); }
    else { x = 1; y = f((1 - x0) * (y1 - y0) / (x1 - x0) + y0); }
    if (c === c0) { x0 = x; y0 = y; c0 = code(x, y); } else { x1 = x; y1 = y; c1 = code(x, y); }
  }
  let a = Math.trunc(x0), b = Math.trunc(y0); const c2 = Math.trunc(x1), d2 = Math.trunc(y1);
  const dx = Math.abs(c2 - a), dy = Math.abs(d2 - b), xm = dx >= dy, n = (xm ? dx : dy) + 1, mj = xm ? dx : dy, mn = xm ? dy : dx;
  const sx = c2 < a ? -1 : 1, sy = d2 < b ? -1 : 1;
  let d = 2 * mn - mj;
  for (let i = 0; i < n; i++) {
    const p = b * 512 + a; buf.d[p] = (buf.d[p] + col) & 255;
    if (d < 0) { d += 2 * mn; if (xm) a += sx; else b += sy; } else { d += 2 * (mn - mj); a += sx; b += sy; }
  }
}
