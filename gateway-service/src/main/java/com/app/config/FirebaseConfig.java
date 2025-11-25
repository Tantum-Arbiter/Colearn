package com.app.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.AccessToken;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Date;


/**
 * Firebase Configuration for Firestore Database Integration
 * Supports both service account key and Application Default Credentials (ADC)
 */
@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.project-id}")
    private String projectId;

    @Value("${firebase.service-account-key:#{null}}")
    private String serviceAccountKey;

    @Value("${firebase.database-url:#{null}}")
    private String databaseUrl;

    @Value("${firebase.emulator.host:#{null}}")
    private String emulatorHost;

    @Value("${firebase.emulator.port:8080}")
    private int emulatorPort;

    /**
     * Initialize Firebase App for production and development
     */
    @Bean
    @Profile("!test")
    public FirebaseApp firebaseApp() throws IOException {
        logger.info("Initializing Firebase App for project: {}", projectId);

        if (FirebaseApp.getApps().isEmpty()) {
            FirebaseOptions.Builder optionsBuilder = FirebaseOptions.builder()
                    .setProjectId(projectId);

            // Check if using emulator - if so, use test credentials
            if (emulatorHost != null && !emulatorHost.trim().isEmpty()) {
                logger.info("Using Firestore emulator - initializing with test credentials");
                optionsBuilder.setCredentials(getTestCredentials());
            } else {
                // Configure production credentials
                GoogleCredentials credentials = getGoogleCredentials();
                optionsBuilder.setCredentials(credentials);
            }

            // Set database URL if provided
            if (databaseUrl != null && !databaseUrl.trim().isEmpty()) {
                optionsBuilder.setDatabaseUrl(databaseUrl);
            }

            FirebaseOptions options = optionsBuilder.build();
            FirebaseApp app = FirebaseApp.initializeApp(options);

            logger.info("Firebase App initialized successfully");
            return app;
        } else {
            logger.info("Firebase App already initialized");
            return FirebaseApp.getInstance();
        }
    }

    /**
     * Firestore client bean for production and development
     */
    @Bean
    @Profile("!test")
    public Firestore firestore(FirebaseApp firebaseApp) {
        logger.info("Creating Firestore client");

        // Check if emulator is configured
        if (emulatorHost != null && !emulatorHost.trim().isEmpty()) {
            logger.info("Using Firestore emulator at {}:{}", emulatorHost, emulatorPort);

            // Configure Firestore to use emulator (plaintext)
            FirestoreOptions options = FirestoreOptions.newBuilder()
                    .setProjectId(projectId)
                    .setEmulatorHost(emulatorHost + ":" + emulatorPort)
                    .setCredentials(getTestCredentials())
                    .build();

            return options.getService();
        } else {
            // Use production Firestore
            return FirestoreClient.getFirestore(firebaseApp);
        }
    }

    /**
     * Test Firestore client bean for testing with emulator
     */
    @Bean
    @Profile("test")
    public Firestore testFirestore() {
        logger.info("Creating test Firestore client with emulator");

        String testEmulatorHost = emulatorHost != null ? emulatorHost : "localhost";
        int testEmulatorPort = emulatorPort > 0 ? emulatorPort : 8080;

        FirestoreOptions options = FirestoreOptions.newBuilder()
                .setProjectId("test-project")
                .setEmulatorHost(testEmulatorHost + ":" + testEmulatorPort)
                .setCredentials(getTestCredentials())
                .build();

        return options.getService();
    }

    /**
     * Get Google credentials based on configuration
     */
    private GoogleCredentials getGoogleCredentials() {
        try {
            if (serviceAccountKey != null && !serviceAccountKey.trim().isEmpty()) {
                // Use service account key from environment variable
                logger.info("Using service account key from configuration");
                InputStream serviceAccountStream = new ByteArrayInputStream(
                        serviceAccountKey.getBytes(StandardCharsets.UTF_8));
                return GoogleCredentials.fromStream(serviceAccountStream);
            } else {
                // Use Application Default Credentials (ADC)
                logger.info("Using Application Default Credentials");
                return GoogleCredentials.getApplicationDefault();
            }
        } catch (IOException e) {
            logger.error("Failed to initialize Google credentials", e);
            throw new RuntimeException("Failed to initialize Firebase credentials", e);
        }
    }

    /**
     * Get test credentials for emulator
     */
    private GoogleCredentials getTestCredentials() {
        AccessToken token = new AccessToken("emulator-token", new Date(System.currentTimeMillis() + 3600_000));
        return GoogleCredentials.create(token);
    }
}
