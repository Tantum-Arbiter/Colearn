package com.app.service;

import com.app.dto.AnalyticsEventBatchDTO;
import com.app.dto.AnalyticsEventBatchDTO.AnalyticsEvent;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ContentAnalyticsServiceTest {

    private MeterRegistry meterRegistry;
    private ContentAnalyticsService service;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        service = new ContentAnalyticsService(meterRegistry);
    }

    private AnalyticsEventBatchDTO createBatch(String platform, String appVersion, String locale,
                                                List<AnalyticsEvent> events) {
        AnalyticsEventBatchDTO batch = new AnalyticsEventBatchDTO();
        batch.setSessionId("test-session-123");
        batch.setPlatform(platform);
        batch.setAppVersion(appVersion);
        batch.setLocale(locale);
        batch.setEvents(events);
        return batch;
    }

    private AnalyticsEvent createEvent(String name, Map<String, String> properties) {
        AnalyticsEvent event = new AnalyticsEvent();
        event.setEvent(name);
        event.setProperties(properties);
        return event;
    }

    @Test
    @DisplayName("processes valid story events and increments counters")
    void testProcessValidStoryEvents() {
        List<AnalyticsEvent> events = List.of(
            createEvent("story_opened", Map.of("storyId", "abc", "category", "bedtime", "storyType", "musical")),
            createEvent("story_completed", Map.of("storyId", "abc", "durationBucket", "5-10min")),
            createEvent("story_opened", Map.of("storyId", "def", "category", "adventure", "storyType", "interactive"))
        );

        int processed = service.processBatch(createBatch("ios", "1.1.0", "en", events));

        assertEquals(3, processed);
        // story_opened should have been incremented twice
        double storyOpenedCount = meterRegistry.getMeters().stream()
            .filter(m -> m.getId().getName().equals("app.analytics.story_opened"))
            .mapToDouble(m -> ((Counter) m).count())
            .sum();
        assertEquals(2.0, storyOpenedCount);
    }

    @Test
    @DisplayName("rejects unknown event names -prevents cardinality explosion")
    void testRejectUnknownEvents() {
        List<AnalyticsEvent> events = List.of(
            createEvent("story_opened", Map.of("storyId", "abc")),
            createEvent("hacker_event", Map.of("evil", "data")),
            createEvent("story_completed", Map.of("storyId", "abc"))
        );

        int processed = service.processBatch(createBatch("android", "1.0.0", "es", events));

        assertEquals(2, processed); // hacker_event rejected
    }

    @Test
    @DisplayName("strips disallowed property keys -only safe labels pass through")
    void testStripDisallowedProperties() {
        List<AnalyticsEvent> events = List.of(
            createEvent("story_opened", Map.of(
                "storyId", "abc",
                "userId", "should-be-stripped",
                "email", "should-be-stripped",
                "category", "bedtime"
            ))
        );

        int processed = service.processBatch(createBatch("ios", "1.1.0", "en", events));

        assertEquals(1, processed);
        Counter counter = meterRegistry.getMeters().stream()
            .filter(m -> m.getId().getName().equals("app.analytics.story_opened"))
            .map(m -> (Counter) m)
            .findFirst().orElseThrow();
        // Should have storyId and category but NOT userId or email
        assertNotNull(counter.getId().getTag("storyId"));
        assertNotNull(counter.getId().getTag("category"));
        assertNull(counter.getId().getTag("userId"));
        assertNull(counter.getId().getTag("email"));
    }

    @Test
    @DisplayName("handles null and empty batches gracefully")
    void testNullAndEmptyBatches() {
        assertEquals(0, service.processBatch(null));
        assertEquals(0, service.processBatch(createBatch("ios", "1.0", "en", List.of())));
        assertEquals(0, service.processBatch(createBatch("ios", "1.0", "en", null)));
    }

    @Test
    @DisplayName("sanitizes null platform/version/locale to 'unknown'")
    void testSanitizesNullFields() {
        List<AnalyticsEvent> events = List.of(
            createEvent("session_started", null)
        );

        int processed = service.processBatch(createBatch(null, null, null, events));

        assertEquals(1, processed);
        Counter counter = meterRegistry.getMeters().stream()
            .filter(m -> m.getId().getName().equals("app.analytics.session_started"))
            .map(m -> (Counter) m)
            .findFirst().orElseThrow();
        assertEquals("unknown", counter.getId().getTag("platform"));
        assertEquals("unknown", counter.getId().getTag("app_version"));
        assertEquals("unknown", counter.getId().getTag("locale"));
    }

    @Test
    @DisplayName("truncates oversized label values to prevent abuse")
    void testTruncatesLongValues() {
        String longValue = "a".repeat(200);
        List<AnalyticsEvent> events = List.of(
            createEvent("story_opened", Map.of("storyId", longValue))
        );

        int processed = service.processBatch(createBatch("ios", "1.0", "en", events));

        assertEquals(1, processed);
        Counter counter = meterRegistry.getMeters().stream()
            .filter(m -> m.getId().getName().equals("app.analytics.story_opened"))
            .map(m -> (Counter) m)
            .findFirst().orElseThrow();
        assertEquals(64, counter.getId().getTag("storyId").length());
    }

    @Test
    @DisplayName("processes all supported event types")
    void testAllSupportedEventTypes() {
        List<AnalyticsEvent> events = new ArrayList<>();
        for (String eventName : service.getAllowedEvents()) {
            events.add(createEvent(eventName, Map.of()));
        }

        int processed = service.processBatch(createBatch("ios", "1.1.0", "en", events));

        assertEquals(service.getAllowedEvents().size(), processed);
    }

    @Test
    @DisplayName("skips null events in batch without crashing")
    void testSkipsNullEventsInBatch() {
        List<AnalyticsEvent> events = new ArrayList<>();
        events.add(createEvent("story_opened", Map.of("storyId", "abc")));
        events.add(null);
        events.add(createEvent("story_completed", Map.of("storyId", "abc")));

        int processed = service.processBatch(createBatch("ios", "1.0", "en", events));

        assertEquals(2, processed);
    }

    @Test
    @DisplayName("increments batch counter for monitoring ingestion rate")
    void testBatchCounter() {
        service.processBatch(createBatch("ios", "1.0", "en",
            List.of(createEvent("session_started", null))));
        service.processBatch(createBatch("android", "1.0", "en",
            List.of(createEvent("session_started", null))));

        double batchCount = meterRegistry.getMeters().stream()
            .filter(m -> m.getId().getName().equals("app.analytics.batches_processed"))
            .mapToDouble(m -> ((Counter) m).count())
            .sum();
        assertEquals(2.0, batchCount);
    }

    @Test
    @DisplayName("handles conversion events correctly")
    void testConversionEvents() {
        List<AnalyticsEvent> events = List.of(
            createEvent("subscription_overlay_shown", Map.of("trigger", "download_limit")),
            createEvent("subscription_overlay_dismissed", Map.of("trigger", "download_limit")),
            createEvent("download_limit_reached", Map.of()),
            createEvent("share_to_unlock", Map.of("storyId", "share-story"))
        );

        int processed = service.processBatch(createBatch("ios", "1.0", "en", events));

        assertEquals(4, processed);
    }

    @Test
    @DisplayName("handles music and practise events correctly")
    void testMusicEvents() {
        List<AnalyticsEvent> events = List.of(
            createEvent("instrument_selected", Map.of("instrumentId", "flute")),
            createEvent("music_challenge_completed", Map.of("instrumentId", "flute", "storyId", "abc")),
            createEvent("practise_session", Map.of("instrumentId", "recorder", "durationBucket", "3-5min")),
            createEvent("freeplay_session", Map.of("instrumentId", "ocarina", "durationBucket", "1-3min"))
        );

        int processed = service.processBatch(createBatch("android", "1.0", "de", events));

        assertEquals(4, processed);
    }

    @Test
    @DisplayName("case-insensitive event matching")
    void testCaseInsensitiveEvents() {
        List<AnalyticsEvent> events = List.of(
            createEvent("STORY_OPENED", Map.of("storyId", "abc")),
            createEvent("Story_Completed", Map.of("storyId", "abc"))
        );

        int processed = service.processBatch(createBatch("ios", "1.0", "en", events));

        assertEquals(2, processed);
    }

    @Test
    @DisplayName("content events get platform only -no app_version or locale labels")
    void testContentEventsOmitVersionAndLocale() {
        List<AnalyticsEvent> events = List.of(
            createEvent("story_opened", Map.of("storyId", "abc")),
            createEvent("story_completed", Map.of("storyId", "abc", "durationBucket", "3-5min")),
            createEvent("instrument_selected", Map.of("instrumentId", "flute")),
            createEvent("share_to_unlock", Map.of("storyId", "xyz"))
        );

        service.processBatch(createBatch("ios", "2.0.0", "pl", events));

        meterRegistry.getMeters().stream()
            .filter(m -> m.getId().getName().startsWith("app.analytics."))
            .filter(m -> !m.getId().getName().equals("app.analytics.batches_processed"))
            .forEach(m -> {
                String name = m.getId().getName();
                assertEquals("ios", m.getId().getTag("platform"), name + " should have platform");
                assertNull(m.getId().getTag("app_version"), name + " should NOT have app_version");
                assertNull(m.getId().getTag("locale"), name + " should NOT have locale");
            });
    }

    @Test
    @DisplayName("session-level events get full labels: platform + app_version + locale")
    void testSessionEventsGetFullLabels() {
        List<AnalyticsEvent> events = List.of(
            createEvent("session_started", null),
            createEvent("session_ended", Map.of("durationBucket", "10-30min")),
            createEvent("onboarding_step", Map.of("step", "language", "result", "completed")),
            createEvent("onboarding_completed", Map.of()),
            createEvent("subscription_overlay_shown", Map.of("trigger", "download_limit")),
            createEvent("app_error", Map.of("errorType", "network"))
        );

        service.processBatch(createBatch("android", "1.5.0", "de", events));

        meterRegistry.getMeters().stream()
            .filter(m -> m.getId().getName().startsWith("app.analytics."))
            .filter(m -> !m.getId().getName().equals("app.analytics.batches_processed"))
            .forEach(m -> {
                String name = m.getId().getName();
                assertEquals("android", m.getId().getTag("platform"), name + " should have platform");
                assertEquals("1.5.0", m.getId().getTag("app_version"), name + " should have app_version");
                assertEquals("de", m.getId().getTag("locale"), name + " should have locale");
            });
    }

    @Test
    @DisplayName("pagesViewed, lastPage, songIndex are stripped from labels (high cardinality)")
    void testHighCardinalityPropertiesStripped() {
        List<AnalyticsEvent> events = List.of(
            createEvent("story_completed", Map.of(
                "storyId", "abc", "durationBucket", "3-5min",
                "pagesViewed", "12", "lastPage", "8"
            )),
            createEvent("practise_session", Map.of(
                "instrumentId", "flute", "durationBucket", "1-3min",
                "songIndex", "3"
            ))
        );

        service.processBatch(createBatch("ios", "1.0", "en", events));

        meterRegistry.getMeters().stream()
            .filter(m -> m.getId().getName().startsWith("app.analytics."))
            .filter(m -> !m.getId().getName().equals("app.analytics.batches_processed"))
            .forEach(m -> {
                assertNull(m.getId().getTag("pagesViewed"), "pagesViewed should be stripped");
                assertNull(m.getId().getTag("lastPage"), "lastPage should be stripped");
                assertNull(m.getId().getTag("songIndex"), "songIndex should be stripped");
            });
    }

    @Test
    @DisplayName("horizontally scalable -independent instances produce independent counters")
    void testHorizontalScaling() {
        // Simulate two gateway instances with separate registries
        MeterRegistry registry1 = new SimpleMeterRegistry();
        MeterRegistry registry2 = new SimpleMeterRegistry();
        ContentAnalyticsService instance1 = new ContentAnalyticsService(registry1);
        ContentAnalyticsService instance2 = new ContentAnalyticsService(registry2);

        instance1.processBatch(createBatch("ios", "1.0", "en",
            List.of(createEvent("story_opened", Map.of("storyId", "abc")))));
        instance2.processBatch(createBatch("ios", "1.0", "en",
            List.of(
                createEvent("story_opened", Map.of("storyId", "abc")),
                createEvent("story_opened", Map.of("storyId", "abc"))
            )));

        // Each instance has its own counter -Prometheus sums them
        double count1 = registry1.getMeters().stream()
            .filter(m -> m.getId().getName().equals("app.analytics.story_opened"))
            .mapToDouble(m -> ((Counter) m).count()).sum();
        double count2 = registry2.getMeters().stream()
            .filter(m -> m.getId().getName().equals("app.analytics.story_opened"))
            .mapToDouble(m -> ((Counter) m).count()).sum();

        assertEquals(1.0, count1);
        assertEquals(2.0, count2);
        // Prometheus would see sum = 3.0 across instances
    }
}
