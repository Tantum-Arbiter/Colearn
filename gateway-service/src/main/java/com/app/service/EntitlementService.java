package com.app.service;

import com.app.model.Entitlement;
import com.app.repository.EntitlementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;

@Service
public class EntitlementService {

    public static final Duration PAID_MAX_AGE = Duration.ofDays(7);
    public static final Duration UPGRADE_MAX_AGE = Duration.ofSeconds(30);
    public static final Duration FREE_MAX_AGE = Duration.ofSeconds(30);
    public static final Duration REFRESH_MAX_AGE = Duration.ofSeconds(10);

    public record Resolution(Tier tier, String source) {
    }

    private static final Logger logger = LoggerFactory.getLogger(EntitlementService.class);

    private final EntitlementRepository repository;
    private final RevenueCatClient revenueCat;
    private final Clock clock;
    private final long cacheEpochMs;

    @Autowired
    public EntitlementService(EntitlementRepository repository, RevenueCatClient revenueCat,
                              @Value("${app.entitlements.cache-epoch:}") String cacheEpoch) {
        this(repository, revenueCat, Clock.systemUTC(), cacheEpoch);
    }

    public EntitlementService(EntitlementRepository repository, RevenueCatClient revenueCat, Clock clock, String cacheEpoch) {
        this.repository = repository;
        this.revenueCat = revenueCat;
        this.clock = clock;
        this.cacheEpochMs = parseEpoch(cacheEpoch);
    }

    public Resolution refresh(String userId) {
        return resolve(userId, REFRESH_MAX_AGE);
    }

    public Resolution resolve(String userId, Duration paidMaxAge) {
        long now = clock.millis();
        Optional<Entitlement> cached = readCache(userId).filter(e -> e.getCheckedAtMs() >= cacheEpochMs);
        Duration freeMaxAge = paidMaxAge.compareTo(FREE_MAX_AGE) < 0 ? paidMaxAge : FREE_MAX_AGE;
        Tier cachedTier = cached.map(e -> parse(e.getTier())).orElse(null);
        long age = cached.map(e -> now - e.getCheckedAtMs()).orElse(Long.MAX_VALUE);
        boolean paidAndUnexpired = cachedTier != null && cachedTier.isPaid()
                && (cached.get().getExpiresAtMs() == null || cached.get().getExpiresAtMs() > now);

        if (paidAndUnexpired && age < paidMaxAge.toMillis()) {
            return new Resolution(cachedTier, "cache");
        }
        if (cachedTier == Tier.FREE && age < freeMaxAge.toMillis()) {
            return new Resolution(Tier.FREE, "cache");
        }

        try {
            RevenueCatClient.Lookup lookup = revenueCat.lookup(userId);
            remember(userId, lookup, now);
            return new Resolution(lookup.tier(), "revenuecat");
        } catch (RevenueCatClient.UnavailableException e) {
            if (paidAndUnexpired) {
                return new Resolution(cachedTier, "stale_cache");
            }
            logger.warn("[Entitlements] RevenueCat unavailable ({}); letting the family in unverified", e.outcome());
            return new Resolution(Tier.PREMIUM, "unverified");
        }
    }

    private Optional<Entitlement> readCache(String userId) {
        try {
            return repository.find(userId).join();
        } catch (RuntimeException e) {
            logger.warn("[Entitlements] Could not read the cached entitlement: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private void remember(String userId, RevenueCatClient.Lookup lookup, long now) {
        Entitlement entitlement = new Entitlement();
        entitlement.setTier(lookup.tier().name().toLowerCase(Locale.ROOT));
        entitlement.setExpiresAtMs(lookup.expiresAtMs());
        entitlement.setCheckedAtMs(now);
        entitlement.setEnvironment(lookup.sandbox() ? "SANDBOX" : "PRODUCTION");
        try {
            repository.update(userId, current -> entitlement).join();
        } catch (RuntimeException e) {
            logger.warn("[Entitlements] Could not remember the entitlement: {}", e.getMessage());
        }
    }

    private static long parseEpoch(String cacheEpoch) {
        if (cacheEpoch == null || cacheEpoch.isBlank()) {
            return 0;
        }
        try {
            return java.time.Instant.parse(cacheEpoch.trim()).toEpochMilli();
        } catch (java.time.format.DateTimeParseException e) {
            logger.warn("[Entitlements] ENTITLEMENTS_CACHE_EPOCH '{}' is not an ISO instant; no saved answers are thrown away", cacheEpoch);
            return 0;
        }
    }

    private static Tier parse(String tier) {
        if (tier == null) {
            return null;
        }
        try {
            return Tier.valueOf(tier.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
