# 3s-money (Three State, "antimoney", 64k) - web port, work in progress

`cd web && python3 -m http.server` then open the page: 512x384 canvas shown at 4:3, play/pause and seek bar (seek = set the audio clock; the video is a function of it).

## Status (honest)
| Part | State |
|---|---|
| Music | **Recording, not a port.** `web/assets/music.ogg` = 179.5 s (one pass of the 28 orders) of the original tracker synth run under Unicorn through an "ideal 25 ms DirectSound thread" (`re/emu.py`). The synth itself is not ported. The original loops at 179 s. |
| Scene script | Decoded (`re/NOTES.md`): 60 commands at 0x415250 fired by the tracker position (order<<8 \| row); row times in `web/assets/rows.json`. Not yet used by the player. |
| Slot 3 (opening star, 0-13 s) | Ported (`web/fx/fx03.js`). 99.4% of pixels equal golden + grain (0..31); 0.6% differ (unanalysed, probably x87 80-bit intermediates). Palette fade matches the golden frames. Check: `node re/fxcheck03.mjs` (needs the golden frames `re/fbv`, produced by `re/emu.py`, not committed). |
| Slot 24 grain | Approximate (`Math.random`): the original uses `rand()` added per frame. |
| Other 23 slots | Not ported (3D engine scenes, GDI-text based effects...). Text (Impact/Arial via GDI) is blank in the golden run, so it can only be approximated. |
| Video/audio offset | Video clock = audio + 800 ms (guess from the golden run; machine dependent in the original). |

## Files
`re/` reverse-engineering (unpack, Unicorn harness, notes), `web/` player, original `3s-money.exe` untouched.
