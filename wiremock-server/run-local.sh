#!/usr/bin/env bash
# Serves the mappings on http://localhost:8080 without Docker: fetches the
# WireMock standalone jar once, then runs it against this directory.
set -euo pipefail

cd "$(dirname "$0")"

VERSION="${WIREMOCK_VERSION:-3.9.1}"
PORT="${WIREMOCK_PORT:-8080}"
JAR=".jar/wiremock-standalone-${VERSION}.jar"

if [ ! -f "$JAR" ]; then
  mkdir -p .jar
  echo "Fetching WireMock ${VERSION}..."
  curl -fsSL -o "$JAR" \
    "https://repo1.maven.org/maven2/org/wiremock/wiremock-standalone/${VERSION}/wiremock-standalone-${VERSION}.jar"
fi

exec java -jar "$JAR" \
  --port "$PORT" \
  --root-dir . \
  --global-response-templating \
  "$@"
