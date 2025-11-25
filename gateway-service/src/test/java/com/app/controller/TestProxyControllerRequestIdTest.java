package com.app.controller;

import com.app.testing.TestSimulationFlags;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.mock.web.MockHttpServletRequest;

import java.net.URI;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TestProxyControllerRequestIdTest {

    @Test
    void forwardsXRequestIdToDownstream() throws Exception {
        RestTemplate defaultRt = mock(RestTemplate.class);
        RestTemplateBuilder builder = new RestTemplateBuilder();
        CircuitBreakerRegistry registry = CircuitBreakerRegistry.ofDefaults();
        @SuppressWarnings("unchecked")
        ObjectProvider<TestSimulationFlags> flagsProvider = mock(ObjectProvider.class);
        when(flagsProvider.getIfAvailable()).thenReturn(null);

        TestProxyController controller = new TestProxyController(defaultRt, builder, registry, flagsProvider);
        ReflectionTestUtils.setField(controller, "wiremockBaseUrl", "http://example.com");

        // Mock downstream response
        when(defaultRt.exchange(any(RequestEntity.class), eq(byte[].class)))
                .thenReturn(ResponseEntity.ok().body("{}".getBytes()));

        // Build incoming request
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/users/profile");
        request.setMethod("GET");
        String rid = UUID.randomUUID().toString();
        request.addHeader("X-Request-Id", rid);

        try {
            controller.proxyUsers(request);
        } catch (Exception ignore) {
            // Ignore; we only need to capture the outbound request
        }

        // Capture the request entity sent downstream
        ArgumentCaptor<RequestEntity> captor = ArgumentCaptor.forClass(RequestEntity.class);
        verify(defaultRt, atLeastOnce()).exchange(captor.capture(), eq(byte[].class));

        RequestEntity<?> sent = captor.getValue();
        HttpHeaders headers = sent.getHeaders();
        assertEquals(rid, headers.getFirst("X-Request-Id"));
        assertEquals(HttpMethod.GET, sent.getMethod());
        assertEquals(URI.create("http://example.com/api/users/profile"), sent.getUrl());
    }
}

