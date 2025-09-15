FROM eclipse-temurin:17-jdk

WORKDIR /app

COPY . .

RUN chmod +x ./gradlew

RUN ./gradlew clean assemble --no-daemon

CMD ["./gradlew", "gatlingRun", "--no-daemon"]
