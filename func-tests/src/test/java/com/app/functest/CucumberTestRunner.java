package com.app.functest;

import io.cucumber.junit.Cucumber;
import io.cucumber.junit.CucumberOptions;
import org.junit.runner.RunWith;

/**
 * Cucumber Test Runner for Functional Tests
 * 
 * This class configures and runs all Cucumber functional tests.
 * It integrates with Spring Boot for dependency injection and
 * WireMock for external service mocking.
 */
@RunWith(Cucumber.class)
@CucumberOptions(
    features = "src/test/resources/features",
    glue = {
        "com.app.functest.stepdefs",
        "com.app.functest.config",
        "stepdefs"
    },
    plugin = {
        "pretty",
        "html:build/reports/tests/cucumber.html",
        "json:build/reports/tests/cucumber.json",
        "junit:build/reports/tests/cucumber-junit.xml"
    },
    tags = "not @ignore"
)
public class CucumberTestRunner {
    // Test runner class - no implementation needed
}
