FROM amazoncorretto:21
WORKDIR /app

COPY . .

RUN chmod +x gradlew

RUN ./gradlew test --no-daemon

RUN ./gradlew clean bootJar --no-daemon

RUN cp build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
