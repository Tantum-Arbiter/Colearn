package com.app.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * URL generation strategy for Cloudflare CDN.
 * Active when 'cdn' profile is enabled.
 * 
 * Cloudflare caches assets at edge locations, reducing GCS egress costs
 * and improving latency for global users.
 */
@Component
@Profile("cdn")
public class CdnUrlStrategy implements UrlGenerationStrategy {

    private static final Logger logger = LoggerFactory.getLogger(CdnUrlStrategy.class);

    private final String cdnHost;

    public CdnUrlStrategy(@Value("${gcs.cdn-host}") String cdnHost) {
        this.cdnHost = cdnHost;
        logger.info("Initialized CdnUrlStrategy with host: {}", cdnHost);
    }

    @Override
    public String generateUrl(String assetPath, String bucketName) {
        String encodedPath = encodePathSegments(assetPath);
        String url = String.format("https://%s/%s/%s", cdnHost, bucketName, encodedPath);
        logger.debug("Generated CDN URL: {}", url);
        return url;
    }

    @Override
    public String getStrategyName() {
        return "cdn";
    }

    private String encodePathSegments(String path) {
        String[] segments = path.split("/");
        StringBuilder encoded = new StringBuilder();
        for (int i = 0; i < segments.length; i++) {
            if (i > 0) encoded.append("/");
            encoded.append(URLEncoder.encode(segments[i], StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return encoded.toString();
    }
}

