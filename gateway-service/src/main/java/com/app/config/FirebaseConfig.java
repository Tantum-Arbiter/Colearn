package com.app.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Firebase configuration for Firestore database
 */
@Configuration
public class FirebaseConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);
    
    @Value("${firebase.project-id:}")
    private String projectId;
    
    @Value("${firebase.service-account-key:}")
    private String serviceAccountKey;
    
    @Value("${firebase.database-url:}")
    private String databaseUrl;
    
    @Value("${firebase.use-emulator:false}")
    private boolean useEmulator;
    
    @Value("${firebase.emulator.host:localhost}")
    private String emulatorHost;
    
    @Value("${firebase.emulator.port:8080}")
    private int emulatorPort;
    
    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        logger.info("Initializing Firebase with project ID: {}", projectId);
        
        if (FirebaseApp.getApps().isEmpty()) {
            FirebaseOptions.Builder optionsBuilder = FirebaseOptions.builder();
            
            // Set project ID
            if (projectId != null && !projectId.trim().isEmpty()) {
                optionsBuilder.setProjectId(projectId);
            }
            
            // Set database URL if provided
            if (databaseUrl != null && !databaseUrl.trim().isEmpty()) {
                optionsBuilder.setDatabaseUrl(databaseUrl);
            }
            
            // Configure credentials
            GoogleCredentials credentials = getGoogleCredentials();
            optionsBuilder.setCredentials(credentials);
            
            FirebaseOptions options = optionsBuilder.build();
            FirebaseApp app = FirebaseApp.initializeApp(options);
            
            logger.info("Firebase initialized successfully with app name: {}", app.getName());
            return app;
        } else {
            logger.info("Firebase already initialized, using existing app");
            return FirebaseApp.getInstance();
        }
    }
    
    @Bean
    public Firestore firestore(FirebaseApp firebaseApp) {
        logger.info("Creating Firestore client");
        
        if (useEmulator) {
            logger.info("Using Firestore emulator at {}:{}", emulatorHost, emulatorPort);
            // Set emulator environment variables
            System.setProperty("FIRESTORE_EMULATOR_HOST", emulatorHost + ":" + emulatorPort);
        }
        
        Firestore firestore = FirestoreClient.getFirestore(firebaseApp);
        logger.info("Firestore client created successfully");
        
        return firestore;
    }
    
    private GoogleCredentials getGoogleCredentials() throws IOException {
        if (serviceAccountKey != null && !serviceAccountKey.trim().isEmpty()) {
            logger.info("Using service account key for authentication");
            try {
                // Parse the service account key JSON
                InputStream serviceAccountStream = new ByteArrayInputStream(
                        serviceAccountKey.getBytes(StandardCharsets.UTF_8));
                return GoogleCredentials.fromStream(serviceAccountStream);
            } catch (Exception e) {
                logger.error("Failed to parse service account key, falling back to Application Default Credentials", e);
                return GoogleCredentials.getApplicationDefault();
            }
        } else {
            logger.info("Using Application Default Credentials");
            return GoogleCredentials.getApplicationDefault();
        }
    }
    
    /**
     * Health check method for Firebase connection
     */
    public boolean isFirebaseHealthy() {
        try {
            FirebaseApp app = FirebaseApp.getInstance();
            return app != null && app.getName() != null;
        } catch (Exception e) {
            logger.error("Firebase health check failed", e);
            return false;
        }
    }
    
    /**
     * Health check method for Firestore connection
     */
    public boolean isFirestoreHealthy(Firestore firestore) {
        try {
            // Try to access a collection to test the connection
            firestore.collection("health_check").limit(1).get();
            return true;
        } catch (Exception e) {
            logger.error("Firestore health check failed", e);
            return false;
        }
    }
}
