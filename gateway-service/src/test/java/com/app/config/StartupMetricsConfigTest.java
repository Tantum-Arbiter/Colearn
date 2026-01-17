package com.app.config;

import com.app.service.ApplicationMetricsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.context.event.ApplicationReadyEvent;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StartupMetricsConfigTest {

    @Mock
    private ApplicationMetricsService mockMetricsService;

    @Mock
    private ApplicationReadyEvent mockEvent;

    @Test
    void testOnApplicationEvent_RecordsStartupTime() {
        // Given - create config and immediately trigger event
        StartupMetricsConfig startupMetricsConfig = new StartupMetricsConfig(mockMetricsService);

        // When
        startupMetricsConfig.onApplicationEvent(mockEvent);

        // Then - verify startup time was recorded (should be very small since no delay)
        ArgumentCaptor<Long> timeCaptor = ArgumentCaptor.forClass(Long.class);
        verify(mockMetricsService).recordStartupTime(timeCaptor.capture());

        long recordedTime = timeCaptor.getValue();
        assertTrue(recordedTime >= 0, "Startup time should be non-negative");
        assertTrue(recordedTime < 1000, "Startup time should be less than 1 second for immediate event");
    }

    @Test
    void testOnApplicationEvent_RecordsPositiveStartupTime() throws InterruptedException {
        // Given - create config with a small delay before event
        StartupMetricsConfig startupMetricsConfig = new StartupMetricsConfig(mockMetricsService);

        // Simulate some startup time
        Thread.sleep(50);

        // When
        startupMetricsConfig.onApplicationEvent(mockEvent);

        // Then - verify startup time was recorded and is at least 50ms
        ArgumentCaptor<Long> timeCaptor = ArgumentCaptor.forClass(Long.class);
        verify(mockMetricsService).recordStartupTime(timeCaptor.capture());

        long recordedTime = timeCaptor.getValue();
        assertTrue(recordedTime >= 50, "Startup time should be at least 50ms");
    }

    @Test
    void testOnApplicationEvent_CalledOnce() {
        // Given
        StartupMetricsConfig startupMetricsConfig = new StartupMetricsConfig(mockMetricsService);

        // When
        startupMetricsConfig.onApplicationEvent(mockEvent);

        // Then
        verify(mockMetricsService, times(1)).recordStartupTime(anyLong());
    }

    @Test
    void testOnApplicationEvent_MultipleEvents() {
        // Given
        StartupMetricsConfig startupMetricsConfig = new StartupMetricsConfig(mockMetricsService);

        // When - multiple events (edge case)
        startupMetricsConfig.onApplicationEvent(mockEvent);
        startupMetricsConfig.onApplicationEvent(mockEvent);

        // Then - each event triggers a metric recording
        verify(mockMetricsService, times(2)).recordStartupTime(anyLong());
    }
}

