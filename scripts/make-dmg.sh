#!/usr/bin/env bash
# Wraps the already-built html2mp4.app into a compressed, drag-to-install .dmg.
# Uses plain `hdiutil create` (no mounted intermediate), which is far more
# reliable than electron-builder's default DMG step in restricted environments.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"

# electron-builder names the output dir after the target arch: dist/mac on
# Intel, dist/mac-arm64 on Apple Silicon, dist/mac-universal for universal
# builds. Find whichever one actually got produced rather than guessing.
APP=""
for candidate in "$ROOT"/dist/mac*/html2mp4.app; do
  if [ -d "$candidate" ]; then
    APP="$candidate"
    break
  fi
done

if [ -z "$APP" ]; then
  echo "No html2mp4.app found under $ROOT/dist/mac*/"
  echo "Build it first:  npm run pack:mac"
  ls -la "$ROOT/dist" 2>/dev/null || echo "(no dist directory at all)"
  exit 1
fi

# Tag the filename with the arch so an arm64 and an x64 build can coexist as
# release assets. A plain Intel build keeps the original unsuffixed name.
ARCH_DIR="$(basename "$(dirname "$APP")")"   # mac | mac-arm64 | mac-universal
# Every mac build gets an explicit arch in the filename so a user can tell at
# a glance which one their machine needs.
case "$ARCH_DIR" in
  mac)           SUFFIX="-x64" ;;
  mac-universal) SUFFIX="-universal" ;;
  *)             SUFFIX="-${ARCH_DIR#mac-}" ;;
esac
DMG="$ROOT/dist/html2mp4-${VERSION}${SUFFIX}.dmg"

echo "Found app:  $APP"
echo "Output dmg: $DMG"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "Staging app + Applications shortcut…"
ditto "$APP" "$STAGE/html2mp4.app"
ln -s /Applications "$STAGE/Applications"

rm -f "$DMG"
echo "Creating compressed disk image…"
hdiutil create -srcfolder "$STAGE" -volname "html2mp4" -format UDZO -fs HFS+ "$DMG"

echo ""
echo "Built: $DMG"
ls -lh "$DMG"
