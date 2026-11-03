#!/usr/bin/env bash
# Prints the comma-separated story ids given in $1, whitespace around the commas removed, or
# exits 1 when any id is not a kebab-case story id (the shape scripts/story-schema.json requires). The
# CMS delete workflow builds bucket paths from these, so nothing else may get through.
set -euo pipefail

raw="${1-}"
cleaned=$(printf '%s' "$raw" | tr '[:space:]' ' ' | sed -E 's/ *, */,/g; s/^ +//; s/ +$//')
if [ -z "$cleaned" ]; then
  echo "ERROR: no story ids given" >&2
  exit 1
fi

IFS=',' read -ra ids <<< "$cleaned"
for id in "${ids[@]}"; do
  if [[ ! "$id" =~ ^[a-z0-9-]{1,100}$ ]]; then
    echo "ERROR: '$id' is not a story id (lowercase letters, digits and dashes, up to 100 characters)" >&2
    exit 1
  fi
done

IFS=','
printf '%s\n' "${ids[*]}"
