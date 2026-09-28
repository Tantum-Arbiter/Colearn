#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."

first_attempt="${RUNNER_TEMP:-/tmp}/maestro-first-attempt.log"
most_flows_retried=3

first_report=()
retry_report=()
if [ -n "${MAESTRO_REPORT:-}" ]; then
  first_report=(--format=JUNIT "--output=$MAESTRO_REPORT")
  retry_report=(--format=JUNIT "--output=${MAESTRO_REPORT%.xml}-retry.xml")
fi

./.maestro/run.sh ${first_report[@]+"${first_report[@]}"} "$@" 2>&1 | tee "$first_attempt"
status=${PIPESTATUS[0]}

if [ "$status" -eq 0 ]; then
  exit 0
fi

if grep -qE "device offline|device '[^']+' not found" "$first_attempt"; then
  if ! timeout 120 adb wait-for-device; then
    echo "::error title=Emulator lost::adb lost the emulator during the journeys and it did not come back."
    exit "$status"
  fi
  adb reverse tcp:8080 tcp:8080
  echo "::warning title=Emulator lost::adb lost the emulator during the journeys; they are running once more."
  exec ./.maestro/run.sh ${retry_report[@]+"${retry_report[@]}"} "$@"
fi

if grep -qE "Device became unreachable|Transport unreachable" "$first_attempt"; then
  echo "::warning title=Driver lost::Maestro lost its iOS driver during the journeys; they are running once more."
  exec ./.maestro/run.sh ${retry_report[@]+"${retry_report[@]}"} "$@"
fi

failed_flows=()
while IFS= read -r name; do
  file=$(grep -rlxF "name: $name" .maestro/flows | head -1)
  if [ -z "$file" ]; then
    echo "::error title=Flow not found::No flow file is named '$name', so nothing is retried."
    exit "$status"
  fi
  failed_flows+=("$file")
done < <(sed -nE 's/^\[Failed\] (.*) \(([0-9]+m )?[0-9]+(ms|s)\).*/\1/p' "$first_attempt")

if [ "${#failed_flows[@]}" -eq 0 ] || [ "${#failed_flows[@]}" -gt "$most_flows_retried" ]; then
  exit "$status"
fi

echo "::warning title=Flows retried::These journeys failed and are running once more: ${failed_flows[*]}"
MAESTRO_FLOWS="${failed_flows[*]}" exec ./.maestro/run.sh ${retry_report[@]+"${retry_report[@]}"} "$@"
