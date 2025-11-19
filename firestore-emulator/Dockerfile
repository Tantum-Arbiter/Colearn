# Firestore Emulator with Java 21 runtime
# Base on official Google Cloud SDK image and add OpenJDK 21 JRE
FROM gcr.io/google.com/cloudsdktool/cloud-sdk:latest

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget gnupg ca-certificates \
    && install -d -m 0755 /etc/apt/keyrings \
    && wget -qO- https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" > /etc/apt/sources.list.d/adoptium.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends temurin-21-jre \
    && rm -rf /var/lib/apt/lists/*

# Default command is provided via docker-compose; keep image generic
# Example (from compose):
# gcloud beta emulators firestore start --host-port=0.0.0.0:8080 --project=test-project

