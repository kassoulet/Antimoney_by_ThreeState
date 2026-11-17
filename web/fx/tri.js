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
