// Slot 16: the word "anti" (GDI Arial bold 31 px centred in a 128x32 byte mask, blank under the emulator) drawn as jittering 12x12 blocks added to the picture
// (frame 0x401660). Per frame: srand(seeds[ftol(dt*0.01333) & 63]); jitter amplitude m = ftol(sin(dt*0.001)*4.4 + 6); for every mask cell (x,y) two rand() draw the
// displaced cell (x + r1%m - m/2, y + r2%m - m/2); if the cell is lit (the ORIGINAL position's mask byte) the block at (12*cx - 512, 12*cy) gets dword adds (with byte carries).
const f = Math.fround;
// MSVCRT rand: returns the generator and its seed setter
export function rng(seed = 1) { let s = seed | 0; return { seed: v => { s = v | 0; }, rand: () => { s = (Math.imul(s, 0x343fd) + 0x269ec3) | 0; return (s >>> 16) & 0x7fff; } }; }
const ROW0 = [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60], ROWM = [0x60, 0xa0, 0xa0, 0xa0, 0x60, 0x60, 0x60, 0x60, 0xa0, 0xa0, 0xa0, 0x60];
function add12(d, o, row) {   // three dword adds: carries run inside each aligned group of 4 bytes
  for (let g = 0; g < 3; g++) { let c = 0; for (let k = 0; k < 4; k++) { const v = d[o + 4 * g + k] + row[4 * g + k] + c; d[o + 4 * g + k] = v & 255; c = v >> 8; } }
}
// mask: 128*32 bytes (nonzero = text), seeds: the 64 values of 0x427278; dt = now - t0 (ms)
export function frame(buf, dt, mask, seeds, R = rng()) {
  const d = buf.d; R.seed(seeds[Math.trunc(f(dt * f(0.013333333333333334))) & 63]);
  const m = Math.trunc(f(f(Math.sin(f(dt * f(0.001))) * 4.4) + 6)), h = m >> 1;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 128; x++) {
    const cx = R.rand() % m - h + x, cy = R.rand() % m - h + y;
    if (cx < 0 || cy < 0 || cx >= 0x80 || cy >= 0x20 || !mask[y * 128 + x]) continue;
    const X = 12 * cx - 512, Y = 12 * cy;
    if (X < 0 || Y < 0 || X >= 0x1f3 || Y >= 0x173) continue;
    for (let r = 0; r < 12; r++) add12(d, (Y + r) * 512 + X, r === 0 || r === 11 ? ROW0 : ROWM);
  }
}
