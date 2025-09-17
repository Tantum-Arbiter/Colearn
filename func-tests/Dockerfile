FROM gradle:8.5-jdk21 as builder

WORKDIR /app

COPY . .

RUN gradle testClasses --no-daemon

FROM amazoncorretto:21

WORKDIR /app

COPY --from=builder /app /app

CMD ["./gradlew", "cucumberTest", "--no-daemon"]