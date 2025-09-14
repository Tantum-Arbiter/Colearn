FROM amazoncorretto:21

WORKDIR /app

COPY func-tests/gradlew func-tests/gradlew
COPY func-tests/gradle func-tests/gradle
COPY func-tests/build.gradle func-tests/settings.gradle ./

RUN ./gradlew build -x test || return 0

COPY func-tests/src ./src

CMD ["./gradlew", "test"]
