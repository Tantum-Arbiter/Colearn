FROM gradle:8.5-jdk21 AS builder

WORKDIR /app

COPY . .

RUN ./gradlew testClasses --no-daemon

FROM amazoncorretto:21

WORKDIR /app

COPY --from=builder /app /app

RUN chmod +x ./gradlew

CMD ["./gradlew", "cucumberTest", "--no-daemon"]
