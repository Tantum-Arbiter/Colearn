package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * StoryPage entity representing a page within a story
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StoryPage {
    
    private String id;
    private int pageNumber;
    private String type; // e.g., 'cover', 'story', 'ending'
    private String backgroundImage;
    private String characterImage;
    private String text;
    private String audioUrl; // URL for audio narration
    private Integer audioDuration; // Duration in seconds
    private String animationData; // JSON data for animations
    
    // Constructors
    public StoryPage() {}
    
    public StoryPage(String id, int pageNumber, String text) {
        this.id = id;
        this.pageNumber = pageNumber;
        this.text = text;
    }
    
    // Getters and Setters
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
    
    public String getText() {
        return text;
    }
    
    public void setText(String text) {
        this.text = text;
    }
    
    public String getAudioUrl() {
        return audioUrl;
    }
    
    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }
    
    public Integer getAudioDuration() {
        return audioDuration;
    }
    
    public void setAudioDuration(Integer audioDuration) {
        this.audioDuration = audioDuration;
    }
    
    public String getAnimationData() {
        return animationData;
    }
    
    public void setAnimationData(String animationData) {
        this.animationData = animationData;
    }
    
    // Helper methods
    public boolean hasAudio() {
        return audioUrl != null && !audioUrl.trim().isEmpty();
    }
    
    public boolean hasAnimation() {
        return animationData != null && !animationData.trim().isEmpty();
    }
    
    public boolean isCoverPage() {
        return "cover".equals(type) || pageNumber == 0;
    }
    
    @Override
    public String toString() {
        return "StoryPage{" +
                "id='" + id + '\'' +
                ", pageNumber=" + pageNumber +
                ", type='" + type + '\'' +
                ", hasAudio=" + hasAudio() +
                ", hasAnimation=" + hasAnimation() +
                '}';
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StoryPage storyPage = (StoryPage) o;
        return id != null && id.equals(storyPage.id);
    }
    
    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}
