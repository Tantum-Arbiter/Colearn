package com.app.repository.impl;

import com.app.model.VoiceOverRecord;
import com.app.repository.VoiceOverRepository;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseVoiceOverRepository implements VoiceOverRepository {

    private final Firestore firestore;

    public FirebaseVoiceOverRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    private CollectionReference voiceOvers(String userId) {
        return firestore.collection("users").document(userId).collection("voiceOvers");
    }

    @Override
    public CompletableFuture<List<VoiceOverRecord>> findAll(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<VoiceOverRecord> result = new ArrayList<>();
                for (QueryDocumentSnapshot doc : voiceOvers(userId).get().get().getDocuments()) {
                    VoiceOverRecord record = doc.toObject(VoiceOverRecord.class);
                    record.setId(doc.getId());
                    result.add(record);
                }
                return result;
            } catch (Exception e) {
                throw new IllegalStateException("Failed to list voice-overs", e);
            }
        });
    }

    @Override
    public CompletableFuture<Optional<VoiceOverRecord>> find(String userId, String voiceOverId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentSnapshot doc = voiceOvers(userId).document(voiceOverId).get().get();
                if (!doc.exists()) {
                    return Optional.empty();
                }
                VoiceOverRecord record = doc.toObject(VoiceOverRecord.class);
                record.setId(doc.getId());
                return Optional.of(record);
            } catch (Exception e) {
                throw new IllegalStateException("Failed to read voice-over", e);
            }
        });
    }

    @Override
    public CompletableFuture<VoiceOverRecord> save(String userId, VoiceOverRecord record) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                voiceOvers(userId).document(record.getId()).set(record).get();
                return record;
            } catch (Exception e) {
                throw new IllegalStateException("Failed to save voice-over", e);
            }
        });
    }

    @Override
    public CompletableFuture<Void> delete(String userId, String voiceOverId) {
        return CompletableFuture.runAsync(() -> {
            try {
                voiceOvers(userId).document(voiceOverId).delete().get();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to delete voice-over", e);
            }
        });
    }

    @Override
    public CompletableFuture<Integer> deleteAll(String userId) {
        return CompletableFuture.supplyAsync(() -> FirebaseChildRepository.deleteCollection(voiceOvers(userId)));
    }
}
