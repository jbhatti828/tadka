#!/bin/bash
# Installs Tadka into Applications and clears macOS's "downloaded app" block.
cd "$(dirname "$0")"
APP="Tadka.app"
if [ ! -d "$APP" ]; then echo "Put this file next to \"$APP\" and run it again."; read -n1; exit 1; fi
echo "Installing Tadka..."
rm -rf "/Applications/$APP"
cp -R "$APP" /Applications/
xattr -cr "/Applications/$APP"
codesign --force --deep --sign - "/Applications/$APP" 2>/dev/null
echo "Done. Opening Tadka..."
open "/Applications/$APP"
