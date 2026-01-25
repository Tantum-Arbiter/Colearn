package com.app.config;

public interface UrlGenerationStrategy {

    String generateUrl(String assetPath, String bucketName);

    String getStrategyName();
}

