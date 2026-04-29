package com.app.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for StoryPage model
 * Tests validation, getters/setters, and interactiveElements
 */
class StoryPageTest {

    private StoryPage storyPage;

    @BeforeEach
    void setUp() {
        storyPage = new StoryPage();
        storyPage.setId("story-1-page-2");
        storyPage.setPageNumber(2);
        storyPage.setType("story");
        storyPage.setText("She wants to make a snowman.\nWhat's inside this shed?");
        storyPage.setBackgroundImage("assets/stories/test/page-2/page-2.webp");
    }

    @Test
    @DisplayName("Should create StoryPage with default constructor")
    void testDefaultConstructor() {
        StoryPage page = new StoryPage();
        assertNotNull(page);
        assertNotNull(page.getInteractiveElements());
        assertTrue(page.getInteractiveElements().isEmpty());
    }

    @Test
    @DisplayName("Should create StoryPage with parameterized constructor")
    void testParameterizedConstructor() {
        StoryPage page = new StoryPage("page-id", 1, "Some text");
        
        assertEquals("page-id", page.getId());
        assertEquals(1, page.getPageNumber());
        assertEquals("Some text", page.getText());
        assertNotNull(page.getInteractiveElements());
    }

    @Test
    @DisplayName("Should set and get id")
    void testIdGetterSetter() {
        storyPage.setId("new-id");
        assertEquals("new-id", storyPage.getId());
    }

    @Test
    @DisplayName("Should set and get pageNumber")
    void testPageNumberGetterSetter() {
        storyPage.setPageNumber(5);
        assertEquals(5, storyPage.getPageNumber());
    }

    @Test
    @DisplayName("Should set and get type")
    void testTypeGetterSetter() {
        storyPage.setType("cover");
        assertEquals("cover", storyPage.getType());
    }

    @Test
    @DisplayName("Should set and get text")
    void testTextGetterSetter() {
        storyPage.setText("New story text");
        assertEquals("New story text", storyPage.getText());
    }

    @Test
    @DisplayName("Should set and get backgroundImage")
    void testBackgroundImageGetterSetter() {
        storyPage.setBackgroundImage("assets/new-bg.webp");
        assertEquals("assets/new-bg.webp", storyPage.getBackgroundImage());
    }

    @Test
    @DisplayName("Should set and get characterImage")
    void testCharacterImageGetterSetter() {
        storyPage.setCharacterImage("assets/character.webp");
        assertEquals("assets/character.webp", storyPage.getCharacterImage());
    }

    @Test
    @DisplayName("Should set and get interactiveElements")
    void testInteractiveElementsGetterSetter() {
        InteractiveElement element1 = new InteractiveElement("door", "reveal", "door.webp");
        element1.setPosition(new InteractiveElement.Position(0.5, 0.5));
        element1.setSize(new InteractiveElement.Size(0.25, 0.30));
        
        InteractiveElement element2 = new InteractiveElement("basket", "reveal", "basket.webp");
        element2.setPosition(new InteractiveElement.Position(0.6, 0.7));
        element2.setSize(new InteractiveElement.Size(0.2, 0.2));
        
        List<InteractiveElement> elements = Arrays.asList(element1, element2);
        storyPage.setInteractiveElements(elements);
        
        assertNotNull(storyPage.getInteractiveElements());
        assertEquals(2, storyPage.getInteractiveElements().size());
        assertEquals("door", storyPage.getInteractiveElements().get(0).getId());
        assertEquals("basket", storyPage.getInteractiveElements().get(1).getId());
    }

    @Test
    @DisplayName("Should handle null interactiveElements")
    void testNullInteractiveElements() {
        storyPage.setInteractiveElements(null);
        assertNull(storyPage.getInteractiveElements());
    }

    @Test
    @DisplayName("Should handle empty interactiveElements")
    void testEmptyInteractiveElements() {
        storyPage.setInteractiveElements(new ArrayList<>());
        assertNotNull(storyPage.getInteractiveElements());
        assertTrue(storyPage.getInteractiveElements().isEmpty());
    }

