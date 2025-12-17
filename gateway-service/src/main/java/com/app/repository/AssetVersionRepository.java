package com.app.repository;

import com.app.model.AssetVersion;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Repository interface for AssetVersion operations.
 * Manages asset versioning for delta-sync.
 */
public interface AssetVersionRepository {

    /**
     * Get current asset version
     * @return CompletableFuture with Optional AssetVersion
     */
    CompletableFuture<Optional<AssetVersion>> getCurrent();

    /**
     * Save or update asset version
     * @param assetVersion AssetVersion to save
     * @return CompletableFuture with saved AssetVersion
     */
    CompletableFuture<AssetVersion> save(AssetVersion assetVersion);

    /**
     * Update asset checksum in asset version
     * @param assetPath Asset path
     * @param checksum Asset checksum
     * @return CompletableFuture with updated AssetVersion
     */
    CompletableFuture<AssetVersion> updateAssetChecksum(String assetPath, String checksum);

    /**
     * Remove asset checksum from asset version
     * @param assetPath Asset path
     * @return CompletableFuture with updated AssetVersion
     */
    CompletableFuture<AssetVersion> removeAssetChecksum(String assetPath);
}

