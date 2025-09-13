FROM amazoncorretto:21

# Make port 8080 available to the world outside this container

CMD ["./gradlew", "clean", "bootJar"]
COPY build/libs/*.jar app.jar

EXPOSE 8081:8080
ENTRYPOINT ["java", "-jar", "app.jar"]