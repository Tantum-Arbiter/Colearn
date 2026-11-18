package com.app.service;

import com.app.model.Entitlement;
import com.app.repository.EntitlementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.UnaryOperator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EntitlementServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-25T12:00:00Z");
    private static final long HOUR = 3_600_000L;
    private static final String USER = "user-1";

    private final Map<String, Entitlement> stored = new HashMap<>();
    private final RevenueCatClient revenueCat = mock(RevenueCatClient.class);
    private boolean storeFails;
    private EntitlementService underTest;

    private final EntitlementRepository repository = new EntitlementRepository() {
        @Override
        public CompletableFuture<Optional<Entitlement>> find(String userId) {
            return CompletableFuture.completedFuture(Optional.ofNullable(stored.get(userId)));
        }

        @Override
        public CompletableFuture<Boolean> update(String userId, UnaryOperator<Entitlement> change) {
            if (storeFails) {
                return CompletableFuture.failedFuture(new IllegalStateException("firestore down"));
            }
            Entitlement next = change.apply(stored.get(userId));
            if (next != null) {
                stored.put(userId, next);
            }
            return CompletableFuture.completedFuture(true);
        }
    };

    @BeforeEach
    void setUp() {
        underTest = new EntitlementService(repository, revenueCat, Clock.fixed(NOW, ZoneOffset.UTC), "");
    }

    private long now() {
        return NOW.toEpochMilli();
    }

    private void cached(Tier tier, Long expiresAtMs, long checkedAgoMs) {
        Entitlement entitlement = new Entitlement();
        entitlement.setTier(tier.name().toLowerCase());
        entitlement.setExpiresAtMs(expiresAtMs);
        entitlement.setCheckedAtMs(now() - checkedAgoMs);
        entitlement.setEnvironment("PRODUCTION");
        stored.put(USER, entitlement);
    }

    private void revenueCatSays(Tier tier, Long expiresAtMs) {
        when(revenueCat.lookup(USER)).thenReturn(new RevenueCatClient.Lookup(tier, expiresAtMs, false));
    }

    private void revenueCatIsDown() {
        when(revenueCat.lookup(anyString())).thenThrow(new RevenueCatClient.UnavailableException("timeout", "down"));
    }

    private EntitlementService.Resolution resolve() {
        return underTest.resolve(USER, EntitlementService.PAID_MAX_AGE);
    }

    @Test
    void asksRevenueCatAboutSomeoneItKnowsNothingAbout_andRemembersTheAnswer() {
        revenueCatSays(Tier.PREMIUM, now() + HOUR);

        EntitlementService.Resolution resolution = resolve();

        assertEquals(Tier.PREMIUM, resolution.tier());
        assertEquals("revenuecat", resolution.source());
        Entitlement remembered = stored.get(USER);
        assertEquals("premium", remembered.getTier());
        assertEquals(now() + HOUR, remembered.getExpiresAtMs());
        assertEquals(now(), remembered.getCheckedAtMs());
        assertEquals("PRODUCTION", remembered.getEnvironment());
    }

    @Test
    void remembersASandboxAnswerAsSandbox() {
        when(revenueCat.lookup(USER)).thenReturn(new RevenueCatClient.Lookup(Tier.BASIC, now() + HOUR, true));

        resolve();

        assertEquals("SANDBOX", stored.get(USER).getEnvironment());
    }

    @Test
    void usesARecentPaidAnswerWithoutAsking() {
        cached(Tier.BASIC, now() + HOUR, 6 * 24 * HOUR);

        EntitlementService.Resolution resolution = resolve();

        assertEquals(Tier.BASIC, resolution.tier());
        assertEquals("cache", resolution.source());
        verify(revenueCat, never()).lookup(anyString());
    }

    @Test
    void asksAgainOnceAPaidAnswerIsAWeekOld_toCatchRefunds() {
        cached(Tier.PREMIUM, now() + 10 * 24 * HOUR, 7 * 24 * HOUR + 1);
        revenueCatSays(Tier.FREE, null);

        assertEquals(Tier.FREE, resolve().tier());
    }

    @Test
    void asksAgainOnceAPaidAnswerHasExpired() {
        cached(Tier.PREMIUM, now() - 1, HOUR);
        revenueCatSays(Tier.PREMIUM, now() + 30 * 24 * HOUR);

        EntitlementService.Resolution resolution = resolve();

        assertEquals(Tier.PREMIUM, resolution.tier());
        assertEquals("revenuecat", resolution.source());
    }

    @Test
    void aSavedPaidAnswerEndingThisVeryMomentIsCheckedAgain() {
        cached(Tier.PREMIUM, now(), HOUR);
        revenueCatSays(Tier.PREMIUM, now() + 30 * 24 * HOUR);

        assertEquals("revenuecat", resolve().source());
    }

    @Test
    void aSavedPaidAnswerExactlyAWeekOldIsCheckedAgain() {
        cached(Tier.PREMIUM, now() + 30 * 24 * HOUR, 7 * 24 * HOUR);
        revenueCatSays(Tier.PREMIUM, now() + 30 * 24 * HOUR);

        assertEquals("revenuecat", resolve().source());
    }

    @Test
    void trustsALifetimePurchaseUntilItIsRechecked() {
        cached(Tier.PREMIUM, null, HOUR);

        assertEquals("cache", resolve().source());
    }

    @Test
    void usesAFreeAnswerForHalfAMinute() {
        cached(Tier.FREE, null, 29_000);

        EntitlementService.Resolution resolution = resolve();

        assertEquals(Tier.FREE, resolution.tier());
        assertEquals("cache", resolution.source());
        verify(revenueCat, never()).lookup(anyString());
    }

    @Test
    void asksAgainAfterHalfAMinute_soSomeoneWhoJustSubscribedGetsIn() {
        cached(Tier.FREE, null, 31_000);
        revenueCatSays(Tier.BASIC, now() + HOUR);

        assertEquals(Tier.BASIC, resolve().tier());
    }

    @Test
    void aShorterMaxAgeForcesARecheckOfARecentPaidAnswer() {
        cached(Tier.BASIC, now() + HOUR, 60_000);
        revenueCatSays(Tier.PREMIUM, now() + HOUR);

        EntitlementService.Resolution resolution = underTest.resolve(USER, EntitlementService.UPGRADE_MAX_AGE);

        assertEquals(Tier.PREMIUM, resolution.tier());
    }

    @Test
    void aShorterMaxAgeStillUsesAnAnswerFromTheLastHalfMinute() {
        cached(Tier.BASIC, now() + HOUR, 10_000);

        underTest.resolve(USER, EntitlementService.UPGRADE_MAX_AGE);

        verify(revenueCat, never()).lookup(anyString());
    }

    @Test
    void whenRevenueCatIsDown_anUnexpiredPaidAnswerIsUsedHoweverOld() {
        cached(Tier.PREMIUM, now() + HOUR, 8 * 24 * HOUR);
        revenueCatIsDown();

        EntitlementService.Resolution resolution = resolve();

        assertEquals(Tier.PREMIUM, resolution.tier());
        assertEquals("stale_cache", resolution.source());
    }

    @Test
    void whenRevenueCatIsDown_andNothingIsKnown_theFamilyIsLetIn_countedAsUnverified_neverTurnedFree() {
        revenueCatIsDown();

        EntitlementService.Resolution resolution = resolve();

        assertEquals(Tier.PREMIUM, resolution.tier());
        assertEquals("unverified", resolution.source());
        assertNull(stored.get(USER));
    }

    @Test
    void whenRevenueCatIsDown_anExpiredPaidAnswerDoesNotCount() {
        cached(Tier.PREMIUM, now() - 1, HOUR);
        revenueCatIsDown();

        assertEquals("unverified", resolve().source());
    }



    @Test
    void theAnswerStandsEvenWhenItCannotBeRemembered() {
        storeFails = true;
        revenueCatSays(Tier.BASIC, now() + HOUR);

        assertEquals(Tier.BASIC, resolve().tier());
    }

    @Test
    void theAnswerStandsEvenWhenTheCacheCannotBeRead() {
        EntitlementRepository unreadable = new EntitlementRepository() {
            @Override
            public CompletableFuture<Optional<Entitlement>> find(String userId) {
                return CompletableFuture.failedFuture(new IllegalStateException("firestore down"));
            }

            @Override
            public CompletableFuture<Boolean> update(String userId, UnaryOperator<Entitlement> change) {
                return CompletableFuture.completedFuture(true);
            }
        };
        underTest = new EntitlementService(unreadable, revenueCat, Clock.fixed(NOW, ZoneOffset.UTC), "");
        revenueCatSays(Tier.PREMIUM, now() + HOUR);

        assertEquals(Tier.PREMIUM, resolve().tier());
    }

    @Test
    void anUnreadableCachedTierIsTreatedAsUnknown() {
        cached(Tier.PREMIUM, now() + HOUR, 60_000);
        stored.get(USER).setTier("platinum");
        revenueCatSays(Tier.BASIC, now() + HOUR);

        assertEquals(Tier.BASIC, resolve().tier());
        verify(revenueCat, times(1)).lookup(USER);
    }

    @Test
    void theMaxAgesAreAWeekHalfAMinuteAndTenSeconds() {
        assertEquals(Duration.ofDays(7), EntitlementService.PAID_MAX_AGE);
        assertEquals(Duration.ofSeconds(30), EntitlementService.UPGRADE_MAX_AGE);
        assertEquals(Duration.ofSeconds(30), EntitlementService.FREE_MAX_AGE);
        assertEquals(Duration.ofSeconds(10), EntitlementService.REFRESH_MAX_AGE);
    }

    @Test
    void aRefreshAsksRevenueCatEvenWhenAPaidAnswerIsSaved_soAnUpgradeShowsAtOnce() {
        cached(Tier.BASIC, now() + 20 * 24 * HOUR, 60_000);
        revenueCatSays(Tier.PREMIUM, now() + 30 * 24 * HOUR);

        EntitlementService.Resolution resolution = underTest.refresh(USER);

        assertEquals(Tier.PREMIUM, resolution.tier());
        assertEquals("revenuecat", resolution.source());
        assertEquals("premium", stored.get(USER).getTier());
    }

    @Test
    void aRefreshAsksRevenueCatWhenFreeIsSaved_soANewPurchaseShowsAtOnce() {
        cached(Tier.FREE, null, 11_000);
        revenueCatSays(Tier.BASIC, now() + HOUR);

        assertEquals(Tier.BASIC, underTest.refresh(USER).tier());
    }

    @Test
    void refreshesInQuickSuccessionAskRevenueCatOnlyOnce() {
        cached(Tier.FREE, null, 9_000);

        EntitlementService.Resolution resolution = underTest.refresh(USER);

        assertEquals("cache", resolution.source());
        verify(revenueCat, never()).lookup(anyString());
    }

    @Test
    void aRefreshWhileRevenueCatIsDownFallsBackLikeADownload() {
        cached(Tier.PREMIUM, now() + HOUR, 60_000);
        revenueCatIsDown();

        assertEquals("stale_cache", underTest.refresh(USER).source());
    }

    @Test
    void answersSavedBeforeTheCacheEpochAreIgnored_soABadCopyCanBeThrownAway() {
        underTest = new EntitlementService(repository, revenueCat, Clock.fixed(NOW, ZoneOffset.UTC), NOW.minusSeconds(60).toString());
        cached(Tier.PREMIUM, now() + 10 * 24 * HOUR, 120_000);
        revenueCatSays(Tier.FREE, null);

        EntitlementService.Resolution resolution = resolve();

        assertEquals(Tier.FREE, resolution.tier());
        assertEquals("revenuecat", resolution.source());
    }

    @Test
    void anAnswerSavedBeforeTheEpochIsNotUsedAsAFallback_theFamilyIsLetInUnverifiedInstead() {
        underTest = new EntitlementService(repository, revenueCat, Clock.fixed(NOW, ZoneOffset.UTC), NOW.minusSeconds(60).toString());
        cached(Tier.PREMIUM, now() + 10 * 24 * HOUR, 120_000);
        revenueCatIsDown();

        assertEquals("unverified", resolve().source());
    }

    @Test
    void answersSavedAfterTheEpochAreKept() {
        underTest = new EntitlementService(repository, revenueCat, Clock.fixed(NOW, ZoneOffset.UTC), NOW.minusSeconds(60).toString());
        cached(Tier.PREMIUM, now() + 10 * 24 * HOUR, 30_000);

        assertEquals("cache", resolve().source());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  ", "not a time"})
    void anEmptyOrUnreadableEpochThrowsNothingAway(String epoch) {
        underTest = new EntitlementService(repository, revenueCat, Clock.fixed(NOW, ZoneOffset.UTC), epoch);
        cached(Tier.PREMIUM, now() + 10 * 24 * HOUR, 120_000);

        assertEquals("cache", resolve().source());
    }
}
