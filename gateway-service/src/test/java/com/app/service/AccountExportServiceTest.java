package com.app.service;

import com.app.dto.ChildDocument;
import com.app.model.Child;
import com.app.model.Consent;
import com.app.model.User;
import com.app.model.UserProfile;
import com.app.repository.ChildRepository;
import com.app.repository.ConsentRepository;
import com.app.repository.UserProfileRepository;
import com.app.repository.UserRepository;
import com.google.cloud.Timestamp;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AccountExportServiceTest {

    private static final String USER = "user-1";

    private final UserRepository users = mock(UserRepository.class);
    private final UserProfileRepository profiles = mock(UserProfileRepository.class);
    private final ChildRepository children = mock(ChildRepository.class);
    private final ConsentRepository consents = mock(ConsentRepository.class);
    private final com.app.repository.DownloadRepository downloads = mock(com.app.repository.DownloadRepository.class);
    private final com.app.repository.EntitlementRepository entitlements = mock(com.app.repository.EntitlementRepository.class);
    private AccountExportService underTest;

    @BeforeEach
    void setUp() {
        underTest = new AccountExportService(users, profiles, children, consents, downloads, entitlements);
        when(downloads.list(USER)).thenReturn(CompletableFuture.completedFuture(List.of()));
        when(entitlements.find(USER)).thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        User user = new User(USER, "google", "google-sub-123");
        user.setCreatedAt(Instant.parse("2026-01-02T03:04:05Z"));
        when(users.findById(USER)).thenReturn(CompletableFuture.completedFuture(Optional.of(user)));
        when(profiles.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(children.findAll(USER)).thenReturn(CompletableFuture.completedFuture(List.of()));
        when(consents.findAll(USER)).thenReturn(CompletableFuture.completedFuture(List.of()));
    }

    @Test
    void includesTheAccountAndItsSignInIdentity() {
        Map<String, Object> export = underTest.export(USER);

        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) export.get("account");
        assertEquals(USER, account.get("id"));
        assertEquals("google", account.get("provider"));
        assertEquals("google-sub-123", account.get("providerId"));
        assertEquals("2026-01-02T03:04:05Z", account.get("createdAt"));
    }

    @Test
    void includesEveryChildAsTheAppSeesIt() {
        Child child = new Child();
        child.setChildId("main");
        child.setNickname("Freya");
        child.setFinishedStoryIds(List.of("snowy"));
        when(children.findAll(USER)).thenReturn(CompletableFuture.completedFuture(List.of(child)));

        @SuppressWarnings("unchecked")
        List<ChildDocument> exported = (List<ChildDocument>) underTest.export(USER).get("children");

        assertEquals("Freya", exported.get(0).nickname());
        assertEquals(List.of("snowy"), exported.get(0).finishedStoryIds());
    }

    @Test
    void includesEveryConsentWithItsTimes() {
        Consent consent = new Consent();
        consent.setPolicyVersion("1.0");
        consent.setScope("core");
        consent.setAcceptedAt(Timestamp.ofTimeSecondsAndNanos(Instant.parse("2026-09-01T10:00:00Z").getEpochSecond(), 0));
        consent.setRecordedAt(Timestamp.ofTimeSecondsAndNanos(Instant.parse("2026-09-01T10:00:05Z").getEpochSecond(), 0));
        when(consents.findAll(USER)).thenReturn(CompletableFuture.completedFuture(List.of(consent)));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> exported = (List<Map<String, Object>>) underTest.export(USER).get("consents");

        assertEquals("core", exported.get(0).get("scope"));
        assertEquals("2026-09-01T10:00:00Z", exported.get(0).get("acceptedAt"));
        assertEquals("2026-09-01T10:00:05Z", exported.get(0).get("recordedAt"));
    }

    @Test
    void includesTheOlderProfileWhileItStillExists() {
        UserProfile profile = new UserProfile(USER);
        profile.setNickname("Freya");
        when(profiles.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.of(profile)));

        @SuppressWarnings("unchecked")
        Map<String, Object> exported = (Map<String, Object>) underTest.export(USER).get("profile");

        assertEquals("Freya", exported.get("nickname"));
    }

    @Test
    void hasNoProfileWhenThereIsNone() {
        assertNull(underTest.export(USER).get("profile"));
    }

    @Test
    void neverIncludesSessionTokens() {
        Map<String, Object> export = underTest.export(USER);

        assertFalse(export.toString().toLowerCase().contains("token"));
        assertFalse(export.containsKey("sessions"));
    }

    @Test
    void saysWhenItWasMade() {
        Instant before = Instant.now();

        Instant made = Instant.parse((String) underTest.export(USER).get("exportedAt"));

        assertFalse(made.isBefore(before.minusSeconds(1)));
    }

    @Test
    void includesTheSubscriptionTheGatewayHoldsAndTheStoriesOnTheFamilysDevices() {
        com.app.model.Entitlement entitlement = new com.app.model.Entitlement();
        entitlement.setTier("premium");
        entitlement.setExpiresAtMs(1790000000000L);
        entitlement.setEnvironment("SANDBOX");
        when(entitlements.find(USER)).thenReturn(CompletableFuture.completedFuture(Optional.of(entitlement)));
        when(downloads.list(USER)).thenReturn(CompletableFuture.completedFuture(List.of("snowy", "wombat")));

        Map<String, Object> export = underTest.export(USER);

        @SuppressWarnings("unchecked")
        Map<String, Object> subscription = (Map<String, Object>) export.get("subscription");
        assertEquals("premium", subscription.get("tier"));
        assertEquals(Instant.ofEpochMilli(1790000000000L).toString(), subscription.get("expiresAt"));
        assertEquals(List.of("snowy", "wombat"), export.get("downloadedStories"));
    }

    @Test
    void hasNoSubscriptionWhenNoneWasBought() {
        assertNull(underTest.export(USER).get("subscription"));
    }
}
