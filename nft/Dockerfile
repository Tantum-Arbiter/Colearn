FROM eclipse-temurin:17-jdk

WORKDIR /app

COPY . .

RUN gradle clean gatlingRun --no-daemon

CMD ["gradle", "gatlingRun"]
