package com.app.model;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;

@IgnoreExtraProperties
public class ConsentLogEntry {

    private String subjectRef;
    private String policyVersion;
    private String scope;
    private Timestamp acceptedAt;
    private Timestamp recordedAt;
    private String appVersion;
    private Timestamp accountDeletedAt;
    private Timestamp expiresAt;

    public String getSubjectRef() { return subjectRef; }
    public void setSubjectRef(String subjectRef) { this.subjectRef = subjectRef; }
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
    public Timestamp getAccountDeletedAt() { return accountDeletedAt; }
    public void setAccountDeletedAt(Timestamp accountDeletedAt) { this.accountDeletedAt = accountDeletedAt; }
    public Timestamp getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Timestamp expiresAt) { this.expiresAt = expiresAt; }
}
