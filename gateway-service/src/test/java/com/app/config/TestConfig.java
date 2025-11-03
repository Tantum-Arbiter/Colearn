package com.app.config;

import com.app.service.ApplicationMetricsService;
import com.app.service.BulkDataService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import static org.mockito.Mockito.mock;

@TestConfiguration
public class TestConfig {
    
    @Bean
    @Primary
    public MeterRegistry meterRegistry() {
        return new SimpleMeterRegistry();
    }
    
    @Bean
    @Primary
    public ApplicationMetricsService applicationMetricsService() {
        return mock(ApplicationMetricsService.class);
    }
    
    @Bean
    @Primary
    public BulkDataService bulkDataService() {
        return mock(BulkDataService.class);
    }
}
