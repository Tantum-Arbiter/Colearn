package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.google.cloud.firestore.annotation.Exclude;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;

import java.util.Map;

@IgnoreExtraProperties
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AchievementDefinition {

    private String id;
    private int version;
    private String status;
    private String family;
    private String category;
    private Map<String, Object> rule;
    private Integer points;
    private String art;
    private Map<String, Object> copy;
    private Map<String, Object> recommendation;
    private String minAppVersion;
    private String checksum;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getFamily() { return family; }
    public void setFamily(String family) { this.family = family; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Map<String, Object> getRule() { return rule; }
    public void setRule(Map<String, Object> rule) { this.rule = rule; }
    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }
    public String getArt() { return art; }
    public void setArt(String art) { this.art = art; }
    public Map<String, Object> getCopy() { return copy; }
    public void setCopy(Map<String, Object> copy) { this.copy = copy; }
    public Map<String, Object> getRecommendation() { return recommendation; }
    public void setRecommendation(Map<String, Object> recommendation) { this.recommendation = recommendation; }
    public String getMinAppVersion() { return minAppVersion; }
    public void setMinAppVersion(String minAppVersion) { this.minAppVersion = minAppVersion; }

    @Exclude
    public String getChecksum() { return checksum; }
    @Exclude
    public void setChecksum(String checksum) { this.checksum = checksum; }
}
