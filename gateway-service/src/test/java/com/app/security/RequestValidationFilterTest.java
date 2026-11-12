package com.app.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestValidationFilterTest {

    private static final int ONE_MB = 1024 * 1024;
    private static final int SYNC_LIMIT = 600 * 1024;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private RequestValidationFilter underTest;
    private MockHttpServletResponse response;
    private MockFilterChain chain;

    @BeforeEach
    void setUp() {
        underTest = new RequestValidationFilter(objectMapper);
        response = new MockHttpServletResponse();
        chain = new MockFilterChain();
    }

    private static MockHttpServletRequest get(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        request.addHeader("User-Agent", "EarlyRoots/1.4.0 (iPhone; iOS 19.0)");
        return request;
    }

    private static MockHttpServletRequest getWithQuery(String uri, String query) {
        MockHttpServletRequest request = get(uri);
        request.setQueryString(query);
        return request;
    }

    private static MockHttpServletRequest postJson(String uri, String body) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        request.addHeader("User-Agent", "EarlyRoots/1.4.0 (iPhone; iOS 19.0)");
        request.setContentType("application/json");
        request.setContent(body.getBytes(StandardCharsets.UTF_8));
        return request;
    }

    private static MockHttpServletRequest withClientHeaders(MockHttpServletRequest request) {
        request.addHeader("Authorization", "Bearer token");
        request.addHeader("X-Client-Platform", "ios");
        request.addHeader("X-Client-Version", "1.4.0");
        request.addHeader("X-Device-ID", "device-1234");
        return request;
    }

    private void run(HttpServletRequest request) throws Exception {
        underTest.doFilter(request, response, chain);
    }

    private boolean passedThrough() {
        return chain.getRequest() != null;
    }

    private JsonNode error() throws Exception {
        return objectMapper.readTree(response.getContentAsString());
    }

    @Test
    void passesAnOrdinaryRequest() throws Exception {
        run(getWithQuery("/api/stories", "category=bedtime"));

        assertTrue(passedThrough());
        assertEquals(200, response.getStatus());
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "/api/test | id=1' OR 1=1--",
            "/api/test | comment=<script>alert('xss')</script>",
            "/api/test | cmd=ls; rm -rf /",
            "/api/test | filter=(&(uid=*)(password=*))",
            "/api/test | id=1' UNION SELECT * FROM users--",
            "/api/../../../etc/passwd | ",
            "/api/..%2f..%2fetc/passwd | ",
            "/api/test | file=..%2f..%2fetc%2fpasswd"
    })
    void blocksAttacksInTheUrlOrQuery(String uri, String query) throws Exception {
        run(getWithQuery(uri, query));

        assertEquals(400, response.getStatus());
        assertEquals("Suspicious URL or parameters detected", error().get("message").asText());
        assertNull(chain.getRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"sqlmap/1.0", "Nikto/2.1", "curl/8.4.0", "Wget/1.21", "masscan/1.3"})
    void blocksScannerUserAgents(String userAgent) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/stories");
        request.addHeader("User-Agent", userAgent);

        run(request);

        assertEquals("Suspicious user agent detected", error().get("message").asText());
        assertNull(chain.getRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)",
            "okhttp/4.12.0",
            "Expo/57.0.24 CFNetwork/1568 Darwin/25.0"
    })
    void passesRealAppUserAgents(String userAgent) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/stories");
        request.addHeader("User-Agent", userAgent);

        run(request);

        assertTrue(passedThrough());
    }

    @Test
    void passesARequestWithNoUserAgent() throws Exception {
        run(new MockHttpServletRequest("GET", "/api/stories"));

        assertTrue(passedThrough());
    }

    @Test
    void blocksAHeaderCarryingMarkup() throws Exception {
        MockHttpServletRequest request = get("/api/stories");
        request.addHeader("X-Custom", "<script>alert(1)</script>");

        run(request);

        assertEquals("Suspicious headers detected", error().get("message").asText());
    }

    @Test
    void blocksAHeaderCarryingALineBreak() throws Exception {
        MockHttpServletRequest request = get("/api/stories");
        request.addHeader("X-Custom", "ok%0d%0aSet-Cookie: x=1");

        run(request);

        assertEquals("Suspicious headers detected", error().get("message").asText());
    }

    @Test
    void passesStandardHeadersThatContainSemicolons() throws Exception {
        MockHttpServletRequest request = get("/api/stories");
        request.addHeader("Accept-Language", "en-GB,en;q=0.9,pl;q=0.8");
        request.addHeader("Accept", "application/json;charset=UTF-8");

        run(request);

        assertTrue(passedThrough());
    }

    @ParameterizedTest
    @ValueSource(strings = {"application/json", "*/*", "application/*", "application/json, text/plain"})
    void passesAcceptableAcceptHeaders(String accept) throws Exception {
        MockHttpServletRequest request = get("/api/stories");
        request.addHeader("Accept", accept);

        run(request);

        assertTrue(passedThrough());
    }

    @Test
    void refusesAnXmlOnlyAcceptHeaderWith406() throws Exception {
        MockHttpServletRequest request = get("/api/stories");
        request.addHeader("Accept", "application/xml");

        run(request);

        assertEquals(406, response.getStatus());
    }

    @Test
    void refusesAnUnsupportedContentType() throws Exception {
        MockHttpServletRequest request = postJson("/api/profile", "{}");
        request.setContentType("application/xml");

        run(request);

        assertEquals("Suspicious headers detected", error().get("message").asText());
    }

    @Test
    void passesABodyOfExactlyOneMegabyte() throws Exception {
        run(postJson("/api/profile", jsonOfSize(ONE_MB)));

        assertTrue(passedThrough());
    }

    @Test
    void refusesABodyOneByteOverOneMegabyteWith413() throws Exception {
        run(postJson("/api/profile", jsonOfSize(ONE_MB + 1)));

        assertEquals(413, response.getStatus());
        assertNull(chain.getRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/stories/delta", "/api/assets/batch-urls"})
    void passesASyncBodyAtTheSyncLimit(String uri) throws Exception {
        run(postJson(uri, jsonOfSize(SYNC_LIMIT)));

        assertTrue(passedThrough());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/stories/delta", "/api/assets/batch-urls"})
    void refusesASyncBodyOneByteOverTheSyncLimitWith400(String uri) throws Exception {
        run(postJson(uri, jsonOfSize(SYNC_LIMIT + 1)));

        assertEquals(400, response.getStatus());
        assertEquals("excessive_items", error().get("details").get("reason").asText());
    }

    @Test
    void refusesAChunkedSyncBodyOverTheSyncLimit() throws Exception {
        MockHttpServletRequest request = chunked(postJson("/api/stories/delta", jsonOfSize(SYNC_LIMIT + 1)));

        run(request);

        assertEquals(400, response.getStatus());
        assertNull(chain.getRequest());
    }

    @Test
    void passesAChunkedSyncBodyAtTheSyncLimit() throws Exception {
        MockHttpServletRequest request = chunked(postJson("/api/stories/delta", jsonOfSize(SYNC_LIMIT)));

        run(request);

        assertTrue(passedThrough());
    }

    @Test
    void passesADeltaRequestWithTenThousandChecksums() throws Exception {
        run(postJson("/api/stories/delta", checksums(10_000)));

        assertTrue(passedThrough());
    }

    @Test
    void refusesADeltaRequestWithTenThousandAndOneChecksums() throws Exception {
        run(postJson("/api/stories/delta", checksums(10_001)));

        assertEquals(400, response.getStatus());
        assertEquals(10_001, error().get("details").get("count").asInt());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"events\":[{\"event\":\"subscription_overlay_shown\"}]}",
            "{\"title\":\"Bath; then story\",\"message\":\"Teeth & pyjamas\"}",
            "{\"message\":\"I <3 bedtime\"}",
            "{\"description\":\"A transcript of our favourite script\"}",
            "{\"note\":\"Pick one | or the other\"}",
            "{\"note\":\"#1 select from the menu\"}",
            "{\"note\":\"Don't drop the table -- it's Grandma's\"}",
            "{\"title\":\"Łódź, Zürich, القمر, 🌙\"}"
    })
    void passesRealBodiesThatLookLikeCode(String body) throws Exception {
        run(withClientHeaders(postJson("/api/profile", body)));

        assertTrue(passedThrough());
        assertEquals(200, response.getStatus());
    }

    @Test
    void handsTheBodyOnUnchanged() throws Exception {
        String body = "{\"message\":\"Bath; then story <3\"}";

        run(withClientHeaders(postJson("/api/profile", body)));

        MockHttpServletRequest forwarded = (MockHttpServletRequest) unwrap(chain.getRequest());
        assertNotNull(forwarded);
        assertEquals(body, new String(chain.getRequest().getInputStream().readAllBytes(), StandardCharsets.UTF_8));
    }

    @Test
    void handsADeltaBodyOnUnchangedAfterCountingIt() throws Exception {
        String body = checksums(3);

        run(postJson("/api/stories/delta", body));

        assertEquals(body, new String(chain.getRequest().getInputStream().readAllBytes(), StandardCharsets.UTF_8));
    }

    @Test
    void refusesAnAuthenticatedApiCallWithoutClientHeaders() throws Exception {
        MockHttpServletRequest request = get("/api/profile");
        request.addHeader("Authorization", "Bearer token");

        run(request);

        assertEquals(400, response.getStatus());
        assertEquals(3, error().get("details").get("missingHeaders").size());
    }

    @Test
    void passesTheAnalyticsBatchWithoutClientHeaders() throws Exception {
        MockHttpServletRequest request = postJson("/api/analytics/events", "{\"events\":[{\"event\":\"story_opened\"}]}");
        request.addHeader("Authorization", "Bearer token");

        run(request);

        assertTrue(passedThrough());
    }

    @ParameterizedTest
    @CsvSource({
            "GET, /api/analytics/events",
            "POST, /api/analytics/events/extra",
            "POST, /api/analytics"
    })
    void keepsTheHeaderRuleForEverythingElseUnderAnalytics(String method, String uri) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.addHeader("User-Agent", "EarlyRoots/1.4.0");
        request.addHeader("Authorization", "Bearer token");

        run(request);

        assertEquals(400, response.getStatus());
    }

    @ParameterizedTest
    @CsvSource({
            "X-Client-Platform, windows",
            "X-Client-Version, one.two",
            "X-Device-ID, abc"
    })
    void refusesAnInvalidClientHeaderValue(String header, String value) throws Exception {
        MockHttpServletRequest request = withClientHeaders(get("/api/profile"));
        request.removeHeader(header);
        request.addHeader(header, value);

        run(request);

        assertTrue(error().get("details").get("invalidHeaders").has(header));
    }

    @Test
    void passesAClientHeaderAtTheMinimumDeviceIdLength() throws Exception {
        MockHttpServletRequest request = withClientHeaders(get("/api/profile"));
        request.removeHeader("X-Device-ID");
        request.addHeader("X-Device-ID", "abcd");

        run(request);

        assertTrue(passedThrough());
    }

    @Test
    void doesNotRequireClientHeadersWithoutAToken() throws Exception {
        run(get("/api/stories"));

        assertTrue(passedThrough());
    }

    @Test
    void passesEverythingWhenDisabled() throws Exception {
        ReflectionTestUtils.setField(underTest, "filterEnabled", false);

        run(getWithQuery("/api/test", "id=1' OR 1=1--"));

        assertTrue(passedThrough());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/health", "/actuator/health", "/private/reset", "/"})
    void skipsInfrastructurePaths(String uri) throws Exception {
        run(getWithQuery(uri, "x=<script>"));

        assertTrue(passedThrough());
    }

    private static MockHttpServletRequest chunked(MockHttpServletRequest source) {
        MockHttpServletRequest request = new MockHttpServletRequest(source.getMethod(), source.getRequestURI()) {
            @Override
            public int getContentLength() {
                return -1;
            }

            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
        request.addHeader("User-Agent", source.getHeader("User-Agent"));
        request.setContentType(source.getContentType());
        request.setContent(source.getContentAsByteArray());
        return request;
    }

    private static HttpServletRequest unwrap(jakarta.servlet.ServletRequest request) {
        jakarta.servlet.ServletRequest current = request;
        while (current instanceof jakarta.servlet.ServletRequestWrapper wrapper) {
            current = wrapper.getRequest();
        }
        return (HttpServletRequest) current;
    }

    private static String jsonOfSize(int bytes) {
        String prefix = "{\"a\":\"";
        String suffix = "\"}";
        return prefix + "x".repeat(bytes - prefix.length() - suffix.length()) + suffix;
    }

    private static String checksums(int count) {
        StringBuilder sb = new StringBuilder("{\"clientVersion\":1,\"storyChecksums\":{");
        for (int i = 0; i < count; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append("\"s").append(i).append("\":\"c\"");
        }
        return sb.append("}}").toString();
    }
}
