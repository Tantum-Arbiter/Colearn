package com.app.config;

import com.app.service.ApplicationMetricsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;

/**
 * Configuration to record application startup metrics.
 * Listens for ApplicationReadyEvent to capture the total startup time.
 */
@Configuration
public class StartupMetricsConfig implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger logger = LoggerFactory.getLogger(StartupMetricsConfig.class);

    private final ApplicationMetricsService metricsService;
    private final long applicationStartTime;

    public StartupMetricsConfig(ApplicationMetricsService metricsService) {
        this.metricsService = metricsService;
        // Record when this bean is created (early in startup)
        this.applicationStartTime = System.currentTimeMillis();
    }

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        // Calculate startup time from when this config was created to when application is ready
        long startupTimeMs = System.currentTimeMillis() - applicationStartTime;

        // Record the startup time metric
        metricsService.recordStartupTime(startupTimeMs);

        logger.info("Application startup completed in {}ms", startupTimeMs);
    }
}

