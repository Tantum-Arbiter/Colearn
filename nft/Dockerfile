FROM gradle:8.4.0-jdk21

WORKDIR /app

COPY . .

RUN gradle build

CMD ["gradle", "gatlingRun"]
