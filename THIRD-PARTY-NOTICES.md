# Third-party notices

html2mp4's own source code is MIT licensed (see [LICENSE](LICENSE)). That
licence covers the source only — it does not cover the bundled FFmpeg binary
or the mascot artwork. The
packaged desktop app bundles third-party software with its own terms, listed
here. If you redistribute a build of html2mp4, these terms travel with it.

---

## FFmpeg — GPL-3.0-or-later ⚠️ read this one

The installers bundle an FFmpeg binary via
[`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static), built with
`--enable-gpl --enable-version3`. That binary is licensed
**GPL-3.0-or-later**.

What this means in practice:

- **The html2mp4 source code stays MIT.** html2mp4 invokes `ffmpeg` as a
  separate process — it does not link against FFmpeg's libraries — so the two
  are separate programs that happen to ship together.
- **A distributed installer contains GPLv3 software.** If you hand someone a
  `.dmg` / `.exe` / `.AppImage`, you are distributing that FFmpeg binary and
  must honour the GPLv3 for it: pass along the licence, and make the
  corresponding source available.
- **Corresponding source:** the exact build scripts and sources are published
  by the `ffmpeg-static` project at
  <https://github.com/eugeneware/ffmpeg-static>, and FFmpeg itself at
  <https://ffmpeg.org/download.html>. Anyone receiving a build from this
  project can obtain the FFmpeg source there.

Full FFmpeg licence text ships inside the package at
`node_modules/ffmpeg-static/ffmpeg.LICENSE`.

> If you would rather avoid GPL obligations entirely, swap `ffmpeg-static` for
> an LGPL FFmpeg build, or have the app call a system-installed `ffmpeg`
> instead of bundling one.

---

## Electron — MIT

<https://github.com/electron/electron> · Copyright (c) Electron contributors,
Copyright (c) 2013-2020 GitHub Inc.

Electron embeds Chromium (BSD-3-Clause and others) and Node.js (MIT). Their
licences ship inside the packaged app under `LICENSES.chromium.html`.

## Node dependencies — MIT

`express`, `multer`, `open`, `electron-builder` — all MIT.

---

## Fonts

Bundled in `public/fonts/` so the app renders identically offline. Licence
texts sit next to the font files.

| Font | Licence | Copyright |
|---|---|---|
| **Luckiest Guy** | Apache-2.0 — [`LICENSE-luckiestguy-Apache-2.0.txt`](public/fonts/LICENSE-luckiestguy-Apache-2.0.txt) | Copyright (c) 2010 Brian J. Bonislawsky DBA Astigmatic (AOETI) |
| **Bungee** | OFL-1.1 — [`OFL-bungee.txt`](public/fonts/OFL-bungee.txt) | Copyright 2023 The Bungee Project Authors ([github.com/djrrb/Bungee](https://github.com/djrrb/Bungee)) |
| **Nunito** | OFL-1.1 — [`OFL-nunito.txt`](public/fonts/OFL-nunito.txt) | Copyright 2014 The Nunito Project Authors ([github.com/googlefonts/nunito](https://github.com/googlefonts/nunito)) |

Both licences permit bundling and redistribution. Neither font is sold on its
own here, and neither is renamed — both conditions the OFL cares about.

---

## Brand artwork — © Kleivin Gjuzi, all rights reserved

The mascot, the app icon and the walk-cycle animation
(`public/mascot.png`, `public/walker.gif`, `public/appicon.png`,
`build/icon.png`) are **not** covered by the MIT licence.

You may use them in unmodified builds and forks of html2mp4 that still identify
as html2mp4. Please don't reuse the character for unrelated projects, and
please replace it if you fork this into a differently-named product.

---

## Trademarks

The Claude and Remotion logos appear in the UI under "Pairs with" purely to
indicate compatibility. **Claude** is a trademark of Anthropic PBC.
**Remotion** is a trademark of Remotion GmbH. html2mp4 is an independent
project — not affiliated with, endorsed by, or sponsored by either company.
Those marks remain the property of their respective owners and are not covered
by this project's licence.
