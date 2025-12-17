# Multi-stage Dockerfile for Functional Tests
FROM gradle:8.5-jdk21 AS builder

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Build test classes and dependencies (clean to avoid stale compiled classes)
RUN ./gradlew clean testClasses --no-daemon

# Runtime stage
FROM amazoncorretto:21

# Install curl, which, tar, gzip (required by gcloud installer), and python3 for gcloud CLI
RUN yum update -y && \
    yum install -y curl which tar gzip python3 && \
    curl -sSL https://sdk.cloud.google.com > /tmp/install.sh && \
    bash /tmp/install.sh --disable-prompts --install-dir=/opt && \
    rm /tmp/install.sh && \
    yum clean all

# Add gcloud to PATH
ENV PATH="/opt/google-cloud-sdk/bin:${PATH}"

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
