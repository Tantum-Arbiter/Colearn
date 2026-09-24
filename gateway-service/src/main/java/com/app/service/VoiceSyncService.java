package com.app.service;

import com.app.dto.VoiceUploadRequest;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.VoiceOverRecord;
import com.app.repository.ConsentRepository;
import com.app.repository.VoiceOverRepository;
import com.google.cloud.Timestamp;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class VoiceSyncService {

    public static final long LIMIT_BYTES = 200L * 1024 * 1024;
    public static final long PAGE_LIMIT_BYTES = 10L * 1024 * 1024;
    public static final String CONTENT_TYPE = "audio/mp4";
    private static final String CONSENT_SCOPE = "voiceSync";
    private static final Duration LINK_TTL = Duration.ofMinutes(15);
    private static final Pattern VOICE_OVER_ID = Pattern.compile("^vo_[A-Za-z0-9_]{1,64}$");

    public record PageUpload(int pageIndex, String url, String contentType, long maxBytes) {
    }

    public record UploadPlan(List<PageUpload> uploads, long usedBytes, long limitBytes) {
    }

    public record PageLink(int pageIndex, long bytes, String url) {
    }

    public record VoiceOverListing(String id, String storyId, String label, List<PageLink> pages) {
    }

    private final VoiceStorage storage;
    private final VoiceOverRepository repository;
    private final ConsentRepository consents;

    public VoiceSyncService(VoiceStorage storage, VoiceOverRepository repository, ConsentRepository consents) {
        this.storage = storage;
        this.repository = repository;
        this.consents = consents;
    }

    public UploadPlan prepareUpload(String userId, String voiceOverId, VoiceUploadRequest request) {
        requireId(voiceOverId);
        for (VoiceUploadRequest.Page page : request.pages()) {
            if (page.bytes() > PAGE_LIMIT_BYTES) {
                throw new GatewayException(ErrorCode.INVALID_REQUEST, "A page recording can be at most 10 MB");
            }
        }
        requireConsent(userId);

        List<VoiceOverRecord> existing = repository.findAll(userId).join();
        VoiceOverRecord record = existing.stream().filter(r -> voiceOverId.equals(r.getId())).findFirst().orElseGet(VoiceOverRecord::new);
        Map<String, Long> pages = new HashMap<>(record.getPages() == null ? Map.of() : record.getPages());
        request.pages().forEach(page -> pages.put(String.valueOf(page.pageIndex()), page.bytes()));

        long others = existing.stream().filter(r -> !voiceOverId.equals(r.getId())).mapToLong(VoiceSyncService::bytesOf).sum();
        long used = others + pages.values().stream().mapToLong(Long::longValue).sum();
        if (used > LIMIT_BYTES) {
            throw new GatewayException(ErrorCode.VOICE_QUOTA_EXCEEDED, "Recordings kept online are limited to 200 MB per account");
        }

        record.setId(voiceOverId);
        record.setStoryId(request.storyId());
        record.setLabel(request.label());
        record.setPages(pages);
        record.setUpdatedAt(Timestamp.now());
        repository.save(userId, record).join();

        List<PageUpload> uploads = request.pages().stream()
                .map(page -> new PageUpload(page.pageIndex(),
                        storage.signedUpload(objectName(userId, voiceOverId, page.pageIndex()), CONTENT_TYPE, page.bytes(), LINK_TTL),
                        CONTENT_TYPE, page.bytes()))
                .toList();
        return new UploadPlan(uploads, used, LIMIT_BYTES);
    }

    public List<VoiceOverListing> list(String userId) {
        requireConsent(userId);
        return repository.findAll(userId).join().stream()
                .map(record -> new VoiceOverListing(record.getId(), record.getStoryId(), record.getLabel(), pageLinks(userId, record)))
                .toList();
    }

    public void delete(String userId, String voiceOverId) {
        requireId(voiceOverId);
        storage.deletePrefix("voice/" + userId + "/" + voiceOverId + "/");
        repository.delete(userId, voiceOverId).join();
    }

    public void deleteAll(String userId) {
        if (storage.configured()) {
            storage.deletePrefix("voice/" + userId + "/");
        }
        repository.deleteAll(userId).join();
    }

    public List<Map<String, Object>> exportSummary(String userId) {
        List<Map<String, Object>> summary = new ArrayList<>();
        for (VoiceOverRecord record : repository.findAll(userId).join()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", record.getId());
            entry.put("storyId", record.getStoryId());
            entry.put("label", record.getLabel());
            entry.put("pages", record.getPages() == null ? 0 : record.getPages().size());
            entry.put("bytes", bytesOf(record));
            summary.add(entry);
        }
        return summary;
    }

    private List<PageLink> pageLinks(String userId, VoiceOverRecord record) {
        Map<String, Long> pages = record.getPages() == null ? Map.of() : record.getPages();
        return pages.entrySet().stream()
                .map(entry -> Map.entry(Integer.parseInt(entry.getKey()), entry.getValue()))
                .sorted(Comparator.comparing(Map.Entry::getKey))
                .map(entry -> new PageLink(entry.getKey(), entry.getValue(),
                        storage.signedDownload(objectName(userId, record.getId(), entry.getKey()), LINK_TTL)))
                .toList();
    }

    private void requireConsent(String userId) {
        boolean agreed = consents.findAll(userId).join().stream().anyMatch(consent -> CONSENT_SCOPE.equals(consent.getScope()));
        if (!agreed) {
            throw new GatewayException(ErrorCode.VOICE_SYNC_NOT_CONSENTED, "Keeping recordings online needs a grown-up's agreement");
        }
    }

    private static void requireId(String voiceOverId) {
        if (voiceOverId == null || !VOICE_OVER_ID.matcher(voiceOverId).matches()) {
            throw new GatewayException(ErrorCode.INVALID_PARAMETER, "Invalid voice-over id");
        }
    }

    private static long bytesOf(VoiceOverRecord record) {
        return record.getPages() == null ? 0 : record.getPages().values().stream().mapToLong(Long::longValue).sum();
    }

    private static String objectName(String userId, String voiceOverId, int pageIndex) {
        return "voice/" + userId + "/" + voiceOverId + "/" + pageIndex + ".m4a";
    }
}
