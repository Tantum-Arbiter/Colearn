package com.app.testing;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile({"test", "gcp-dev"})
public class TestSimulationFlags {
    private Integer googleOauthStatus;
    private Long googleOauthDelayMs;
    private Integer firebaseStatus;
    private Long gatewayTimeoutMs;
    private Long inboundTimeoutMs;
    private boolean maintenanceMode;
    private boolean circuitOpenGoogle;
    private boolean overloaded;
    private Integer authRateLimitPerMinute;
    private Integer apiRateLimitPerMinute;

    public void reset() {
        googleOauthStatus = null;
        googleOauthDelayMs = null;
        firebaseStatus = null;
        gatewayTimeoutMs = null;
        inboundTimeoutMs = null;
        maintenanceMode = false;
        circuitOpenGoogle = false;
        overloaded = false;

        authRateLimitPerMinute = null;
        apiRateLimitPerMinute = null;
    }

    public Integer getGoogleOauthStatus() { return googleOauthStatus; }
    public void setGoogleOauthStatus(Integer googleOauthStatus) { this.googleOauthStatus = googleOauthStatus; }

    public Long getGoogleOauthDelayMs() { return googleOauthDelayMs; }
    public void setGoogleOauthDelayMs(Long googleOauthDelayMs) { this.googleOauthDelayMs = googleOauthDelayMs; }

    public Integer getFirebaseStatus() { return firebaseStatus; }
    public void setFirebaseStatus(Integer firebaseStatus) { this.firebaseStatus = firebaseStatus; }

    public Long getGatewayTimeoutMs() { return gatewayTimeoutMs; }
    public void setGatewayTimeoutMs(Long gatewayTimeoutMs) { this.gatewayTimeoutMs = gatewayTimeoutMs; }

    public Long getInboundTimeoutMs() { return inboundTimeoutMs; }
    public void setInboundTimeoutMs(Long inboundTimeoutMs) { this.inboundTimeoutMs = inboundTimeoutMs; }

    public boolean isMaintenanceMode() { return maintenanceMode; }

    public boolean isOverloaded() { return overloaded; }
    public void setOverloaded(boolean overloaded) { this.overloaded = overloaded; }

    public void setMaintenanceMode(boolean maintenanceMode) { this.maintenanceMode = maintenanceMode; }

    public boolean isCircuitOpenGoogle() { return circuitOpenGoogle; }
    public void setCircuitOpenGoogle(boolean circuitOpenGoogle) { this.circuitOpenGoogle = circuitOpenGoogle; }

    public Integer getAuthRateLimitPerMinute() { return authRateLimitPerMinute; }
    public void setAuthRateLimitPerMinute(Integer authRateLimitPerMinute) { this.authRateLimitPerMinute = authRateLimitPerMinute; }

    public Integer getApiRateLimitPerMinute() { return apiRateLimitPerMinute; }
    public void setApiRateLimitPerMinute(Integer apiRateLimitPerMinute) { this.apiRateLimitPerMinute = apiRateLimitPerMinute; }
}

