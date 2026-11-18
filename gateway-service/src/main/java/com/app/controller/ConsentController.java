package com.app.controller;

import com.app.dto.ConsentRequest;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.Consent;
import com.app.repository.ConsentRepository;
import com.app.security.AuthenticatedUser;
import com.google.cloud.Timestamp;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/consents")
public class ConsentController {

    private final ConsentRepository consentRepository;

    public ConsentController(ConsentRepository consentRepository) {
        this.consentRepository = consentRepository;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> record(@Valid @RequestBody ConsentRequest request) {
        Instant now = Instant.now();
        if (request.acceptedAt() != null && request.acceptedAt().isAfter(now.plusSeconds(60))) {
            throw new GatewayException(ErrorCode.FIELD_VALIDATION_FAILED, "acceptedAt cannot be in the future");
        }
        Timestamp recordedAt = Timestamp.ofTimeSecondsAndNanos(now.getEpochSecond(), now.getNano());
        Consent consent = new Consent();
        consent.setPolicyVersion(request.policyVersion());
        consent.setScope(request.scope());
        consent.setAppVersion(request.appVersion());
        consent.setRecordedAt(recordedAt);
        consent.setAcceptedAt(request.acceptedAt() == null
                ? recordedAt
                : Timestamp.ofTimeSecondsAndNanos(request.acceptedAt().getEpochSecond(), request.acceptedAt().getNano()));
        consentRepository.add(AuthenticatedUser.id(), consent).join();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("status", "recorded"));
    }
}
