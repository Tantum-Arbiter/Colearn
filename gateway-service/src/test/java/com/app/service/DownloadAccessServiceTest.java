package com.app.service;

import com.app.model.Story;
import com.app.repository.DownloadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DownloadAccessServiceTest {

    private final Set<String> held = new HashSet<>();
    private boolean downloadsUnreadable;
    private EntitlementService entitlements;
    private DownloadAccessService underTest;

    private final DownloadRepository downloads = new DownloadRepository() {
        @Override
        public CompletableFuture<Boolean> has(String userId, String storyId) {
            if (downloadsUnreadable) {
                return CompletableFuture.failedFuture(new IllegalStateException("firestore down"));
            }
            return CompletableFuture.completedFuture(held.contains(storyId));
        }

        @Override
        public CompletableFuture<Long> count(String userId) {
            if (downloadsUnreadable) {
                return CompletableFuture.failedFuture(new IllegalStateException("firestore down"));
            }
            return CompletableFuture.completedFuture((long) held.size());
        }

        @Override
        public CompletableFuture<Void> record(String userId, String storyId) {
            held.add(storyId);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletableFuture<Void> release(String userId, String storyId) {
            held.remove(storyId);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletableFuture<List<String>> list(String userId) {
            return CompletableFuture.completedFuture(List.copyOf(held));
        }

        @Override
        public CompletableFuture<Integer> deleteAll(String userId) {
            int n = held.size();
            held.clear();
            return CompletableFuture.completedFuture(n);
        }
    };

    @BeforeEach
    void setUp() {
        entitlements = mock(EntitlementService.class);
        underTest = new DownloadAccessService(entitlements, downloads);
    }

    private void tier(Tier tier, String source) {
        when(entitlements.resolve(anyString(), eq(EntitlementService.PAID_MAX_AGE)))
                .thenReturn(new EntitlementService.Resolution(tier, source));
    }

    private static Story story(String id, boolean free, boolean premium, boolean referral) {
        Story story = new Story();
        story.setId(id);
        story.setFree(free);
        story.setPremium(premium);
        story.setReferralReward(referral);
        return story;
    }

    private static Story paid(String id) {
        return story(id, false, true, false);
    }

    private static Story free(String id) {
        return story(id, true, false, false);
    }

    private void hold(int n) {
        for (int i = 0; i < n; i++) {
            held.add("held-" + i);
        }
    }

    @Test
    void aFreeStoryIsForEveryone_withoutAskingAboutTheSubscription() {
        DownloadAccessService.Check check = underTest.check("u", free("s"));

        assertEquals(DownloadAccessService.Decision.ALLOWED, check.decision());
        assertEquals("free_story", check.source());
        verify(entitlements, never()).resolve(anyString(), any());
    }

    @Test
    void aReferralRewardIsLeftToTheApp_whichHoldsTheReferral() {
        DownloadAccessService.Check check = underTest.check("u", story("s", false, false, true));

        assertEquals(DownloadAccessService.Decision.ALLOWED, check.decision());
        assertEquals("referral", check.source());
        verify(entitlements, never()).resolve(anyString(), any());
    }

    @Test
    void pastTheFreeLimit_aFreeStoryNeedsTheTierToKnowTheLimit() {
        hold(2);
        tier(Tier.BASIC, "revenuecat");

        DownloadAccessService.Check check = underTest.check("u", free("new"));

        assertEquals(DownloadAccessService.Decision.ALLOWED, check.decision());
        assertEquals("revenuecat", check.source());
    }

    @Test
    void pastTheFreeLimit_aFreeStoryIsRefusedToAFreeFamily() {
        hold(2);
        tier(Tier.FREE, "revenuecat");

        assertEquals(DownloadAccessService.Decision.LIMIT_REACHED, underTest.check("u", free("new")).decision());
    }

    @ParameterizedTest
    @CsvSource({"FREE,SUBSCRIPTION_REQUIRED", "BASIC,ALLOWED", "PREMIUM,ALLOWED"})
    void aPaidStoryNeedsASubscription(Tier tier, DownloadAccessService.Decision decision) {
        tier(tier, "revenuecat");

        assertEquals(decision, underTest.check("u", paid("s")).decision());
        assertEquals(decision, underTest.check("u", story("t", false, false, false)).decision());
    }

    @Test
    void saysWhereTheTierCameFrom() {
        tier(Tier.PREMIUM, "unverified");

        assertEquals("unverified", underTest.check("u", paid("s")).source());
    }

    @ParameterizedTest
    @CsvSource({"BASIC,50", "PREMIUM,125"})
    void holdsEachPaidTierToItsLimit(Tier tier, int limit) {
        tier(tier, "revenuecat");
        hold(limit - 1);
        assertEquals(DownloadAccessService.Decision.ALLOWED, underTest.check("u", paid("new")).decision());

        hold(limit);

        assertEquals(DownloadAccessService.Decision.LIMIT_REACHED, underTest.check("u", paid("new")).decision());
    }

    @Test
    void aStoryAlreadyHeldCanBeFetchedAgain() {
        tier(Tier.BASIC, "revenuecat");
        hold(50);
        held.add("again");

        assertEquals(DownloadAccessService.Decision.ALLOWED, underTest.check("u", paid("again")).decision());
    }

    @Test
    void aLapsedFamilyCannotFetchAPaidStoryAgainEvenIfTheyHeldIt() {
        tier(Tier.FREE, "revenuecat");
        held.add("again");

        assertEquals(DownloadAccessService.Decision.SUBSCRIPTION_REQUIRED, underTest.check("u", paid("again")).decision());
    }

    @Test
    void atTheBasicLimit_aRememberedBasicTierIsRecheckedInCaseTheyUpgraded() {
        tier(Tier.BASIC, "cache");
        when(entitlements.resolve("u", EntitlementService.UPGRADE_MAX_AGE))
                .thenReturn(new EntitlementService.Resolution(Tier.PREMIUM, "revenuecat"));
        hold(50);

        DownloadAccessService.Check check = underTest.check("u", paid("new"));

        assertEquals(DownloadAccessService.Decision.ALLOWED, check.decision());
        assertEquals("revenuecat", check.source());
    }

    @Test
    void atTheBasicLimit_aFreshBasicAnswerIsNotRecheckedAgain() {
        tier(Tier.BASIC, "revenuecat");
        hold(50);

        assertEquals(DownloadAccessService.Decision.LIMIT_REACHED, underTest.check("u", paid("new")).decision());
        verify(entitlements, never()).resolve("u", EntitlementService.UPGRADE_MAX_AGE);
    }

    @Test
    void atThePremiumLimit_thereIsNothingToUpgradeTo() {
        tier(Tier.PREMIUM, "cache");
        hold(125);

        assertEquals(DownloadAccessService.Decision.LIMIT_REACHED, underTest.check("u", paid("new")).decision());
        verify(entitlements, never()).resolve("u", EntitlementService.UPGRADE_MAX_AGE);
    }

    @Test
    void whenTheHeldStoriesCannotBeRead_aSubscriberIsLetIn_countedAsUnverified() {
        downloadsUnreadable = true;
        tier(Tier.BASIC, "cache");

        DownloadAccessService.Check check = underTest.check("u", paid("s"));

        assertEquals(DownloadAccessService.Decision.ALLOWED, check.decision());
        assertEquals("unverified", check.source());
    }

    @Test
    void whenTheHeldStoriesCannotBeRead_aFreeStoryIsStillForEveryone() {
        downloadsUnreadable = true;

        DownloadAccessService.Check check = underTest.check("u", free("s"));

        assertEquals(DownloadAccessService.Decision.ALLOWED, check.decision());
        assertEquals("unverified", check.source());
        verify(entitlements, never()).resolve(anyString(), any());
    }

    @Test
    void whenTheHeldStoriesCannotBeRead_aFamilyWithoutASubscriptionIsStillRefusedAPaidStory() {
        downloadsUnreadable = true;
        tier(Tier.FREE, "revenuecat");

        assertEquals(DownloadAccessService.Decision.SUBSCRIPTION_REQUIRED, underTest.check("u", paid("s")).decision());
    }

    @Test
    void recordsAndReleasesTheStoriesADeviceHolds() {
        underTest.recordDownload("u", "s").join();
        assertEquals(Set.of("s"), held);

        underTest.release("u", "s").join();

        assertEquals(Set.of(), held);
    }
}
