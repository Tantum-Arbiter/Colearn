package com.app.service;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class GcsVoiceStorage implements VoiceStorage {

    private final Storage storage;
    private final String bucket;

    public GcsVoiceStorage(Storage storage, @Value("${app.voice.bucket:}") String bucket) {
        this.storage = storage;
        this.bucket = bucket == null ? "" : bucket.trim();
    }

    @Override
    public boolean configured() {
        return !bucket.isEmpty();
    }

    @Override
    public String signedUpload(String objectName, String contentType, long maxBytes, Duration ttl) {
        BlobInfo blob = BlobInfo.newBuilder(BlobId.of(bucket, objectName)).setContentType(contentType).build();
        return storage.signUrl(blob, ttl.toSeconds(), TimeUnit.SECONDS,
                Storage.SignUrlOption.httpMethod(HttpMethod.PUT),
                Storage.SignUrlOption.withContentType(),
                Storage.SignUrlOption.withExtHeaders(Map.of("x-goog-content-length-range", "0," + maxBytes)),
                Storage.SignUrlOption.withV4Signature()).toString();
    }

    @Override
    public String signedDownload(String objectName, Duration ttl) {
        BlobInfo blob = BlobInfo.newBuilder(BlobId.of(bucket, objectName)).build();
        return storage.signUrl(blob, ttl.toSeconds(), TimeUnit.SECONDS, Storage.SignUrlOption.withV4Signature()).toString();
    }

    @Override
    public int deletePrefix(String prefix) {
        int deleted = 0;
        for (Blob blob : storage.list(bucket, Storage.BlobListOption.prefix(prefix)).iterateAll()) {
            if (storage.delete(blob.getBlobId())) {
                deleted++;
            }
        }
        return deleted;
    }
}
