package com.app.service;

import com.app.model.Consent;
import com.app.model.ConsentLogEntry;
import com.app.model.User;
import com.app.repository.ConsentLogRepository;
import com.google.cloud.Timestamp;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class ConsentLog {

    private final ConsentLogRepository repository;
    private final Clock clock;
    private final Duration retention;

    @Autowired
    public ConsentLog(ConsentLogRepository repository, @Value("${app.consent-log.retention-days:1095}") long retentionDays) {
        this(repository, Clock.systemUTC(), Duration.ofDays(retentionDays));
    }

    public ConsentLog(ConsentLogRepository repository, Clock clock, Duration retention) {
        this.repository = repository;
        this.clock = clock;
        this.retention = retention;
    }

    public CompletableFuture<Void> preserve(User user, List<Consent> consents) {
        if (consents.isEmpty()) {
            return CompletableFuture.completedFuture(null);
        }
        Instant now = clock.instant();
        String subjectRef = subjectRef(user.getProvider(), user.getProviderId());
        List<ConsentLogEntry> entries = consents.stream().map(consent -> {
            ConsentLogEntry entry = new ConsentLogEntry();
            entry.setSubjectRef(subjectRef);
            entry.setPolicyVersion(consent.getPolicyVersion());
            entry.setScope(consent.getScope());
            entry.setAcceptedAt(consent.getAcceptedAt());
            entry.setRecordedAt(consent.getRecordedAt());
            entry.setAppVersion(consent.getAppVersion());
            entry.setAccountDeletedAt(timestamp(now));
            entry.setExpiresAt(timestamp(now.plus(retention)));
            return entry;
        }).toList();
        return repository.addAll(entries);
    }

    private static Timestamp timestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }

    private static String subjectRef(String provider, String providerId) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest((provider + ":" + providerId).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
