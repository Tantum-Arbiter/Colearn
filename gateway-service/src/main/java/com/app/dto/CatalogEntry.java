package com.app.dto;

import com.app.model.LocalizedText;
import com.app.model.Story;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Lightweight catalog entry for stories the client hasn't downloaded.
 * Returned as part of the delta sync response for browse/discovery UI.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CatalogEntry {

    @JsonProperty("storyId")
    private String storyId;

    @JsonProperty("title")
    private String title;

    @JsonProperty("localizedTitle")
    private LocalizedText localizedTitle;

    @JsonProperty("description")
    private String description;

    @JsonProperty("localizedDescription")
    private LocalizedText localizedDescription;

    @JsonProperty("category")
    private String category;

    @JsonProperty("tag")
    private String tag;

    @JsonProperty("tags")
    private java.util.List<String> tags;

    @JsonProperty("emoji")
    private String emoji;

    @JsonProperty("thumbnailUrl")
    private String thumbnailUrl;

    @JsonProperty("isFree")
    private boolean free;

    @JsonProperty("isReferralReward")
    private boolean referralReward;

    @JsonProperty("ageRange")
    private String ageRange;

    @JsonProperty("duration")
    private Integer duration;

    @JsonProperty("isPremium")
    private boolean premium;

    @JsonProperty("gender")
    private String gender; // "boy", "girl", or "unisex"

    public CatalogEntry() {
    }

    /**
     * Build a CatalogEntry from a Story model and a pre-generated thumbnail URL.
     */
    public static CatalogEntry fromStory(Story story, String thumbnailUrl) {
        CatalogEntry entry = new CatalogEntry();
        entry.storyId = story.getId();
        entry.title = story.getTitle();
        entry.localizedTitle = story.getLocalizedTitle();
        entry.description = story.getDescription();
        entry.localizedDescription = story.getLocalizedDescription();
        entry.category = story.getCategory();
        entry.tag = story.getTag();
        entry.tags = story.getTags();
        entry.emoji = story.getEmoji();
        entry.thumbnailUrl = thumbnailUrl;
        entry.free = story.isFree();
        entry.referralReward = story.isReferralReward();
        entry.ageRange = story.getAgeRange();
        entry.duration = story.getDuration();
        entry.premium = story.isPremium();
        entry.gender = story.getGender();
        return entry;
    }

    // Getters and setters

    public String getStoryId() { return storyId; }
    public void setStoryId(String storyId) { this.storyId = storyId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalizedText getLocalizedTitle() { return localizedTitle; }
    public void setLocalizedTitle(LocalizedText localizedTitle) { this.localizedTitle = localizedTitle; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalizedText getLocalizedDescription() { return localizedDescription; }
    public void setLocalizedDescription(LocalizedText localizedDescription) { this.localizedDescription = localizedDescription; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }

    public java.util.List<String> getTags() { return tags; }
    public void setTags(java.util.List<String> tags) { this.tags = tags; }

    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public boolean isFree() { return free; }
    public void setFree(boolean free) { this.free = free; }

    public boolean isReferralReward() { return referralReward; }
    public void setReferralReward(boolean referralReward) { this.referralReward = referralReward; }

    public String getAgeRange() { return ageRange; }
    public void setAgeRange(String ageRange) { this.ageRange = ageRange; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public boolean isPremium() { return premium; }
    public void setPremium(boolean premium) { this.premium = premium; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
}
