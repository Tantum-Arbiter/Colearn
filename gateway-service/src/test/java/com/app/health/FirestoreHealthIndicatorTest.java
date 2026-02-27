package com.app.health;

import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.Firestore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FirestoreHealthIndicatorTest {

    @Mock
    private Firestore firestore;

    private FirestoreHealthIndicator healthIndicator;

    @BeforeEach
    void setUp() {
        healthIndicator = new FirestoreHealthIndicator(firestore);
    }

    @Test
    void health_WhenFirestoreIsAccessible_ReturnsUp() {
        // Arrange
        when(firestore.listCollections()).thenReturn(Collections.emptyList());

        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsKey("responseTime");
        assertThat(health.getDetails()).containsEntry("service", "firestore");
    }

    @Test
    void health_WhenFirestoreThrowsException_ReturnsDown() {
        // Arrange
        when(firestore.listCollections()).thenThrow(new RuntimeException("Connection failed"));

        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsKey("responseTime");
        assertThat(health.getDetails()).containsEntry("service", "firestore");
        assertThat(health.getDetails()).containsEntry("error", "Connection failed");
    }

    @Test
    void health_WhenFirestoreTimesOut_ReturnsDownWithError() {
        // Arrange
        when(firestore.listCollections()).thenThrow(new RuntimeException("Timeout"));

        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsKey("error");
    }
}

