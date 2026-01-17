package scenarios

import io.gatling.core.Predef._
import io.gatling.core.structure.{PopulationBuilder, ScenarioBuilder}
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

  // Configuration from system properties (passed via -D) or environment
  val bearerToken = sys.props.getOrElse("BEARER_TOKEN",
    sys.env.getOrElse("BEARER_TOKEN", "test-bearer-token"))
  val testStoryId = sys.env.getOrElse("TEST_STORY_ID", "story-001")
  val testCategory = sys.env.getOrElse("TEST_CATEGORY", "bedtime")
  val testAssetPath = sys.env.getOrElse("TEST_ASSET_PATH", "stories/images/test.png")

  // Load test configuration
  // 10 concurrent users constant throughout test, distributed across 8 scenarios
  val numScenarios = 8
  val totalUsers = 10
  val usersPerScenario = Math.max(1, totalUsers / numScenarios)  // ~1 user per scenario
  val testDuration = 5 minutes

  // Common headers
  val jsonHeaders = Map(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json",
    "User-Agent" -> "GrowWithFreya-NFT/1.0 (Gatling Load Test)"
  )

  // Authenticated API headers (require device info for /api/** endpoints)
  val authHeaders = Map(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json",
    "Authorization" -> s"Bearer $bearerToken",
    "User-Agent" -> "GrowWithFreya-NFT/1.0 (Gatling Load Test)",
    "X-Device-ID" -> "nft-load-test-device",
    "X-Client-Platform" -> "ios",
    "X-Client-Version" -> "1.0.0"
  )

  // ============================================
  // Status Endpoints (Health Checks)
  // ============================================

  // Injection pattern: constant concurrent users for the entire test duration
  def injectLoad(scn: ScenarioBuilder): PopulationBuilder = scn.inject(
    constantConcurrentUsers(usersPerScenario).during(testDuration)
  )

  val root_status_scenario = injectLoad(
    scenario("GET / - Root Status")
      .exec(
        http("root_status")
          .get("/")
          .check(status.is(200))
      )
  )

  val auth_status_scenario = injectLoad(
    scenario("GET /auth/status - Auth Service Status")
      .exec(
        http("auth_status")
          .get("/auth/status")
          .check(status.is(200))
      )
  )

  // ============================================
  // Stories Endpoints (All /api/** require auth)
  // ============================================

  val get_all_stories_scenario = injectLoad(
    scenario("GET /api/stories - Get All Stories")
      .exec(
        http("get_all_stories")
          .get("/api/stories")
          .headers(authHeaders)
          .check(status.is(200))
      )
  )

  val get_story_by_id_scenario = injectLoad(
    scenario("GET /api/stories/{storyId} - Get Story by ID")
      .exec(
        http("get_story_by_id")
          .get(s"/api/stories/$testStoryId")
          .headers(authHeaders)
          .check(status.in(200, 404))
      )
  )

  val get_stories_version_scenario = injectLoad(
    scenario("GET /api/stories/version - Get Content Version")
      .exec(
        http("get_stories_version")
          .get("/api/stories/version")
          .headers(authHeaders)
          .check(status.is(200))
      )
  )

  val get_stories_by_category_scenario = injectLoad(
    scenario("GET /api/stories/category/{category} - Get Stories by Category")
      .exec(
        http("get_stories_by_category")
          .get(s"/api/stories/category/$testCategory")
          .headers(authHeaders)
          .check(status.in(200, 404))
      )
  )

  val sync_stories_scenario = injectLoad(
    scenario("POST /api/stories/sync - Sync Stories")
      .exec(
        http("sync_stories")
          .post("/api/stories/sync")
          .headers(authHeaders)
          .body(StringBody("""{"clientVersion": 0, "storyChecksums": {}, "lastSyncTimestamp": 0}"""))
          .check(status.in(200, 204, 500))
      )
  )

  // ============================================
  // Assets Endpoints (All /api/** require auth)
  // ============================================

  // NOTE: get_asset_url requires GCS credentials for signed URLs - skip in local NFT testing
  // val get_asset_url_scenario = ...

  val get_assets_version_scenario = injectLoad(
    scenario("GET /api/assets/version - Get Asset Version")
      .exec(
        http("get_assets_version")
          .get("/api/assets/version")
          .headers(authHeaders)
          .check(status.is(200))
      )
  )

  val sync_assets_scenario = injectLoad(
    scenario("POST /api/assets/sync - Sync Assets")
      .exec(
        http("sync_assets")
          .post("/api/assets/sync")
          .headers(authHeaders)
          .body(StringBody("""{"clientVersion": 0, "assetChecksums": {}, "lastSyncTimestamp": 0}"""))
          .check(status.in(200, 204, 500))
      )
  )

  // ============================================
  // Profile Endpoints - DISABLED for NFT
  // Profile operations cause Firestore contention under load
  // and all use the same mock userId. Better tested in func-tests.
  // ============================================

  // val get_profile_scenario = ...
  // val save_profile_scenario = ...

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
