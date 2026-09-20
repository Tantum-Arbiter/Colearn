#!/usr/bin/env bash
# Runs the Maestro suite against a booted simulator (or $MAESTRO_DEVICE).
set -euo pipefail

cd "$(dirname "$0")/.."

device="${MAESTRO_DEVICE:-}"
if [ -z "$device" ]; then
  device=$(xcrun simctl list devices booted -j | python3 -c "
import json,sys
for runtime in json.load(sys.stdin)['devices'].values():
    for d in runtime:
        if d.get('state') == 'Booted' and 'iPad' not in d['name']:
            print(d['udid']); raise SystemExit
")
fi

if [ -z "$device" ]; then
  echo "No booted simulator. Boot one, or set MAESTRO_DEVICE=<udid>." >&2
  exit 1
fi

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"
exec maestro --device "$device" test "$@" .maestro
