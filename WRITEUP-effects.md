# 3s-money (Three State "antimoney", 64k) - effects

Status: partial. Ported: slot 3 (star/kaleidoscope), slot 13 (images), grain. Everything else is documented below but not ported. See `README.md` for the honest table.

## Structure
- 25 effect "slots" (12-byte records at 0x431838: init, per-frame, command handler). Every frame all per-frame callbacks run; each tests its own enable flag.
- A 60-entry script (0x415250: time = order<<8|row, slot, command, float) fires from the tracker position. Command 0 with 1.0 enables, otherwise disables; 2 on slot 0 sets the palette level; 6/7/8 are slot specific parameters. So the picture is a function of (music position, clock): seek = set the module position.
- Output is 8-bit 512x384 (shown 4:3). The palette is always two-valued: indices below a level `v` are white, the rest black (0x40c691). All "brightness" in the demo is therefore a threshold on an additive 8-bit accumulator: effects add into the screen buffer with saturating or wrapping byte adds and the level decides what is white. Level changes (fades, pulses) are the main visual dynamic.

## Slot 3: star lines through a polar warp
A 256x256 byte texture is cleared each frame and 120 iterations add (+0x3f saturating) horizontal and vertical lines whose lengths follow `100 - trunc(sin(k*0.01 + a) * -128)` and whose positions follow `log10` spacing (`LG[119]-LG[120-k]`), with amplitudes `sin(a)*40+50`, `cos(a)*40+50`, a = t*0.005 (t = timeGetTime()/10). The screen is that texture read through a 512x384 table of words (radius -> column, angle -> row), which turns the grid of lines into the dotted star / rings. Command 6 fixes the vertical line length (0x42725c), command 7 switches off the horizontal lines and enables a scrolling text overlay (text itself is GDI and blank in our emulation), command 8 renders the overlay text.
Check against golden frames: 99.4-100% (orders 0-2 and 14-16).

## Slot 13: images
Four 512x384 pictures built at init from embedded bitmaps (`v = (255-v) & 0x7f`), added with `paddusb` to the screen; command 6 selects the image (0..3 at orders 12-14). We ship the four images dumped from the emulator (`web/assets/fx13.bin`).

## Slot 24: grain
768x512 buffer of `rand() & 31`, added (wrapping `paddb`) at a random offset `rand() % 0x30000` every frame. Not reproducible without the MSVCRT LCG state, approximated with `Math.random`.

## Slot 22: zoom/glow
After the other effects, the screen is halved and four mirrored quadrants (256x192, sampling walks outwards from the centre at a fixed-point step of 0xfe/256 per pixel) add `LUT[0x80 + bilinear]` to each pixel in place, so every pixel is blended with an already-zoomed neighbour: a recursive blur/zoom that turns hard lines into the soft noise floor seen in orders 18-20. Then x2. MMX details: the 16-bit lane low bytes are junk from earlier registers (see NOTES). Port is within +-1..3 LSB of the original.

## Not ported
3D engine scenes (slots 5, 10, 11, 12, 14, 17, 18: shared software engine at 0x407000-0x40bd00, mesh loader 0x407d80, polygon 0x407370, camera 0x409a71), GDI text effects (16, 22, 23, 15, text overlays), rand-driven slot 4. Palette levels of the 3D eras are fitted to the golden run in `web/fx/compose.js`.
