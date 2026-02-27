package com.app.health;

import com.app.config.GcsConfig.GcsProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.HttpURLConnection;
import java.net.URL;

@Component("gcsHealth")
@Lazy
@ConditionalOnBean(GcsProperties.class)
@Profile("!test")
public class GcsHealthIndicator implements HealthIndicator {

    private static final Logger logger = LoggerFactory.getLogger(GcsHealthIndicator.class);
    private static final int TIMEOUT_MS = 5000;
    private static final String GCS_BASE_URL = "https://storage.googleapis.com/";

    private final GcsProperties gcsProperties;

    public GcsHealthIndicator(GcsProperties gcsProperties) {
        this.gcsProperties = gcsProperties;
    }

    @Override
    public Health health() {
        long startTime = System.currentTimeMillis();
        String bucketName = gcsProperties.bucketName();
        String gcsUrl = GCS_BASE_URL + bucketName;

        try {
            URL url = new URL(gcsUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("HEAD");
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);

            int statusCode = connection.getResponseCode();
            long duration = System.currentTimeMillis() - startTime;
            connection.disconnect();

            logger.debug("GCS health check passed for bucket '{}' with status {} in {}ms",
                    bucketName, statusCode, duration);

            return Health.up()
                    .withDetail("responseTime", duration + "ms")
                    .withDetail("service", "gcs")
                    .withDetail("bucket", bucketName)
                    .withDetail("statusCode", statusCode)
                    .build();

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.warn("GCS health check failed for bucket '{}' after {}ms: {}",
                    bucketName, duration, e.getMessage());

            return Health.down()
                    .withDetail("responseTime", duration + "ms")
                    .withDetail("service", "gcs")
                    .withDetail("bucket", bucketName)
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}

