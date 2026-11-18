package com.app.service;

import com.app.model.Entitlement;
import com.app.model.Story;
import com.app.repository.DownloadRepository;
import com.app.repository.EntitlementRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.UnaryOperator;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EntitlementInvariantsTest {

    private static final Instant NOW = Instant.parse("2026-09-25T12:00:00Z");
    private static final long DAY = 86_400_000L;

    enum Failure { NONE, REVENUECAT_DOWN, REVENUECAT_KEY_REJECTED, SNAPSHOT_UNREADABLE, SNAPSHOT_UNWRITABLE, DOWNLOADS_UNREADABLE, EVERYTHING }

    private record World(DownloadAccessService access, EntitlementService entitlements) {
    }

    private static World world(Failure failure, Entitlement snapshot, Tier revenueCatSays) {
        boolean revenueCatDown = failure == Failure.REVENUECAT_DOWN || failure == Failure.REVENUECAT_KEY_REJECTED || failure == Failure.EVERYTHING;
        boolean snapshotUnreadable = failure == Failure.SNAPSHOT_UNREADABLE || failure == Failure.EVERYTHING;
        boolean snapshotUnwritable = failure == Failure.SNAPSHOT_UNWRITABLE || failure == Failure.EVERYTHING;
        boolean downloadsUnreadable = failure == Failure.DOWNLOADS_UNREADABLE || failure == Failure.EVERYTHING;

        EntitlementRepository snapshots = new EntitlementRepository() {
            @Override
            public CompletableFuture<Optional<Entitlement>> find(String userId) {
                return snapshotUnreadable ? CompletableFuture.failedFuture(new IllegalStateException("down"))
                        : CompletableFuture.completedFuture(Optional.ofNullable(snapshot));
            }

            @Override
            public CompletableFuture<Boolean> update(String userId, UnaryOperator<Entitlement> change) {
                return snapshotUnwritable ? CompletableFuture.failedFuture(new IllegalStateException("down"))
                        : CompletableFuture.completedFuture(true);
            }
        };
        DownloadRepository downloads = new DownloadRepository() {
            private <T> CompletableFuture<T> maybe(T value) {
                return downloadsUnreadable ? CompletableFuture.failedFuture(new IllegalStateException("down")) : CompletableFuture.completedFuture(value);
            }

            @Override public CompletableFuture<Boolean> has(String u, String s) { return maybe(false); }
            @Override public CompletableFuture<Long> count(String u) { return maybe(3L); }
            @Override public CompletableFuture<Void> record(String u, String s) { return maybe(null); }
            @Override public CompletableFuture<Void> release(String u, String s) { return maybe(null); }
            @Override public CompletableFuture<List<String>> list(String u) { return maybe(List.of()); }
            @Override public CompletableFuture<Integer> deleteAll(String u) { return maybe(0); }
        };
        RevenueCatClient revenueCat = mock(RevenueCatClient.class);
        if (revenueCatDown) {
            String outcome = failure == Failure.REVENUECAT_KEY_REJECTED ? "unauthorized" : "timeout";
            when(revenueCat.lookup(anyString())).thenThrow(new RevenueCatClient.UnavailableException(outcome, "down"));
        } else {
            when(revenueCat.lookup(anyString())).thenReturn(new RevenueCatClient.Lookup(revenueCatSays, revenueCatSays.isPaid() ? NOW.toEpochMilli() + 20 * DAY : null, false));
        }
        EntitlementService entitlements = new EntitlementService(snapshots, revenueCat, Clock.fixed(NOW, ZoneOffset.UTC), "");
        return new World(new DownloadAccessService(entitlements, downloads), entitlements);
    }

    private static Entitlement snapshot(Tier tier, long expiresInMs, long checkedAgoMs) {
        Entitlement entitlement = new Entitlement();
        entitlement.setTier(tier.name().toLowerCase());
        entitlement.setExpiresAtMs(NOW.toEpochMilli() + expiresInMs);
        entitlement.setCheckedAtMs(NOW.toEpochMilli() - checkedAgoMs);
        return entitlement;
    }

    private static Story paidStory() {
        Story story = new Story();
        story.setId("paid-story");
        story.setPremium(true);
        return story;
    }

    static Stream<Arguments> verifiedPayersAndFailures() {
        return Stream.of(Failure.values()).flatMap(failure -> Stream.of(
                Arguments.of(failure, "premium verified yesterday", snapshot(Tier.PREMIUM, 10 * DAY, DAY)),
                Arguments.of(failure, "basic verified a fortnight ago, still in its paid period", snapshot(Tier.BASIC, 3 * DAY, 14 * DAY)),
                Arguments.of(failure, "premium whose period ended an hour ago", snapshot(Tier.PREMIUM, -3_600_000L, 20 * DAY))));
    }

    @ParameterizedTest(name = "{1}, when {0}")
    @MethodSource("verifiedPayersAndFailures")
    void aPayingFamilyNeverLosesAccessBecauseVerificationFailed(Failure failure, String who, Entitlement snapshot) {
        World world = world(failure, snapshot, Tier.PREMIUM);

        assertEquals(DownloadAccessService.Decision.ALLOWED, world.access().check("u", paidStory()).decision(), who + " / " + failure);
    }

    static Stream<Arguments> unknownFamiliesAndFailures() {
        return Stream.of(Failure.REVENUECAT_DOWN, Failure.REVENUECAT_KEY_REJECTED, Failure.EVERYTHING).map(Arguments::of);
    }

    @ParameterizedTest(name = "when {0}")
    @MethodSource("unknownFamiliesAndFailures")
    void notBeingAbleToCheckIsNeverTreatedAsAVerifiedLackOfSubscription(Failure failure) {
        World world = world(failure, null, Tier.FREE);

        DownloadAccessService.Check check = world.access().check("u", paidStory());

        assertEquals(DownloadAccessService.Decision.ALLOWED, check.decision());
        assertEquals("unverified", check.source());
    }

    static Stream<Arguments> verifiedFreeFamilies() {
        return Stream.of(
                Arguments.of("never subscribed", null),
                Arguments.of("lapsed", snapshot(Tier.PREMIUM, -DAY, 30 * DAY)),
                Arguments.of("refunded, found at the weekly check", snapshot(Tier.PREMIUM, 20 * DAY, 8 * DAY)));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("verifiedFreeFamilies")
    void aFamilyRevenueCatSaysIsFreeIsRefusedAPaidStory(String who, Entitlement snapshot) {
        World world = world(Failure.NONE, snapshot, Tier.FREE);

        assertEquals(DownloadAccessService.Decision.SUBSCRIPTION_REQUIRED, world.access().check("u", paidStory()).decision(), who);
    }
}
