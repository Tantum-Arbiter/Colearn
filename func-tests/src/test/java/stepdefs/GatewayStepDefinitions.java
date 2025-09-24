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

private final String baseUrl = System.getenv().getOrDefault("GATEWAY_HOST", "http://gateway-service:8080");



// RUN LOCAL/DOCKER COMPOSE
//    @When("I GET {string}")
//    public void i_get(String path) throws IOException, InterruptedException {
//        System.out.println("*** >> URL is: " + baseUrl + path);
//        HttpRequest request = HttpRequest.newBuilder()
//                .uri(URI.create(baseUrl + path))
//                .GET()
//                .build();
//        response = client.send(request, HttpResponse.BodyHandlers.ofString());
//    }

    // push to master, run in GCP
    @When("I GET {string}")
    public void i_get(String path) throws IOException, InterruptedException {
        System.out.println("*** >> Base URL is: " + baseUrl);
        System.out.println("*** >> Full URL is: " + baseUrl + path);

        HttpRequest tokenRequest = HttpRequest.newBuilder()
                .uri(URI.create("http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=" + baseUrl))
                .header("Metadata-Flavor", "Google")
                .GET()
                .build();

        HttpResponse<String> tokenResponse = client.send(tokenRequest, HttpResponse.BodyHandlers.ofString());
        String token = tokenResponse.body();

        System.out.println("*** >> Acquired Identity Token: " + (token != null && !token.isEmpty() ? "TOKEN RECEIVED" : "NO TOKEN"));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        response = client.send(request, HttpResponse.BodyHandlers.ofString());
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
