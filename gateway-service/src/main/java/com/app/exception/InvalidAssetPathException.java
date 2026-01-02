package com.app.exception;

import java.util.Map;

/**
 * Exception thrown when an invalid asset path is provided.
 * This includes path traversal attempts, invalid characters, or disallowed prefixes.
 */
public class InvalidAssetPathException extends GatewayException {

    private final String assetPath;
    private final String reason;

    public InvalidAssetPathException(String assetPath, String reason) {
        super(ErrorCode.INVALID_PARAMETER, 
              "Invalid asset path: " + reason,
              Map.of("path", assetPath != null ? assetPath : "null", "reason", reason));
        this.assetPath = assetPath;
        this.reason = reason;
    }

    public String getAssetPath() {
        return assetPath;
    }

    public String getReason() {
        return reason;
    }
}

