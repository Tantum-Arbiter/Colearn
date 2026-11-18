package com.app.repository.impl;

import com.app.model.Entitlement;
import com.app.repository.EntitlementRepository;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.UnaryOperator;

@Repository
public class FirebaseEntitlementRepository implements EntitlementRepository {

    private static final String FIELD = "entitlement";

    private final Firestore firestore;

    public FirebaseEntitlementRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    private DocumentReference user(String userId) {
        return firestore.collection("users").document(userId);
    }

    private static Entitlement read(DocumentSnapshot snapshot) {
        return snapshot.exists() ? snapshot.get(FIELD, Entitlement.class) : null;
    }

    @Override
    public CompletableFuture<Optional<Entitlement>> find(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return Optional.ofNullable(read(user(userId).get().get()));
            } catch (Exception e) {
                throw new IllegalStateException("Failed to read entitlement", e);
            }
        });
    }

    @Override
    public CompletableFuture<Boolean> update(String userId, UnaryOperator<Entitlement> change) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return firestore.runTransaction(transaction -> {
                    DocumentSnapshot snapshot = transaction.get(user(userId)).get();
                    if (!snapshot.exists()) {
                        return false;
                    }
                    Entitlement next = change.apply(read(snapshot));
                    if (next != null) {
                        transaction.update(user(userId), Map.of(FIELD, next));
                    }
                    return true;
                }).get();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to update entitlement", e);
            }
        });
    }
}
