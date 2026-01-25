package com.app.exception;

public class AssetUrlGenerationException extends GatewayException {

    private final String assetPath;

    public AssetUrlGenerationException(String assetPath) {
        super(ErrorCode.STORAGE_UNAVAILABLE, "Failed to generate URL for asset: " + assetPath);
        this.assetPath = assetPath;
    }

    public AssetUrlGenerationException(String assetPath, String message) {
        super(ErrorCode.STORAGE_UNAVAILABLE, message);
        this.assetPath = assetPath;
    }

    public AssetUrlGenerationException(String assetPath, Throwable cause) {
        super(ErrorCode.STORAGE_UNAVAILABLE, "Failed to generate URL for asset: " + assetPath, cause);
        this.assetPath = assetPath;
    }

    public AssetUrlGenerationException(String assetPath, String message, Throwable cause) {
        super(ErrorCode.STORAGE_UNAVAILABLE, message, cause);
        this.assetPath = assetPath;
    }

    public String getAssetPath() {
        return assetPath;
    }
}

