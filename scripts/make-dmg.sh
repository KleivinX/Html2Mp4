#!/usr/bin/env bash
# Wraps the already-built dist/mac/html2mp4.app into a compressed, drag-to-install
# .dmg. Uses plain `hdiutil create` (no mounted intermediate), which is far more
# reliable than electron-builder's default DMG step in restricted environments.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/dist/mac/html2mp4.app"
VERSION="$(node -p "require('$ROOT/package.json').version")"
DMG="$ROOT/dist/html2mp4-$VERSION.dmg"

if [ ! -d "$APP" ]; then
  echo "App bundle not found at $APP"
  echo "Build it first:  npm run pack:mac"
  exit 1
fi

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
