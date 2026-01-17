package simulation

import io.gatling.core.Predef._
import io.gatling.core.structure.PopulationBuilder
import io.gatling.http.Predef._
import scenarios.AuthScenario

import scala.language.postfixOps

/**
 * Peak Load Simulation for Authentication Endpoints
 * 
 * Tests the following endpoints under load:
 * - POST /auth/google (requires real Google OAuth ID token)
 * - POST /auth/apple (requires real Apple OAuth ID token)
 * - POST /auth/firebase (requires real Firebase ID token, test/gcp-dev only)
 * - POST /auth/refresh (requires valid refresh token)
 * - POST /auth/revoke (requires valid refresh token)
 * 
 * Environment variables:
 * - GATEWAY_BASE_URL: Base URL of the gateway service (default: http://localhost:8080)
 * - GOOGLE_ID_TOKEN: Valid Google OAuth ID token
 * - APPLE_ID_TOKEN: Valid Apple OAuth ID token
 * - FIREBASE_ID_TOKEN: Valid Firebase ID token
 * - REFRESH_TOKEN: Valid refresh token
 * 
 * Usage:
 *   ./gradlew gatlingRun-simulation.AuthPeakLoad
 */
class AuthPeakLoad extends Simulation {
  val host = sys.env.getOrElse("GATEWAY_BASE_URL", "http://localhost:8080")

  val httpProtocol = http
    .baseUrl(host)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  // Run all auth scenarios
  val scenarios: List[PopulationBuilder] = List(
    AuthScenario.auth_google_scenario,
    AuthScenario.auth_apple_scenario,
    AuthScenario.auth_firebase_scenario,
    AuthScenario.auth_refresh_scenario,
    AuthScenario.auth_revoke_scenario
  )

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      // P99 response time under 600ms
      global.responseTime.percentile(99).lt(600),
      // At least 95% success rate (some requests may fail with invalid test tokens)
      global.successfulRequests.percent.gte(95)
    )
}

