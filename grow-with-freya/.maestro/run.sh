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

# The app's ambient animation (twinkling stars, a breathing sun) keeps the
# accessibility snapshot moving, which makes a flow miss elements that are
# plainly on screen. Reduce Motion settles it -- and it is put back afterwards,
# because with it on the story card fades its pages instead of turning them.
restore_motion() {
  if [ -n "${motion_was:-}" ] && [ "$motion_was" != "1" ]; then
    xcrun simctl spawn "$device" defaults write com.apple.Accessibility ReduceMotionEnabled -bool false 2>/dev/null || true
  fi
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
  motion_was=$(xcrun simctl spawn "$device" defaults read com.apple.Accessibility ReduceMotionEnabled 2>/dev/null || echo 0)
  if [ "$motion_was" != "1" ]; then
    xcrun simctl spawn "$device" defaults write com.apple.Accessibility ReduceMotionEnabled -bool true 2>/dev/null || true
    # the app reads the setting as it starts, and the accessibility snapshot
    # needs a moment to settle after the write
    xcrun simctl terminate "$device" com.growwithfreya.app >/dev/null 2>&1 || true
    sleep 3
  fi
  trap restore_motion EXIT INT TERM
  maestro --device "$device" test "$@" .maestro
  status=$?
  restore_motion
  trap - EXIT INT TERM
  exit $status
fi

if command -v adb >/dev/null 2>&1 && [ -n "$(adb devices | sed -n '2p')" ]; then
  exec maestro test "$@" .maestro
fi

echo "No device to test on. Boot a simulator or an emulator, or set MAESTRO_DEVICE=<id>." >&2
exit 1
