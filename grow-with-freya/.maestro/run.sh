#!/usr/bin/env bash
# Runs the Maestro suite against a running device: a booted iOS simulator on a
# Mac, or whatever adb has (an emulator) elsewhere. Override with MAESTRO_DEVICE.
set -euo pipefail

cd "$(dirname "$0")/.."

device="${MAESTRO_DEVICE:-}"

if [ -z "$device" ] && command -v xcrun >/dev/null 2>&1; then
  device=$(xcrun simctl list devices booted -j | python3 -c "
import json,sys
for runtime in json.load(sys.stdin)['devices'].values():
    for d in runtime:
        if d.get('state') == 'Booted' and 'iPad' not in d['name']:
            print(d['udid']); raise SystemExit
")
fi

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"

if [ -n "$device" ]; then
  exec maestro --device "$device" test "$@" .maestro
fi

if command -v adb >/dev/null 2>&1 && [ -n "$(adb devices | sed -n '2p')" ]; then
  exec maestro test "$@" .maestro
fi

echo "No device to test on. Boot a simulator or an emulator, or set MAESTRO_DEVICE=<id>." >&2
exit 1
