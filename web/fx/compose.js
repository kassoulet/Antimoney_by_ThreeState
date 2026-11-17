// Script-driven compositor. SCRIPT = 0x415250 table [time=order<<8|row, slot, cmd, p]; state is rebuilt from the position (seek = pure replay).
import { frame as star, level as fade } from './fx03.js';
import { frame as images } from './fx13.js';
import { glow } from './fx22.js';
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
  if (on.has(15)) s.lvl = Math.trunc(159.5 + 59.5 * Math.cos(2 * Math.PI * (t - 143.1) / 6.25)); // slot 15: pulsing
  if (on.has(18)) s.lvl = Math.min(255, Math.trunc(100 + 27 * Math.max(0, t - 166.8)));          // slot 18: final fade to white
  return s;
}
// ms = video clock; grain(i) -> 0..31 for slot 24 (random in the original)
export function render(ax, ms, out, grain = null) {
  const s = state(ax, ms); out.fill(0);
  if (s.on.has(3)) star(ms, out, s.len5c, s.noText);
  if (s.on.has(13)) images(s.img, out);
  if (s.on.has(22)) glow(out, s.glowS, s.glowF);                 // slot 22 runs after slots 0..21 and before 23, 24
  if (grain && s.on.has(24)) for (let i = 0; i < out.length; i++) out[i] = (out[i] + grain()) & 255;
  return s.lvl;
}
