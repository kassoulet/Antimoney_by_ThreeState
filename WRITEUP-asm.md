# 3s-money - assembly notes

- MSVC, UPX packed; unpacked by running the stub under Unicorn (`re/unpack_upx_pe.py`). OEP 0x40d7e4. Imports: DirectDraw (8 bpp 512x384, palettised), DirectSound (64 KB looping secondary buffer, filled by a thread), GDI (text), MSVCRT.
- Float code is x87 with MSVC's `_ftol` (0x40d790, truncating) everywhere; the cheap trick of the 64k is table-free per-frame geometry: sin/cos/log10 evaluated live, line primitives `hline`/`vline` (0x401180/0x4011d0) doing a saturating add by `cmp al,0xff` after an `add` (carry test, 0x3f step).
- The polar warp (slot 3 init 0x401220) is a one-time table of 512*384 words: `trunc(sqrt(x^2+y^2)*255) - (trunc((atan2+pi/2)*4/pi*-255) << 8)`, so the per-frame cost is one `mov dl,[edx+edi]` loop of 0x30000 pixels (0x401443): texture lookup through a word table, the whole effect pass.
- Slot 13 combines images with `paddusb` (MMX saturating add, 16 bytes per iteration, 0x2fc4 iterations); grain uses `paddb` (wrapping) on purpose: wraps produce the speckle.
- Sequencing: the main routine (0x40c2f7) polls the tracker row/order, compares `time <= order<<8|row` against the script, so script times with a low byte above 63 (0xd80...) trigger at the next order boundary.
- Exactness: Unicorn's fsin/fcos return host glibc doubles; JS `Math.sin/cos` differ on ~3.5% of arguments. Our slot 3 matches golden frames on 99.4-100% of pixels; the residue is attributed to 80-bit x87 intermediates in the `_ftol` truncations (not analysed).
