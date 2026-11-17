// slot 13: four 512x384 images (values 0..127, dumped from the emulator after init), added to the screen with a saturating byte add (paddusb).
// Command 6 sets the image index; the script enables it at order 12 and disables at 3456.
export let IMG; // 4 x 196608
export const load = async url => { IMG = new Uint8Array(await (await fetch(url)).arrayBuffer()); };
export function frame(idx, out) { const o = idx * 196608; for (let i = 0; i < 196608; i++) out[i] = Math.min(255, out[i] + IMG[o + i]); }
export const setImages = b => { IMG = b; };
