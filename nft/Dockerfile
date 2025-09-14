FROM gradle:8.4.0-jdk21

WORKDIR /app
COPY . .

# Force rebuild without caches
RUN ./gradlew clean build --no-daemon --refresh-dependencies

CMD ["./gradlew", "gatlingRun"]
