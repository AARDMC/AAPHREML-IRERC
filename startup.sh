#!/bin/sh
set -eu
# Resolve the project directory from this script's location so the contract
# works after a sandbox revive (or locally) regardless of the CWD.
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

# Probe the preview port; if it is already healthy, do nothing.
if command -v curl >/dev/null 2>&1; then
  if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
    exit 0
  fi
fi

# Start the dev server in the background (npm run dev runs Vite through the
# env wrapper so VITE_AUTH_ENABLED is populated).
nohup npm run dev >> /tmp/app-startup.log 2>&1 &
exit 0