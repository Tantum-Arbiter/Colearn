package com.app.testing;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Test-only simulation flags to steer gateway behavior during functional tests.
 * Available in 'test' profile (local/Docker) and 'gcp-dev' profile (GCP functional tests).
 */
@Component
@Profile({"test", "gcp-dev"})
public class TestSimulationFlags {
    // Downstream simulation
    private Integer googleOauthStatus; // e.g., 503
    private Long googleOauthDelayMs;   // artificial delay
    private Integer firebaseStatus;    // e.g., 500

    // Timeouts
    private Long gatewayTimeoutMs;     // outbound downstream timeout simulation
    private Long inboundTimeoutMs;     // inbound request timeout simulation

    // Circuit breakers / maintenance
    private boolean maintenanceMode;
    private boolean circuitOpenGoogle;

    private boolean overloaded;

    // Rate limiting overrides
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

    // Getters / setters
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

