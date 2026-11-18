// Shared 3D engine (code 0x407000-0x40bd00), hand port in progress. See re/NOTES.md "3D engine port".
// Float32 storage is modelled with Math.fround; intermediates are double (x87 uses 80 bit), so +-1 LSB is possible.
const f = Math.fround;
// 0x409136: per face normal = unit(-(a x b)), a = v1-v0, b = v2-v0 (stored f32), vertex normal = mean of the normals of faces that use it.
// V: array of [x,y,z]; F: array of [i0,i1,i2] -> {fn:[[x,y,z]], vn:[[x,y,z]]}
export function prepare(V, F) {
  const fn = F.map(([i0, i1, i2]) => {
    const p = V[i0], a = [0, 1, 2].map(k => f(V[i1][k] - p[k])), b = [0, 1, 2].map(k => f(V[i2][k] - p[k]));
    const n = [f(b[1] * a[2] - b[2] * a[1]), f(b[2] * a[0] - b[0] * a[2]), f(b[0] * a[1] - b[1] * a[0])];
    const l = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
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
for (let i = 0; i < 1024; i++) { const x = i * 6.283185307179586 * 0.0009765625; SIN[i] = Math.sin(x); COS[i] = Math.cos(x); }
// 3x3 row-major float32 matrices. 0x40a006: dst = A*B (dst[3i+o] = sum_k A[3i+k]*B[3k+o]); 0x40a04f: dst[i] = M[3i..]·v (added z, y, x)
export const mul = (A, B) => { const d = new Float32Array(9); for (let i = 0; i < 3; i++) for (let o = 0; o < 3; o++) d[3 * i + o] = A[3 * i] * B[o] + A[3 * i + 1] * B[o + 3] + A[3 * i + 2] * B[o + 6]; return d; };
export const apply = (M, v) => [0, 1, 2].map(i => f(M[3 * i + 2] * v[2] + M[3 * i + 1] * v[1] + M[3 * i] * v[0]));
const I = () => Float32Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
export const rotX = a => { const m = I(); a &= 1023; m[4] = COS[a]; m[5] = -SIN[a]; m[7] = SIN[a]; m[8] = COS[a]; return m; };   // 0x40a0a2
export const rotY = a => { const m = I(); a &= 1023; m[0] = COS[a]; m[6] = -SIN[a]; m[2] = SIN[a]; m[8] = COS[a]; return m; };   // 0x40a0dd
export const rotZ = a => { const m = I(); a &= 1023; m[0] = COS[a]; m[1] = -SIN[a]; m[3] = SIN[a]; m[4] = COS[a]; return m; };   // 0x40a117
// 0x408fbb: object matrix (obj+0xa0) from the three int angles (obj+0x64/68/6c): Rx*Ry*Rz
export const euler = (ax, ay, az) => mul(mul(rotX(ax), rotY(ay)), rotZ(az));
// 0x409065: rotate vertex normals and face normals by M (the engine keeps the rotated copies for lighting/culling)
export const rotateNormals = (M, vn, fn) => ({ vn: vn.map(n => apply(M, n)), fn: fn.map(n => apply(M, n)) });

// 0x4097fe: view-space position = Mc*p + T (obj+0xc4 matrix, obj+0xf4 vector), then perspective: sx = fx*x/z + cx, sy = cy - fy*y/z
// (0x431770/74 = fx/fy, 0x430300/0x4302fc = screen centre). Returns [{v:[x,y,z], sx, sy}].
export function project(P, M, T, fx, fy, cx, cy) {
  return P.map(p => {
    const x = f(M[2] * p[2] + M[1] * p[1] + M[0] * p[0] + T[0]), y = f(M[5] * p[2] + M[4] * p[1] + M[3] * p[0] + T[1]), z = f(M[7] * p[1] + M[8] * p[2] + M[6] * p[0] + T[2]);
    return { v: [x, y, z], sx: f(f(fx * x) / z + cx), sy: f(cy - f(fy * y) / z) };
  });
}
// 0x4098e4: env-map UV from the rotated vertex normal ((n+1)*0.5), face shade = trunc(rotated face normal z * 255)
export const envUV = n => [f((n[0] + 1) * 0.5), f((n[1] + 1) * 0.5)];
export const faceShade = n => Math.trunc(f(n[2] * 255));

// 0x409aaf: focal data. fov in degrees (cam+0x7c), w,h = cam+0x64/68, aspect = cam+0x74. Returns the globals 0x431770/74 (fx, fy) and 0x430300/0x4302fc (screen centre, ftol).
export function camera(w, h, fov, aspect) {
  const x = fov * 0.5 * 0.017453292519943295, t = f(Math.sin(x) / Math.cos(x));
  return { fx: f(f(w * 0.5) / t), fy: f(f(f(h * 0.5) / aspect) / t), cx: Math.trunc(w * 0.5), cy: Math.trunc(h * 0.5) };
}
// 0x40933a: returns ftol((y1-y2)*(x0-x2) - (y0-y2)*(x1-x2)) of the projected face (the original first runs bounding tests that, as compiled, always fall through to this).
export const faceArea = (a, b, c) => Math.trunc((b.sy - c.sy) * (a.sx - c.sx) - (a.sy - c.sy) * (b.sx - c.sx));
// 0x40946f (no near-plane clipping: faces with 1 or 2 vertices in front of z<near are DROPPED here, the original clips them via 0x40a18b) + 0x40889b (stable LSD radix sort on the
// unsigned key = ftol(z0+z1+z2), walked from the far end unless rev) + 0x408991 dispatch. Only face type 6 (additive 0x3f triangle) is ported.
// faces: [{v:[{sx,sy,z}x3], flag3c}], returns the number queued.
export function queueFaces(faces, near, rev = 0) {
  const q = [];
  for (const fc of faces) {
    const [a, b, c] = fc.v; let cl = 0;
    if (a.z < near) cl++; if (b.z < near) cl++; if (c.z < near) cl++;
    if (cl) continue;   // ponytail: near clip (0x40a18b) not ported: faces with 1-2 vertices behind the plane are dropped like the fully hidden ones
    if (faceArea(a, b, c) > 0 || fc.flag3c) q.push({ key: Math.trunc(a.z + b.z + c.z) >>> 0, fc });
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
