package scenarios

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration.DurationInt
import scala.language.postfixOps

/**
 * Authentication endpoint scenarios for NFT (Non-Functional Testing)
 * 
 * Note: These endpoints require real OAuth tokens:
 * - /auth/google, /auth/apple, /auth/firebase: require real OAuth ID tokens
 * - /auth/refresh, /auth/revoke: require valid refresh tokens
 * 
 * For load testing, use environment variables to provide valid tokens:
 * - GOOGLE_ID_TOKEN: Valid Google OAuth ID token
 * - APPLE_ID_TOKEN: Valid Apple OAuth ID token
 * - FIREBASE_ID_TOKEN: Valid Firebase ID token
 * - REFRESH_TOKEN: Valid refresh token
 */
object AuthScenario {

  // Token feeders - tokens should be provided via environment variables
  val googleIdToken = sys.env.getOrElse("GOOGLE_ID_TOKEN", "test-google-id-token")
  val appleIdToken = sys.env.getOrElse("APPLE_ID_TOKEN", "test-apple-id-token")
  val firebaseIdToken = sys.env.getOrElse("FIREBASE_ID_TOKEN", "test-firebase-id-token")
  val refreshToken = sys.env.getOrElse("REFRESH_TOKEN", "test-refresh-token")

  // Common headers for auth requests
  val authHeaders = Map(
    "Content-Type" -> "application/json",
    "X-Client-Platform" -> "ios",
    "X-Client-Version" -> "1.0.0",
    "X-Device-ID" -> "nft-load-test-device"
  )

  // ============================================
  // Google OAuth Authentication
  // ============================================
  val auth_google_scenario = scenario("POST /auth/google - Google OAuth Authentication")
    .exec(
      http("auth_google")
        .post("/auth/google")
        .headers(authHeaders)
        .body(StringBody(s"""{"idToken": "$googleIdToken"}"""))
        .check(status.in(200, 401, 400)) // Accept auth errors for invalid test tokens
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Apple OAuth Authentication
  // ============================================
  val auth_apple_scenario = scenario("POST /auth/apple - Apple OAuth Authentication")
    .exec(
      http("auth_apple")
        .post("/auth/apple")
        .headers(authHeaders)
        .body(StringBody(s"""{"idToken": "$appleIdToken"}"""))
        .check(status.in(200, 401, 400))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Firebase Authentication (test/gcp-dev only)
  // ============================================
  val auth_firebase_scenario = scenario("POST /auth/firebase - Firebase Authentication")
    .exec(
      http("auth_firebase")
        .post("/auth/firebase")
        .headers(authHeaders)
        .body(StringBody(s"""{"idToken": "$firebaseIdToken"}"""))
        .check(status.in(200, 401, 400, 404)) // 404 if not in test/gcp-dev profile
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Refresh Token
  // ============================================
  val auth_refresh_scenario = scenario("POST /auth/refresh - Refresh Access Token")
    .exec(
      http("auth_refresh")
        .post("/auth/refresh")
        .headers(authHeaders)
        .body(StringBody(s"""{"refreshToken": "$refreshToken"}"""))
        .check(status.in(200, 401, 400))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Revoke Token (Logout)
  // ============================================
  val auth_revoke_scenario = scenario("POST /auth/revoke - Revoke Refresh Token")
    .exec(
      http("auth_revoke")
        .post("/auth/revoke")
        .headers(authHeaders)
        .body(StringBody(s"""{"refreshToken": "$refreshToken"}"""))
        .check(status.in(200, 401, 400))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Helper for creating custom auth load tests
  // ============================================
  def auth_peak_load(requestName: String, requestEndpoint: String, requestBody: String) = 
    scenario(s"peak load test for $requestName endpoint")
      .exec(
        http(requestName)
          .post(requestEndpoint)
          .headers(authHeaders)
          .body(StringBody(requestBody))
          .check(status.in(200, 401, 400))
      )
      .inject(constantUsersPerSec(10) during (5 minutes))
      .throttle(
        reachRps(10) in (30 seconds),
        holdFor(5 minutes),
        reachRps(0) in (30 seconds)
      )
}

