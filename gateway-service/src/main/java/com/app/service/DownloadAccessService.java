package com.app.service;

import com.app.model.Story;
import com.app.repository.DownloadRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class DownloadAccessService {

    public enum Decision { ALLOWED, SUBSCRIPTION_REQUIRED, LIMIT_REACHED }

    public record Check(Decision decision, String source) {
    }

    private static final Logger logger = LoggerFactory.getLogger(DownloadAccessService.class);

    private final EntitlementService entitlements;
    private final DownloadRepository downloads;

    public DownloadAccessService(EntitlementService entitlements, DownloadRepository downloads) {
        this.entitlements = entitlements;
        this.downloads = downloads;
    }

    public Check check(String userId, Story story) {
        boolean paid = !story.isFree() && !story.isReferralReward();
        Holdings holdings = holdings(userId, story.getId());
        if (!paid) {
            if (holdings == null) {
                return new Check(Decision.ALLOWED, "unverified");
            }
            if (holdings.held() || holdings.count() < Tier.FREE.downloadLimit()) {
                return new Check(Decision.ALLOWED, story.isFree() ? "free_story" : "referral");
            }
        }

        EntitlementService.Resolution resolution = entitlements.resolve(userId, EntitlementService.PAID_MAX_AGE);
        if (paid && !resolution.tier().isPaid()) {
            return new Check(Decision.SUBSCRIPTION_REQUIRED, resolution.source());
        }
        if (holdings == null) {
            return new Check(Decision.ALLOWED, "unverified");
        }
        if (holdings.held()) {
            return new Check(Decision.ALLOWED, resolution.source());
        }
        if (holdings.count() >= resolution.tier().downloadLimit() && resolution.tier() == Tier.BASIC && "cache".equals(resolution.source())) {
            resolution = entitlements.resolve(userId, EntitlementService.UPGRADE_MAX_AGE);
        }
        Decision decision = holdings.count() >= resolution.tier().downloadLimit() ? Decision.LIMIT_REACHED : Decision.ALLOWED;
        return new Check(decision, resolution.source());
    }

    private record Holdings(boolean held, long count) {
    }

    private Holdings holdings(String userId, String storyId) {
        try {
            return new Holdings(downloads.has(userId, storyId).join(), downloads.count(userId).join());
        } catch (RuntimeException e) {
            logger.warn("[Downloads] Could not read the stories this family holds: {}", e.getMessage());
            return null;
        }
    }

    public CompletableFuture<Void> recordDownload(String userId, String storyId) {
        return downloads.record(userId, storyId);
    }

    public CompletableFuture<Void> release(String userId, String storyId) {
        return downloads.release(userId, storyId);
    }
}
