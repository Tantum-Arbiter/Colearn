package com.app.repository.impl;

import com.app.model.Child;
import com.app.repository.ChildRepository;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseChildRepository implements ChildRepository {

    private static final String USERS = "users";
    private static final String CHILDREN = "children";

    private final Firestore firestore;

    public FirebaseChildRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    private CollectionReference children(String userId) {
        return firestore.collection(USERS).document(userId).collection(CHILDREN);
    }

    @Override
    public CompletableFuture<List<Child>> findAll(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<Child> result = new ArrayList<>();
                for (QueryDocumentSnapshot doc : children(userId).get().get().getDocuments()) {
                    result.add(withId(doc.toObject(Child.class), doc.getId()));
                }
                return result;
            } catch (Exception e) {
                throw new IllegalStateException("Failed to list children", e);
            }
        });
    }

    @Override
    public CompletableFuture<Optional<Child>> find(String userId, String childId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentSnapshot doc = children(userId).document(childId).get().get();
                return doc.exists() ? Optional.of(withId(doc.toObject(Child.class), doc.getId())) : Optional.empty();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to read child", e);
            }
        });
    }

    @Override
    public CompletableFuture<PutResult> putIfVersion(String userId, Child child, long expectedVersion) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference ref = children(userId).document(child.getChildId());
                return firestore.runTransaction(transaction -> {
                    DocumentSnapshot current = transaction.get(ref).get();
                    long currentVersion = current.exists() ? current.getLong("version") == null ? 0 : current.getLong("version") : 0;
                    if (currentVersion != expectedVersion) {
                        Child existing = current.exists() ? withId(current.toObject(Child.class), current.getId()) : null;
                        return (PutResult) new Conflict(existing);
                    }
                    if (!current.exists()) {
                        int count = transaction.get(children(userId)).get().size();
                        if (count >= MAX_CHILDREN) {
                            return new LimitReached(MAX_CHILDREN);
                        }
                    }
                    child.setVersion(currentVersion + 1);
                    child.setUpdatedAt(Timestamp.now());
                    transaction.set(ref, child);
                    return new Saved(child);
                }).get();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to save child", e);
            }
        });
    }

    @Override
    public CompletableFuture<Integer> deleteAll(String userId) {
        return CompletableFuture.supplyAsync(() -> deleteCollection(children(userId)));
    }

    static int deleteCollection(CollectionReference collection) {
        try {
            int deleted = 0;
            for (QueryDocumentSnapshot doc : collection.get().get().getDocuments()) {
                doc.getReference().delete().get();
                deleted++;
            }
            return deleted;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to delete " + collection.getPath(), e);
        }
    }

    private static Child withId(Child child, String id) {
        child.setChildId(id);
        return child;
    }
}
