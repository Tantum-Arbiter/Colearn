package stepdefs;

import io.cucumber.java.en.*;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.Assert.assertTrue;

public class GatewayStepDefinitions {

    private HttpResponse<String> response;
    private final HttpClient client = HttpClient.newHttpClient();

private final String baseUrl = System.getenv().getOrDefault("GATEWAY_BASE_URL", "http://gateway-service:8080");

    @When("I GET {string}")
    public void i_get(String path) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .GET()
                .build();
        response = client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Then("the response status should be {int}")
    public void the_response_status_should_be(Integer statusCode) {
        assertTrue("Unexpected status code", response.statusCode() == statusCode);

    }

    @Then("the response body should contain {string}")
    public void the_response_body_should_contain(String expectedValue) {
        assertTrue("Expected value not found in body", response.body().contains(expectedValue));

    }

    @Then("the response JSON should contain value {string}")
    public void the_response_json_should_contain(String expectedValue) {
        assertTrue("Expected value not found in body", response.body().contains(expectedValue));
    }
}
