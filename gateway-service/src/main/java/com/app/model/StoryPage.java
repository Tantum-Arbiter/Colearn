package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StoryPage {

    @JsonProperty("id")
    @PropertyName("id")
    private String id;

    @JsonProperty("pageNumber")
    @PropertyName("pageNumber")
    private int pageNumber;

    @JsonProperty("type")
    @PropertyName("type")
    private String type;

    @JsonProperty("text")
    @PropertyName("text")
    private String text;

    @JsonProperty("localizedText")
    @PropertyName("localizedText")
    private LocalizedText localizedText;

    @JsonProperty("ageGroupText")
    @PropertyName("ageGroupText")
    private Map<String, LocalizedText> ageGroupText; // "0-2", "2-4", "4-6" -> LocalizedText

    @JsonProperty("backgroundImage")
    @PropertyName("backgroundImage")
    private String backgroundImage;

    @JsonProperty("characterImage")
    @PropertyName("characterImage")
    private String characterImage;

    @JsonProperty("interactiveElements")
    @PropertyName("interactiveElements")
    private List<InteractiveElement> interactiveElements;

    @JsonProperty("interactionType")
    @PropertyName("interactionType")
    private String interactionType; // "none", "interactive_state_change", "music_challenge", "jigsaw_puzzle"

    @JsonProperty("musicChallenge")
    @PropertyName("musicChallenge")
    private MusicChallenge musicChallenge;

    @JsonProperty("jigsawPuzzle")
    @PropertyName("jigsawPuzzle")
    private JigsawPuzzle jigsawPuzzle;

    @JsonProperty("readingChallenge")
    @PropertyName("readingChallenge")
    private ReadingChallenge readingChallenge;

    public StoryPage() {
        this.interactiveElements = new ArrayList<>();
    }

    public StoryPage(String id, int pageNumber, String text) {
        this();
        this.id = id;
        this.pageNumber = pageNumber;
        this.text = text;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(int pageNumber) {
        this.pageNumber = pageNumber;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public LocalizedText getLocalizedText() {
        return localizedText;
    }

    public void setLocalizedText(LocalizedText localizedText) {
        this.localizedText = localizedText;
    }

    public Map<String, LocalizedText> getAgeGroupText() {
        return ageGroupText;
    }

    public void setAgeGroupText(Map<String, LocalizedText> ageGroupText) {
        this.ageGroupText = ageGroupText;
    }

    /**
     * Get text for a specific language (no age group).
     * Resolution: localizedText[lang] → localizedText.en → text
     */
    public String getTextForLanguage(String languageCode) {
        if (localizedText != null) {
            String result = localizedText.getText(languageCode);
            if (result != null) return result;
        }
        return text;
    }

    /**
     * Get text for a specific language and age group.
     * Resolution: ageGroupText[ageGroup][lang] → ageGroupText[ageGroup].en
     *           → localizedText[lang] → localizedText.en → text
     */
    public String getTextForLanguageAndAgeGroup(String languageCode, String ageGroup) {
        // Try age-group-specific text first
        if (ageGroupText != null && ageGroup != null) {
            String[] fallbackChain = getAgeGroupFallbackChain(ageGroup);
            for (String group : fallbackChain) {
                LocalizedText groupText = ageGroupText.get(group);
                if (groupText != null) {
                    String result = groupText.getText(languageCode);
                    if (result != null) return result;
                }
            }
        }
        // Fall back to default localizedText
        return getTextForLanguage(languageCode);
    }

    /**
     * Returns the fallback chain for age groups.
     */
    private static String[] getAgeGroupFallbackChain(String ageGroup) {
        switch (ageGroup) {
            case "0-2": return new String[]{"0-2"};
            case "2-4": return new String[]{"2-4", "0-2"};
            case "4-6": return new String[]{"4-6", "2-4", "0-2"};
            default: return new String[]{"4-6", "2-4", "0-2"};
        }
    }

    public String getBackgroundImage() {
        return backgroundImage;
    }

    public void setBackgroundImage(String backgroundImage) {
        this.backgroundImage = backgroundImage;
    }

    public String getCharacterImage() {
        return characterImage;
    }

    public void setCharacterImage(String characterImage) {
        this.characterImage = characterImage;
    }

    public List<InteractiveElement> getInteractiveElements() {
        return interactiveElements;
    }

    public void setInteractiveElements(List<InteractiveElement> interactiveElements) {
        this.interactiveElements = interactiveElements;
    }

    public String getInteractionType() {
        return interactionType;
    }

    public void setInteractionType(String interactionType) {
        this.interactionType = interactionType;
    }

    public MusicChallenge getMusicChallenge() {
        return musicChallenge;
    }

    public void setMusicChallenge(MusicChallenge musicChallenge) {
        this.musicChallenge = musicChallenge;
    }

    public JigsawPuzzle getJigsawPuzzle() {
        return jigsawPuzzle;
    }

    public void setJigsawPuzzle(JigsawPuzzle jigsawPuzzle) {
        this.jigsawPuzzle = jigsawPuzzle;
    }

    public ReadingChallenge getReadingChallenge() {
        return readingChallenge;
    }

    public void setReadingChallenge(ReadingChallenge readingChallenge) {
        this.readingChallenge = readingChallenge;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StoryPage storyPage = (StoryPage) o;
        return pageNumber == storyPage.pageNumber &&
                Objects.equals(id, storyPage.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, pageNumber);
    }

    @Override
    public String toString() {
        return "StoryPage{" +
                "id='" + id + '\'' +
                ", pageNumber=" + pageNumber +
                ", type='" + type + '\'' +
                ", text='" + text + '\'' +
                '}';
    }
}

