package com.app.repository;

import com.app.model.AssetVersion;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public interface AssetVersionRepository {

    CompletableFuture<Optional<AssetVersion>> getCurrent();

    CompletableFuture<AssetVersion> save(AssetVersion assetVersion);

    CompletableFuture<AssetVersion> updateAssetChecksum(String assetPath, String checksum);

    CompletableFuture<AssetVersion> removeAssetChecksum(String assetPath);
}

