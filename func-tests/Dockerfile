# Multi-stage Dockerfile for Functional Tests
FROM gradle:8.5-jdk21 AS builder

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Build test classes and dependencies (clean to avoid stale compiled classes)
RUN ./gradlew clean testClasses --no-daemon

# Copy gcloud CLI from official image
FROM gcr.io/google.com/cloudsdktool/google-cloud-cli:slim AS gcloud

# Runtime stage
FROM amazoncorretto:21

# Copy gcloud from the official image
COPY --from=gcloud /usr/lib/google-cloud-sdk /usr/lib/google-cloud-sdk

# Add gcloud to PATH
ENV PATH="/usr/lib/google-cloud-sdk/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app /app

# Make scripts executable
RUN chmod +x ./gradlew ./entrypoint.sh

# Create report/result directories (host-mounted in compose)
RUN mkdir -p build/reports build/test-results build/cucumber-reports

# Environment variables
ENV SPRING_PROFILES_ACTIVE=test

# Use entrypoint script to run tests and upload reports
CMD ["./entrypoint.sh"]