    @Test
    @DisplayName("Should validate interactiveElements with position and size")
    void testInteractiveElementsWithFullData() {
        InteractiveElement element = new InteractiveElement();
        element.setId("door");
        element.setType("reveal");
        element.setImage("assets/stories/squirrels-snowman/page-2/door-open.webp");
        element.setPosition(new InteractiveElement.Position(0.481, 0.337));
        element.setSize(new InteractiveElement.Size(0.273, 0.301));
        
        storyPage.setInteractiveElements(Arrays.asList(element));
        
        InteractiveElement retrieved = storyPage.getInteractiveElements().get(0);
        assertEquals("door", retrieved.getId());
        assertEquals("reveal", retrieved.getType());
        assertEquals(0.481, retrieved.getPosition().getX(), 0.001);
        assertEquals(0.337, retrieved.getPosition().getY(), 0.001);
        assertEquals(0.273, retrieved.getSize().getWidth(), 0.001);
        assertEquals(0.301, retrieved.getSize().getHeight(), 0.001);
    }

    @Test
    @DisplayName("Should compare pages by id and pageNumber")
    void testEquals() {
        StoryPage page1 = new StoryPage("page-1", 2, "Text 1");
        StoryPage page2 = new StoryPage("page-1", 2, "Text 2");
        StoryPage page3 = new StoryPage("page-2", 2, "Text 1");
        
        assertEquals(page1, page2);
        assertNotEquals(page1, page3);
    }

    @Test
    @DisplayName("Should generate consistent hashCode")
    void testHashCode() {
        StoryPage page1 = new StoryPage("page-1", 2, "Text 1");
        StoryPage page2 = new StoryPage("page-1", 2, "Text 2");

        assertEquals(page1.hashCode(), page2.hashCode());
    }

    // Localization tests

    @Test
    @DisplayName("Should set and get localizedText")
    void testLocalizedTextGetterSetter() {
        LocalizedText localizedText = new LocalizedText();
        localizedText.setEn("English text");
        localizedText.setPl("Polish text");

        storyPage.setLocalizedText(localizedText);

        assertNotNull(storyPage.getLocalizedText());
        assertEquals("English text", storyPage.getLocalizedText().getEn());
        assertEquals("Polish text", storyPage.getLocalizedText().getPl());
    }

    @Test
    @DisplayName("Should return localized text for requested language")
    void testGetTextForLanguage() {
        LocalizedText localizedText = new LocalizedText();
        localizedText.setEn("Once upon a time...");
        localizedText.setPl("Dawno dawno temu...");
        localizedText.setEs("Érase una vez...");
        localizedText.setDe("Es war einmal...");

        storyPage.setLocalizedText(localizedText);

        assertEquals("Once upon a time...", storyPage.getTextForLanguage("en"));
        assertEquals("Dawno dawno temu...", storyPage.getTextForLanguage("pl"));
        assertEquals("Érase una vez...", storyPage.getTextForLanguage("es"));
        assertEquals("Es war einmal...", storyPage.getTextForLanguage("de"));
    }

    @Test
    @DisplayName("Should fallback to English when language not available")
    void testTextForLanguageFallbackToEnglish() {
        LocalizedText localizedText = new LocalizedText();
        localizedText.setEn("English fallback");
        // No Polish translation

        storyPage.setLocalizedText(localizedText);

        // Should fallback to English when Polish not available
        assertEquals("English fallback", storyPage.getTextForLanguage("pl"));
    }

    @Test
    @DisplayName("Should fallback to default text when no localization")
    void testTextForLanguageFallbackToDefaultText() {
        storyPage.setText("Default page text");
        storyPage.setLocalizedText(null);

        assertEquals("Default page text", storyPage.getTextForLanguage("en"));
        assertEquals("Default page text", storyPage.getTextForLanguage("pl"));
    }

    @Test
    @DisplayName("Should handle null language code")
    void testTextForLanguageNullLanguage() {
        LocalizedText localizedText = new LocalizedText();
        localizedText.setEn("English text");
        storyPage.setLocalizedText(localizedText);

        // Null language should return English
        assertEquals("English text", storyPage.getTextForLanguage(null));
    }

    // =============================================
    // Interaction type and music challenge tests
    // =============================================

    @Test
    @DisplayName("Should default to null interactionType (treated as 'none' by clients)")
    void testInteractionTypeDefaultsToNull() {
        StoryPage page = new StoryPage();
        assertNull(page.getInteractionType());
    }

    @Test
    @DisplayName("Should set and get interactionType 'none' for static pages")
    void testInteractionTypeNone() {
        storyPage.setInteractionType("none");
        assertEquals("none", storyPage.getInteractionType());
    }

    @Test
    @DisplayName("Should set and get interactionType 'interactive_state_change'")
    void testInteractionTypeInteractiveStateChange() {
        storyPage.setInteractionType("interactive_state_change");
        assertEquals("interactive_state_change", storyPage.getInteractionType());
    }

