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

private final String baseUrl = System.getenv().getOrDefault("BACKEND_URL_GATEWAY_SERVICE", "http://gateway-service:8080");
private final String gatewayAudience = System.getenv().getOrDefault("GATEWAY_AUDIENCE", null);

    @When("I GET {string}")
    public void i_get(String path) throws IOException, InterruptedException {
        String fullUrl = baseUrl + path;
        System.out.println("*** Making GET request to: " + fullUrl);
        System.out.println("*** Gateway Audience present: " + (gatewayAudience != null ? "YES" : "NO"));

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(fullUrl))
                .GET();

        // Add Authorization header if GATEWAY_AUDIENCE token is provided
        if (gatewayAudience != null && !gatewayAudience.isEmpty()) {
            requestBuilder.header("Authorization", "Bearer " + gatewayAudience);
            System.out.println("*** Using Bearer token authentication with GATEWAY_AUDIENCE");
        } else {
            System.out.println("*** No GATEWAY_AUDIENCE token provided");
        }

        HttpRequest request = requestBuilder.build();
        response = client.send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("*** Response status: " + response.statusCode());
    }

    @Then("the response status should be {int}")
    public void the_response_status_should_be(Integer statusCode) {
        System.out.println("*** [DEBUG] Status code: " + response.statusCode());
        assertTrue("Unexpected status code", response.statusCode() == statusCode);

    }

    @Then("the response body should contain {string}")
    public void the_response_body_should_contain(String expectedValue) {
        System.out.println("*** [DEBUG] Response body: " + response.body());
        assertTrue("Expected value not found in body", response.body().contains(expectedValue));

    }

    @Then("the response JSON should contain value {string}")
    public void the_response_json_should_contain(String expectedValue) {
        System.out.println("*** [DEBUG] Response body: " + response.body());
        assertTrue("Expected value not found in body", response.body().contains(expectedValue));
    }
}
