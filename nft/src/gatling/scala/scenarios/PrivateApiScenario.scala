package scenarios

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration.DurationInt
import scala.language.postfixOps

/**
 * Private API endpoint scenarios for NFT (Non-Functional Testing)
 * 
 * Tests private/admin endpoints that are used for:
 * - Content management (rebuild-content-version)
 * - Health checks
 * - Monitoring
 * 
 * Note: These endpoints are typically only available in test/gcp-dev profiles.
 */
object PrivateApiScenario {

  // Common headers for private API requests
  val privateHeaders = Map(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json"
  )

  // ============================================
  // Health Check
  // ============================================
  val healthcheck_scenario = scenario("GET /private/healthcheck - Health Check")
    .exec(
      http("healthcheck")
        .get("/private/healthcheck")
        .headers(privateHeaders)
        .check(status.is(200))
        .check(jsonPath("$.status").is("UP"))
    )

  // ============================================
  // Rebuild Content Version
  // ============================================
  val rebuild_content_version_scenario = scenario("POST /private/rebuild-content-version - Rebuild Content Version")
    .exec(
      http("rebuild_content_version")
        .post("/private/rebuild-content-version")
        .headers(privateHeaders)
        .check(status.in(200, 503)) // 503 if Firestore not available
    )

  // ============================================
  // Get Content Version
  // ============================================
  val get_content_version_scenario = scenario("GET /api/stories/version - Get Content Version")
    .exec(
      http("get_content_version")
        .get("/api/stories/version")
        .headers(privateHeaders)
        .check(status.is(200))
        .check(jsonPath("$.version").exists)
        .check(jsonPath("$.totalStories").exists)
    )

  // ============================================
  // Status Check
  // ============================================
  val status_scenario = scenario("GET /private/status - Status Check")
    .exec(
      http("status")
        .get("/private/status")
        .headers(privateHeaders)
        .check(status.is(200))
    )

  // ============================================
  // Info Endpoint
  // ============================================
  val info_scenario = scenario("GET /private/info - App Info")
    .exec(
      http("info")
        .get("/private/info")
        .headers(privateHeaders)
        .check(status.is(200))
        .check(jsonPath("$.app.name").exists)
    )

  // ============================================
  // Prometheus Metrics
  // ============================================
  val prometheus_scenario = scenario("GET /private/prometheus - Prometheus Metrics")
    .exec(
      http("prometheus")
        .get("/private/prometheus")
        .header("Accept", "text/plain")
        .check(status.in(200, 503))
    )

  // ============================================
  // Combined Private API Load Test
  // This tests the rebuild-content-version endpoint under load
  // ============================================
  def rebuild_content_version_load(usersPerSec: Int, duration: Int) = 
    scenario(s"Rebuild Content Version Load Test ($usersPerSec users/sec for $duration min)")
      .exec(
        http("rebuild_content_version_load")
          .post("/private/rebuild-content-version")
          .headers(privateHeaders)
          .check(status.in(200, 503))
      )
      .inject(constantUsersPerSec(usersPerSec) during (duration minutes))
      .throttle(
        reachRps(usersPerSec) in (30 seconds),
        holdFor(duration minutes),
        reachRps(0) in (30 seconds)
      )

  // ============================================
  // Helper for creating custom private API load tests
  // ============================================
  def private_post_load(requestName: String, requestEndpoint: String) = 
    scenario(s"POST $requestEndpoint load test")
      .exec(
        http(requestName)
          .post(requestEndpoint)
          .headers(privateHeaders)
          .check(status.in(200, 503))
      )
      .inject(constantUsersPerSec(10) during (5 minutes))
      .throttle(
        reachRps(10) in (30 seconds),
        holdFor(5 minutes),
        reachRps(0) in (30 seconds)
      )

  def private_get_load(requestName: String, requestEndpoint: String) = 
    scenario(s"GET $requestEndpoint load test")
      .exec(
        http(requestName)
          .get(requestEndpoint)
          .headers(privateHeaders)
          .check(status.in(200, 503))
      )
      .inject(constantUsersPerSec(10) during (5 minutes))
      .throttle(
        reachRps(10) in (30 seconds),
        holdFor(5 minutes),
        reachRps(0) in (30 seconds)
      )
}

