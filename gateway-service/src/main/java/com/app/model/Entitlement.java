package com.app.model;

import com.google.cloud.firestore.annotation.IgnoreExtraProperties;

@IgnoreExtraProperties
public class Entitlement {

    private String tier;
    private Long expiresAtMs;
    private long checkedAtMs;
    private String environment;

    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public Long getExpiresAtMs() { return expiresAtMs; }
    public void setExpiresAtMs(Long expiresAtMs) { this.expiresAtMs = expiresAtMs; }
    public long getCheckedAtMs() { return checkedAtMs; }
    public void setCheckedAtMs(long checkedAtMs) { this.checkedAtMs = checkedAtMs; }
    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }
}
