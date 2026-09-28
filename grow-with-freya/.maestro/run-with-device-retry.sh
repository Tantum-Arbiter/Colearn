#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."

first_attempt="${RUNNER_TEMP:-/tmp}/maestro-first-attempt.log"

./.maestro/run.sh "$@" 2>&1 | tee "$first_attempt"
status=${PIPESTATUS[0]}

if [ "$status" -eq 0 ]; then
  exit 0
fi

if ! grep -qE "device offline|device '[^']+' not found" "$first_attempt"; then
  exit "$status"
fi

if ! timeout 120 adb wait-for-device; then
  echo "::error title=Emulator lost::adb lost the emulator during the journeys and it did not come back."
  exit "$status"
fi

echo "::warning title=Emulator lost::adb lost the emulator during the journeys; they are running once more."
adb reverse tcp:8080 tcp:8080
./.maestro/run.sh "$@"
