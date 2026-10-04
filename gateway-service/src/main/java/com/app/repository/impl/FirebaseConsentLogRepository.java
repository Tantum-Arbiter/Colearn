package com.app.repository.impl;

import com.app.model.ConsentLogEntry;
import com.app.repository.ConsentLogRepository;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteBatch;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseConsentLogRepository implements ConsentLogRepository {

    static final String COLLECTION_NAME = "consent_log";

    private final Firestore firestore;

    public FirebaseConsentLogRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public CompletableFuture<Void> addAll(List<ConsentLogEntry> entries) {
        return CompletableFuture.runAsync(() -> {
            try {
                WriteBatch batch = firestore.batch();
                for (ConsentLogEntry entry : entries) {
                    batch.set(firestore.collection(COLLECTION_NAME).document(), entry);
                }
                batch.commit().get();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to keep the consent log", e);
            }
        });
    }
}
