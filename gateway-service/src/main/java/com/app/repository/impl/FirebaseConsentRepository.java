package com.app.repository.impl;

import com.app.model.Consent;
import com.app.repository.ConsentRepository;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseConsentRepository implements ConsentRepository {

    private final Firestore firestore;

    public FirebaseConsentRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    private CollectionReference consents(String userId) {
        return firestore.collection("users").document(userId).collection("consents");
    }

    @Override
    public CompletableFuture<Consent> add(String userId, Consent consent) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                consents(userId).add(consent).get();
                return consent;
            } catch (Exception e) {
                throw new IllegalStateException("Failed to record consent", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Consent>> findAll(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<Consent> result = new ArrayList<>();
                for (QueryDocumentSnapshot doc : consents(userId).orderBy("recordedAt").get().get().getDocuments()) {
                    result.add(doc.toObject(Consent.class));
                }
                return result;
            } catch (Exception e) {
                throw new IllegalStateException("Failed to list consents", e);
            }
        });
    }

    @Override
    public CompletableFuture<Integer> deleteAll(String userId) {
        return CompletableFuture.supplyAsync(() -> FirebaseChildRepository.deleteCollection(consents(userId)));
    }
}
