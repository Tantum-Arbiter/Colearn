package com.app.repository.impl;

import com.app.model.AchievementDefinition;
import com.app.repository.AchievementDefinitionRepository;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseAchievementDefinitionRepository implements AchievementDefinitionRepository {

    static final String COLLECTION = "achievement_definitions";

    private final Firestore firestore;

    public FirebaseAchievementDefinitionRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    @Override
    public CompletableFuture<List<AchievementDefinition>> findByIds(List<String> ids) {
        if (ids.isEmpty()) {
            return CompletableFuture.completedFuture(List.of());
        }
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference[] refs = ids.stream()
                        .map(id -> firestore.collection(COLLECTION).document(id))
                        .toArray(DocumentReference[]::new);
                List<AchievementDefinition> result = new ArrayList<>();
                for (DocumentSnapshot doc : firestore.getAll(refs).get()) {
                    if (doc.exists()) {
                        AchievementDefinition definition = doc.toObject(AchievementDefinition.class);
                        definition.setId(doc.getId());
                        result.add(definition);
                    }
                }
                return result;
            } catch (Exception e) {
                throw new IllegalStateException("Failed to read achievement definitions", e);
            }
        });
    }
}
