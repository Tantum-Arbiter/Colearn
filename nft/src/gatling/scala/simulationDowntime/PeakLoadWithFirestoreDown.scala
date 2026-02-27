package simulationDowntime

import io.gatling.core.Predef._
import io.gatling.core.structure.PopulationBuilder
import io.gatling.http.Predef._
import scenarios.PublicApiScenario
import scala.sys.process._
import scala.language.postfixOps

/**
 * Peak Load Simulation with Firestore Down
 *
 * Tests how the gateway service responds when Firestore is unavailable.
 * The service should return appropriate error codes (503, 500) rather than crashing.
 *
 * This simulation:
 * 1. Starts the load test (15 sec ramp up)
 * 2. Runs a script that stops the Firestore container for 45 seconds
 * 3. Brings Firestore back up
 * 4. Continues the load test (recovery phase)
 *
 * Expected behavior:
 * - During Firestore downtime: 503 Service Unavailable or 500 errors
 * - After Firestore recovery: Normal 200 responses
 * - No crashes or connection hangs
 *
 * Prerequisites:
 *   1. Start services: docker-compose up -d firestore gateway-service
 *   2. Run from host (NOT inside container) so script can access docker:
 *      cd nft && GATEWAY_BASE_URL=http://localhost:8080 ./gradlew gatlingRun-simulationDowntime.PeakLoadWithFirestoreDown
 */
class PeakLoadWithFirestoreDown extends Simulation {
  // Default to localhost since this runs from host machine (not in container)
  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  // Use stories endpoints that depend on Firestore
  val scenarios: List[PopulationBuilder] = List(
    PublicApiScenario.get_all_stories_scenario,
    PublicApiScenario.get_stories_version_scenario,
    PublicApiScenario.delta_sync_scenario
  )

  // Run the failure simulation script in the background
  Process("./src/gatling/scala/scripts/failure_simulation_firestore_down.sh").run()

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      // During Firestore downtime, we expect errors - but service should not crash
      // P99 can be higher during recovery, allow 5 seconds
      global.responseTime.percentile(99).lt(5000),
      // Allow failures during downtime - but most requests should eventually succeed
      // (after Firestore comes back up)
      global.successfulRequests.percent.gte(50)
    )
}