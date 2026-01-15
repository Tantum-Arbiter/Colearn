package com.app.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for LocalizedText model
 * Tests localization with fallback to English
 */
class LocalizedTextTest {

    private LocalizedText localizedText;

    @BeforeEach
    void setUp() {
        localizedText = new LocalizedText();
        localizedText.setEn("English text");
        localizedText.setPl("Polish text");
        localizedText.setEs("Spanish text");
        localizedText.setDe("German text");
    }

    @Test
    @DisplayName("Should create LocalizedText with default constructor")
    void testDefaultConstructor() {
        LocalizedText lt = new LocalizedText();
        assertNotNull(lt);
        assertNull(lt.getEn());
    }

    @Test
    @DisplayName("Should set and get English text")
    void testEnglishGetterSetter() {
        localizedText.setEn("New English");
        assertEquals("New English", localizedText.getEn());
    }

    @Test
    @DisplayName("Should set and get Polish text")
    void testPolishGetterSetter() {
        localizedText.setPl("New Polish");
        assertEquals("New Polish", localizedText.getPl());
    }

    @Test
    @DisplayName("Should set and get Spanish text")
    void testSpanishGetterSetter() {
        localizedText.setEs("New Spanish");
        assertEquals("New Spanish", localizedText.getEs());
    }

    @Test
    @DisplayName("Should set and get German text")
    void testGermanGetterSetter() {
        localizedText.setDe("New German");
        assertEquals("New German", localizedText.getDe());
    }

    @Test
    @DisplayName("Should return text for valid language code")
    void testGetTextForLanguage() {
        assertEquals("English text", localizedText.getText("en"));
        assertEquals("Polish text", localizedText.getText("pl"));
        assertEquals("Spanish text", localizedText.getText("es"));
        assertEquals("German text", localizedText.getText("de"));
    }

    @Test
    @DisplayName("Should fallback to English for unsupported language")
    void testGetTextFallbackToEnglish() {
        assertEquals("English text", localizedText.getText("fr")); // French not supported
        assertEquals("English text", localizedText.getText("it")); // Italian not supported
    }

    @Test
    @DisplayName("Should fallback to English for null language")
    void testGetTextNullLanguage() {
        assertEquals("English text", localizedText.getText(null));
    }

    @Test
    @DisplayName("Should fallback to English when requested language is empty string")
    void testGetTextEmptyLanguage() {
        assertEquals("English text", localizedText.getText(""));
    }

    @Test
    @DisplayName("Should fallback to English when requested language has no translation")
    void testGetTextMissingTranslation() {
        LocalizedText partial = new LocalizedText();
        partial.setEn("Only English");
        
        assertEquals("Only English", partial.getText("pl"));
        assertEquals("Only English", partial.getText("es"));
        assertEquals("Only English", partial.getText("de"));
    }

    @Test
    @DisplayName("Should convert to map for Firestore")
    void testToMap() {
        Map<String, String> map = localizedText.toMap();

        assertNotNull(map);
        assertEquals("English text", map.get("en"));
        assertEquals("Polish text", map.get("pl"));
        assertEquals("Spanish text", map.get("es"));
        assertEquals("German text", map.get("de"));
    }

    @Test
    @DisplayName("Should create from map")
    void testFromMap() {
        Map<String, String> map = Map.of(
            "en", "Map English",
            "pl", "Map Polish",
            "es", "Map Spanish",
            "de", "Map German"
        );

        LocalizedText result = LocalizedText.fromMap(map);

        assertNotNull(result);
        assertEquals("Map English", result.getEn());
        assertEquals("Map Polish", result.getPl());
        assertEquals("Map Spanish", result.getEs());
        assertEquals("Map German", result.getDe());
    }

    @Test
    @DisplayName("Should handle null map in fromMap")
    void testFromMapNull() {
        LocalizedText result = LocalizedText.fromMap(null);
        assertNull(result);
    }

    @Test
    @DisplayName("Should handle partial map in fromMap")
    void testFromMapPartial() {
        Map<String, String> map = Map.of("en", "Only English");

        LocalizedText result = LocalizedText.fromMap(map);

        assertNotNull(result);
        assertEquals("Only English", result.getEn());
        assertNull(result.getPl());
        assertNull(result.getEs());
        assertNull(result.getDe());
    }
}

