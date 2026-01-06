# Multi-stage Docker build for Grow with Freya Gateway Service
# Optimized for GCP Cloud Run deployment

# Build stage
FROM gradle:8.5-jdk21 AS builder

# Set working directory
WORKDIR /app

# Copy all project files
COPY build.gradle settings.gradle gradlew ./
COPY gradle/ gradle/
COPY src/ src/

# Ensure gradlew is executable
RUN chmod +x gradlew

# Build the application with retry logic (Maven Central sometimes returns 403)
RUN ./gradlew build --no-daemon -x test || \
    (sleep 10 && ./gradlew build --no-daemon -x test) || \
    (sleep 30 && ./gradlew build --no-daemon -x test)

# Runtime stage
FROM eclipse-temurin:21-jre

# Install security updates and required packages
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y \
        curl \
        ca-certificates \
        tzdata && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Create log directory
RUN mkdir -p /var/log/gateway && \
    chown -R appuser:appuser /var/log/gateway

# Copy the built JAR from builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Change ownership of the app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set JVM options for Cloud Run
ENV JAVA_OPTS="-Xmx512m -Xms256m -XX:+UseG1GC -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Set Spring profile
ENV SPRING_PROFILES_ACTIVE=prod

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f -A "HealthCheck/1.0" http://localhost:8080/auth/status || exit 1

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

# Metadata
LABEL maintainer="grow-with-freya-team"
LABEL version="1.0.0"
LABEL description="Grow with Freya Gateway Service - Enterprise Authentication & API Gateway"
