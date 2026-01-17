FROM eclipse-temurin:17-jdk

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN chmod +x ./gradlew ./wait-and-run.sh

RUN ./gradlew clean assemble --no-daemon

# Use wait script to ensure services are ready before running tests
CMD ["./wait-and-run.sh"]
