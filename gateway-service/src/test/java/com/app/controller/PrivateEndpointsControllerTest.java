package com.app.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class PrivateEndpointsControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    public void getInfo_ShouldReturnAppInfo() throws Exception {
        this.mockMvc.perform(get("/private/info"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.app.name").value("Channel Metadata Store"));
    }

    @Test
    public void getHealthcheck_ShouldReturnHealthcheckStatus() throws Exception {
        this.mockMvc.perform(get("/private/healthcheck"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    public void getMetricsEndpointCalled_ShouldReturnMetrics() throws Exception {
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
}
