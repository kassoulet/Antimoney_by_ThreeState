# 3s-money (Three State, "antimoney", 64k) - reverse-engineering log

## Tooling
- `unpack_upx_pe.py ../3s-money.exe unp` - runs the UPX stub under Unicorn (needs `python3` WITHOUT `-I`: unicorn is in the user site). OEP 0x40d7e4, image 0x400000..0x4c9000 -> `unp/image.bin`, `unp/info.json` (copy both next to `emu.py`).
- `emu.py` - h7 harness adapted (MSVC exe): TIB at 0x7e000000 (FS:0 = SEH chain), CRT stubs (`__getmainargs`, `_initterm` via trampoline, `_acmdln` data import, rand = MSVCRT LCG, math = real x87 snippets, `_ftol` truncating), stdcall arg counts in `NARGS` (a wrong count corrupts the stack silently), DirectDraw 512x384x8 (palette via CreatePalette/SetEntries, Lock desc 8bpp). `H7FBDIR=fb` streams each presented frame as `fbN.bin` = palette (256x4) + 512*384 indices. Do NOT use `H7RING` for long runs (per-instruction hook, 10x slower). Never `pgrep -f`/`pkill -f` from the tool shell (matches itself).
- Speed: ~1.5M instr/s without hooks; the demo precalculates ~700M instructions before the audio starts.

## Findings
- Display: 512x384, 8-bit, window 0x200x0x180 (4:3). Frames are presented with `Blt` (primary <- back buffer). Loading frames are blank; real effects (black/white kaleidoscope, dotted star) from frame ~30.
- Text: CreateFontA/TextOutA + GetDIBits/SetDIBits (GDI text rasterised into a DIB): the stub returns nothing, so text is blank. Needs a glyph rasteriser (or documented as approximated).
- Audio: `DirectSoundCreate` (DSOUND ord1) after ~20 frames; secondary buffer 64 KB, PCM 44.1 kHz stereo 16 bit (flags 0x18000). `CreateThread(0x40e161)` + `SetThreadPriority`. Thread loop (flat 0xe161): Sleep(0x19 = 25 ms?) via 0xd776; GetCurrentPosition (vtbl+0x10); bytes = (play & ~31) - last (mod 0x10000); Lock (vtbl+0x2c) at `last`; render n/4 samples with 0xe4f9 into a scratch at ctx+0x10046, copy to the two Lock parts with 0xe000; Unlock (vtbl+0x4c); loop. Ctx at 0x43221c (+0x28 play pos, +0x2c last pos).
  -> same "ideal thread" model as h7: run the loop body by hand every 25 ms of virtual time, play cursor = t * 176400.
- The tail of `emu.py` (after the main `emu_start`) is still h7 specific (`0x401252`, ctx 0x42a400): rewrite for this exe.

## Timing (read from the code)
- `timeGetTime` is called from 18 sites inside the effect routines (0x40100d, 0x4013a2, ... 0x40724c); the one at 0x401000 uses t = timeGetTime()/10 (centiseconds: mul 0xcccccccd, shr 3) -> fsin/fcos. So the picture is a pure function of the clock (not of the audio position): the golden run can drive a virtual clock, and seek = set the clock. Audio is a separate stream (thread above).
- Message loop at 0xcab9 (PeekMessageA -> Translate/Dispatch, sets 0x431a0c = quit flag on WM_QUIT/ESC), then 0xca60 draws a frame.
- Plan: same route as h7 (static recompile of the whole x86 with h7's `recomp.py`/x87 runtime, run in wasm) rather than a hand port: the demo is float heavy (fsin/fcos/fpatan/fdiv) and has ~700M instructions of precalc + a software synth, which are cheap to recompile and exactly reproducible.

## TODO
1. Audio mode in `emu.py`: run the thread body at 25 ms steps, capture PCM, check how video timing depends on it (timeGetTime vs sample position).
2. Golden frames on a virtual clock; palette per frame.
3. Port (JS), seek, README, WRITEUPs.
