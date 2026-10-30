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

read -ra flows <<< "${MAESTRO_FLOWS:-.maestro}"

# The app's ambient animation (twinkling stars, a breathing sun) keeps the
# accessibility snapshot moving, which makes a flow miss elements that are
# plainly on screen. Reduce Motion settles it, but only while the suite runs:
# afterwards it is always turned off, whatever it was before, because with it
# on the island voyage is a white flash and the story card fades its pages.
motion_for_the_suite() {
  xcrun simctl spawn "$device" defaults write com.apple.Accessibility ReduceMotionEnabled -bool "$1" 2>/dev/null || true
  xcrun simctl terminate "$device" com.growwithfreya.app >/dev/null 2>&1 || true
}

motion_back_on() {
  motion_for_the_suite false
}

# A simulator driven for a long stretch starts leaving whole subtrees out of
# the accessibility snapshot, and flows fail on elements that are plainly on
# screen. MAESTRO_FRESH=1 boots it again first, which cures it.
if [ -n "$device" ] && [ "${MAESTRO_FRESH:-0}" = "1" ]; then
  echo "Rebooting $device for a clean accessibility service..."
  xcrun simctl shutdown "$device" >/dev/null 2>&1 || true
  sleep 5
  xcrun simctl boot "$device" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$device" >/dev/null 2>&1 || true
  sleep 10
fi

if [ -n "$device" ]; then
  trap motion_back_on EXIT INT TERM
  motion_for_the_suite true
  # the app reads the setting as it starts, and the accessibility snapshot
  # needs a moment to settle after the write
  sleep 3
  status=0
  maestro --device "$device" test "$@" "${flows[@]}" || status=$?
  motion_back_on
  trap - EXIT INT TERM
  exit $status
fi

if command -v adb >/dev/null 2>&1 && [ -n "$(adb devices | sed -n '2p')" ]; then
  exec maestro test "$@" "${flows[@]}"
fi

echo "No device to test on. Boot a simulator or an emulator, or set MAESTRO_DEVICE=<id>." >&2
exit 1
