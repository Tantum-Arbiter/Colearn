package com.app.service;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RevenueCatClientTest {

    private static final Instant NOW = Instant.parse("2026-09-25T12:00:00Z");
    private static final String URL = "https://api.revenuecat.test/v1/subscribers/user-1";

    private RestTemplate restTemplate;
    private MockRestServiceServer server;
    private SimpleMeterRegistry meters;
    private CircuitBreakerRegistry breakers;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        server = MockRestServiceServer.bindTo(restTemplate).build();
        meters = new SimpleMeterRegistry();
        breakers = CircuitBreakerRegistry.of(CircuitBreakerConfig.custom()
                .slidingWindowSize(4)
                .minimumNumberOfCalls(4)
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofMinutes(1))
                .build());
    }

    private RevenueCatClient client(String key, boolean acceptSandbox) {
        return new RevenueCatClient(restTemplate, breakers, new ApplicationMetricsService(meters),
                "https://api.revenuecat.test", key, acceptSandbox, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private RevenueCatClient client() {
        return client("sk_test_key", true);
    }

    private static String subscriber(String entitlements, String subscriptions) {
        return "{\"subscriber\":{\"entitlements\":{" + entitlements + "},\"subscriptions\":{" + subscriptions + "},\"non_subscriptions\":{}}}";
    }

    private static String entitlement(String id, String product, String expires) {
        return "\"" + id + "\":{\"product_identifier\":\"" + product + "\",\"expires_date\":" + (expires == null ? "null" : "\"" + expires + "\"") + "}";
    }

    private static String subscription(String product, boolean sandbox) {
        return "\"" + product + "\":{\"is_sandbox\":" + sandbox + "}";
    }

    private double requests(String outcome) {
        var counter = meters.find("app.revenuecat.requests").tag("outcome", outcome).counter();
        return counter == null ? 0 : counter.count();
    }

    private void answer(String body) {
        server.expect(requestTo(URL)).andExpect(method(org.springframework.http.HttpMethod.GET))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    @Test
    void asksForTheAccountWithTheSecretKey() {
        server.expect(requestTo(URL))
                .andExpect(header("Authorization", "Bearer sk_test_key"))
                .andRespond(withSuccess(subscriber("", ""), MediaType.APPLICATION_JSON));

        client().lookup("user-1");

        server.verify();
    }

    @Test
    void findsAnActivePremiumSubscription() {
        answer(subscriber(entitlement("premium_access", "monthly_premium", "2026-10-25T12:00:00Z"), subscription("monthly_premium", false)));

        RevenueCatClient.Lookup underTest = client().lookup("user-1");

        assertEquals(Tier.PREMIUM, underTest.tier());
        assertEquals(Instant.parse("2026-10-25T12:00:00Z").toEpochMilli(), underTest.expiresAtMs());
        assertFalse(underTest.sandbox());
        assertEquals(1, requests("active"));
    }

    @Test
    void findsAnActiveBasicSubscription() {
        answer(subscriber(entitlement("basic_access", "monthly_basic", "2026-10-25T12:00:00Z"), subscription("monthly_basic", false)));

        assertEquals(Tier.BASIC, client().lookup("user-1").tier());
    }

    @Test
    void premiumWinsWhenBothAreActive() {
        answer(subscriber(
                entitlement("basic_access", "monthly_basic", "2026-10-25T12:00:00Z") + "," + entitlement("premium_access", "monthly_premium", "2026-10-01T12:00:00Z"),
                subscription("monthly_basic", false) + "," + subscription("monthly_premium", false)));

        RevenueCatClient.Lookup underTest = client().lookup("user-1");

        assertEquals(Tier.PREMIUM, underTest.tier());
        assertEquals(Instant.parse("2026-10-01T12:00:00Z").toEpochMilli(), underTest.expiresAtMs());
    }

    @Test
    void premiumWinsWhicheverOrderRevenueCatListsThemIn() {
        answer(subscriber(
                entitlement("premium_access", "monthly_premium", "2026-10-01T12:00:00Z") + "," + entitlement("basic_access", "monthly_basic", "2026-10-25T12:00:00Z"),
                subscription("monthly_basic", false) + "," + subscription("monthly_premium", false)));

        assertEquals(Tier.PREMIUM, client().lookup("user-1").tier());
    }

    @Test
    void aSubscriptionEndingThisVeryMomentHasEnded() {
        answer(subscriber(entitlement("premium_access", "monthly_premium", "2026-09-25T12:00:00Z"), subscription("monthly_premium", false)));

        assertEquals(Tier.FREE, client().lookup("user-1").tier());
    }

    @Test
    void aLifetimePurchaseHasNoExpiry() {
        answer(subscriber(entitlement("premium_access", "lifetime", null), ""));

        RevenueCatClient.Lookup underTest = client().lookup("user-1");

        assertEquals(Tier.PREMIUM, underTest.tier());
        assertNull(underTest.expiresAtMs());
    }

    @Test
    void anExpiredSubscriptionIsFree() {
        answer(subscriber(entitlement("premium_access", "monthly_premium", "2026-09-25T11:59:59Z"), subscription("monthly_premium", false)));

        assertEquals(Tier.FREE, client().lookup("user-1").tier());
        assertEquals(1, requests("inactive"));
    }

    @Test
    void someoneWhoNeverSubscribedIsFree() {
        answer(subscriber("", ""));

        assertEquals(Tier.FREE, client().lookup("user-1").tier());
    }

    @Test
    void anEntitlementThatIsNotATierIsIgnored() {
        answer(subscriber(entitlement("sticker_pack", "stickers", null), ""));

        assertEquals(Tier.FREE, client().lookup("user-1").tier());
    }

    @Test
    void aSandboxPurchaseCountsWhileSandboxIsAccepted() {
        answer(subscriber(entitlement("premium_access", "monthly_premium", "2026-10-25T12:00:00Z"), subscription("monthly_premium", true)));

        RevenueCatClient.Lookup underTest = client("sk_test_key", true).lookup("user-1");

        assertEquals(Tier.PREMIUM, underTest.tier());
        assertTrue(underTest.sandbox());
    }

    @Test
    void aSandboxPurchaseDoesNotCountOnceTheStoreIsLive() {
        answer(subscriber(entitlement("premium_access", "monthly_premium", "2026-10-25T12:00:00Z"), subscription("monthly_premium", true)));

        assertEquals(Tier.FREE, client("sk_test_key", false).lookup("user-1").tier());
    }

    @Test
    void aProductionPurchaseStillCountsOnceTheStoreIsLive() {
        answer(subscriber(entitlement("basic_access", "monthly_basic", "2026-10-25T12:00:00Z"), subscription("monthly_basic", false)));

        assertEquals(Tier.BASIC, client("sk_test_key", false).lookup("user-1").tier());
    }

    @Test
    void anUnknownAccountIsFree() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertEquals(Tier.FREE, client().lookup("user-1").tier());
        assertEquals(1, requests("inactive"));
    }

    @Test
    void escapesTheAccountIdInThePath() {
        server.expect(requestTo("https://api.revenuecat.test/v1/subscribers/user%2F1%20x"))
                .andRespond(withSuccess(subscriber("", ""), MediaType.APPLICATION_JSON));

        client().lookup("user/1 x");

        server.verify();
    }

    @ParameterizedTest
    @CsvSource({
            "UNAUTHORIZED, unauthorized",
            "FORBIDDEN, unauthorized",
            "TOO_MANY_REQUESTS, rate_limited",
            "INTERNAL_SERVER_ERROR, server_error",
            "BAD_GATEWAY, server_error",
            "SERVICE_UNAVAILABLE, server_error"
    })
    void reportsWhyRevenueCatCouldNotAnswer(HttpStatus status, String outcome) {
        server.expect(requestTo(URL)).andRespond(withStatus(status));

        RevenueCatClient.UnavailableException underTest = assertThrows(RevenueCatClient.UnavailableException.class, () -> client().lookup("user-1"));

        assertEquals(outcome, underTest.outcome());
        assertEquals(1, requests(outcome));
    }

    @Test
    void aTimeoutIsUnavailable() {
        server.expect(requestTo(URL)).andRespond(withException(new SocketTimeoutException("read timed out")));

        RevenueCatClient.UnavailableException underTest = assertThrows(RevenueCatClient.UnavailableException.class, () -> client().lookup("user-1"));

        assertEquals("timeout", underTest.outcome());
    }

    @Test
    void aConnectionFailureIsUnavailable() {
        server.expect(requestTo(URL)).andRespond(withException(new IOException("connection refused")));

        assertEquals("timeout", assertThrows(RevenueCatClient.UnavailableException.class, () -> client().lookup("user-1")).outcome());
    }

    @Test
    void anAnswerItCannotReadIsUnavailable() {
        answer("{not json");

        assertEquals("bad_response", assertThrows(RevenueCatClient.UnavailableException.class, () -> client().lookup("user-1")).outcome());
    }

    @Test
    void anAnswerWithoutASubscriberIsUnavailable() {
        answer("{\"message\":\"odd\"}");

        assertEquals("bad_response", assertThrows(RevenueCatClient.UnavailableException.class, () -> client().lookup("user-1")).outcome());
    }

    @Test
    void aSubscriberThatIsNotAnObjectIsUnavailable() {
        answer("{\"subscriber\":\"user-1\"}");

        assertEquals("bad_response", assertThrows(RevenueCatClient.UnavailableException.class, () -> client().lookup("user-1")).outcome());
    }

    @Test
    void anUnreadableExpiryIsUnavailable() {
        answer(subscriber(entitlement("premium_access", "monthly_premium", "next tuesday"), ""));

        assertEquals("bad_response", assertThrows(RevenueCatClient.UnavailableException.class, () -> client().lookup("user-1")).outcome());
    }

    @Test
    void withoutAKeyItDoesNotCallAtAll() {
        RevenueCatClient.UnavailableException underTest = assertThrows(RevenueCatClient.UnavailableException.class, () -> client("", true).lookup("user-1"));

        assertEquals("not_configured", underTest.outcome());
        server.verify();
    }

    @Test
    void stopsCallingOnceRevenueCatKeepsFailing_andSaysSo() {
        for (int i = 0; i < 4; i++) {
            server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        }
        RevenueCatClient underTest = client();
        for (int i = 0; i < 4; i++) {
            assertThrows(RevenueCatClient.UnavailableException.class, () -> underTest.lookup("user-1"));
        }

        assertEquals(CircuitBreaker.State.OPEN, breakers.circuitBreaker("revenuecat").getState());
        assertEquals("circuit_open", assertThrows(RevenueCatClient.UnavailableException.class, () -> underTest.lookup("user-1")).outcome());
        server.verify();
        assertEquals(1, requests("circuit_open"));
    }

    @Test
    void anAccountThatIsSimplyFreeDoesNotTripTheBreaker() {
        for (int i = 0; i < 6; i++) {
            server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.NOT_FOUND));
        }
        RevenueCatClient underTest = client();
        for (int i = 0; i < 6; i++) {
            underTest.lookup("user-1");
        }

        assertEquals(CircuitBreaker.State.CLOSED, breakers.circuitBreaker("revenuecat").getState());
    }

    @Test
    void timesEveryCall() {
        answer(subscriber("", ""));

        client().lookup("user-1");

        assertEquals(1, meters.find("app.revenuecat.request.duration").tag("outcome", "inactive").timer().count());
    }
}
