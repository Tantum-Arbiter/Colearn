package com.app.functest.stepdefs;

import io.cucumber.java.en.When;

import static io.restassured.RestAssured.given;

public class AnalyticsStepDefs extends BaseStepDefs {

    private static final String EVENTS = "/api/analytics/events";

    @When("the app sends an analytics batch:")
    public void theAppSendsAnAnalyticsBatch(String body) {
        lastResponse = given()
                .header("User-Agent", "GrowWithFreya-FuncTest/1.0.0")
                .header("Authorization", "Bearer " + getEffectiveAuthToken())
                .contentType("application/json")
                .body(body)
                .when()
                .post(EVENTS);
    }

    @When("the app sends an analytics batch without a token:")
    public void theAppSendsAnAnalyticsBatchWithoutAToken(String body) {
        lastResponse = given()
                .header("User-Agent", "GrowWithFreya-FuncTest/1.0.0")
                .contentType("application/json")
                .body(body)
                .when()
                .post(EVENTS);
    }

    @When("the app sends an analytics batch with the event {string}")
    public void theAppSendsAnAnalyticsBatchWithTheEvent(String event) {
        theAppSendsAnAnalyticsBatch("""
                {"sessionId":"s-1","platform":"ios","appVersion":"1.4.0","locale":"en",
                 "events":[{"event":"%s","properties":{"source":"home"}}]}
                """.formatted(event));
    }

    @When("the app sends an analytics batch of {int} events")
    public void theAppSendsAnAnalyticsBatchOfEvents(int count) {
        StringBuilder events = new StringBuilder();
        for (int i = 0; i < count; i++) {
            if (i > 0) {
                events.append(',');
            }
            events.append("{\"event\":\"story_opened\"}");
        }
        theAppSendsAnAnalyticsBatch("{\"sessionId\":\"s-1\",\"platform\":\"ios\",\"events\":[" + events + "]}");
    }
}
