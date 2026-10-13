# October 2026 design reference

The final design for the site, exported from the Claude Design canvas
(https://claude.ai/artifact/1bUXBdz8gq6F7o3T9on2Be) on 2026-10-13. It is a
reference only: nothing here is served or built.

- `boards/`: one `.dc.html` file per board, plus `hbc.css` (the boards'
  shared styles) and `canvas.json`. Blob images are left out. The board →
  route map is in the spec, §0.2.
- `notes/`: the research (01–05) and adversarial review notes (A–D) that
  the implementation spec was written and revised from.

The plan is `docs/redesign/07-IMPLEMENTATION-SPEC.md`. Where the boards and
the spec disagree, the spec wins: it records every deliberate deviation.
**Never take facts from the boards** (prices, times, places, ratings,
contacts): their copy comes from a Dubrovnik template. Facts live in
`src/data/*` and `src/config/*`.

Changes here don't trigger a Netlify build (see `ignore` in netlify.toml).
