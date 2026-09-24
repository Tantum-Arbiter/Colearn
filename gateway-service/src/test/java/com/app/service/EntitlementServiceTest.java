package com.app.service;

import com.app.dto.RevenueCatWebhook;
import com.app.model.Entitlement;
import com.app.repository.EntitlementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.UnaryOperator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EntitlementServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-24T12:00:00Z");
    private static final long HOUR = 3_600_000L;

    private final Map<String, Entitlement> stored = new HashMap<>();
    private final Map<String, Boolean> users = new HashMap<>();
    private EntitlementService underTest;

    private final EntitlementRepository repository = new EntitlementRepository() {
        @Override
        public CompletableFuture<Optional<Entitlement>> find(String userId) {
            return CompletableFuture.completedFuture(Optional.ofNullable(stored.get(userId)));
        }

        @Override
        public CompletableFuture<Boolean> update(String userId, UnaryOperator<Entitlement> change) {
            if (!users.getOrDefault(userId, false)) {
                return CompletableFuture.completedFuture(false);
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
        users.put("user-1", true);
        underTest = new EntitlementService(repository, Clock.fixed(NOW, ZoneOffset.UTC), true);
    }

    private static RevenueCatWebhook event(String type, String appUserId, List<String> entitlements, Long expiresAt, long at) {
        RevenueCatWebhook.Event event = new RevenueCatWebhook.Event();
        event.setType(type);
        event.setAppUserId(appUserId);
        event.setEntitlementIds(entitlements);
        event.setExpirationAtMs(expiresAt);
        event.setEventTimestampMs(at);
        event.setEnvironment("SANDBOX");
        RevenueCatWebhook webhook = new RevenueCatWebhook();
        webhook.setEvent(event);
        return webhook;
    }

    private long now() {
        return NOW.toEpochMilli();
    }

    @Test
    void aUserWithNoEntitlementIsFree() {
        assertEquals(Tier.FREE, underTest.tierOf("user-1").join());
    }

    @ParameterizedTest
    @ValueSource(strings = {"INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT"})
    void grantsTheTierAPurchaseCarries(String type) {
        underTest.apply(event(type, "user-1", List.of("basic_access"), now() + HOUR, now())).join();

        assertEquals(Tier.BASIC, underTest.tierOf("user-1").join());
    }

    @Test
    void theHighestEntitlementWins() {
        underTest.apply(event("INITIAL_PURCHASE", "user-1", List.of("basic_access", "premium_access"), now() + HOUR, now())).join();

        assertEquals(Tier.PREMIUM, underTest.tierOf("user-1").join());
    }

    @Test
    void aPurchaseWithoutAnExpiryLastsUntilExpiredByAnEvent() {
        underTest.apply(event("NON_RENEWING_PURCHASE", "user-1", List.of("premium_access"), null, now())).join();

        assertEquals(Tier.PREMIUM, underTest.tierOf("user-1").join());
    }

    @Test
    void aSubscriptionPastItsExpiryIsFree_evenBeforeTheExpirationEventArrives() {
        underTest.apply(event("INITIAL_PURCHASE", "user-1", List.of("basic_access"), now() - 1, now() - HOUR)).join();

        assertEquals(Tier.FREE, underTest.tierOf("user-1").join());
    }

    @ParameterizedTest
    @ValueSource(strings = {"CANCELLATION", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED"})
    void keepsTheTierUntilTheSubscriptionEnds(String type) {
        underTest.apply(event("INITIAL_PURCHASE", "user-1", List.of("basic_access"), now() + 2 * HOUR, now() - HOUR)).join();

        underTest.apply(event(type, "user-1", List.of("basic_access"), now() + HOUR, now())).join();

        assertEquals(Tier.BASIC, underTest.tierOf("user-1").join());
        assertEquals(now() + HOUR, stored.get("user-1").getExpiresAtMs());
    }

    @Test
    void expirationEndsTheTier() {
        underTest.apply(event("INITIAL_PURCHASE", "user-1", List.of("premium_access"), now() + HOUR, now() - HOUR)).join();

        underTest.apply(event("EXPIRATION", "user-1", List.of("premium_access"), now(), now())).join();

        assertEquals(Tier.FREE, underTest.tierOf("user-1").join());
    }

    @Test
    void ignoresAnEventOlderThanTheOneAlreadyApplied() {
        underTest.apply(event("RENEWAL", "user-1", List.of("premium_access"), now() + HOUR, now())).join();

        underTest.apply(event("EXPIRATION", "user-1", List.of("premium_access"), now() - HOUR, now() - HOUR)).join();

        assertEquals(Tier.PREMIUM, underTest.tierOf("user-1").join());
    }

    @Test
    void ignoresAPurchaseOlderThanTheRenewalAlreadyApplied() {
        underTest.apply(event("RENEWAL", "user-1", List.of("premium_access"), now() + HOUR, now())).join();

        underTest.apply(event("INITIAL_PURCHASE", "user-1", List.of("basic_access"), now() + HOUR, now() - HOUR)).join();

        assertEquals(Tier.PREMIUM, underTest.tierOf("user-1").join());
    }

    @Test
    void findsTheAccountBehindAnAnonymousId() {
        RevenueCatWebhook webhook = event("INITIAL_PURCHASE", "$RCAnonymousID:abc", List.of("basic_access"), now() + HOUR, now());
        webhook.getEvent().setAliases(List.of("$RCAnonymousID:abc", "user-1"));

        assertEquals(EntitlementService.Outcome.APPLIED, underTest.apply(webhook).join());
        assertEquals(Tier.BASIC, underTest.tierOf("user-1").join());
    }

    @Test
    void ignoresAPurchaseNoAccountOwnsYet() {
        assertEquals(EntitlementService.Outcome.NO_ACCOUNT,
                underTest.apply(event("INITIAL_PURCHASE", "$RCAnonymousID:abc", List.of("basic_access"), now() + HOUR, now())).join());
    }

    @Test
    void ignoresAnIdThatIsNotAnAccount() {
        assertEquals(EntitlementService.Outcome.NO_ACCOUNT,
                underTest.apply(event("INITIAL_PURCHASE", "stranger", List.of("basic_access"), now() + HOUR, now())).join());
        assertTrue(stored.isEmpty());
    }

    @Test
    void ignoresAPurchaseOfSomethingThatIsNotATier() {
        assertEquals(EntitlementService.Outcome.IGNORED,
                underTest.apply(event("INITIAL_PURCHASE", "user-1", List.of("sticker_pack"), now() + HOUR, now())).join());
        assertTrue(stored.isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"TEST", "SOMETHING_NEW"})
    void acknowledgesEventsItHasNoUseFor(String type) {
        assertEquals(EntitlementService.Outcome.IGNORED, underTest.apply(event(type, "user-1", List.of(), null, now())).join());
        assertTrue(stored.isEmpty());
    }

    @Test
    void aTransferEndsTheTierOnTheAccountItLeft() {
        users.put("user-2", true);
        underTest.apply(event("INITIAL_PURCHASE", "user-1", List.of("basic_access"), now() + HOUR, now() - HOUR)).join();
        RevenueCatWebhook transfer = event("TRANSFER", null, null, null, now());
        transfer.getEvent().setTransferredFrom(List.of("user-1"));
        transfer.getEvent().setTransferredTo(List.of("user-2"));

        underTest.apply(transfer).join();

        assertEquals(Tier.FREE, underTest.tierOf("user-1").join());
        assertEquals(Tier.FREE, underTest.tierOf("user-2").join());
    }

    @Test
    void refusesSandboxPurchasesWhenTheStoreIsLive() {
        EntitlementService live = new EntitlementService(repository, Clock.fixed(NOW, ZoneOffset.UTC), false);

        assertEquals(EntitlementService.Outcome.IGNORED,
                live.apply(event("INITIAL_PURCHASE", "user-1", List.of("basic_access"), now() + HOUR, now())).join());
        assertNull(stored.get("user-1"));
    }

    @Test
    void recordsWhereTheEntitlementCameFrom() {
        underTest.apply(event("INITIAL_PURCHASE", "user-1", List.of("basic_access"), now() + HOUR, now())).join();

        Entitlement underTestEntitlement = stored.get("user-1");
        assertEquals("basic", underTestEntitlement.getTier());
        assertEquals(now(), underTestEntitlement.getEventAtMs());
        assertEquals("SANDBOX", underTestEntitlement.getEnvironment());
        assertFalse(underTestEntitlement.getTier().isBlank());
    }
}
