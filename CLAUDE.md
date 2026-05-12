# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static single-page "Wheel of Dental" — a D3.js spin-the-wheel for picking dental school tables without repeats. No build step, no package manager, no tests. Everything is served as-is from `src/` by nginx.

## Running locally

```bash
docker-compose up        # serves on http://localhost:8080
```

`src/` is bind-mounted into the nginx container, so edits to HTML/CSS/JS are picked up on browser reload — no rebuild needed. The `Dockerfile` itself only matters for non-compose deploys (it `COPY`s `src/` into the image).

## Architecture

Three files in `src/` do everything:

- [src/index.html](src/index.html) — markup + `<script>` tags. **`d3.v3.min.js` must load before `script.js`** (script.js uses the global `d3` immediately at parse time, not inside `DOMContentLoaded`). The `?v=1` on `script.js` is a manual cache buster — bump it when shipping JS changes if users report stale behavior.
- [src/script.js](src/script.js) — all app logic; runs top-to-bottom on load with no module/IIFE wrapper. Several functions (`setTableCount`, `resetWheel`, `toggleAccordion`) are exposed as globals because `index.html` calls them via inline `onclick=`.
- [src/style.css](src/style.css)

### State model

All persistent state lives in `localStorage` — there is no backend:

- `numberOfTables` — wheel segment count (1–200; defaults to 10).
- `oldpick` — JSON array of already-picked slice indices (0-based). Drives "used" styling and the history chips.
- `wheelRotation` — last rotation angle so the wheel restores its visual position on reload.

The in-memory `data` array is rebuilt from `numberOfTables` on every page load. Anything that changes wheel structure (table count, reset) does a `location.reload()` rather than re-rendering in place — the D3 setup code only runs once at script load.

### Wheel state machine (in `script.js`)

The container's click handler is swapped between `spin` and `resetWheel` depending on whether every slice has been picked:

- `spin()` picks a random *unpicked* index, animates rotation, pushes to `oldpick`, then dims the slice. When `oldpick.length === data.length` it relabels the center button "RESET" and rebinds the click to `resetWheel`.
- `resetWheel()` clears `oldpick` (preserving `numberOfTables`) and reloads.
- `removeTableFromHistory()` (via the × on each history chip) un-dims the slice, pops it out of `oldpick`, and — if it was the most recent pick — rotates the wheel back to the new last pick.

When touching spin/restore/remove logic, keep these three paths in sync: they all duplicate the same "dim slice + set fill/opacity + apply text glow" styling block, and the inverse "reset to original color" block. Color comes from `getColor(i)` which cycles `colorRange` modulo its length.

### Rotation math

`ps = 360 / data.length` is the arc per slice. To park slice `i` under the right-side arrow:

```
rotation = (data.length - i) * ps + 90 - Math.round(ps / 2)
```

`spin()` adds `360 * 3` for the visual spin. This formula is repeated in `spin()`, the page-load restore block, and `removeTableFromHistory()` — change all three together.

## Gotchas

- D3 v3 (legacy API): `d3.layout.pie()`, `d3.svg.arc()`, `.ease("cubic-in-out")`, `.each("end", …)` for transition end. Do not "upgrade" snippets to v4+ syntax without also swapping the library.
- Stale `oldpick` entries (indices ≥ current `numberOfTables`) are defensively filtered on load and skipped in `updateHistoryChips` — preserve those guards when refactoring.
