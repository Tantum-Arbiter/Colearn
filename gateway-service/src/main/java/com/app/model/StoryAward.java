package com.app.model;

import com.google.cloud.firestore.annotation.IgnoreExtraProperties;

@IgnoreExtraProperties
public class StoryAward {

    private String achievementId;
    private Object trigger;

    public String getAchievementId() { return achievementId; }
    public void setAchievementId(String achievementId) { this.achievementId = achievementId; }
    public Object getTrigger() { return trigger; }
    public void setTrigger(Object trigger) { this.trigger = trigger; }
}
