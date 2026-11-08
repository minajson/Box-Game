#!/bin/bash
# Crack the Box - NAPE 2026 (offline). Double-click this file to start the game.
# Uses the Node.js engine bundled in the "runtime" folder - nothing to install.
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1
/usr/bin/clear 2>/dev/null
echo "=============================================="
echo "   CRACK THE BOX - NAPE 2026   (offline)"
echo "=============================================="

# Files copied from the internet / AirDrop / email get a "quarantine" tag that can
# make macOS block the bundled engine. Remove it (harmless if there is none) and
# make sure the engine files are allowed to run (a USB stick can drop that flag).
/usr/bin/xattr -dr com.apple.quarantine "$DIR" 2>/dev/null
/bin/chmod +x "$DIR"/runtime/node-* 2>/dev/null

# Pick the engine that matches this Mac (Apple chip or Intel chip).
# (Absolute paths: this must not depend on what happens to be on the PATH.)
if [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ] || [ "$(/usr/bin/uname -m 2>/dev/null)" = "arm64" ]; then
  NODE="$DIR/runtime/node-darwin-arm64"
else
  NODE="$DIR/runtime/node-darwin-x64"
fi

# A working engine must actually run code (an empty or damaged file does not).
if [ ! -f "$NODE" ] || [ "$("$NODE" -p 1 2>/dev/null)" != "1" ]; then
  # Last resort: a Node.js 18+ the Mac already has.
  if command -v node >/dev/null 2>&1 && [ "$(node -p "process.versions.node.split('.')[0]" 2>/dev/null)" -ge 18 ] 2>/dev/null; then
    NODE="$(command -v node)"
  else
    echo
    echo "  The game engine could not start on this Mac."
    echo "  - Make sure you copied the WHOLE folder (it must contain a 'runtime' folder)."
    echo "  - If macOS showed a security message, open System Settings > Privacy & Security,"
    echo "    scroll down and click 'Open Anyway', then start the game again."
    echo "  - This game needs macOS 11 (Big Sur) or newer."
    echo
    read -r -p "  Press Enter to close this window. "
    exit 1
  fi
fi

OPEN_BROWSER=1 "$NODE" "$DIR/server/serve-offline.mjs"
code=$?
if [ "$code" -ne 0 ]; then
  echo
  read -r -p "  Press Enter to close this window. "
fi
exit "$code"
