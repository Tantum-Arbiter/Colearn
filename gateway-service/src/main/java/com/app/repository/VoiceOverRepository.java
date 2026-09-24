package com.app.repository;

import com.app.model.VoiceOverRecord;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

public interface VoiceOverRepository {

    CompletableFuture<List<VoiceOverRecord>> findAll(String userId);

    CompletableFuture<Optional<VoiceOverRecord>> find(String userId, String voiceOverId);

    CompletableFuture<VoiceOverRecord> save(String userId, VoiceOverRecord record);

    CompletableFuture<Void> delete(String userId, String voiceOverId);

    CompletableFuture<Integer> deleteAll(String userId);
}
