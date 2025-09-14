FROM amazoncorretto:21

WORKDIR /app

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src ./src

RUN chmod +x gradlew

RUN ./gradlew clean test --info --no-daemon \
  -Dtest.logger=plain \
  -Dorg.gradle.logging.level=info
  
RUN ./gradlew bootJar

CMD ["java", "-jar", "build/libs/*.jar"]
