package com.app.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@Profile("emulator")
public class EmulatorUrlStrategy implements UrlGenerationStrategy {

    private static final Logger logger = LoggerFactory.getLogger(EmulatorUrlStrategy.class);

    private final String emulatorHost;

    public EmulatorUrlStrategy(@Value("${gcs.emulator-host}") String emulatorHost) {
        this.emulatorHost = emulatorHost;
        logger.info("Initialized EmulatorUrlStrategy with host: {}", emulatorHost);
    }

    @Override
    public String generateUrl(String assetPath, String bucketName) {
        String encodedPath = encodePathSegments(assetPath);
        String url = String.format("%s/%s/%s", emulatorHost, bucketName, encodedPath);
        logger.debug("Generated emulator URL: {}", url);
        return url;
    }

    @Override
    public String getStrategyName() {
        return "emulator";
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

