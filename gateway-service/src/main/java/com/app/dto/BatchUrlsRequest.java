package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public class BatchUrlsRequest {

    public static final int MAX_PATHS = 100;

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

