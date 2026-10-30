package com.app.service;

import com.app.model.AchievementDefinition;
import com.app.model.ContentVersion;
import com.app.repository.AchievementDefinitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AchievementServiceTest {

    private AchievementDefinitionRepository repository;
    private AchievementService underTest;

    @BeforeEach
    void setUp() {
        repository = mock(AchievementDefinitionRepository.class);
        underTest = new AchievementService(repository);
        when(repository.findByIds(anyList())).thenAnswer(invocation -> {
            List<String> ids = invocation.getArgument(0);
            return CompletableFuture.completedFuture(ids.stream().map(AchievementServiceTest::definition).toList());
        });
    }

    private static AchievementDefinition definition(String id) {
        AchievementDefinition definition = new AchievementDefinition();
        definition.setId(id);
        definition.setVersion(1);
        return definition;
    }

    private static ContentVersion server(Map<String, String> achievementChecksums) {
        ContentVersion version = new ContentVersion();
        version.setAchievementChecksums(achievementChecksums);
        return version;
    }

    @Test
    void sendsNothingAndReadsNothingWhenTheDeviceIsCurrent() {
        AchievementService.Delta delta = underTest.delta(server(Map.of("a", "1", "b", "2")), Map.of("a", "1", "b", "2")).join();

        assertTrue(delta.definitions().isEmpty());
        assertTrue(delta.deletedIds().isEmpty());
        verify(repository, never()).findByIds(anyList());
    }

    @Test
    void sendsOnlyTheDefinitionsTheDeviceLacksOrHoldsAnOlderCopyOf() {
        AchievementService.Delta delta = underTest.delta(server(Map.of("a", "1", "b", "2", "c", "3")), Map.of("a", "1", "b", "old")).join();

        assertEquals(List.of("b", "c"), delta.definitions().stream().map(AchievementDefinition::getId).sorted().toList());
    }

    @Test
    void stampsEachDefinitionWithTheChecksumTheDeviceShouldSendBack() {
        AchievementService.Delta delta = underTest.delta(server(Map.of("a", "sum-a")), Map.of()).join();

        assertEquals("sum-a", delta.definitions().get(0).getChecksum());
    }

    @Test
    void tellsTheDeviceToForgetDefinitionsTheCmsRemoved() {
        AchievementService.Delta delta = underTest.delta(server(Map.of("a", "1")), Map.of("a", "1", "gone", "9")).join();

        assertEquals(List.of("gone"), delta.deletedIds());
    }

    @Test
    void copesWithAContentVersionWrittenBeforeBadgesExisted() {
        ContentVersion old = new ContentVersion();
        old.setAchievementChecksums(null);

        AchievementService.Delta delta = underTest.delta(old, Map.of("a", "1")).join();

        assertTrue(delta.definitions().isEmpty());
        assertEquals(List.of("a"), delta.deletedIds());
    }

    @Test
    void copesWithADeviceThatSendsNoChecksums() {
        AchievementService.Delta delta = underTest.delta(server(Map.of("a", "1")), null).join();

        assertEquals(1, delta.definitions().size());
        assertTrue(delta.deletedIds().isEmpty());
    }

    @Test
    void leavesOutADefinitionTheIndexNamesButTheCollectionNoLongerHolds() {
        when(repository.findByIds(anyList())).thenReturn(CompletableFuture.completedFuture(List.of()));

        AchievementService.Delta delta = underTest.delta(server(Map.of("a", "1")), Map.of()).join();

        assertTrue(delta.definitions().isEmpty());
    }
}
