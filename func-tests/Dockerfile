FROM amazoncorretto:21

WORKDIR /app

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src/test/java ./src/test/java
COPY src/test/resources ./src/test/resources

RUN chmod +x gradlew
RUN ./gradlew build -x test || true

CMD ["./gradlew", "cucumberTest"]
