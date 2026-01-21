package com.app.config;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URL;
import java.util.concurrent.TimeUnit;

/**
 * URL generation strategy for production GCS signed URLs.
 * Active when neither 'emulator' nor 'cdn' profile is enabled.
 * 
 * Generates V4 signed URLs that provide time-limited access to private GCS objects.
 */
@Component
@Profile("!emulator & !cdn")
public class ProductionUrlStrategy implements UrlGenerationStrategy {

    private static final Logger logger = LoggerFactory.getLogger(ProductionUrlStrategy.class);

    private final Storage storage;
    private final int signedUrlDurationMinutes;

    public ProductionUrlStrategy(
            Storage storage,
            @Value("${gcs.signed-url-duration-minutes:60}") int signedUrlDurationMinutes) {
        this.storage = storage;
        this.signedUrlDurationMinutes = signedUrlDurationMinutes;
        logger.info("Initialized ProductionUrlStrategy with {} minute URL expiry", signedUrlDurationMinutes);
    }

    @Override
    public String generateUrl(String assetPath, String bucketName) {
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, assetPath)).build();
        
        URL signedUrl = storage.signUrl(
                blobInfo,
                signedUrlDurationMinutes,
                TimeUnit.MINUTES,
                Storage.SignUrlOption.withV4Signature()
        );
        
        String url = signedUrl.toString();
        logger.debug("Generated production signed URL for: {}", assetPath);
        return url;
    }

    @Override
    public String getStrategyName() {
        return "production";
    }
}

