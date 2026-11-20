// Slot 23: five scrolling lines of text (GDI Courier 16 px, 1536x16 byte masks 0 / 0x65, blank under the emulator) added (mod 256) to the picture in 512x16 windows
// (init 0x404f6a, frame 0x40502b). Line j sits at row 16*j + Y (Y = float parameter of command 6, 300 until set), window start = (100*j + ftol(dt*0.2)) % 1024
// (JS % keeps the sign like idiv: a negative start reads the end of the previous row; before the first row the original reads heap memory, here 0).
const f = Math.fround;
export const STRIP = 0x6000;
// strips: 5 Uint8Array(0x6000) (0 / 0x65), dt = now - t0 (ms, t0 = clock of the first enabled frame ever)
export function frame(buf, dt, strips, Y = 300) {
  const d = buf.d, k = Math.trunc(f(dt * f(-0.2)));
  for (let j = 0; j < 5; j++) {
    const y0 = Math.trunc(f(f(16 * j + Y) * 512)), e = (j * 100 - k) % 1024, s = strips[j];
    for (let r = 0; r < 16; r++) for (let c = 0; c < 512; c++) {
      const i = r * 0x600 + c + e, o = y0 + r * 512 + c; if (o >= d.length) continue;
      d[o] = (d[o] + (i >= 0 && i < STRIP ? s[i] : 0)) & 255;
    }
  }
}
