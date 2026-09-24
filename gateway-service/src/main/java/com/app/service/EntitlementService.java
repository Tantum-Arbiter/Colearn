package com.app.service;

import com.app.dto.RevenueCatWebhook;
import com.app.model.Entitlement;
import com.app.repository.EntitlementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.function.UnaryOperator;

@Service
public class EntitlementService {

    public enum Outcome { APPLIED, IGNORED, NO_ACCOUNT }

    private static final Logger logger = LoggerFactory.getLogger(EntitlementService.class);
    private static final String ANONYMOUS_PREFIX = "$RCAnonymousID:";
    private static final String PREMIUM_ENTITLEMENT = "premium_access";
    private static final String BASIC_ENTITLEMENT = "basic_access";
    private static final Set<String> GRANTS = Set.of("INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION",
            "NON_RENEWING_PURCHASE", "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT");
    private static final Set<String> KEEPS_UNTIL_EXPIRY = Set.of("CANCELLATION", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED");

    private final EntitlementRepository repository;
    private final Clock clock;
    private final boolean acceptSandbox;

    @Autowired
    public EntitlementService(EntitlementRepository repository,
                              @Value("${app.revenuecat.accept-sandbox:true}") boolean acceptSandbox) {
        this(repository, Clock.systemUTC(), acceptSandbox);
    }

    public EntitlementService(EntitlementRepository repository, Clock clock, boolean acceptSandbox) {
        this.repository = repository;
        this.clock = clock;
        this.acceptSandbox = acceptSandbox;
    }

    public CompletableFuture<Tier> tierOf(String userId) {
        return repository.find(userId).thenApply(found -> found
                .filter(entitlement -> entitlement.getExpiresAtMs() == null || entitlement.getExpiresAtMs() > clock.millis())
                .map(entitlement -> parse(entitlement.getTier()))
                .orElse(Tier.FREE));
    }

    public CompletableFuture<Outcome> apply(RevenueCatWebhook webhook) {
        RevenueCatWebhook.Event event = webhook.getEvent();
        String type = event.getType() == null ? "" : event.getType();
        if (!acceptSandbox && "SANDBOX".equalsIgnoreCase(event.getEnvironment())) {
            logger.info("[RevenueCat] Ignored a sandbox {} event", type);
            return CompletableFuture.completedFuture(Outcome.IGNORED);
        }
        if (type.equals("TRANSFER")) {
            return transfer(event);
        }

        UnaryOperator<Entitlement> change;
        if (GRANTS.contains(type)) {
            Tier tier = tierFrom(event.getEntitlementIds());
            if (tier == null) {
                return CompletableFuture.completedFuture(Outcome.IGNORED);
            }
            change = current -> newer(current, event) ? entitlement(tier, event.getExpirationAtMs(), event) : null;
        } else if (KEEPS_UNTIL_EXPIRY.contains(type)) {
            change = current -> current != null && newer(current, event)
                    ? entitlement(parse(current.getTier()), event.getExpirationAtMs(), event) : null;
        } else if (type.equals("EXPIRATION")) {
            change = current -> newer(current, event) ? entitlement(Tier.FREE, event.getExpirationAtMs(), event) : null;
        } else {
            return CompletableFuture.completedFuture(Outcome.IGNORED);
        }

        String account = accountOf(event);
        if (account == null) {
            return CompletableFuture.completedFuture(Outcome.NO_ACCOUNT);
        }
        return repository.update(account, change).thenApply(found -> found ? Outcome.APPLIED : Outcome.NO_ACCOUNT);
    }

    private CompletableFuture<Outcome> transfer(RevenueCatWebhook.Event event) {
        List<CompletableFuture<Boolean>> updates = new ArrayList<>();
        for (String from : event.getTransferredFrom() == null ? List.<String>of() : event.getTransferredFrom()) {
            if (isAccount(from)) {
                updates.add(repository.update(from, current -> newer(current, event) ? entitlement(Tier.FREE, null, event) : null));
            }
        }
        return CompletableFuture.allOf(updates.toArray(new CompletableFuture[0]))
                .thenApply(done -> updates.stream().anyMatch(CompletableFuture::join) ? Outcome.APPLIED : Outcome.NO_ACCOUNT);
    }

    private static boolean newer(Entitlement current, RevenueCatWebhook.Event event) {
        return current == null || event.getEventTimestampMs() >= current.getEventAtMs();
    }

    private static Entitlement entitlement(Tier tier, Long expiresAtMs, RevenueCatWebhook.Event event) {
        Entitlement entitlement = new Entitlement();
        entitlement.setTier(tier.name().toLowerCase(Locale.ROOT));
        entitlement.setExpiresAtMs(expiresAtMs);
        entitlement.setEventAtMs(event.getEventTimestampMs());
        entitlement.setEnvironment(event.getEnvironment());
        return entitlement;
    }

    private static Tier tierFrom(List<String> entitlementIds) {
        if (entitlementIds == null) {
            return null;
        }
        if (entitlementIds.contains(PREMIUM_ENTITLEMENT)) {
            return Tier.PREMIUM;
        }
        return entitlementIds.contains(BASIC_ENTITLEMENT) ? Tier.BASIC : null;
    }

    private static Tier parse(String tier) {
        try {
            return tier == null ? Tier.FREE : Tier.valueOf(tier.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return Tier.FREE;
        }
    }

    private static boolean isAccount(String id) {
        return id != null && !id.isBlank() && !id.startsWith(ANONYMOUS_PREFIX);
    }

    private static String accountOf(RevenueCatWebhook.Event event) {
        List<String> candidates = new ArrayList<>();
        candidates.add(event.getAppUserId());
        candidates.add(event.getOriginalAppUserId());
        if (event.getAliases() != null) {
            candidates.addAll(event.getAliases());
        }
        return candidates.stream().filter(Objects::nonNull).filter(EntitlementService::isAccount).findFirst().orElse(null);
    }
}
