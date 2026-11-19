// Script-driven compositor. SCRIPT = 0x415250 table [time=order<<8|row, slot, cmd, p]; state is rebuilt from the position (seek = pure replay).
import { frame as star, level as fade } from './fx03.js';
import { frame as images } from './fx13.js';
import { glow } from './fx22.js';
import { at as slot12 } from './slot12.js';
import { frame as slot5 } from './slot5.js';
import { sprite, particles, frame as slot4 } from './slot4.js';
import * as s15 from './slot15.js';
import * as s18 from './slot18.js';
export const SCRIPT = [[0,2,2,2],[0,0,2,100],[0,24,0,1],[0,1,0,1],[0,3,0,1],[0,16,0,1],[512,16,0,0],[512,0,2,100],[512,3,0,0],[512,14,0,1],[544,14,6,1],[576,14,6,1],[1024,14,0,0],[1024,5,0,1],[1024,22,0,1],[1024,5,6,1],[1024,22,6,244],[1024,22,7,.14],[1536,5,0,0],[1536,22,0,0],[1536,4,0,1],[2048,4,0,0],[2048,0,2,100],[2048,12,0,1],[3072,12,0,0],[3072,0,2,255],[3072,11,0,1],[3072,13,0,1],[3072,13,6,0],[3104,13,6,1],[3328,13,6,2],[3360,13,6,3],[3456,13,0,0],[3456,11,0,0],[3456,0,2,100],[3456,3,0,1],[3456,3,7,1],[3456,3,6,256],[4096,3,0,0],[4096,23,0,1],[4096,22,6,244],[4096,22,7,.14],[4096,22,0,1],[4096,17,0,1],[4608,17,0,0],[4608,3,0,1],[4608,3,8,1],[4608,3,6,256],[5120,3,0,0],[5120,22,0,0],[5120,10,0,1],[5120,23,6,136],[5632,10,0,0],[5632,23,6,300],[5632,23,0,0],[5632,15,0,1],[6144,15,0,0],[6144,0,2,100],[6144,18,0,1]];
// state at script position ax (order<<8|row) and clock ms: enabled slots, image index, palette level
export function state(ax, ms) {
  const on = new Set(), s = { on, img: 0, lvl: 0, len5c: 0, noText: true, glowS: 0xfe, glowF: Math.fround(0.14) };
  for (const [t, slot, c, p] of SCRIPT) {
    if (t > ax) break;
    if (c === 0) { p === 1 ? on.add(slot) : on.delete(slot); }
    else if (slot === 3 && c === 6) s.len5c = p;          // 0x42725c: fixed length of the vertical lines
    else if (slot === 3 && c === 7) s.noText = p === 0;    // 0x427269: text overlay mode (horizontal lines off; text itself not ported)
    else if (slot === 22 && c === 6) s.glowS = Math.trunc(p);   // step of the zoom
    else if (slot === 22 && c === 7) s.glowF = Math.fround(p);  // LUT slope
    else if (slot === 13 && c === 6) s.img = p;
    else if (slot === 0 && c === 2) s.lvl = Math.trunc(p);
  }
  if (on.has(3) && ax < 0x500) s.lvl = fade(ms);   // slot 3's own fade while in the first scene
  // palette levels driven by other slots, fitted on the golden run (fbs), NOT derived from the code except slot 3's fade
  const t = (ms - 800) / 1000;
  if (ax >= 0xc00 && ax < 0xd80) s.lvl = Math.max(130, Math.trunc(255 - 125 * (t - 76)));   // slot 11/13 era: 255 -> 130 in one second
  if (on.has(4)) s.lvl = 100 + (Math.random() * 100 | 0);                             // slot 4: rand() driven level (100..197 in the golden run)
  if (on.has(15)) s.lvl = ROWS ? s15.params(ms, t0Of(0x1600)).lvl : Math.trunc(159.5 + 59.5 * Math.cos(2 * Math.PI * (t - 143.1) / 6.25)); // slot 15: ftol(sin(dt*0.001)*60+160), derived (fitted fallback without rows.json)
  if (on.has(18)) { const l = s18.level(Math.max(0, ax - 1)); if (l !== null) s.lvl = l; }       // slot 18: min(255, ftol((pos-0x1a00)*2.5+100)) from 0x1a00 on, derived
  return s;
}
// clock of the last disabled frame before the command at script position t (what the slots store as their start time), on the 40 ms grid
const t0Of = t => Math.ceil(ROWS[(t >> 8 << 6) + (t & 63)] / 40) * 40 + 800 - 40;
// rows.json (ms of each order*64+row, audio clock; video clock = audio + 800) lets slot 12 replay its tracker-dependent rotation signs; setRows before render
let ROWS = null;
export const setRows = r => { ROWS = r; };
// slot 4: needs a 256x256 0/0xff text mask (GDI text in the original, blank under the emulator): the player supplies a canvas-rendered one; without it slot 4 draws nothing
let MASK = null, TEX = null, PART = null, MAP15 = null, T15 = null;
export const setMask = m => { MASK = m; };
// slot 18: three 512x160 text strips (0xc8 where the GDI text is: "work", "consume", "sleep" in Impact 160), added at row 96 by tracker position; the player supplies them
let STRIPS = null; export const setStrips = s => { STRIPS = s; };
const axOfClock = ms => { const R = ROWS || [0]; let lo = 0, hi = R.length - 1; const a = ms - 800; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (R[m] <= a) lo = m; else hi = m - 1; } return ((lo >> 6) << 8) | (lo & 63); };
// ms = video clock; grain(i) -> 0..31 for slot 24 (random in the original)
export function render(ax, ms, out, grain = null) {
  const s = state(ax, ms); out.fill(0);
  if (s.on.has(3)) star(ms, out, s.len5c, s.noText);
  if (s.on.has(4) && ROWS && MASK) {                              // particles on the text mask, closed form after n frames from the enabling row
    const t0 = t0Of(0x600); TEX ||= sprite();
    let x = 1; PART ||= particles(() => (x = (x * 1103515245 + 12345) >>> 0, (x >>> 16) & 0x7fff));   // seeded rand: placement differs from the original run
    slot4(PART, Math.max(0, Math.floor((ms - t0) / 40)), ms, t0, { d: out }, MASK, TEX);
  }
  if (s.on.has(15) && ROWS) {                                      // voxel terrain (map from a seeded rand: differs from the original run)
    let x = 7; MAP15 ||= s15.init(() => (x = (x * 1103515245 + 12345) >>> 0, (x >>> 16) & 0x7fff)); T15 ||= s15.tables();
    const p = s15.params(ms, t0Of(0x1600)); s15.render(out, MAP15, T15, p.x, p.y, p.ang);
  }
  if (s.on.has(18) && ROWS) {                                      // 3 wire curves with the 13 pixel brush, T = ms since the first enabled frame
    s18.render(ms - (t0Of(0x1800) + 40), { d: out });
    const pos = Math.max(0, ax - 1), st = pos < 0x1900 ? 0 : pos < 0x1a00 ? 1 : pos < 0x1c00 ? 2 : -1;
    if (STRIPS && st >= 0) s18.strip(out, STRIPS[st]);
  }
  if (s.on.has(5)) slot5(ms, Math.max(0, ax - 1), { d: out, pitch: 512, w: 512, h: 384 });   // textured sphere (0x40c282 returns the position - 1)
  if (s.on.has(12) && ROWS) slot12(ms, ROWS[0x800 >> 8 << 6] + 800, axOfClock, { d: out, pitch: 512, w: 512, h: 384 });   // 3D snakes + cubes, additive 0x3f
  if (s.on.has(13)) images(s.img, out);
  if (s.on.has(22)) glow(out, s.glowS, s.glowF);                 // slot 22 runs after slots 0..21 and before 23, 24
  if (grain && s.on.has(24)) for (let i = 0; i < out.length; i++) out[i] = (out[i] + grain()) & 255;
  return s.lvl;
}
