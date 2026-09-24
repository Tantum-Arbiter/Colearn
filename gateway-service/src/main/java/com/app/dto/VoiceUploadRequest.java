package com.app.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record VoiceUploadRequest(
        @NotBlank @Pattern(regexp = "^[a-z0-9-]{1,100}$") String storyId,
        @NotBlank @Pattern(regexp = "^[^\\p{Cntrl}]{1,40}$") String label,
        @NotEmpty @Size(max = 200) List<@Valid Page> pages) {

    public record Page(@Min(0) @Max(999) int pageIndex, @Positive long bytes) {
    }
}
