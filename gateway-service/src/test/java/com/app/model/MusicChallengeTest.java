package com.app.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for MusicChallenge model.
 * Validates getters/setters, defaults, equals/hashCode, and toString.
 */
class MusicChallengeTest {

    private MusicChallenge challenge;

    @BeforeEach
    void setUp() {
        challenge = new MusicChallenge();
    }

    @Test
    @DisplayName("Should have correct defaults from no-arg constructor")
    void testDefaults() {
        assertTrue(challenge.isEnabled());
        assertEquals("guided", challenge.getMode());
        assertNotNull(challenge.getRequiredSequence());
        assertTrue(challenge.getRequiredSequence().isEmpty());
        assertTrue(challenge.isAutoPlaySuccessSong());
        assertFalse(challenge.isAllowSkip());
        assertTrue(challenge.isMicRequired());
        assertTrue(challenge.isFallbackAllowed());
        assertEquals("standard", challenge.getHintLevel());
    }

    @Test
    @DisplayName("Should set and get enabled")
    void testEnabled() {
        challenge.setEnabled(false);
        assertFalse(challenge.isEnabled());
    }

    @Test
    @DisplayName("Should set and get instrumentId")
    void testInstrumentId() {
        challenge.setInstrumentId("flute");
        assertEquals("flute", challenge.getInstrumentId());
    }

    @Test
    @DisplayName("Should set and get promptText")
    void testPromptText() {
        challenge.setPromptText("Play the flute to help Gary!");
        assertEquals("Play the flute to help Gary!", challenge.getPromptText());
    }

    @Test
    @DisplayName("Should set and get mode")
    void testMode() {
        challenge.setMode("free_play_optional");
        assertEquals("free_play_optional", challenge.getMode());
    }

    @Test
    @DisplayName("Should set and get requiredSequence")
    void testRequiredSequence() {
        List<String> sequence = Arrays.asList("C", "D", "E", "C");
        challenge.setRequiredSequence(sequence);
        assertEquals(4, challenge.getRequiredSequence().size());
        assertEquals("C", challenge.getRequiredSequence().get(0));
        assertEquals("D", challenge.getRequiredSequence().get(1));
        assertEquals("E", challenge.getRequiredSequence().get(2));
        assertEquals("C", challenge.getRequiredSequence().get(3));
    }

    @Test
    @DisplayName("Should set and get successSongId")
    void testSuccessSongId() {
        challenge.setSuccessSongId("gary_rock_lift_theme_v1");
        assertEquals("gary_rock_lift_theme_v1", challenge.getSuccessSongId());
    }

    @Test
    @DisplayName("Should set and get successStateId")
    void testSuccessStateId() {
        assertNull(challenge.getSuccessStateId());
        challenge.setSuccessStateId("rock_moved");
        assertEquals("rock_moved", challenge.getSuccessStateId());
    }

    @Test
    @DisplayName("Should set and get autoPlaySuccessSong")
    void testAutoPlaySuccessSong() {
        challenge.setAutoPlaySuccessSong(false);
        assertFalse(challenge.isAutoPlaySuccessSong());
    }

    @Test
    @DisplayName("Should set and get allowSkip")
    void testAllowSkip() {
        challenge.setAllowSkip(true);
        assertTrue(challenge.isAllowSkip());
    }

    @Test
    @DisplayName("Should set and get micRequired")
    void testMicRequired() {
        challenge.setMicRequired(false);
        assertFalse(challenge.isMicRequired());
    }

    @Test
    @DisplayName("Should set and get fallbackAllowed")
    void testFallbackAllowed() {
        challenge.setFallbackAllowed(false);
        assertFalse(challenge.isFallbackAllowed());
    }

    @Test
    @DisplayName("Should set and get hintLevel")
    void testHintLevel() {
        challenge.setHintLevel("verbose");
        assertEquals("verbose", challenge.getHintLevel());
    }

    @Test
    @DisplayName("Should compare equal challenges by enabled, instrumentId, successSongId, requiredSequence")
    void testEquals() {
        MusicChallenge c1 = createTestChallenge();
        MusicChallenge c2 = createTestChallenge();
        assertEquals(c1, c2);
    }

    @Test
    @DisplayName("Should not equal when instrumentId differs")
    void testNotEqualsDifferentInstrument() {
        MusicChallenge c1 = createTestChallenge();
        MusicChallenge c2 = createTestChallenge();
        c2.setInstrumentId("trumpet_basic");
        assertNotEquals(c1, c2);
    }

    @Test
    @DisplayName("Should generate consistent hashCode for equal objects")
    void testHashCode() {
        MusicChallenge c1 = createTestChallenge();
        MusicChallenge c2 = createTestChallenge();
        assertEquals(c1.hashCode(), c2.hashCode());
    }

    @Test
    @DisplayName("Should produce meaningful toString")
    void testToString() {
        challenge.setInstrumentId("flute");
        challenge.setMode("guided");
        challenge.setRequiredSequence(Arrays.asList("C", "D"));
        challenge.setSuccessSongId("test_song");
        String str = challenge.toString();
        assertTrue(str.contains("flute"));
        assertTrue(str.contains("guided"));
        assertTrue(str.contains("test_song"));
    }

    @Test
    @DisplayName("Should handle null requiredSequence gracefully")
    void testNullRequiredSequence() {
        challenge.setRequiredSequence(null);
        assertNull(challenge.getRequiredSequence());
    }

    /**
     * Creates a fully-populated test MusicChallenge for use in equality/comparison tests.
     */
    private MusicChallenge createTestChallenge() {
        MusicChallenge c = new MusicChallenge();
        c.setEnabled(true);
        c.setInstrumentId("flute");
        c.setPromptText("Play the flute to help Gary!");
        c.setMode("guided");
        c.setRequiredSequence(Arrays.asList("C", "D", "E", "C"));
        c.setSuccessSongId("gary_rock_lift_theme_v1");
        c.setSuccessStateId("rock_moved");
        c.setAutoPlaySuccessSong(true);
        c.setAllowSkip(false);
        c.setMicRequired(true);
        c.setFallbackAllowed(true);
        c.setHintLevel("standard");
        return c;
    }
}