FROM gradle:8.4.0-jdk17

WORKDIR /app

COPY . .

RUN gradle clean gatlingRun --no-daemon

CMD ["gradle", "gatlingRun"]
