# Pure WireMock Server - No Java Code Required
FROM wiremock/wiremock:3.3.1

# Switch to root to install packages and setup
USER root

# Install curl for health checks (supports Alpine or Debian/Ubuntu bases)
RUN (command -v apk >/dev/null 2>&1 && apk add --no-cache curl) || \
    (command -v apt-get >/dev/null 2>&1 && apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*)

# Create directories for WireMock
RUN mkdir -p /home/wiremock/mappings \
    /home/wiremock/__files \
    /home/wiremock/extensions

# Copy mappings and static files
COPY mappings/ /home/wiremock/mappings/
COPY __files/ /home/wiremock/__files/

# Note: skip chown to avoid relying on a specific user existing in the base image (portable across variants)
# Default base image permissions are sufficient for read-only mappings and running as root in tests.

# Expose WireMock port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/__admin/health || exit 1

# Environment variables for configuration
ENV WIREMOCK_OPTIONS="--global-response-templating --verbose"

# Use the base image default entrypoint and honor WIREMOCK_OPTIONS
