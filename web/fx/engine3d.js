// Shared 3D engine (code 0x407000-0x40bd00), hand port in progress. See re/NOTES.md "3D engine port".
// Float32 storage is modelled with Math.fround; intermediates are double (x87 uses 80 bit), so +-1 LSB is possible.
const f = Math.fround;
// 0x409136 (bit-exact vs Unicorn): per face normal = unit(-(a x b)), a = v1-v0, b = v2-v0 (stored f32), vertex normal = mean of the normals of faces that use it.
// V: array of [x,y,z]; F: array of [i0,i1,i2] -> {fn:[[x,y,z]], vn:[[x,y,z]]}
export function prepare(V, F) {
  const fn = F.map(([i0, i1, i2]) => {
    const p = V[i0], a = [0, 1, 2].map(k => f(V[i1][k] - p[k])), b = [0, 1, 2].map(k => f(V[i2][k] - p[k]));
    // single-precision x87: every product, sum, the sqrt and the divides are rounded to f32 (sum order z, y, x)
    const n = [f(f(b[1] * a[2]) - f(b[2] * a[1])), f(f(b[2] * a[0]) - f(b[0] * a[2])), f(f(b[0] * a[1]) - f(b[1] * a[0]))];
    const l = f(Math.sqrt(f(f(f(n[2] * n[2]) + f(n[1] * n[1])) + f(n[0] * n[0]))));
    return n.map(c => f(c / l));
  });
  const vn = V.map((_, i) => {
    const s = [0, 0, 0]; let c = 0;
    F.forEach((fc, j) => fc.forEach(k => { if (k === i) { for (let m = 0; m < 3; m++) s[m] = f(s[m] + fn[j][m]); c++; } }));
    return s.map(x => f(x / c));
  });
  return { fn, vn };
}

// 0x4088df: angle tables, 1024 steps (angles are ints, &0x3ff). SIN = 0x43030c, COS = 0x42f2f8.
export const SIN = new Float32Array(1024), COS = new Float32Array(1024);
for (let i = 0; i < 1024; i++) { const x = i * 6.283185307179586 * 0.0009765625;   /* built at init, before the first _ftol switches the FPU to single precision: double arguments */ SIN[i] = Math.sin(x); COS[i] = Math.cos(x); }
// 3x3 row-major float32 matrices. 0x40a006: dst = A*B (dst[3i+o] = A[3i]*B[o] + A[3i+2]*B[o+6] + A[3i+1]*B[o+3], in that order, rounded to f32 after every op); 0x40a04f: dst[i] = M[3i..]·v (added z, y, x)
export const mul = (A, B) => { const d = new Float32Array(9); for (let i = 0; i < 3; i++) for (let o = 0; o < 3; o++) d[3 * i + o] = f(f(f(A[3 * i] * B[o]) + f(A[3 * i + 2] * B[o + 6])) + f(A[3 * i + 1] * B[o + 3])); return d; };
export const apply = (M, v) => [0, 1, 2].map(i => f(f(f(M[3 * i + 2] * v[2]) + f(M[3 * i + 1] * v[1])) + f(M[3 * i] * v[0])));   // single-precision x87: round after every op
const I = () => Float32Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
export const rotX = a => { const m = I(); a &= 1023; m[4] = COS[a]; m[5] = -SIN[a]; m[7] = SIN[a]; m[8] = COS[a]; return m; };   // 0x40a0a2
export const rotY = a => { const m = I(); a &= 1023; m[0] = COS[a]; m[6] = -SIN[a]; m[2] = SIN[a]; m[8] = COS[a]; return m; };   // 0x40a0dd
export const rotZ = a => { const m = I(); a &= 1023; m[0] = COS[a]; m[1] = -SIN[a]; m[3] = SIN[a]; m[4] = COS[a]; return m; };   // 0x40a117
// 0x408fbb: object matrix (obj+0xa0) from the three int angles (obj+0x64/68/6c): Rx*Ry*Rz
export const euler = (ax, ay, az) => mul(mul(rotX(ax), rotY(ay)), rotZ(az));
// 0x409065: rotate vertex normals and face normals by M (the engine keeps the rotated copies for lighting/culling)
// (0x409065 sums the three products in a different order per row and per kind, so apply() does not reproduce it; every op rounded to f32)
const dot3 = (a, p, b, q, c, r) => f(f(f(a * p) + f(b * q)) + f(c * r));
export const rotateNormals = (M, vn, fn) => ({
  vn: vn.map(n => [dot3(M[2], n[2], M[1], n[1], M[0], n[0]), dot3(M[4], n[1], M[5], n[2], M[3], n[0]), dot3(M[6], n[0], M[7], n[1], M[8], n[2])]),
  fn: fn.map(n => [dot3(M[1], n[1], M[2], n[2], M[0], n[0]), dot3(M[5], n[2], M[3], n[0], M[4], n[1]), dot3(M[8], n[2], M[6], n[0], M[7], n[1])]) });

