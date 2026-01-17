package simulation

import io.gatling.core.Predef._
import io.gatling.core.structure.PopulationBuilder
import io.gatling.http.Predef._
import scenarios.PrivateApiScenario

import scala.concurrent.duration.DurationInt
import scala.language.postfixOps

/**
 * Peak Load Simulation for Private API Endpoints
 * 
 * Tests the following endpoints under load:
 * - POST /private/rebuild-content-version (rebuilds content version from Firestore)
 * - GET /private/healthcheck
 * - GET /private/status
 * - GET /private/info
 * - GET /private/prometheus
 * - GET /api/stories/version
 * 
 * Note: These endpoints are only available in test/gcp-dev profiles.
 * The rebuild-content-version endpoint is particularly important for CMS sync.
 * 
 * Environment variables:
 * - GATEWAY_BASE_URL: Base URL of the gateway service (default: http://localhost:8080)
 * 
 * Usage:
 *   ./gradlew gatlingRun-simulation.PrivateApiPeakLoad
 */
class PrivateApiPeakLoad extends Simulation {
  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  // Define injection profile for each scenario
  val healthcheckScenario = scenario("Healthcheck")
    .exec(
      http("healthcheck")
        .get("/private/healthcheck")
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(100) during (5 minutes))

  val statusScenario = scenario("Status")
    .exec(
      http("status")
        .get("/private/status")
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(100) during (5 minutes))

  val infoScenario = scenario("Info")
    .exec(
      http("info")
        .get("/private/info")
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(100) during (5 minutes))

  val contentVersionScenario = scenario("Content Version")
    .exec(
      http("content_version")
        .get("/api/stories/version")
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(100) during (5 minutes))

  // Rebuild content version - lower rate since it's a heavier operation
  val rebuildContentVersionScenario = scenario("Rebuild Content Version")
    .exec(
      http("rebuild_content_version")
        .post("/private/rebuild-content-version")
        .check(status.in(200, 503))
    )
    .inject(constantUsersPerSec(20) during (5 minutes))

  // Run all scenarios
  val scenarios: List[PopulationBuilder] = List(
    healthcheckScenario,
    statusScenario,
    infoScenario,
    contentVersionScenario,
    rebuildContentVersionScenario
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      // Target: 1 second response time for all private endpoints
      details("healthcheck").responseTime.percentile(99).lt(1000),
      details("status").responseTime.percentile(99).lt(1000),
      details("info").responseTime.percentile(99).lt(1000),
      details("content_version").responseTime.percentile(99).lt(1000),

      // Rebuild content version - heavier Firestore operation, allow 3 seconds
      details("rebuild_content_version").responseTime.percentile(99).lt(3000),

      // Global success rate
      global.successfulRequests.percent.gte(95)
    )
}

