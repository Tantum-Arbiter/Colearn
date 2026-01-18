package simulation

import io.gatling.core.Predef._
import io.gatling.core.structure.PopulationBuilder
import io.gatling.http.Predef._
import scenarios.PublicApiScenario

import scala.language.postfixOps

/**
 * Peak Load Simulation for Public API Endpoints
 * 
 * Tests all client-facing endpoints that the mobile app uses.
 * 
 * Run with:
 *   ./gradlew gatlingRun-simulation.PublicApiPeakLoad
 * 
 * Environment variables:
 *   GATEWAY_BASE_URL - Base URL of the gateway (default: http://localhost:8080)
 *   BEARER_TOKEN - Valid JWT for authenticated endpoints
 *   TEST_STORY_ID - Story ID for single story fetch
 *   TEST_CATEGORY - Category for filter test
 *   TEST_ASSET_PATH - Asset path for signed URL test
 */
class PublicApiPeakLoad extends Simulation {

  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("GrowWithFreya/1.0.0 (NFT Load Test)")

  // All public API scenarios
  val scenarios: List[PopulationBuilder] = List(
    // Status endpoints
    PublicApiScenario.auth_status_scenario,

    // Stories endpoints
    PublicApiScenario.get_all_stories_scenario,
    PublicApiScenario.get_story_by_id_scenario,
    PublicApiScenario.get_stories_version_scenario,
    PublicApiScenario.get_stories_by_category_scenario,
    PublicApiScenario.sync_stories_scenario,

    // Assets endpoints (get_asset_url requires GCS credentials - skip in local testing)
    PublicApiScenario.get_assets_version_scenario,
    PublicApiScenario.sync_assets_scenario

    // Profile endpoints - disabled (Firestore contention + same mock userId)
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      // Target: 1 second response time for all APIs except CMS sync (bigger payloads)

      // Regular API endpoints - strict 1 second target
      details("auth_status").responseTime.percentile(99).lt(1000),
      details("get_stories_version").responseTime.percentile(99).lt(1000),
      details("get_story_by_id").responseTime.percentile(99).lt(1000),
      details("get_stories_by_category").responseTime.percentile(99).lt(1000),
      details("get_all_stories").responseTime.percentile(99).lt(1000),
      details("get_assets_version").responseTime.percentile(99).lt(1000),

      // CMS sync endpoints - larger payloads, allow up to 3 seconds
      details("sync_stories").responseTime.percentile(99).lt(3000),
      details("sync_assets").responseTime.percentile(99).lt(3000),

      // Global success rate
      forAll.successfulRequests.percent.gte(95)
    )
}

/**
 * Lighter simulation for quick smoke tests
 */
class PublicApiSmokeTest extends Simulation {

  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("GrowWithFreya/1.0.0 (NFT Smoke Test)")

  // Just status and basic story endpoints for quick validation
  val scenarios: List[PopulationBuilder] = List(
    PublicApiScenario.auth_status_scenario,
    PublicApiScenario.get_all_stories_scenario,
    PublicApiScenario.get_stories_version_scenario
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      global.responseTime.mean.lt(150),
      global.responseTime.percentile(50).lt(75),
      global.responseTime.percentile(95).lt(300),
      global.responseTime.percentile(99).lt(500),
      forAll.successfulRequests.percent.is(100)
    )
}

// AuthenticatedApiPeakLoad removed - profile endpoints cause Firestore contention
// and all use the same mock userId under load

