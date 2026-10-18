package com.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ConsentRequest(
        @NotBlank @Size(max = 20) @Pattern(regexp = "[0-9A-Za-z.\\-]+") String policyVersion,
        @NotBlank @Pattern(regexp = "core") String scope,
        Instant acceptedAt,
        @Size(max = 40) @Pattern(regexp = "[0-9A-Za-z.+\\-]*") String appVersion
) {
}
