FROM amazoncorretto:21

# Copy the built JAR into the image
COPY build/libs/*.jar app.jar

# Expose internal port used by the app
EXPOSE 8080

# Run the JAR file
ENTRYPOINT ["java", "-jar", "app.jar"]
