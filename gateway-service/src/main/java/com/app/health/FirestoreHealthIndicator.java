package com.app.health;

import com.google.cloud.firestore.Firestore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component("firestoreHealth")
@Lazy
@ConditionalOnBean(Firestore.class)
@Profile("!test")
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

