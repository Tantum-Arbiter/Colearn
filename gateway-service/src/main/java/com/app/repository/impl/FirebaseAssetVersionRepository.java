package com.app.repository.impl;

import com.app.model.AssetVersion;
import com.app.repository.AssetVersionRepository;
import com.app.service.ApplicationMetricsService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseAssetVersionRepository implements AssetVersionRepository {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseAssetVersionRepository.class);
    private static final String COLLECTION_NAME = "asset_versions";
    private static final String CURRENT_DOC_ID = "current";

    private final Firestore firestore;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public FirebaseAssetVersionRepository(Firestore firestore, ApplicationMetricsService metricsService) {
        this.firestore = firestore;
        this.metricsService = metricsService;
    }

    @Override
    public CompletableFuture<Optional<AssetVersion>> getCurrent() {
        logger.debug("Getting current asset version");

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(CURRENT_DOC_ID);
                ApiFuture<DocumentSnapshot> future = docRef.get();
                DocumentSnapshot document = future.get();

                long duration = System.currentTimeMillis() - startTime;

                if (document.exists()) {
                    AssetVersion version = document.toObject(AssetVersion.class);
                    logger.debug("Asset version found: version={}", version.getVersion());
                    metricsService.recordFirestoreOperation(COLLECTION_NAME, "getCurrent", true, duration);
                    return Optional.of(version);
                } else {
                    logger.debug("No asset version found, returning empty");
                    metricsService.recordFirestoreOperation(COLLECTION_NAME, "getCurrent", true, duration);
                    return Optional.empty();
                }
            } catch (Exception e) {
                logger.error("Error getting current asset version", e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "getCurrent", false, duration);
                throw new RuntimeException("Failed to get asset version", e);
            }
        });
    }

    @Override
    public CompletableFuture<AssetVersion> save(AssetVersion assetVersion) {
        logger.debug("Saving asset version: version={}", assetVersion.getVersion());

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                assetVersion.setId(CURRENT_DOC_ID);
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(CURRENT_DOC_ID);
                ApiFuture<WriteResult> future = docRef.set(assetVersion);

                WriteResult result = future.get();
                logger.debug("Asset version saved: version={} at {}", assetVersion.getVersion(), result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", true, duration);

                return assetVersion;
            } catch (Exception e) {
                logger.error("Error saving asset version", e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", false, duration);
                throw new RuntimeException("Failed to save asset version", e);
            }
        });
    }

    @Override
    public CompletableFuture<AssetVersion> updateAssetChecksum(String assetPath, String checksum) {
        logger.debug("Updating asset checksum: assetPath={}", assetPath);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                Optional<AssetVersion> currentOpt = getCurrent().join();
                AssetVersion version = currentOpt.orElse(new AssetVersion());
                version.updateAssetChecksum(assetPath, checksum);

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(CURRENT_DOC_ID);
                ApiFuture<WriteResult> future = docRef.set(version);
                future.get();

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "updateAssetChecksum", true, duration);

                return version;
            } catch (Exception e) {
                logger.error("Error updating asset checksum: assetPath={}", assetPath, e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "updateAssetChecksum", false, duration);
                throw new RuntimeException("Failed to update asset checksum", e);
            }
        });
    }

    @Override
    public CompletableFuture<AssetVersion> removeAssetChecksum(String assetPath) {
        logger.debug("Removing asset checksum: assetPath={}", assetPath);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                Optional<AssetVersion> currentOpt = getCurrent().join();
                if (currentOpt.isEmpty()) {
                    logger.warn("No asset version found when trying to remove checksum: {}", assetPath);
                    return new AssetVersion();
                }

                AssetVersion version = currentOpt.get();
                version.removeAssetChecksum(assetPath);

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(CURRENT_DOC_ID);
                ApiFuture<WriteResult> future = docRef.set(version);
                future.get();

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "removeAssetChecksum", true, duration);

                return version;
            } catch (Exception e) {
                logger.error("Error removing asset checksum: assetPath={}", assetPath, e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "removeAssetChecksum", false, duration);
                throw new RuntimeException("Failed to remove asset checksum", e);
            }
        });
    }
}

