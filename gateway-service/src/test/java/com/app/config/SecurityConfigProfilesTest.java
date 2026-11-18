package com.app.config;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The private and actuator endpoints open only for the profiles that are meant to have them.
 * A profile is matched by its exact name: "development-lab" or "prod-devices" must not open
 * them because its name happens to contain "dev", and nothing with "prod" active ever does.
 */
class SecurityConfigProfilesTest {

    @ParameterizedTest(name = "profiles [{0}] open private endpoints: {1}")
    @CsvSource({
            "test, true",
            "dev, true",
            "gcp-dev, true",
            "nft, false",
            "prod, false",
            "'gcp-dev,prod', false",
            "'test,prod', false",
            "development-lab, false",
            "prod-devices, false",
            "devprod, false",
            "'', false",
            "GCP-DEV, false",
    })
    void opensPrivateEndpointsOnlyForExactNonProdProfiles(String profiles, boolean expected) {
        String[] active = profiles.isEmpty() ? new String[0] : profiles.split(",");

        assertEquals(expected, SecurityConfig.allowsPrivateEndpoints(active));
    }
}
