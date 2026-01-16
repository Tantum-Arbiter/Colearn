package scenarios

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration.DurationInt
import scala.language.postfixOps

/**
 * Public API endpoint scenarios for NFT (Non-Functional Testing)
 *
 * These are client-facing endpoints that the mobile app uses.
 * Some endpoints require authentication via Bearer token.
 *
 * Environment variables:
 * - BEARER_TOKEN: Valid JWT access token for authenticated endpoints
 * - TEST_STORY_ID: Story ID for single story fetch test
 * - TEST_CATEGORY: Category for category filter test
 * - TEST_ASSET_PATH: Asset path for signed URL test
 */
object PublicApiScenario {

  // Configuration from environment
  val bearerToken = sys.env.getOrElse("BEARER_TOKEN", "test-bearer-token")
  val testStoryId = sys.env.getOrElse("TEST_STORY_ID", "story-001")
  val testCategory = sys.env.getOrElse("TEST_CATEGORY", "bedtime")
  val testAssetPath = sys.env.getOrElse("TEST_ASSET_PATH", "stories/images/test.png")

  // Common headers
  val jsonHeaders = Map(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json",
    "User-Agent" -> "GrowWithFreya-NFT/1.0 (Gatling Load Test)"
  )

  val authHeaders = Map(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json",
    "Authorization" -> s"Bearer $bearerToken",
    "User-Agent" -> "GrowWithFreya-NFT/1.0 (Gatling Load Test)"
  )

  // ============================================
  // Status Endpoints (Health Checks)
  // ============================================

  val root_status_scenario = scenario("GET / - Root Status")
    .exec(
      http("root_status")
        .get("/")
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  val auth_status_scenario = scenario("GET /auth/status - Auth Service Status")
    .exec(
      http("auth_status")
        .get("/auth/status")
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Stories Endpoints (All /api/** require auth)
  // ============================================

  val get_all_stories_scenario = scenario("GET /api/stories - Get All Stories")
    .exec(
      http("get_all_stories")
        .get("/api/stories")
        .headers(authHeaders)
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  val get_story_by_id_scenario = scenario("GET /api/stories/{storyId} - Get Story by ID")
    .exec(
      http("get_story_by_id")
        .get(s"/api/stories/$testStoryId")
        .headers(authHeaders)
        .check(status.in(200, 404))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  val get_stories_version_scenario = scenario("GET /api/stories/version - Get Content Version")
    .exec(
      http("get_stories_version")
        .get("/api/stories/version")
        .headers(authHeaders)
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  val get_stories_by_category_scenario = scenario("GET /api/stories/category/{category} - Get Stories by Category")
    .exec(
      http("get_stories_by_category")
        .get(s"/api/stories/category/$testCategory")
        .headers(authHeaders)
        .check(status.in(200, 404))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  val sync_stories_scenario = scenario("POST /api/stories/sync - Sync Stories")
    .exec(
      http("sync_stories")
        .post("/api/stories/sync")
        .headers(authHeaders)
        .body(StringBody("""{"clientVersion": "0"}"""))
        .check(status.in(200, 204))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Assets Endpoints (All /api/** require auth)
  // ============================================

  val get_asset_url_scenario = scenario("GET /api/assets/url - Get Signed URL")
    .exec(
      http("get_asset_url")
        .get(s"/api/assets/url?path=$testAssetPath")
        .headers(authHeaders)
        .check(status.in(200, 404))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  val get_assets_version_scenario = scenario("GET /api/assets/version - Get Asset Version")
    .exec(
      http("get_assets_version")
        .get("/api/assets/version")
        .headers(authHeaders)
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  val sync_assets_scenario = scenario("POST /api/assets/sync - Sync Assets")
    .exec(
      http("sync_assets")
        .post("/api/assets/sync")
        .headers(authHeaders)
        .body(StringBody("""{"clientVersion": "0"}"""))
        .check(status.in(200, 204))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Profile Endpoints (Requires Authentication)
  // ============================================

  val get_profile_scenario = scenario("GET /api/profile - Get User Profile (Auth Required)")
    .exec(
      http("get_profile")
        .get("/api/profile")
        .headers(authHeaders)
        .check(status.in(200, 401, 404))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  val save_profile_scenario = scenario("POST /api/profile - Save User Profile (Auth Required)")
    .exec(
      http("save_profile")
        .post("/api/profile")
        .headers(authHeaders)
        .body(StringBody("""{
          "nickname": "NFT Test User",
          "avatarType": "boy",
          "textSizePreference": 1.0,
          "language": "en"
        }"""))
        .check(status.in(200, 201, 401))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )

  // ============================================
  // Helper for creating custom load tests
  // ============================================

  def get_peak_load(requestName: String, requestEndpoint: String) =
    scenario(s"peak load test for $requestName endpoint")
      .exec(
        http(requestName)
          .get(requestEndpoint)
          .headers(jsonHeaders)
          .check(status.is(200))
      )
      .inject(constantUsersPerSec(10) during (5 minutes))
      .throttle(
        reachRps(10) in (30 seconds),
        holdFor(5 minutes),
        reachRps(0) in (30 seconds)
      )

  def post_peak_load(requestName: String, requestEndpoint: String, requestBody: String) =
    scenario(s"peak load test for $requestName endpoint")
      .exec(
        http(requestName)
          .post(requestEndpoint)
          .headers(jsonHeaders)
          .body(StringBody(requestBody))
          .check(status.in(200, 201, 204))
      )
      .inject(constantUsersPerSec(10) during (5 minutes))
      .throttle(
        reachRps(10) in (30 seconds),
        holdFor(5 minutes),
        reachRps(0) in (30 seconds)
      )

  def auth_get_peak_load(requestName: String, requestEndpoint: String) =
    scenario(s"peak load test for $requestName endpoint (authenticated)")
      .exec(
        http(requestName)
          .get(requestEndpoint)
          .headers(authHeaders)
          .check(status.in(200, 401))
      )
      .inject(constantUsersPerSec(10) during (5 minutes))
      .throttle(
        reachRps(10) in (30 seconds),
        holdFor(5 minutes),
        reachRps(0) in (30 seconds)
      )
}
