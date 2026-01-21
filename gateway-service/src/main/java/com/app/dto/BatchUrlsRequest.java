package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for batch URL generation endpoint.
 * Allows clients to request signed URLs for multiple assets in a single request.
 * 
 * This reduces API calls from N (one per asset) to ceil(N/50) (batched).
 */
public class BatchUrlsRequest {

    /**
     * Maximum number of paths allowed per request.
     * Prevents abuse and ensures reasonable response times.
     */
    public static final int MAX_PATHS = 50;

    @JsonProperty("paths")
    @NotEmpty(message = "paths cannot be empty")
    @Size(max = MAX_PATHS, message = "paths cannot exceed " + MAX_PATHS + " entries")
    private List<String> paths;

    public BatchUrlsRequest() {
    }

    public BatchUrlsRequest(List<String> paths) {
        this.paths = paths;
    }

    public List<String> getPaths() {
        return paths;
    }

    public void setPaths(List<String> paths) {
        this.paths = paths;
    }
}

