package com.app.service;

import com.app.dto.AnalyticsEventBatchDTO;
import com.app.dto.AnalyticsEventBatchDTO.AnalyticsEvent;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/**
 * Processes anonymous analytics events into Prometheus counters.
 *
 * Horizontally scalable: each gateway instance maintains its own counters,
 * Prometheus aggregates across instances using sum().
 *
 * No data is persisted -events are converted to counter increments and discarded.
 * Privacy-safe: no PII is accepted, no user-level tracking, no persistent identifiers.
 */
@Service
public class ContentAnalyticsService {

    private static final Logger logger = LoggerFactory.getLogger(ContentAnalyticsService.class);

    private final MeterRegistry meterRegistry;

    /** Allowed event names -reject anything not in this set to prevent cardinality explosion */
    private static final Set<String> ALLOWED_EVENTS = Set.of(
        // Content engagement
        "story_opened", "story_completed", "story_abandoned",
        // Music & instruments
        "music_challenge_completed", "music_challenge_failed",
        "practise_session", "freeplay_session", "instrument_selected",
        // Session lifecycle
        "session_started", "session_ended",
        // Onboarding & conversion
        "onboarding_step", "onboarding_completed", "onboarding_abandoned",
        // Monetization signals
        "subscription_overlay_shown", "subscription_overlay_dismissed",
        "download_limit_reached", "share_to_unlock",
        // Technical health
        "download_started", "download_completed", "download_failed",
        "app_error"
    );

    /**
     * Allowed property keys for Prometheus counter labels.
     *
     * CARDINALITY WARNING: Every unique label combination creates a separate time series.
     * Only include labels with LOW, BOUNDED cardinality here.
     *
     * Excluded (too many unique values → series explosion):
     * - pagesViewed (0–50+ values per story)
     * - lastPage (0–50+ values per story)
     * - songIndex (0–N values per instrument)
     *
     * These are still accepted in the event payload but are NOT promoted to Prometheus labels.
     * If you need per-page or per-song analysis, query the aggregate counters instead
     * (e.g., story_abandoned count by storyId tells you drop-off rate;
     *  you don't need per-page granularity in real-time counters).
     */
    private static final Set<String> ALLOWED_PROPERTY_KEYS = Set.of(
        "storyId", "category", "storyType", "instrumentId",
        "durationBucket", "trigger",
        "step", "result", "errorType", "reason"
    );

    /** Max label value length to prevent cardinality abuse */
    private static final int MAX_LABEL_VALUE_LENGTH = 64;

    public ContentAnalyticsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    /**
     * Session-level events where app_version and locale are useful as labels.
     * These have inherently low cardinality (no storyId/instrumentId).
     */
    private static final Set<String> SESSION_LEVEL_EVENTS = Set.of(
        "session_started", "session_ended",
        "onboarding_step", "onboarding_completed", "onboarding_abandoned",
        "subscription_overlay_shown", "subscription_overlay_dismissed",
        "download_limit_reached", "app_error"
    );

    /**
     * Process a batch of analytics events, incrementing Prometheus counters for each.
     * Returns the number of events successfully processed.
     *
     * CARDINALITY STRATEGY:
     * - Session-level events get platform + app_version + locale labels (low cardinality)
     * - Content-level events (with storyId/instrumentId) get platform only
     *   to avoid series explosion (100 stories × 12 locales × 3 versions = 3,600 per event)
     */
    public int processBatch(AnalyticsEventBatchDTO batch) {
        if (batch == null || batch.getEvents() == null || batch.getEvents().isEmpty()) {
            return 0;
        }

        String platform = sanitize(batch.getPlatform(), "unknown");
        String appVersion = sanitize(batch.getAppVersion(), "unknown");
        String locale = sanitize(batch.getLocale(), "unknown");

        int processed = 0;

        for (AnalyticsEvent event : batch.getEvents()) {
            if (event == null || event.getEvent() == null) {
                continue;
            }

            String eventName = event.getEvent().trim().toLowerCase();
            if (!ALLOWED_EVENTS.contains(eventName)) {
                logger.debug("Rejected unknown analytics event: {}", eventName);
                continue;
            }

            // Session-level events: full labels (low cardinality)
            // Content-level events: platform only (avoids storyId × locale × version explosion)
            Tags tags;
            if (SESSION_LEVEL_EVENTS.contains(eventName)) {
                tags = Tags.of(
                    "platform", platform,
                    "app_version", appVersion,
                    "locale", locale
                );
            } else {
                tags = Tags.of("platform", platform);
            }

            // Add safe property labels
            if (event.getProperties() != null) {
                tags = addPropertyTags(tags, event.getProperties());
            }

            Counter.builder("app.analytics." + eventName)
                    .tags(tags)
                    .description("Analytics: " + eventName)
                    .register(meterRegistry)
                    .increment();

            processed++;
        }

        // Increment batch counter for monitoring ingestion rate
        Counter.builder("app.analytics.batches_processed")
                .tags("platform", platform)
                .register(meterRegistry)
                .increment();

        logger.debug("Processed analytics batch: {}/{} events from {} ({})",
                processed, batch.getEvents().size(), platform, appVersion);

        return processed;
    }

    private Tags addPropertyTags(Tags tags, Map<String, String> properties) {
        for (Map.Entry<String, String> entry : properties.entrySet()) {
            String key = entry.getKey();
            if (!ALLOWED_PROPERTY_KEYS.contains(key)) {
                continue;
            }
            String value = sanitize(entry.getValue(), "unknown");
            if (value.length() > MAX_LABEL_VALUE_LENGTH) {
                value = value.substring(0, MAX_LABEL_VALUE_LENGTH);
            }
            tags = tags.and(key, value);
        }
        return tags;
    }

    private String sanitize(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    /** Returns the set of allowed event names (for testing/documentation) */
    public Set<String> getAllowedEvents() {
        return ALLOWED_EVENTS;
    }
}
