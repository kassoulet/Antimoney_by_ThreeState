// node fxcheck_s12.mjs s12.json (from oracle_slot12.py): wired object pass + queue + type 3/6 draw vs a real slot 12 frame under Unicorn
import { renderScene } from '../web/fx/scene3d.js'; import fs from 'fs';
const R = JSON.parse(fs.readFileSync(process.argv[2])).frames, f = Math.fround;
const H = h => Buffer.from(h, 'hex'), F32 = (b, o) => b.readFloatLE(o);
for (const r of R) {
  const cb = H(r.cam), cam = { M: new Float32Array(9).map((_, k) => F32(cb, 0x84 + 4 * k)), pos: [0x40, 0x44, 0x48].map(o => F32(cb, o)), fx: r.glob.fx[0], fy: r.glob.fx[1], cx: r.glob.c[0], cy: r.glob.c[1], near: r.glob.near };
  const objs = r.objs.map(o => {
    const ob = H(o.o), vb = H(o.V), fb = H(o.F);
    const V = Array.from({ length: o.nv }, (_, i) => [0, 4, 8].map(k => F32(vb, 0x30 * i + k)));
    const faces = Array.from({ length: o.nf }, (_, i) => ({ i: [0, 8, 16].map(k => fb.readUInt16LE(0x40 * i + k)), flag3c: fb.readUInt32LE(0x40 * i + 0x3c) !== 0, type: r.mattypes[r.matptrs.indexOf(fb.readUInt32LE(0x40 * i + 0x38))] }));
    return { V, faces, ang: [0x64, 0x68, 0x6c].map(k => ob.readInt32LE(k)), pos: [0xe8, 0xec, 0xf0].map(k => F32(ob, k)), euler: ob.readInt32LE(0x108) !== 0, wire: ob.readInt32LE(0x114) !== 0, M: new Float32Array(9).map((_, k) => F32(ob, 0xa0 + 4 * k)) };
  });
  const buf = { d: new Uint8Array(512 * 384), pitch: 512, w: 512, h: 384 };
  const n = renderScene(objs, cam, buf, r.glob.rev);
  let bad = 0; for (let i = 0; i < buf.d.length; i++) if (buf.d[i] !== r.out[i]) bad++;
  console.log('frame', r.k, 'verts', objs.map(o => o.V.length), 'queued', n, 'differing bytes', bad, 'of', r.out.filter(b => b).length, 'lit');
}
