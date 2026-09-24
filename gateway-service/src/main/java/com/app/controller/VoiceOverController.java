package com.app.controller;

import com.app.dto.VoiceUploadRequest;
import com.app.exception.ErrorCode;
import com.app.security.AuthenticatedUser;
import com.app.service.VoiceStorage;
import com.app.service.VoiceSyncService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/voice-overs")
public class VoiceOverController {

    private final VoiceSyncService voiceSyncService;
    private final VoiceStorage voiceStorage;

    public VoiceOverController(VoiceSyncService voiceSyncService, VoiceStorage voiceStorage) {
        this.voiceSyncService = voiceSyncService;
        this.voiceStorage = voiceStorage;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        if (!voiceStorage.configured()) {
            return unavailable();
        }
        return ResponseEntity.ok(Map.of("voiceOvers", voiceSyncService.list(AuthenticatedUser.id())));
    }

    @PostMapping("/{voiceOverId}/uploads")
    public ResponseEntity<?> prepareUpload(@PathVariable String voiceOverId, @Valid @RequestBody VoiceUploadRequest request) {
        if (!voiceStorage.configured()) {
            return unavailable();
        }
        VoiceSyncService.UploadPlan plan = voiceSyncService.prepareUpload(AuthenticatedUser.id(), voiceOverId, request);
        return ResponseEntity.ok(Map.of(
                "uploads", plan.uploads().stream().map(upload -> Map.of(
                        "pageIndex", upload.pageIndex(),
                        "url", upload.url(),
                        "headers", Map.of(
                                "Content-Type", upload.contentType(),
                                "x-goog-content-length-range", "0," + upload.maxBytes()))).toList(),
                "usedBytes", plan.usedBytes(),
                "limitBytes", plan.limitBytes()));
    }

    @DeleteMapping("/{voiceOverId}")
    public ResponseEntity<?> delete(@PathVariable String voiceOverId) {
        if (!voiceStorage.configured()) {
            return unavailable();
        }
        voiceSyncService.delete(AuthenticatedUser.id(), voiceOverId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAll() {
        if (!voiceStorage.configured()) {
            return unavailable();
        }
        voiceSyncService.deleteAll(AuthenticatedUser.id());
        return ResponseEntity.noContent().build();
    }

    private static ResponseEntity<Map<String, Object>> unavailable() {
        ErrorCode code = ErrorCode.FEATURE_NOT_AVAILABLE;
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("success", false, "errorCode", code.getCode(), "error", code.getDefaultMessage()));
    }
}
