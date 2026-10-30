package com.app.repository.impl;

import com.app.repository.DownloadRepository;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseDownloadRepository implements DownloadRepository {

    private final Firestore firestore;

    public FirebaseDownloadRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    private CollectionReference downloads(String userId) {
        return firestore.collection("users").document(userId).collection("downloads");
    }

    @Override
    public CompletableFuture<Boolean> has(String userId, String storyId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return downloads(userId).document(storyId).get().get().exists();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to read download", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> count(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return downloads(userId).count().get().get().getCount();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to count downloads", e);
            }
        });
    }

    @Override
    public CompletableFuture<Void> record(String userId, String storyId) {
        return CompletableFuture.runAsync(() -> {
            try {
                downloads(userId).document(storyId).set(Map.of("at", Timestamp.now())).get();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to record download", e);
            }
        });
    }

    @Override
    public CompletableFuture<Void> release(String userId, String storyId) {
        return CompletableFuture.runAsync(() -> {
            try {
                downloads(userId).document(storyId).delete().get();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to release download", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<String>> list(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return downloads(userId).get().get().getDocuments().stream().map(QueryDocumentSnapshot::getId).sorted().toList();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to list downloads", e);
            }
        });
    }

    @Override
    public CompletableFuture<Integer> deleteAll(String userId) {
        return CompletableFuture.supplyAsync(() -> FirebaseChildRepository.deleteCollection(downloads(userId)));
    }
}
