package com.app.config;

import com.app.service.ApplicationMetricsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;

@Configuration
public class StartupMetricsConfig implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger logger = LoggerFactory.getLogger(StartupMetricsConfig.class);

    private final ApplicationMetricsService metricsService;
    private final long applicationStartTime;

    public StartupMetricsConfig(ApplicationMetricsService metricsService) {
        this.metricsService = metricsService;
        this.applicationStartTime = System.currentTimeMillis();
    }

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        long startupTimeMs = System.currentTimeMillis() - applicationStartTime;
        metricsService.recordStartupTime(startupTimeMs);
        logger.info("Application startup completed in {}ms", startupTimeMs);
    }
}

