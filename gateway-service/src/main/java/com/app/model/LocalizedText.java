package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Represents localized text content for stories.
 * Stores translations for multiple languages.
 * 
 * Supported languages: en (English), pl (Polish), es (Spanish), de (German)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LocalizedText {

    @JsonProperty("en")
    private String en;

    @JsonProperty("pl")
    private String pl;

    @JsonProperty("es")
    private String es;

    @JsonProperty("de")
    private String de;

    // Default constructor
    public LocalizedText() {}

    // Constructor with English only (fallback)
    public LocalizedText(String en) {
        this.en = en;
    }

    // Constructor with all languages
    public LocalizedText(String en, String pl, String es, String de) {
        this.en = en;
        this.pl = pl;
        this.es = es;
        this.de = de;
    }

    /**
     * Get text for the specified language code.
     * Falls back to English if the requested language is not available.
     * 
     * @param languageCode ISO 639-1 language code (e.g., "en", "pl", "es", "de")
     * @return The localized text, or English fallback, or null if no text available
     */
    public String getText(String languageCode) {
        if (languageCode == null) {
            return en;
        }
        
        switch (languageCode.toLowerCase()) {
            case "pl":
                return pl != null ? pl : en;
            case "es":
                return es != null ? es : en;
            case "de":
                return de != null ? de : en;
            case "en":
            default:
                return en;
        }
    }

    /**
     * Convert to a Map for Firestore storage
     */
    public Map<String, String> toMap() {
        Map<String, String> map = new HashMap<>();
        if (en != null) map.put("en", en);
        if (pl != null) map.put("pl", pl);
        if (es != null) map.put("es", es);
        if (de != null) map.put("de", de);
        return map;
    }

    /**
     * Create from a Map (from Firestore)
     */
    public static LocalizedText fromMap(Map<String, String> map) {
        if (map == null) return null;
        LocalizedText text = new LocalizedText();
        text.setEn(map.get("en"));
        text.setPl(map.get("pl"));
        text.setEs(map.get("es"));
        text.setDe(map.get("de"));
        return text;
    }

    // Getters and Setters
    public String getEn() { return en; }
    public void setEn(String en) { this.en = en; }

    public String getPl() { return pl; }
    public void setPl(String pl) { this.pl = pl; }

    public String getEs() { return es; }
    public void setEs(String es) { this.es = es; }

    public String getDe() { return de; }
    public void setDe(String de) { this.de = de; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        LocalizedText that = (LocalizedText) o;
        return Objects.equals(en, that.en) &&
               Objects.equals(pl, that.pl) &&
               Objects.equals(es, that.es) &&
               Objects.equals(de, that.de);
    }

    @Override
    public int hashCode() {
        return Objects.hash(en, pl, es, de);
    }

    @Override
    public String toString() {
        return "LocalizedText{en='" + en + "'}";
    }
}

