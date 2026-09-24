package com.app.model;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;

import java.util.HashMap;
import java.util.Map;

@IgnoreExtraProperties
public class VoiceOverRecord {

    private String id;
    private String storyId;
    private String label;
    private Map<String, Long> pages = new HashMap<>();
    private Timestamp updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStoryId() { return storyId; }
    public void setStoryId(String storyId) { this.storyId = storyId; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public Map<String, Long> getPages() { return pages; }
    public void setPages(Map<String, Long> pages) { this.pages = pages; }
    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }
}
