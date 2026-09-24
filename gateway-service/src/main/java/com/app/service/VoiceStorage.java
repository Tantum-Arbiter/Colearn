package com.app.service;

import java.time.Duration;

public interface VoiceStorage {

    boolean configured();

    String signedUpload(String objectName, String contentType, long maxBytes, Duration ttl);

    String signedDownload(String objectName, Duration ttl);

    int deletePrefix(String prefix);
}
