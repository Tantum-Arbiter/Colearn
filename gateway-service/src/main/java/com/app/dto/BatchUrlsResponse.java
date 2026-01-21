package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO for batch URL generation endpoint.
 * Returns signed URLs for requested assets and lists any that failed.
 */
public class BatchUrlsResponse {

    @JsonProperty("urls")
    private List<UrlEntry> urls;

    @JsonProperty("failed")
    private List<String> failed;

    public BatchUrlsResponse() {
        this.urls = new ArrayList<>();
        this.failed = new ArrayList<>();
    }

    public List<UrlEntry> getUrls() {
        return urls;
    }

    public void setUrls(List<UrlEntry> urls) {
        this.urls = urls;
    }

    public List<String> getFailed() {
        return failed;
    }

    public void setFailed(List<String> failed) {
        this.failed = failed;
    }

    public void addUrl(String path, String signedUrl, long expiresAt) {
        this.urls.add(new UrlEntry(path, signedUrl, expiresAt));
    }

    public void addFailed(String path) {
        this.failed.add(path);
    }

    /**
     * Individual URL entry with path, signed URL, and expiration time.
     */
    public static class UrlEntry {
        @JsonProperty("path")
        private String path;

        @JsonProperty("signedUrl")
        private String signedUrl;

        @JsonProperty("expiresAt")
        private long expiresAt;

        public UrlEntry() {
        }

        public UrlEntry(String path, String signedUrl, long expiresAt) {
            this.path = path;
            this.signedUrl = signedUrl;
            this.expiresAt = expiresAt;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public String getSignedUrl() {
            return signedUrl;
        }

        public void setSignedUrl(String signedUrl) {
            this.signedUrl = signedUrl;
        }

        public long getExpiresAt() {
            return expiresAt;
        }

        public void setExpiresAt(long expiresAt) {
            this.expiresAt = expiresAt;
        }
    }
}

