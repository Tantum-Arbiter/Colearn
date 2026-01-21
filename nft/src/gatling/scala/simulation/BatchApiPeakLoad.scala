package simulation

import io.gatling.core.Predef._
import io.gatling.core.structure.PopulationBuilder
import io.gatling.http.Predef._
import scenarios.PublicApiScenario

import scala.language.postfixOps

/**
 * Peak Load Simulation for Batch Processing API Endpoints
 * 
 * Tests the new batch processing endpoints that reduce API calls by 95%:
 * - POST /api/stories/delta - Delta sync (checksum-based updates)
 * - POST /api/assets/batch-urls - Batch URL generation (50 assets per request)
 * 
 * Run with:
 *   ./gradlew gatlingRun-simulation.BatchApiPeakLoad
 * 
 * Environment variables:
 *   GATEWAY_BASE_URL - Base URL of the gateway (default: http://localhost:8080)
 *   BEARER_TOKEN - Valid JWT for authenticated endpoints
 */
class BatchApiPeakLoad extends Simulation {

  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("GrowWithFreya/1.0.0 (NFT Batch API Load Test)")

  // All batch processing scenarios
  val scenarios: List[PopulationBuilder] = List(
    // Standard batch operations
    PublicApiScenario.delta_sync_scenario,
    PublicApiScenario.batch_urls_scenario,

    // Large batch operations (stress test)
    PublicApiScenario.delta_sync_large_scenario,
    PublicApiScenario.batch_urls_large_scenario
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      // Delta sync - checksum comparison should be fast
      details("delta_sync_stories").responseTime.percentile(99).lt(1500),
      details("delta_sync_stories").responseTime.percentile(95).lt(1000),
      details("delta_sync_stories").responseTime.mean.lt(500),

      // Large delta sync - more checksums, slightly longer
      details("delta_sync_stories_large").responseTime.percentile(99).lt(2000),
      details("delta_sync_stories_large").responseTime.percentile(95).lt(1500),

      // Batch URLs - GCS signed URL generation
      details("batch_asset_urls").responseTime.percentile(99).lt(1500),
      details("batch_asset_urls").responseTime.percentile(95).lt(1000),
      details("batch_asset_urls").responseTime.mean.lt(500),

      // Large batch URLs (50 paths) - allow more time for GCS
      details("batch_asset_urls_large").responseTime.percentile(99).lt(3000),
      details("batch_asset_urls_large").responseTime.percentile(95).lt(2000),

      // Global success rate - allow for GCS emulator issues
      forAll.successfulRequests.percent.gte(90)
    )
}

/**
 * Smoke test for batch APIs - quick validation
 */
class BatchApiSmokeTest extends Simulation {

  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("GrowWithFreya/1.0.0 (NFT Batch API Smoke Test)")

  // Just the basic batch operations
  val scenarios: List[PopulationBuilder] = List(
    PublicApiScenario.delta_sync_scenario,
    PublicApiScenario.batch_urls_scenario
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      global.responseTime.percentile(99).lt(2000),
      global.responseTime.percentile(95).lt(1000),
      forAll.successfulRequests.percent.gte(85)
    )
}

/**
 * Stress test for batch APIs - maximum capacity testing
 * 
 * Tests the limits of batch processing with large payloads
 */
class BatchApiStressTest extends Simulation {

  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("GrowWithFreya/1.0.0 (NFT Batch API Stress Test)")

  // Only large batch operations for stress testing
  val scenarios: List[PopulationBuilder] = List(
    PublicApiScenario.delta_sync_large_scenario,
    PublicApiScenario.batch_urls_large_scenario
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      // Stress test - more lenient thresholds
      global.responseTime.percentile(99).lt(5000),
      global.responseTime.percentile(95).lt(3000),
      forAll.successfulRequests.percent.gte(80)
    )
}

