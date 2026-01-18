package simulation

import io.gatling.core.Predef._
import io.gatling.core.structure.PopulationBuilder
import io.gatling.http.Predef._
import scenarios.RealisticUserScenario

import scala.concurrent.duration.DurationInt
import scala.language.postfixOps

/**
 * Realistic User Traffic Simulation
 *
 * Simulates 10 different user personas hitting the application concurrently
 * with different behaviors (sign in, sign out, sync CMS, update settings, etc.)
 *
 * Load Profile:
 * - Ramp up to 100 users in 10 seconds
 * - Hold at 100 users for 4 minutes
 * - Ramp down to 0 users in 10 seconds
 *
 * Each of the 10 user personas gets 10 users (100 total)
 *
 * Run with:
 *   cd nft && ./gradlew gatlingRun-simulation.RealisticUserTrafficSimulation
 *
 * Environment variables:
 *   GATEWAY_BASE_URL - Base URL of the gateway (default: http://localhost:8080)
 *   BEARER_TOKEN - Valid JWT for authenticated endpoints
 *   GOOGLE_ID_TOKEN - Valid Google OAuth ID token for sign-in
 *   REFRESH_TOKEN - Valid refresh token for token refresh/revoke
 */
class RealisticUserTrafficSimulation extends Simulation {

  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("GrowWithFreya/1.0.0 (NFT Realistic Traffic)")
    .shareConnections

  // Load profile configuration
  val usersPerPersona = 10          // 10 users per persona type
  val rampUpDuration = 10.seconds   // Ramp up in 10 seconds
  val holdDuration = 4.minutes      // Hold for 4 minutes
  val rampDownDuration = 10.seconds // Ramp down in 10 seconds

  // Total test duration
  val totalDuration = rampUpDuration + holdDuration + rampDownDuration

  // All 10 user personas with their respective behaviors
  // Each persona ramps up, holds, then ramps down
  val scenarios: List[PopulationBuilder] = List(
    RealisticUserScenario.newUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.returningUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.powerUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.settingsUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.browserUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.quickCheckerScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.signOutUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.syncHeavyUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.profileManagerScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.mixedUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    )
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .maxDuration(totalDuration)
    .assertions(
      // Overall performance targets
      global.responseTime.percentile(99).lt(2000),  // P99 under 2 seconds
      global.responseTime.percentile(95).lt(1000),  // P95 under 1 second
      global.successfulRequests.percent.gte(90),    // At least 90% success (some auth will fail with test tokens)

      // Per-endpoint assertions for critical paths
      details("sync_stories").responseTime.percentile(99).lt(3000),      // Sync can be slower
      details("get_all_stories").responseTime.percentile(99).lt(1500),
      details("health_check").responseTime.percentile(99).lt(500)
    )
}

/**
 * Lighter version for quick smoke tests
 *
 * - 2 users per persona (8 total with 4 personas)
 * - Ramp up in 5 seconds
 * - Hold for 30 seconds
 * - Ramp down in 5 seconds
 */
class RealisticUserTrafficSmokeTest extends Simulation {

  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("GrowWithFreya/1.0.0 (NFT Smoke Test)")
    .shareConnections

  val usersPerPersona = 2
  val rampUpDuration = 5.seconds
  val holdDuration = 30.seconds
  val rampDownDuration = 5.seconds
  val totalDuration = rampUpDuration + holdDuration + rampDownDuration

  // Use a subset of personas for smoke test
  val scenarios: List[PopulationBuilder] = List(
    RealisticUserScenario.newUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.returningUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.syncHeavyUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    ),
    RealisticUserScenario.mixedUserScenario.inject(
      rampUsersPerSec(0).to(usersPerPersona).during(rampUpDuration),
      constantUsersPerSec(usersPerPersona).during(holdDuration),
      rampUsersPerSec(usersPerPersona).to(0).during(rampDownDuration)
    )
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .maxDuration(totalDuration)
    .assertions(
      global.responseTime.percentile(99).lt(2000),
      global.successfulRequests.percent.gte(85)
    )
}

