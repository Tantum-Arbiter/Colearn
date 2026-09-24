package com.app.service;

import com.app.dto.ChildDocument;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.Consent;
import com.app.model.User;
import com.app.model.UserProfile;
import com.app.repository.ChildRepository;
import com.app.repository.ConsentRepository;
import com.app.repository.DownloadRepository;
import com.app.repository.EntitlementRepository;
import com.app.repository.UserProfileRepository;
import com.app.repository.UserRepository;
import com.google.cloud.Timestamp;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AccountExportService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final ChildRepository childRepository;
    private final ConsentRepository consentRepository;
    private final DownloadRepository downloadRepository;
    private final EntitlementRepository entitlementRepository;
    private final VoiceSyncService voiceSyncService;

    public AccountExportService(UserRepository userRepository, UserProfileRepository userProfileRepository,
                                ChildRepository childRepository, ConsentRepository consentRepository,
                                DownloadRepository downloadRepository, EntitlementRepository entitlementRepository,
                                VoiceSyncService voiceSyncService) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.childRepository = childRepository;
        this.consentRepository = consentRepository;
        this.downloadRepository = downloadRepository;
        this.entitlementRepository = entitlementRepository;
        this.voiceSyncService = voiceSyncService;
    }

    public Map<String, Object> export(String userId) {
        User user = userRepository.findById(userId).join()
                .orElseThrow(() -> new GatewayException(ErrorCode.USER_NOT_FOUND, "User not found"));

        Map<String, Object> account = new LinkedHashMap<>();
        account.put("id", user.getId());
        account.put("provider", user.getProvider());
        account.put("providerId", user.getProviderId());
        account.put("createdAt", iso(user.getCreatedAt()));
        account.put("lastLoginAt", iso(user.getLastLoginAt()));

        Map<String, Object> export = new LinkedHashMap<>();
        export.put("exportedAt", Instant.now().toString());
        export.put("account", account);
        export.put("profile", userProfileRepository.findByUserId(userId).join().map(AccountExportService::profile).orElse(null));
        export.put("children", childRepository.findAll(userId).join().stream().map(ChildDocument::fromModel).toList());
        export.put("consents", consentRepository.findAll(userId).join().stream().map(AccountExportService::consent).toList());
        export.put("subscription", entitlementRepository.find(userId).join().map(AccountExportService::subscription).orElse(null));
        export.put("downloadedStories", downloadRepository.list(userId).join());
        export.put("voiceOvers", voiceSyncService.exportSummary(userId));
        return export;
    }

    private static Map<String, Object> subscription(com.app.model.Entitlement entitlement) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tier", entitlement.getTier());
        out.put("expiresAt", entitlement.getExpiresAtMs() == null ? null : Instant.ofEpochMilli(entitlement.getExpiresAtMs()).toString());
        out.put("environment", entitlement.getEnvironment());
        return out;
    }

    private static Map<String, Object> profile(UserProfile profile) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nickname", profile.getNickname());
        out.put("avatarType", profile.getAvatarType());
        out.put("avatarId", profile.getAvatarId());
        out.put("notifications", profile.getNotifications());
        out.put("schedule", profile.getSchedule());
        return out;
    }

    private static Map<String, Object> consent(Consent consent) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("policyVersion", consent.getPolicyVersion());
        out.put("scope", consent.getScope());
        out.put("acceptedAt", iso(consent.getAcceptedAt()));
        out.put("recordedAt", iso(consent.getRecordedAt()));
        out.put("appVersion", consent.getAppVersion());
        return out;
    }

    private static String iso(Instant instant) {
        return instant == null ? null : instant.toString();
    }

    private static String iso(Timestamp timestamp) {
        return timestamp == null ? null : Instant.ofEpochSecond(timestamp.getSeconds(), timestamp.getNanos()).toString();
    }
}
