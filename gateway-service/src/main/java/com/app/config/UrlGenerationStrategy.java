package com.app.config;

/**
 * Strategy interface for generating asset URLs.
 * Implementations are selected based on Spring profile.
 */
public interface UrlGenerationStrategy {

    /**
     * Generate a URL for the given asset path.
     *
     * @param assetPath the validated asset path
     * @param bucketName the GCS bucket name
     * @return the generated URL
     */
    String generateUrl(String assetPath, String bucketName);

    /**
     * Get the strategy name for logging/metrics.
     */
    String getStrategyName();
}

