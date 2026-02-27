package com.app.controller;

import com.app.config.TestHealthConfig;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Assumptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = com.app.service.GatewayServiceApplication.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestHealthConfig.class)
public class PrivateEndpointsControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    public void getInfo_ShouldReturnAppInfo() throws Exception {
        this.mockMvc.perform(get("/private/info"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.app.name").value("Gateway Service"));
    }

    @Test
    public void getHealthcheck_ShouldReturnHealthcheckStatus() throws Exception {
        this.mockMvc.perform(get("/private/healthcheck"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    public void getHealthcheck_ShouldIncludeDownstreamStatus() throws Exception {
        this.mockMvc.perform(get("/private/healthcheck"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.downstreams").exists())
                .andExpect(jsonPath("$.downstreams.firestore").exists())
                .andExpect(jsonPath("$.downstreams.firestore.status").value("UP"))
                .andExpect(jsonPath("$.downstreams.gcs").exists())
                .andExpect(jsonPath("$.downstreams.gcs.status").value("UP"));
    }

    @Test
    public void getMetricsEndpointCalled_ShouldReturnMetricDefinitions() throws Exception {
        this.mockMvc.perform(get("/private/metrics"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("jvm.buffer.memory.used")));
    }

    @Test
    public void getStatus_ShouldReturnAppStatus() throws Exception {
        this.mockMvc.perform(get("/private/status"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("OK")));
    }

    /**
     * Firestore-dependent endpoint tests.
     * These tests require the Firestore emulator to be running (via docker-compose).
     * They will be skipped if FIREBASE_EMULATOR_HOST is not set.
     */
    @Nested
    @SpringBootTest(classes = com.app.service.GatewayServiceApplication.class)
    @AutoConfigureMockMvc(addFilters = false)
    @ActiveProfiles("test")
    class FirestoreEndpointTests {

        @Autowired
        MockMvc mockMvc;

        @BeforeAll
        static void requireEmulatorOrSkip() {
            String host = System.getenv("FIREBASE_EMULATOR_HOST");
            Assumptions.assumeTrue(
                    host != null && !host.isBlank(),
                    "Firestore emulator not configured. Set FIREBASE_EMULATOR_HOST or run via docker-compose."
            );
        }

        @DynamicPropertySource
        static void registerFirestoreProps(DynamicPropertyRegistry registry) {
            String host = System.getenv().getOrDefault("FIREBASE_EMULATOR_HOST", "localhost");
            String port = System.getenv().getOrDefault("FIREBASE_EMULATOR_PORT", "8082");
            String project = System.getenv().getOrDefault("FIREBASE_PROJECT_ID", "grow-with-freya-dev");
            registry.add("firebase.emulator.host", () -> host);
            registry.add("firebase.emulator.port", () -> port);
            registry.add("firebase.project-id", () -> project);
        }

        @Test
        public void rebuildContentVersion_ShouldSucceed() throws Exception {
            // This test requires Firestore emulator to be running
            // Full functional testing is in func-tests/features/cms-content-sync.feature
            this.mockMvc.perform(post("/private/rebuild-content-version"))
                    .andDo(print())
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        public void deleteStory_ShouldSucceed() throws Exception {
            // This test requires Firestore emulator to be running
            // Full functional testing is in func-tests/features/cms-content-sync.feature
            this.mockMvc.perform(post("/private/delete/story/nonexistent-story"))
                    .andDo(print())
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }
}
