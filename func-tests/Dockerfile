FROM gradle:8.4-jdk21 AS builder

WORKDIR /app

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src/test/java ./src/test/java
COPY src/test/resources ./src/test/resources

RUN chmod +x gradlew

RUN ./gradlew testClasses --no-daemon

FROM amazoncorretto:21

WORKDIR /app

COPY --from=builder /app .

ENTRYPOINT ["./gradlew", "cucumberTest", "--no-daemon"]
