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

## Audio capture (done, not yet verified against a second source)
- `H7AUDIO=1 H7SAVE=1 python3 emu.py 740000000` stops after `CreateThread` (~700M instructions of precalc, ~10 min) and writes `snap.pkl` (19.7 MB, memory + regs + harness state). `H7LOAD=1 H7AUDIO=1 H7ASEC=60 python3 emu.py 4000000000` resumes from it in seconds.
- Audio thread = ideal 25 ms thread (`audio_iter`: body 0xe184..0xe22a, play cursor = k*25 ms*176400 B/s), interleaved with the main thread between 20M-instruction chunks until the synth is initialised by main (non-silent after 925 ms of virtual time), then run alone. 60 s of PCM in 34 s -> `pcm_emu.raw` / `pcm_emu.wav` (44.1 kHz stereo s16, peak 32500, rms 5.6k-10k).
- Pitfall: the harness had a leftover h7 hook stopping the CPU at 0x401252; it silently froze the main thread and made the first audio runs silent. Removed.
- The start offset between video clock and audio is machine dependent (the real thread starts at CreateThread, concurrently with the precalc); document as UNRESOLVED in the README.

## TODO
1. Music length / loop point (render until the thread stops or repeats).
2. Golden frames on a virtual clock; palette per frame.
3. Port (JS), seek, README, WRITEUPs.

## Golden video (done)
- `H7NOINT=1 H7LOAD=1 H7AUDIO=1 H7ASEC=1 H7MAXFR=624 H7FBDIR=fbv python3 -u emu.py 6000000000` (~40 min from `snap.pkl`): `fbv/fb20..fb625.bin`, palette+indices. Snapshot VT = 800 ms with 20 frames already presented; each Blt advances the virtual clock 40 ms, so file fbN (N = 20..625, numbering continues from the snapshot) is presented at clock 800 + 40*(N-20) ms. 606 frames = 24 s of effects.

## x87 fsin/fcos exactness (measured, 5000 args each, |x|<50)
- Unicorn `fsin`/`fcos` return the HOST glibc `sin`/`cos` (double). Versus that oracle: JS `Math.sin/cos` differ on 3.3%/3.7% of args; a correctly-rounded sin/cos (mpmath) differs on 0.14%/0.16%.
- So bit-exact trig in wasm/JS means porting glibc's sin/cos (IBM accurate lib), or accepting rare 1-ulp differences. Plan: correctly-rounded sin/cos in the recompiled runtime, then measure pixel/sample diffs against `fbv/` and `pcm_emu.raw`; document the residue in the README (approximated, not bit-exact) unless it is zero.

## Scene script and music length (found)
- `0x40c2f7` is the demo's main routine: it runs init callbacks of 25 effect slots (12-byte entries at 0x431838: +0 init, +4 per-frame, +8 command handler; filled at 0x40c09e..0x40c27b), then walks the SCRIPT at 0x415250 (60 entries x 8 bytes: u16 time, u8 slot, u8 arg1, u32 arg2 (float bits)). Entry fires when `time <= ax`, `ax = order<<8 | row` read from the tracker state (`0x40e846`: row = byte [P+0x4ba0], order = byte [P+0x4ba4], P = [0x4c2264]). Each frame, per-frame callbacks of all slots run, then 0x40cab9 (message loop + blit). Ends when ax >= 0x1b3c (order 27, row 60) or ESC. Last real entry at order 24 (6144).
- So the video is driven by the music position (order,row) AND by timeGetTime inside effects. The golden video in `fbv/` only covers the first ~24 s of video clock with the music frozen near order 0 (audio was not interleaved), so it is a diff target for the early script only.
- Music (`pos.json`, 330 s audio render): 64 rows/order, ~6.27 s/order (7.0 s for orders 13-16 and 13-16 of the second pass: a speed change), 28 orders = 178.5 s per pass; the song LOOPS at 179.45 s (order 0 again). The demo ends at ~178 s.
- Script (time -> slot): 0:2,0,24,1,3,16 | 512:16,0,3,14 | 544,576:14 | 1024:14,5,22 | 1536:5,22,4 | 2048:4,0,12 | 3072:12,0,11,13 | 3104-3360:13 | 3456:13,11,0,3 | 4096:3,23,22,17 | 4608:17,3 | 5120:3,22,10,23 | 5632:10,23,15 | 6144:15,0,18.

## Slot map and first effect port (slot 3)
- All 25 slot per-frame callbacks run every frame; each checks its own enable flag (set by script commands with `p == 1.0`). At script time 0: slot 24 (grain), 1 (screen clear 0x40c62f), 3 (star), 16 (text particles "3"), 22/13 small.
- Slot 24 (init 0x4044a0, frame 0x40455b): 768x512 byte texture, `rand()&31` per byte (+ GDI text blank in the harness), added (paddb, wraps) at a random offset `rand()%0x30000` to the 512x384 screen every frame. The grain is rand()-driven, so not reproducible in the port (approximate: own LCG).
- Palette (0x40c691(v)): entries < v white, others black; v = clamp(320 - 0.002*10*(now-t0), 100, 255) while time word < 0x500.
- Slot 3 ported: `web/fx/fx03.js`, check `node re/fxcheck03.mjs` (needs `re/fbv`): 99.4% of pixels = ours + grain (0..31); 0.6% outside (likely x87 80-bit vs double intermediates in the ftol truncations; not yet analysed).
- GDI text (Impact/Arial strings at 0x411010..0x4110a0, rendered by 0x40bd9a) is blank in the golden run: effects that use it (slot 3 text overlay, slot 24 texture, slot 16) can only be approximated in the port (canvas fillText).
