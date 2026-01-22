package com.app.config;

import com.app.health.FirestoreHealthIndicator;
import com.app.health.GcsHealthIndicator;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Storage;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import java.util.Collections;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test configuration that provides mock health indicators for tests.
 * The mock Firestore and Storage will return healthy status.
 */
@TestConfiguration
@Profile("test")
public class TestHealthConfig {

    @Bean
    @Primary
    public Firestore testFirestoreMock() {
        Firestore mockFirestore = mock(Firestore.class);
        when(mockFirestore.listCollections()).thenReturn(Collections.emptyList());
        return mockFirestore;
    }

    @Bean
    @Primary
    public Storage testStorageMock() {
        Storage mockStorage = mock(Storage.class);
        Bucket mockBucket = mock(Bucket.class);
        when(mockStorage.get("colearnwithfreya-assets-test")).thenReturn(mockBucket);
        return mockStorage;
    }

    @Bean
    @Primary
    public GcsConfig.GcsProperties testGcsProperties() {
        return new GcsConfig.GcsProperties(
                "colearnwithfreya-assets-test",
                60,
                null,
                null
        );
    }

    @Bean
    @Primary
    public FirestoreHealthIndicator firestoreHealthIndicator(Firestore firestore) {
        return new FirestoreHealthIndicator(firestore);
    }

    @Bean
    @Primary
    public GcsHealthIndicator gcsHealthIndicator(Storage storage, GcsConfig.GcsProperties gcsProperties) {
        return new GcsHealthIndicator(storage, gcsProperties);
    }
}

