package com.app.service;

import com.app.model.Story;
import com.app.repository.DownloadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DownloadAccessServiceTest {

    private final Set<String> held = new HashSet<>();
    private EntitlementService entitlements;
    private DownloadAccessService underTest;

    private final DownloadRepository downloads = new DownloadRepository() {
        @Override
        public CompletableFuture<Boolean> has(String userId, String storyId) {
            return CompletableFuture.completedFuture(held.contains(storyId));
        }

        @Override
        public CompletableFuture<Long> count(String userId) {
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
        public CompletableFuture<java.util.List<String>> list(String userId) {
            return CompletableFuture.completedFuture(java.util.List.copyOf(held));
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

    private void tier(Tier tier) {
        when(entitlements.tierOf(anyString())).thenReturn(CompletableFuture.completedFuture(tier));
    }

    private static Story story(String id, boolean free, boolean premium, boolean referral) {
        Story story = new Story();
        story.setId(id);
        story.setFree(free);
        story.setPremium(premium);
        story.setReferralReward(referral);
        return story;
    }

    private void hold(int n) {
        for (int i = 0; i < n; i++) {
            held.add("held-" + i);
        }
    }

    @Test
    void aFreeStoryIsForEveryone() {
        tier(Tier.FREE);

        assertEquals(DownloadAccessService.Decision.ALLOWED, underTest.check("u", story("s", true, false, false)).join());
    }

    @ParameterizedTest
    @CsvSource({"FREE,SUBSCRIPTION_REQUIRED", "BASIC,ALLOWED", "PREMIUM,ALLOWED"})
    void aPaidStoryNeedsASubscription(Tier tier, DownloadAccessService.Decision decision) {
        tier(tier);

        assertEquals(decision, underTest.check("u", story("s", false, true, false)).join());
        assertEquals(decision, underTest.check("u", story("t", false, false, false)).join());
    }

    @Test
    void aReferralRewardIsLeftToTheApp_whichHoldsTheReferral() {
        tier(Tier.FREE);

        assertEquals(DownloadAccessService.Decision.ALLOWED, underTest.check("u", story("s", false, false, true)).join());
    }

    @ParameterizedTest
    @CsvSource({"FREE,2", "BASIC,50", "PREMIUM,125"})
    void holdsEachTierToItsLimit(Tier tier, int limit) {
        tier(tier);
        hold(limit - 1);
        assertEquals(DownloadAccessService.Decision.ALLOWED, underTest.check("u", story("new", true, false, false)).join());

        hold(limit);

        assertEquals(DownloadAccessService.Decision.LIMIT_REACHED, underTest.check("u", story("new", true, false, false)).join());
    }

    @Test
    void aStoryAlreadyHeldCanAlwaysBeFetchedAgain() {
        tier(Tier.FREE);
        hold(2);
        held.add("again");

        assertEquals(DownloadAccessService.Decision.ALLOWED, underTest.check("u", story("again", true, false, false)).join());
    }

    @Test
    void recordsAndReleasesTheStoriesADeviceHolds() {
        underTest.recordDownload("u", "s").join();
        assertEquals(Set.of("s"), held);

        underTest.release("u", "s").join();

        assertEquals(Set.of(), held);
    }
}
