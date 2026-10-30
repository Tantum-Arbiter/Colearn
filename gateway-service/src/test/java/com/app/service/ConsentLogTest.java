package com.app.service;

import com.app.model.Consent;
import com.app.model.ConsentLogEntry;
import com.app.model.User;
import com.app.repository.ConsentLogRepository;
import com.google.cloud.Timestamp;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;


class ConsentLogTest {

    private static final Instant NOW = Instant.parse("2026-09-24T12:00:00Z");

    private final List<ConsentLogEntry> written = new ArrayList<>();
    private int writes;
    private ConsentLog underTest;

    private final ConsentLogRepository repository = entries -> {
        writes++;
        written.addAll(entries);
        return CompletableFuture.completedFuture(null);
    };

    @BeforeEach
    void setUp() {
        underTest = new ConsentLog(repository, Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofDays(1095));
    }

    private static User user(String provider, String providerId) {
        return new User("user-1", provider, providerId);
    }

    private static Consent consent(String version, Instant acceptedAt) {
        Consent consent = new Consent();
        consent.setPolicyVersion(version);
        consent.setScope("core");
        consent.setAcceptedAt(Timestamp.ofTimeSecondsAndNanos(acceptedAt.getEpochSecond(), 0));
        consent.setRecordedAt(Timestamp.ofTimeSecondsAndNanos(acceptedAt.getEpochSecond() + 5, 0));
        consent.setAppVersion("1.4.0");
        return consent;
    }

    private static String sha256(String text) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void keepsWhatWasAgreedAndWhen() {
        underTest.preserve(user("google", "sub-1"), List.of(consent("1.0", Instant.parse("2026-01-02T03:04:05Z")))).join();

        ConsentLogEntry entry = written.get(0);
        assertEquals("1.0", entry.getPolicyVersion());
        assertEquals("core", entry.getScope());
        assertEquals(Instant.parse("2026-01-02T03:04:05Z").getEpochSecond(), entry.getAcceptedAt().getSeconds());
        assertEquals(Instant.parse("2026-01-02T03:04:10Z").getEpochSecond(), entry.getRecordedAt().getSeconds());
        assertEquals("1.4.0", entry.getAppVersion());
    }

    @Test
    void keepsOneEntryPerConsent() {
        underTest.preserve(user("google", "sub-1"), List.of(consent("1.0", NOW), consent("1.1", NOW))).join();

        assertEquals(2, written.size());
    }

    @Test
    void namesNoOne_butCanBeMatchedToTheSignInThatGaveIt() throws Exception {
        underTest.preserve(user("google", "sub-1"), List.of(consent("1.0", NOW))).join();

        ConsentLogEntry entry = written.get(0);
        assertEquals(sha256("google:sub-1"), entry.getSubjectRef());
        assertFalse(entry.getSubjectRef().contains("sub-1"));
    }

    @Test
    void tellsTwoSignInsApart() {
        underTest.preserve(user("google", "sub-1"), List.of(consent("1.0", NOW))).join();
        underTest.preserve(user("apple", "sub-1"), List.of(consent("1.0", NOW))).join();

        assertNotEquals(written.get(0).getSubjectRef(), written.get(1).getSubjectRef());
    }

    @Test
    void recordsWhenTheAccountWasDeleted_andWhenTheEntryIsToGo() {
        underTest.preserve(user("google", "sub-1"), List.of(consent("1.0", NOW))).join();

        ConsentLogEntry entry = written.get(0);
        assertEquals(NOW.getEpochSecond(), entry.getAccountDeletedAt().getSeconds());
        assertEquals(NOW.plus(Duration.ofDays(1095)).getEpochSecond(), entry.getExpiresAt().getSeconds());
    }

    @Test
    void writesNothingForAnAccountThatNeverConsented() {
        underTest.preserve(user("google", "sub-1"), List.of()).join();

        assertEquals(0, writes);
    }
}
