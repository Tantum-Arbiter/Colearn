package com.app.service;

import com.app.model.Story;
import com.app.repository.DownloadRepository;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class DownloadAccessService {

    public enum Decision { ALLOWED, SUBSCRIPTION_REQUIRED, LIMIT_REACHED }

    private final EntitlementService entitlements;
    private final DownloadRepository downloads;

    public DownloadAccessService(EntitlementService entitlements, DownloadRepository downloads) {
        this.entitlements = entitlements;
        this.downloads = downloads;
    }

    public CompletableFuture<Decision> check(String userId, Story story) {
        return entitlements.tierOf(userId).thenCompose(tier -> {
            if (!story.isFree() && !story.isReferralReward() && !tier.isPaid()) {
                return CompletableFuture.completedFuture(Decision.SUBSCRIPTION_REQUIRED);
            }
            return downloads.has(userId, story.getId()).thenCompose(held -> held
                    ? CompletableFuture.completedFuture(Decision.ALLOWED)
                    : downloads.count(userId).thenApply(count -> count >= tier.downloadLimit() ? Decision.LIMIT_REACHED : Decision.ALLOWED));
        });
    }

    public CompletableFuture<Void> recordDownload(String userId, String storyId) {
        return downloads.record(userId, storyId);
    }

    public CompletableFuture<Void> release(String userId, String storyId) {
        return downloads.release(userId, storyId);
    }
}
