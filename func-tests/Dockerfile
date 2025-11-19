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

# Install curl for health checks and debugging
RUN yum update -y && \
    yum install -y curl && \
    yum clean all

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app /app

# Make gradlew executable
RUN chmod +x ./gradlew

# Create report/result directories (host-mounted in compose)
RUN mkdir -p build/reports build/test-results build/cucumber-reports


# Environment variables
ENV SPRING_PROFILES_ACTIVE=test

# Default command runs functional tests with a clean build to avoid stale classes
CMD ["./gradlew", "functionalTest", "--no-daemon", "--info"]
