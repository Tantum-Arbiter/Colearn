package com.app.health;

import com.google.cloud.firestore.Firestore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Health indicator for Firestore connectivity.
 * Performs a simple read operation to verify the connection is working.
 */
@Component("firestore")
public class FirestoreHealthIndicator implements HealthIndicator {

    private static final Logger logger = LoggerFactory.getLogger(FirestoreHealthIndicator.class);
    private static final int TIMEOUT_SECONDS = 5;

    private final Firestore firestore;

    public FirestoreHealthIndicator(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public Health health() {
        long startTime = System.currentTimeMillis();
        try {
            // Perform a lightweight operation to check connectivity
            // listCollections() is a quick metadata operation that verifies the connection
            firestore.listCollections()
                    .iterator()
                    .hasNext(); // Just need to check if we can iterate

            long duration = System.currentTimeMillis() - startTime;
            logger.debug("Firestore health check passed in {}ms", duration);

            return Health.up()
                    .withDetail("responseTime", duration + "ms")
                    .withDetail("service", "firestore")
                    .build();

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.warn("Firestore health check failed after {}ms: {}", duration, e.getMessage());

            return Health.down()
                    .withDetail("responseTime", duration + "ms")
                    .withDetail("service", "firestore")
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}

