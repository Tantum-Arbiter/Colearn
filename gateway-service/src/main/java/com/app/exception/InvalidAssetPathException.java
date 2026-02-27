package com.app.exception;

import java.util.Map;

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

