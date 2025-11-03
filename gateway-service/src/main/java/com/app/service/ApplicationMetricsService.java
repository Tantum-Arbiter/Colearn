package com.app.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Service for recording application metrics
 */
@Service
public class ApplicationMetricsService {
    
    private final MeterRegistry meterRegistry;

    @Autowired
    public ApplicationMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    // Firestore metrics methods
    public void recordFirestoreOperation(String collection, String operation, boolean success, long durationMs) {
        Counter.builder("firestore.operations.total")
                .tag("collection", collection)
                .tag("operation", operation)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .increment();

        Timer.builder("firestore.operations.duration")
                .tag("collection", collection)
                .tag("operation", operation)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void recordFirestoreError(String collection, String operation, String errorType) {
        Counter.builder("firestore.errors.total")
                .tag("collection", collection)
                .tag("operation", operation)
                .tag("error_type", errorType)
                .register(meterRegistry)
                .increment();
    }

    public void recordFirestoreConnectionHealth(boolean healthy) {
        Counter.builder("firestore.connections.total")
                .tag("status", healthy ? "healthy" : "unhealthy")
                .register(meterRegistry)
                .increment();
    }

    public void recordFirestoreDocumentCount(String collection, long count) {
        meterRegistry.gauge("firestore.documents.count",
                io.micrometer.core.instrument.Tags.of("collection", collection), count);
    }
    
    public void recordFirestoreQueryPerformance(String collection, String queryType, long durationMs, int resultCount) {
        Timer.builder("firestore.query.duration")
                .description("Firestore query performance")
                .tag("collection", collection)
                .tag("query_type", queryType)
                .tag("result_count_range", getResultCountRange(resultCount))
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);

        Counter.builder("firestore.query.results.total")
                .tag("collection", collection)
                .tag("query_type", queryType)
                .register(meterRegistry)
                .increment(resultCount);
    }

    public void recordFirestoreBatchOperation(String collection, String operation, int batchSize, boolean success, long durationMs) {
        Counter.builder("firestore.operations.total")
                .tag("collection", collection)
                .tag("operation", operation + "_batch")
                .tag("success", String.valueOf(success))
                .tag("batch_size_range", getBatchSizeRange(batchSize))
                .register(meterRegistry)
                .increment();

        Timer.builder("firestore.operations.duration")
                .tag("collection", collection)
                .tag("operation", operation + "_batch")
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }

    // Bulk data metrics methods
    public void recordBulkDataRequest(String dataType, int itemCount, long processingTimeMs) {
        Counter.builder("bulk.data.requests.total")
                .tag("data_type", dataType)
                .tag("item_count_range", getItemCountRange(itemCount))
                .register(meterRegistry)
                .increment();

        Timer.builder("bulk.data.processing.duration")
                .tag("data_type", dataType)
                .register(meterRegistry)
                .record(processingTimeMs, TimeUnit.MILLISECONDS);

        Counter.builder("bulk.data.items.total")
                .tag("data_type", dataType)
                .register(meterRegistry)
                .increment(itemCount);
    }

    public void recordBulkDataError(String dataType, String errorType) {
        Counter.builder("bulk.data.errors.total")
                .tag("data_type", dataType)
                .tag("error_type", errorType)
                .register(meterRegistry)
                .increment();
    }

    public void recordBulkDataCompressionRatio(String dataType, int compressionRatio) {
        meterRegistry.gauge("bulk.data.compression.ratio",
                io.micrometer.core.instrument.Tags.of("data_type", dataType), compressionRatio);
    }
    
    // Story metrics methods
    public void recordStoryOperation(String operation, boolean success) {
        Counter.builder("story.operations.total")
                .tag("operation", operation)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .increment();
    }

    public void recordStoryDownload(String storyId, String category) {
        Counter.builder("story.downloads.total")
                .tag("story_id", storyId)
                .tag("category", category)
                .register(meterRegistry)
                .increment();
    }

    public void recordStoryQuery(String queryType, long durationMs, int resultCount) {
        Timer.builder("story.queries.duration")
                .tag("query_type", queryType)
                .tag("result_count_range", getResultCountRange(resultCount))
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }

    public void recordStoryRating(String storyId, double rating) {
        meterRegistry.gauge("story.rating.current",
                io.micrometer.core.instrument.Tags.of("story_id", storyId), rating);
    }
    
    // Helper methods for categorizing metrics
    private String getResultCountRange(int count) {
        if (count == 0) return "0";
        if (count <= 10) return "1-10";
        if (count <= 50) return "11-50";
        if (count <= 100) return "51-100";
        if (count <= 500) return "101-500";
        return "500+";
    }
    
    private String getBatchSizeRange(int size) {
        if (size <= 10) return "1-10";
        if (size <= 50) return "11-50";
        if (size <= 100) return "51-100";
        return "100+";
    }
    
    private String getItemCountRange(int count) {
        if (count == 0) return "0";
        if (count <= 100) return "1-100";
        if (count <= 500) return "101-500";
        if (count <= 1000) return "501-1000";
        return "1000+";
    }
    
    // General metrics methods
    public void recordCustomMetric(String metricName, String... tags) {
        meterRegistry.counter(metricName, tags).increment();
    }
    
    public void recordCustomTimer(String metricName, long durationMs, String... tags) {
        Timer.builder(metricName)
                .tags(tags)
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }
    
    public void recordCustomGauge(String metricName, double value, String... tags) {
        meterRegistry.gauge(metricName, 
                io.micrometer.core.instrument.Tags.of(tags), value);
    }
}
