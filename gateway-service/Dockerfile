FROM amazoncorretto:21

WORKDIR /app

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src ./src

RUN chmod +x gradlew

RUN ./gradlew clean test

RUN ./gradlew bootJar

CMD ["java", "-jar", "build/libs/*.jar"]
