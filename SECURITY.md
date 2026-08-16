# Security policy

## Reporting a vulnerability

Please **don't** open a public issue for a security problem.

Report it privately through GitHub's
[**Report a vulnerability**](https://github.com/KleivinX/html2mp4/security/advisories/new)
form. That opens a private advisory only you and the maintainer can see, and
it's the only channel used for this project — there's no security mailing
address.

Include what you did, what happened, and what you expected. A proof of concept
helps a lot. Expect a first reply within about a week — this is a side project,
not a staffed product.

## Threat model, briefly

html2mp4 runs entirely on your machine. It has no accounts, no telemetry, and
makes no network requests of its own. Two things are worth knowing:

- **It renders untrusted HTML.** Loading a file executes its JavaScript inside
  an Electron `BrowserWindow`. Rendering happens in an offscreen window with
  `nodeIntegration: false`, but you should still treat rendering someone else's
  HTML the same way you'd treat opening it in a browser.
- **It runs a local HTTP server** on `127.0.0.1:38470` while the app is open,
  to serve its own UI. It is not intended to be reachable from other machines.

Issues in these areas are in scope. So are path traversal in the upload
handler, and anything that lets a rendered page escape the renderer sandbox.

## Supported versions

The latest release only.