// 0x4097fe: view-space position = Mc*p + T (obj+0xc4 matrix, obj+0xf4 vector), then perspective: sx = fx*x/z + cx, sy = cy - fy*y/z
// (0x431770/74 = fx/fy, 0x430300/0x4302fc = screen centre). Returns [{v:[x,y,z], sx, sy}].
export function project(P, M, T, fx, fy, cx, cy) {
  // single-precision x87 (see slot12.js): round after every operation, adds in the order z, y, x, then T
  const dot = (a, b, c, p, q, r, t) => f(f(f(f(a * p) + f(b * q)) + f(c * r)) + t);
  return P.map(p => {
    const x = dot(M[2], M[1], M[0], p[2], p[1], p[0], T[0]), y = dot(M[5], M[4], M[3], p[2], p[1], p[0], T[1]), z = dot(M[7], M[8], M[6], p[1], p[2], p[0], T[2]);
    return { v: [x, y, z], sx: f(f(f(fx * x) / z) + cx), sy: f(cy - f(f(fy * y) / z)) };
  });
}
// 0x4098e4: env-map UV from the rotated vertex normal ((n+1)*0.5), face shade = trunc(rotated face normal z * 255)
export const envUV = n => [f((n[0] + 1) * 0.5), f((n[1] + 1) * 0.5)];
export const faceShade = n => Math.trunc(f(n[2] * 255));