    @Test
    @DisplayName("Should set and get interactionType 'music_challenge'")
    void testInteractionTypeMusicChallenge() {
        storyPage.setInteractionType("music_challenge");
        assertEquals("music_challenge", storyPage.getInteractionType());
    }

    @Test
    @DisplayName("Should default to null musicChallenge")
    void testMusicChallengeDefaultsToNull() {
        StoryPage page = new StoryPage();
        assertNull(page.getMusicChallenge());
    }

    @Test
    @DisplayName("Should set and get musicChallenge")
    void testMusicChallengeGetterSetter() {
        MusicChallenge challenge = new MusicChallenge();
        challenge.setInstrumentId("flute");
        challenge.setPromptText("Play the flute!");
        challenge.setRequiredSequence(Arrays.asList("C", "D", "E"));
        challenge.setSuccessSongId("test_song_v1");

        storyPage.setInteractionType("music_challenge");
        storyPage.setMusicChallenge(challenge);

        assertNotNull(storyPage.getMusicChallenge());
        assertEquals("flute", storyPage.getMusicChallenge().getInstrumentId());
        assertEquals("Play the flute!", storyPage.getMusicChallenge().getPromptText());
        assertEquals(3, storyPage.getMusicChallenge().getRequiredSequence().size());
        assertEquals("test_song_v1", storyPage.getMusicChallenge().getSuccessSongId());
    }

    @Test
    @DisplayName("Static page should have no musicChallenge and interactionType 'none'")
    void testStaticPageStructure() {
        StoryPage staticPage = new StoryPage("static-page", 1, "A calm story scene.");
        staticPage.setInteractionType("none");

        assertEquals("none", staticPage.getInteractionType());
        assertNull(staticPage.getMusicChallenge());
    }

    @Test
    @DisplayName("Interactive page can also have musicChallenge for a specific page")
    void testInteractivePageWithMusicChallenge() {
        // An interactive page that ALSO has a music challenge
        InteractiveElement element = new InteractiveElement("rock", "reveal", "rock-moved.webp");
        element.setPosition(new InteractiveElement.Position(0.5, 0.5));
        element.setSize(new InteractiveElement.Size(0.3, 0.3));
        storyPage.setInteractiveElements(Arrays.asList(element));

        // This page uses music_challenge as its primary interaction
        storyPage.setInteractionType("music_challenge");

        MusicChallenge challenge = new MusicChallenge();
        challenge.setInstrumentId("trumpet");
        challenge.setPromptText("Gary needs to wake the dragon. Play the trumpet!");
        challenge.setRequiredSequence(Arrays.asList("C", "D", "E", "C"));
        challenge.setSuccessSongId("gary_rock_lift_theme_v1");
        challenge.setSuccessStateId("rock_moved");
        storyPage.setMusicChallenge(challenge);

        // Verify both interactive elements AND music challenge coexist
        assertEquals("music_challenge", storyPage.getInteractionType());
        assertNotNull(storyPage.getInteractiveElements());
        assertEquals(1, storyPage.getInteractiveElements().size());
        assertNotNull(storyPage.getMusicChallenge());
        assertEquals("trumpet", storyPage.getMusicChallenge().getInstrumentId());
        assertEquals("rock_moved", storyPage.getMusicChallenge().getSuccessStateId());
    }

    @Test
    @DisplayName("Should handle null musicChallenge on non-music page")
    void testNullMusicChallengeOnNonMusicPage() {
        storyPage.setInteractionType("interactive_state_change");
        storyPage.setMusicChallenge(null);
        assertNull(storyPage.getMusicChallenge());
        assertEquals("interactive_state_change", storyPage.getInteractionType());
    }

    @Test
    @DisplayName("Should accept any valid instrumentId configured via CMS")
    void testDifferentInstrumentIds() {
        // CMS can configure any of the 6 supported instruments
        String[] instruments = { "flute", "recorder", "ocarina", "trumpet", "clarinet", "saxophone" };
        for (String instrumentId : instruments) {
            MusicChallenge challenge = new MusicChallenge();
            challenge.setInstrumentId(instrumentId);
            challenge.setRequiredSequence(Arrays.asList("C", "D"));
            challenge.setSuccessSongId("test_song");

            StoryPage page = new StoryPage();
            page.setInteractionType("music_challenge");
            page.setMusicChallenge(challenge);

            assertEquals("music_challenge", page.getInteractionType());
            assertEquals(instrumentId, page.getMusicChallenge().getInstrumentId());
        }
    }
}

