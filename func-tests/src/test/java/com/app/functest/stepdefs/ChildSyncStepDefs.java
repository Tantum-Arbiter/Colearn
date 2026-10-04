package com.app.functest.stepdefs;

import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class ChildSyncStepDefs extends BaseStepDefs {

    @When("the app saves the child {string} with body:")
    public void theAppSavesTheChildWithBody(String childId, String body) {
        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(body)
                .when()
                .put("/api/children/" + childId);
    }

    @When("the app records consent with body:")
    public void theAppRecordsConsentWithBody(String body) {
        lastResponse = applyAuthenticatedHeaders(given())
                .contentType("application/json")
                .body(body)
                .when()
                .post("/api/consents");
    }

    @Then("the conflict carries the current child at version {int}")
    public void theConflictCarriesTheCurrentChildAtVersion(int version) {
        assertEquals(409, lastResponse.getStatusCode(), lastResponse.getBody().asString());
        assertEquals("GTW-414", lastResponse.jsonPath().getString("errorCode"));
        assertEquals(version, lastResponse.jsonPath().getInt("details.current.version"));
    }

    @Then("the export holds {int} child(ren) and {int} consent record(s)")
    public void theExportHolds(int children, int consents) {
        List<Map<String, Object>> exportedChildren = lastResponse.jsonPath().getList("children");
        List<Map<String, Object>> exportedConsents = lastResponse.jsonPath().getList("consents");
        assertNotNull(exportedChildren);
        assertEquals(children, exportedChildren.size());
        assertEquals(consents, exportedConsents.size());
    }

    @Then("the response carries no server write time")
    public void theResponseCarriesNoServerWriteTime() {
        assertTrue(!lastResponse.getBody().asString().contains("updatedAt"), lastResponse.getBody().asString());
    }
}
