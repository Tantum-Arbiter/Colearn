package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class Story {

    @JsonProperty("id")
    private String id;

    @JsonProperty("title")
    private String title;

    @JsonProperty("category")
    private String category;

    @JsonProperty("tag")
    private String tag;

    @JsonProperty("emoji")
    private String emoji;

    @JsonProperty("coverImage")
    private String coverImage;

    @JsonProperty("isAvailable")
    @PropertyName("isAvailable")
    private boolean available;

    @JsonProperty("ageRange")
    private String ageRange;

    @JsonProperty("duration")
    private Integer duration;

    @JsonProperty("description")
    private String description;

    @JsonProperty("localizedTitle")
    private LocalizedText localizedTitle;

    @JsonProperty("localizedDescription")
    private LocalizedText localizedDescription;

    @JsonProperty("pages")
    private List<StoryPage> pages;

    @JsonProperty("isPremium")
    private boolean premium;

    @JsonProperty("author")
    private String author;

    @JsonProperty("tags")
    private List<String> tags;

    @JsonProperty("_usageType")
    private String usageType;

    @JsonProperty("_disclaimer")
    private String disclaimer;

    @JsonProperty("createdAt")
    private Instant createdAt;

    @JsonProperty("updatedAt")
    private Instant updatedAt;

    @JsonProperty("version")
    private int version;

    @JsonProperty("checksum")
    private String checksum;

    public Story() {
        this.pages = new ArrayList<>();
        this.tags = new ArrayList<>();
        this.available = true;
        this.premium = false;
        this.version = 1;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Story(String id, String title, String category) {
        this();
        this.id = id;
        this.title = title;
        this.category = category;
    }

    public void updateTimestamp() {
        this.updatedAt = Instant.now();
        this.version++;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getEmoji() {
        return emoji;
    }

    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }

    public String getCoverImage() {
        return coverImage;
    }

    public void setCoverImage(String coverImage) {
        this.coverImage = coverImage;
    }

    @PropertyName("isAvailable")
    public boolean isAvailable() {
        return available;
    }

    @PropertyName("isAvailable")
    public void setAvailable(boolean available) {
        this.available = available;
    }

    public String getAgeRange() {
        return ageRange;
    }

    public void setAgeRange(String ageRange) {
        this.ageRange = ageRange;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalizedText getLocalizedTitle() {
        return localizedTitle;
    }

    public void setLocalizedTitle(LocalizedText localizedTitle) {
        this.localizedTitle = localizedTitle;
    }

    public LocalizedText getLocalizedDescription() {
        return localizedDescription;
    }

    public void setLocalizedDescription(LocalizedText localizedDescription) {
        this.localizedDescription = localizedDescription;
    }

    public String getTitleForLanguage(String languageCode) {
        if (localizedTitle != null) {
            String localized = localizedTitle.getText(languageCode);
            if (localized != null) return localized;
        }
        return title;
    }

    public String getDescriptionForLanguage(String languageCode) {
        if (localizedDescription != null) {
            String localized = localizedDescription.getText(languageCode);
            if (localized != null) return localized;
        }
        return description;
    }

    public List<StoryPage> getPages() {
        return pages;
    }

    public void setPages(List<StoryPage> pages) {
        this.pages = pages;
    }

    public boolean isPremium() {
        return premium;
    }

    public void setIsPremium(boolean isPremium) {
        this.premium = isPremium;
    }

    public void setPremium(boolean premium) {
        this.premium = premium;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getChecksum() {
        return checksum;
    }

    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }

    public String getUsageType() {
        return usageType;
    }

    public void setUsageType(String usageType) {
        this.usageType = usageType;
    }

    public void set_usageType(String usageType) {
        this.usageType = usageType;
    }

    public String getDisclaimer() {
        return disclaimer;
    }

    public void setDisclaimer(String disclaimer) {
        this.disclaimer = disclaimer;
    }

    public void set_disclaimer(String disclaimer) {
        this.disclaimer = disclaimer;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Story story = (Story) o;
        return Objects.equals(id, story.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Story{" +
                "id='" + id + '\'' +
                ", title='" + title + '\'' +
                ", category='" + category + '\'' +
                ", version=" + version +
                '}';
    }
}

