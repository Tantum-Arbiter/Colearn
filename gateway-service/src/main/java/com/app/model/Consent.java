package com.app.model;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;

@IgnoreExtraProperties
public class Consent {

    private String policyVersion;
    private String scope;
    private Timestamp acceptedAt;
    private Timestamp recordedAt;
    private String appVersion;

    public String getPolicyVersion() { return policyVersion; }
    public void setPolicyVersion(String policyVersion) { this.policyVersion = policyVersion; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public Timestamp getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(Timestamp acceptedAt) { this.acceptedAt = acceptedAt; }
    public Timestamp getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Timestamp recordedAt) { this.recordedAt = recordedAt; }
    public String getAppVersion() { return appVersion; }
    public void setAppVersion(String appVersion) { this.appVersion = appVersion; }
}
