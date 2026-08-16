# Contributing to html2mp4

Thanks for taking a look. This is a small, focused tool and I'd like to keep it
that way — but bug reports, fixes and well-argued features are very welcome.

## Getting set up

```bash
git clone https://github.com/KleivinX/html2mp4.git
cd html2mp4
npm install
npm start        # launches the desktop app
npm run doctor   # verifies Node, FFmpeg and the Electron renderer
```

You need **Node.js 18+**. Everything else — Chromium, FFmpeg — comes down with
`npm install`. There is no build step for the UI: `public/` is plain
HTML/CSS/JS served straight to the window, so edit a file and reload.

### Fast UI iteration

You don't need to restart Electron for front-end work:

```bash
node src/server.js      # serves the UI on http://localhost:3847
```

Rendering won't work there (the Electron renderer is injected by the desktop
shell), but everything visual will.

## How it fits together

```
public/                  the whole UI — vanilla HTML/CSS/JS, no framework
electron/main.js         desktop shell: boots the server, opens the window
electron/electron-renderer.js   offscreen Chromium → frames
electron/timing-preload.cjs     freezes time so capture is deterministic
src/server.js            Express API the UI talks to
src/encoder.js           streams frames into FFmpeg
src/presets.js           export presets
```

The one design rule worth preserving: **`src/` must not import Electron.** The
shell injects a renderer via `globalThis.__h2m_createRenderer`, which keeps the
server testable and the renderer swappable.

## Before you open a PR

There's no test suite yet, so please verify by hand and say so in the PR:

1. `npm start`, drop in a file from `samples/`, export it, and confirm the MP4
   plays and has the duration/resolution you asked for.
2. If you touched the UI, check it at a narrow window too — the layout has a
   560px breakpoint.
3. If you touched capture or encoding, try at least two presets and a
   non-default FPS.

Small, single-purpose PRs get reviewed fastest. If you're planning something
large, open an issue first so we can agree on the shape before you write it.

## Style

Match what's already there. Concretely: 2-space indent, single quotes, ES
modules in `src/` and `electron/` (`.cjs` only where Electron requires
CommonJS). Comments should explain *why*, not restate the code — the existing
files are the reference.

## Design and assets

The look is deliberate: 1930s rubber-hose cartoon, palette locked to orange
`#F17217`, ink `#0B0A08` and cream `#FDFBF6`, all pulled off the mascot art.
Please stay inside that palette rather than introducing new accent colours.

The mascot, icon and walk cycle are **not** MIT licensed — see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Contributions shouldn't
depend on reusing them elsewhere.

## Licence

By contributing you agree your contributions are licensed under the MIT
licence, the same as the rest of the source.
