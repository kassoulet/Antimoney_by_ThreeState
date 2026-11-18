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
// Port of 0x40b130: textured triangle filler (screen x,y + texture u,v in 0..255 per vertex, 256x256 byte texture, SET pixels, u/v 8.8 fixed point per scanline).
// Same edge/clipping structure as tri() but every edge carries (u,su,v,sv,x,sx,count) as f32 statics (stale values persist across calls like the original's 0x431788/0x4317a8).
// Every x87 add/mul is rounded to f32 (single-precision reference FPU).
const EA = new Float32Array(7), EB = new Float32Array(7);   // [u,su,v,sv,x,sx,n]
const i32 = x => { x = Math.trunc(x); return x >= -2147483648 && x < 2147483648 ? x : -2147483648; };
const swapE = () => { for (let k = 0; k < 7; k++) { const t = EA[k]; EA[k] = EB[k]; EB[k] = t; } };
const adv = t => { for (const E of [EA, EB]) for (const k of [0, 2, 4]) E[k] = f(f(E[k + 1] * t) + E[k]); };   // advance u,v,x by t rows (slope*t + p)
function edge(E, a, b, ya) {   // a,b = [x,y,u,v]; E = edge from a to b evaluated at row ya
  const r = f(1 / f(b[1] - a[1]));
  E[1] = f(f(b[2] - a[2]) * r); E[3] = f(f(b[3] - a[3]) * r); E[5] = f(f(b[0] - a[0]) * r);
  const t = f(ya - a[1]);
  E[0] = f(f(t * E[1]) + a[2]); E[2] = f(f(t * E[3]) + a[3]); E[4] = f(f(t * E[5]) + a[0]);
}
function texRows(buf, tex, row, cnt) {
  for (; cnt > 0; cnt--, row += buf.pitch) {
    const r = f(1 / f(EB[4] - EA[4])), du = f(f(EB[0] - EA[0]) * r), dv = f(f(EB[2] - EA[2]) * r), dui = i32(f(du * 256)), dvi = i32(f(dv * 256));
    let xl = Math.ceil(EA[4]); const xr = Math.ceil(EB[4]);
    if (xr >= 0 && xl < buf.w) {
      const t = f(xl - EA[4]);
      let u = i32(f(f(f(t * du) + EA[0]) * 256)), v = i32(f(f(f(t * dv) + EA[2]) * 256));
      if (xl < 0) { u = (u - Math.imul(xl, dui)) | 0; v = (v - Math.imul(xl, dvi)) | 0; xl = 0; }
      const e = Math.min(xr, buf.w);
      for (let x = xl; x < e; x++) { buf.d[row + x] = tex[((v & ~0xff) + (u >> 8)) & 0xffff]; u = (u + dui) | 0; v = (v + dvi) | 0; }
    }
    for (const k of [0, 2, 4]) { EA[k] = f(EA[k] + EA[k + 1]); EB[k] = f(EB[k] + EB[k + 1]); }
  }
}
export function texTri(buf, tex, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2) {
  let a = [x0, y0, u0, v0], b = [x1, y1, u1, v1], c = [x2, y2, u2, v2], t;
  if (a[1] > b[1]) { t = a; a = b; b = t; }
  if (a[1] > c[1]) { t = a; a = c; c = t; }
  if (b[1] > c[1]) { t = b; b = c; c = t; }
  const ya = Math.ceil(a[1]), yb = Math.ceil(b[1]), yc = Math.ceil(c[1]), n1 = yb - ya, n2 = yc - ya;
  EA[6] = n1; if (n1 > 0) edge(EA, a, b, ya);
  EB[6] = n2; if (n2 > 0) edge(EB, a, c, ya);
  if (ya > buf.h || yc < 0 || (n1 === 0 && n2 === 0)) return;
  let row = ya >= 0 ? buf.pitch * ya : 0, cnt = n1, sw = false;
  if (EA[5] > EB[5]) { swapE(); sw = true; }
  if (yb >= 0) {
    if (ya < 0) { cnt += ya; adv(-ya); }
    if (yb > buf.h) cnt += buf.h - yb;
    if (cnt > 0) { texRows(buf, tex, row, cnt); row += buf.pitch * cnt; }
  } else adv(yb - ya);
  const n = yc - yb;
  if (n > 0) { if (!sw) { EA[6] = n; edge(EA, b, c, yb); } else { EB[6] = n; edge(EB, b, c, yb); } } else if (!sw) EA[6] = n; else EB[6] = n;
  if (EA[4] > EB[4]) swapE();
  cnt = n;
  if (yb < 0) { cnt += yb; adv(-yb); }
  if (yc > buf.h) cnt += buf.h - yc;
  if (cnt > 0) texRows(buf, tex, row, cnt);
}