// 0x409aaf: focal data. fov in degrees (cam+0x7c), w,h = cam+0x64/68, aspect = cam+0x74. Returns the globals 0x431770/74 (fx, fy) and 0x430300/0x4302fc (screen centre, ftol).
export function camera(w, h, fov, aspect) {
  const x = f(f(fov * 0.5) * 0.017453292519943295), t = f(f(Math.sin(x)) / Math.cos(x));   // single-precision x87: every op rounded, sin stored as f32 before the divide
  return { fx: f(f(w * 0.5) / t), fy: f(f(f(h * 0.5) / aspect) / t), cx: Math.trunc(w * 0.5), cy: Math.trunc(h * 0.5) };
}
// 0x40933a: returns ftol((y1-y2)*(x0-x2) - (y0-y2)*(x1-x2)) of the projected face (the original first runs bounding tests that, as compiled, always fall through to this).
export const faceArea = (a, b, c) => Math.trunc((b.sy - c.sy) * (a.sx - c.sx) - (a.sy - c.sy) * (b.sx - c.sx));
// 0x40946f (no near-plane clipping: faces with 1 or 2 vertices in front of z<near are DROPPED here, the original clips them via 0x40a18b) + 0x40889b (stable LSD radix sort on the
// unsigned key = ftol(z0+z1+z2), walked from the far end unless rev) + 0x408991 dispatch. Only face type 6 (additive 0x3f triangle) is ported.
// faces: [{v:[{sx,sy,z}x3], flag3c}], returns the number queued.
// Near-plane clip (0x40a18b, Sutherland-Hodgman of the 3-vertex face against the plane z = 1: 0x431318 = (0,0,1,1), "inside" when dist = z-1 >= f32(-0.001) per 0x40a151),
// single-precision x87 like the rest. Returns the polygon (3 or 4 vertices) as view-space {x,y,z}.
const THR = f(-0.001);
function clipPoly(vs) {
  const dist = v => f(f(f(f(v.z * 1) + f(v.y * 0)) + f(v.x * 0)) - 1), out = [];
  for (let i = 0; i < 3; i++) {
    const vi = vs[i], vj = vs[(i + 1) % 3], di = dist(vi), dj = dist(vj), ci = di >= THR ? 1 : 2, cj = dj >= THR ? 1 : 2;
    if (ci === 1) out.push(vi);
    if (ci !== cj) {
      const t = f(di / f(di - dj)), l = k => f(f(f(vj[k] - vi[k]) * t) + vi[k]);
      const o = { x: l('x'), y: l('y'), z: l('z') };
      if (vi.uv && vj.uv) o.uv = [0, 1].map(k => f(f(f(vj.uv[k] - vi.uv[k]) * t) + vi.uv[k]));   // env UV (vertex +0x20/+0x24) is interpolated like the position
      if (vi.fu && vj.fu) o.fu = [0, 1].map(k => f(f(f(vj.fu[k] - vi.fu[k]) * t) + vi.fu[k]));   // so are the per-face UVs (face +0x1c..0x30)
      out.push(o);
    }
  }
  return out;
}
const addz = (p, q, r) => Math.trunc(f(f(p + q) + r)) >>> 0;   // ftol of the z sum, summed in the original's order
// 0x40946f (visibility + queue + clip) + 0x40889b (stable LSD radix sort on the unsigned key = ftol(z sum), walked from the far end unless rev) + 0x408991 dispatch.
// faces: [{v:[{sx,sy,z,x,y}x3], flag3c}]; cam = {fx,fy,cx,cy} to project clip vertices (without it faces straddling the plane are dropped). Faces with a vertex behind
// z < near: all three -> dropped; else clipped; clipped faces use the opposite area sign test (area < 0, as compiled) and may become two faces.
export function queueFaces(faces, near, rev = 0, cam = null) {
  const q = [];
  for (const fc of faces) {
    const [a, b, c] = fc.v; let cl = 0;
    if (a.z < near) cl++; if (b.z < near) cl++; if (c.z < near) cl++;
    if (!cl) { if (faceArea(a, b, c) > 0 || fc.flag3c) q.push({ key: addz(a.z, b.z, c.z), fc }); continue; }
    if (cl === 3 || !cam) continue;
    const fu = fc.fuv ? [0, 1, 2].map(i => [fc.fuv[2 * i], fc.fuv[2 * i + 1]]) : null;
    const P = clipPoly([a, b, c].map((v, i) => fu ? { ...v, fu: fu[i] } : v)).map(v => ({ ...v, sx: f(f(f(cam.fx * v.x) / v.z) + cam.cx), sy: f(cam.cy - f(f(cam.fy * v.y) / v.z)) }));
    if (P.length < 3) continue;
    // face A = (P0,P1,P2) key (z1+z0)+z2; face B = (P0,P2,P3) key (z3+z2)+z0, as summed by the original
    const tris = P.length > 3 ? [[P[0], P[1], P[2], addz(P[1].z, P[0].z, P[2].z)], [P[0], P[2], P[3], addz(P[3].z, P[2].z, P[0].z)]] : [[P[0], P[1], P[2], addz(P[1].z, P[0].z, P[2].z)]];
    for (const [x, y, z, key] of tris) if (faceArea(x, y, z) < 0 || fc.flag3c) q.push({ key, fc: { ...fc, v: [x, y, z], fuv: fu && [x.fu, y.fu, z.fu].flat() } });
  }
  q.sort((p, r) => p.key - r.key);   // stable, same order as the LSD radix sort
  if (!rev) q.reverse();             // later-queued faces first on equal keys, like the original's backwards walk
  return q.map(e => e.fc);
}
export function drawFaces(faces, near, buf, tri, rev = 0) {
  const q = queueFaces(faces, near, rev);
  for (const { v: [a, b, c] } of q) tri(buf, a.sx, a.sy, b.sx, b.sy, c.sx, c.sy, 0x3f, 1);
  return q.length;
}
