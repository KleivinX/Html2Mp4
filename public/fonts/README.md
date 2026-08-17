# Bundled fonts

These three faces are bundled rather than loaded from Google Fonts so the app
renders identically with no network connection, which matters because
html2mp4 is meant to work entirely offline.

Only the `latin` subset of each is included, to keep the payload at ~70 KB
total.

| File | Family | Used for | Licence |
|---|---|---|---|
| `LuckiestGuy-latin.woff2` | Luckiest Guy | headings, buttons, the wordmark | [Apache-2.0](LICENSE-luckiestguy-Apache-2.0.txt) |
| `Bungee-latin.woff2` | Bungee | small uppercase labels | [OFL-1.1](OFL-bungee.txt) |
| `Nunito-latin.woff2` | Nunito (variable, 400 to 800) | body and UI text | [OFL-1.1](OFL-nunito.txt) |

## Refreshing them

```bash
curl -s -A "Mozilla/5.0" "https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap"
```

Grab the `latin` `@font-face` block's `.woff2` URL from the response and
download it. Same for `family=Bungee` and `family=Nunito:wght@400..800`.
