FROM amazoncorretto:21

WORKDIR /app

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src ./src

RUN chmod +x gradlew
RUN ./gradlew build -x test || true

CMD ["./gradlew", "test"]
