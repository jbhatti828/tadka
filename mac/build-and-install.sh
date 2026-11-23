#!/bin/bash
# Builds the Mac app for this Mac's chip and installs it into /Applications.
# Run from the mac/ folder:  npm install && npm run install-app
set -e
cd "$(dirname "$0")"
ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && ARCH=x64
VER=$(node -p "require('./package.json').version")
npx @electron/packager . "Tadka" --platform=darwin --arch="$ARCH" --icon=icon.icns \
  --app-bundle-id=com.jasjit.tadka --app-version="$VER" --out=dist --overwrite \
  --ignore='^/dist' --ignore='build-and-install\.sh' --ignore='install\.command'
APP="dist/Tadka-darwin-$ARCH/Tadka.app"
rm -rf "/Applications/Tadka.app"
cp -R "$APP" /Applications/
xattr -cr "/Applications/Tadka.app"
codesign --force --deep --sign - "/Applications/Tadka.app"
echo "Installed. Opening Tadka…"
open "/Applications/Tadka.app"
