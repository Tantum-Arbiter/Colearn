package com.app.service;

import com.app.model.AchievementDefinition;
import com.app.model.ContentVersion;
import com.app.repository.AchievementDefinitionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class AchievementService {

    public record Delta(List<AchievementDefinition> definitions, List<String> deletedIds) {
    }

    private final AchievementDefinitionRepository repository;

    public AchievementService(AchievementDefinitionRepository repository) {
        this.repository = repository;
    }

    public CompletableFuture<Delta> delta(ContentVersion server, Map<String, String> clientChecksums) {
        Map<String, String> serverChecksums = server.getAchievementChecksums() != null ? server.getAchievementChecksums() : Map.of();
        Map<String, String> held = clientChecksums != null ? clientChecksums : Map.of();

        List<String> deletedIds = held.keySet().stream()
                .filter(id -> !serverChecksums.containsKey(id))
                .sorted()
                .toList();
        List<String> changedIds = serverChecksums.entrySet().stream()
                .filter(entry -> !entry.getValue().equals(held.get(entry.getKey())))
                .map(Map.Entry::getKey)
                .sorted()
                .toList();

        if (changedIds.isEmpty()) {
            return CompletableFuture.completedFuture(new Delta(List.of(), deletedIds));
        }
        return repository.findByIds(changedIds).thenApply(definitions -> {
            definitions.forEach(definition -> definition.setChecksum(serverChecksums.get(definition.getId())));
            return new Delta(definitions, deletedIds);
        });
    }
}
