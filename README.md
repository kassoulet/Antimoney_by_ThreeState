# 3s-money (Three State, "antimoney", 64k) - web port, work in progress

`cd web && python3 -m http.server` then open the page: 512x384 canvas shown at 4:3, play/pause and seek bar (seek = set the audio clock; the video is a function of it).

## Status (honest)
| Part | State |
|---|---|
| Music | **Recording, not a port.** `web/assets/music.ogg` = 179.5 s (one pass of the 28 orders) of the original tracker synth run under Unicorn through an "ideal 25 ms DirectSound thread" (`re/emu.py`). The synth itself is not ported. The original loops at 179 s. |
| Scene script | Decoded (`re/NOTES.md`): 60 commands at 0x415250 fired by the tracker position (order<<8 \| row); row times in `web/assets/rows.json`. Drives the player (`web/fx/compose.js`: enable flags, slot-13 image index, palette level, rebuilt from the position so seek is pure). Check: `node re/fxcheck_compose.mjs` (needs `re/fbs`). |
| Slot 3 (star; orders 0-2 and 14-16, params 6/7 wired) | Ported (`web/fx/fx03.js`). 99.4% of pixels equal golden + grain (0..31); 0.6% differ (unanalysed, probably x87 80-bit intermediates). Palette fade matches the golden frames. Check: `node re/fxcheck03.mjs` (needs the golden frames `re/fbv`, produced by `re/emu.py`, not committed). |
| Slot 24 grain | Approximate (`Math.random`): the original uses `rand()` added per frame. |
| Slot 13 (images, orders 12-14) | Ported (`web/fx/fx13.js`): 4 images dumped from the emulator, saturating add. Gold >= image on ~100% of pixels; slot 11 (3D) on top is missing. |
| Palette level | Slot 0/3 rules exact; slot 4 (random), 11/13 era ramp, slot 15 pulse and slot 18 final fade are **fitted** to the golden run, not derived. |
| Other slots | Not ported (slots 4, 5, 10, 11, 12, 14, 15, 16, 17, 18, 23: 3D engine scenes, GDI-text based effects...). Text (Impact/Arial via GDI) is blank in the golden run, so it can only be approximated. |
| Slot 22 (glow/zoom post-process) | Ported (`web/fx/fx22.js`), checked against the original routine under Unicorn (`re/oracle22.py`, `re/fxcheck22.mjs`): within +-1..3 LSB, about 80% of bytes identical, NOT bit-exact. Cause: the MMX code leaves junk in the low bytes of its 16-bit lanes (registers inherited from earlier x87/MMX code); lane 0 junk is modelled, the rest of it is not. Orders 18-20 now agree 90-99% with the golden frames. |
| Video/audio offset | Video clock = audio + 800 ms (guess from the golden run; machine dependent in the original). |

## Files
`re/` reverse-engineering (unpack, Unicorn harness, notes), `web/` player, original `3s-money.exe` untouched.
