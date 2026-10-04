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
    private Map<String, LocalizedText> localizedText;

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

    public Map<String, LocalizedText> getLocalizedText() {
        return localizedText;
    }

    public void setLocalizedText(Map<String, LocalizedText> localizedText) {
        this.localizedText = localizedText;
    }

    public String getTextForLanguage(String languageCode) {
        return getTextForLanguageAndAgeGroup(languageCode, null);
    }

    /**
     * The requested language in the child's age group and then the nearest ones, then English in
     * the same order, then the page text. The app resolves in the same order (types/story.ts).
     */
    public String getTextForLanguageAndAgeGroup(String languageCode, String ageGroup) {
        if (localizedText != null) {
            List<String> chain = ageGroupFallbackChain(ageGroup);
            List<String> languages = languageCode == null || "en".equalsIgnoreCase(languageCode)
                    ? List.of("en")
                    : List.of(languageCode, "en");
            for (String language : languages) {
                for (String group : chain) {
                    LocalizedText groupText = localizedText.get(group);
                    String result = groupText != null ? groupText.getExactText(language) : null;
                    if (result != null && !result.isEmpty()) {
                        return result;
                    }
                }
            }
        }
        return text;
    }

    public static List<String> ageGroupFallbackChain(String ageGroup) {
        if (ageGroup == null) {
            return List.of("4-6", "2-4", "0-2");
        }
        return switch (ageGroup) {
            case "0-2" -> List.of("0-2", "2-4", "4-6");
            case "2-4" -> List.of("2-4", "0-2", "4-6");
            default -> List.of("4-6", "2-4", "0-2");
        };
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

