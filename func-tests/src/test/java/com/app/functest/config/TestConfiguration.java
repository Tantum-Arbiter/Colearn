package com.app.functest.config;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import io.cucumber.spring.CucumberContextConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.ActiveProfiles;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

/**
 * Test Configuration for Functional Tests
 * 
 * Sets up the test environment including WireMock server for mocking external services.
 * This configuration is used by Cucumber tests to provide a consistent testing environment.
 */
@CucumberContextConfiguration
@SpringBootTest(
    classes = TestConfiguration.TestApp.class,
    webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT
)
@ActiveProfiles("test")
public class TestConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(TestConfiguration.class);








    /**
     * Minimal Spring Boot application for functional tests
     */
    @SpringBootApplication
    public static class TestApp {
        public static void main(String[] args) {
            SpringApplication.run(TestApp.class, args);
        }

    }
}
