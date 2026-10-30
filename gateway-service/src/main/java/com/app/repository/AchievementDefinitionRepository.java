package com.app.repository;

import com.app.model.AchievementDefinition;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public interface AchievementDefinitionRepository {

    CompletableFuture<List<AchievementDefinition>> findByIds(List<String> ids);
}
