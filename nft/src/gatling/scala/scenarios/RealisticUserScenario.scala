package scenarios

import io.gatling.core.Predef._
import io.gatling.core.structure.{ChainBuilder, ScenarioBuilder}
import io.gatling.http.Predef._
import scala.concurrent.duration.DurationInt
import scala.language.postfixOps
import scala.util.Random

/**
 * Realistic User Traffic Scenarios
 * 
 * Simulates 10 different user personas with varying behaviors:
 * 1. New User - Signs up, browses stories, syncs content
 * 2. Returning User - Signs in, syncs, reads stories
 * 3. Power User - Heavy CMS sync, multiple story reads
 * 4. Settings User - Updates profile and notifications
 * 5. Browser User - Just browses stories by category
 * 6. Quick Checker - Checks version, minimal activity
 * 7. Sign Out User - Signs in then signs out
 * 8. Sync Heavy User - Frequent sync operations
 * 9. Profile Manager - Updates profile settings repeatedly
 * 10. Mixed User - Random mix of all operations
 */
object RealisticUserScenario {

  val random = new Random()

  // Environment configuration
  // Default token must be recognized by the gateway's test profile security filter
  // (see JwtAuthenticationFilter.isAcceptedFakeToken - accepts "valid-*" or "gateway-access-token*")
  val bearerToken = sys.props.getOrElse("BEARER_TOKEN",
    sys.env.getOrElse("BEARER_TOKEN", "gateway-access-token"))
  val googleIdToken = sys.env.getOrElse("GOOGLE_ID_TOKEN", "test-google-id-token")
  val refreshToken = sys.env.getOrElse("REFRESH_TOKEN", "test-refresh-token")

  // Common headers
  val baseHeaders = Map(
    "Content-Type" -> "application/json",
    "Accept" -> "application/json",
    "User-Agent" -> "GrowWithFreya/1.0 (Realistic User Test)",
    "X-Client-Platform" -> "ios",
    "X-Client-Version" -> "1.0.0",
    "X-Device-ID" -> s"realistic-user-${random.alphanumeric.take(8).mkString}",
    "X-Device-Type" -> "mobile"
  )

  val authHeaders = baseHeaders + ("Authorization" -> s"Bearer $bearerToken")

  // Think times to simulate real user behavior
  val shortThink = 500.milliseconds
  val mediumThink = 2.seconds
  val longThink = 5.seconds

  // ============================================
  // Atomic Actions (Building Blocks)
  // ============================================

  def signIn: ChainBuilder = exec(
    http("sign_in_google")
      .post("/auth/google")
      .headers(baseHeaders)
      .body(StringBody(s"""{"idToken": "$googleIdToken"}"""))
      .check(status.in(200, 401, 400))
  ).pause(shortThink)

  def signOut: ChainBuilder = exec(
    http("sign_out")
      .post("/auth/revoke")
      .headers(baseHeaders)
      .body(StringBody(s"""{"refreshToken": "$refreshToken"}"""))
      .check(status.in(200, 401, 400))
  ).pause(shortThink)

  def refreshAuthToken: ChainBuilder = exec(
    http("refresh_token")
      .post("/auth/refresh")
      .headers(baseHeaders)
      .body(StringBody(s"""{"refreshToken": "$refreshToken"}"""))
      .check(status.in(200, 401, 400))
  ).pause(shortThink)

  def checkStoriesVersion: ChainBuilder = exec(
    http("check_stories_version")
      .get("/api/stories/version")
      .headers(authHeaders)
      .check(status.is(200))
  ).pause(shortThink)

  def syncStories: ChainBuilder = exec(
    http("delta_sync_stories")
      .post("/api/stories/delta")
      .headers(authHeaders)
      .body(StringBody("""{"clientVersion": 0, "storyChecksums": {}}"""))
      .check(status.in(200, 204, 500))
  ).pause(mediumThink)

  def getAllStories: ChainBuilder = exec(
    http("get_all_stories")
      .get("/api/stories")
      .headers(authHeaders)
      .check(status.is(200))
  ).pause(shortThink)

  def getStoryById(storyId: String): ChainBuilder = exec(
    http("get_story_by_id")
      .get(s"/api/stories/$storyId")
      .headers(authHeaders)
      .check(status.in(200, 404))
  ).pause(longThink) // User reads the story

  def getStoriesByCategory(category: String): ChainBuilder = exec(
    http("get_stories_by_category")
      .get(s"/api/stories/category/$category")
      .headers(authHeaders)
      .check(status.in(200, 404))
  ).pause(mediumThink)

  def checkAssetsVersion: ChainBuilder = exec(
    http("check_assets_version")
      .get("/api/assets/version")
      .headers(authHeaders)
      .check(status.is(200))
  ).pause(shortThink)
  // Note: /api/assets/sync was removed - use batchAssetUrls in Batch Processing section below

  // ============================================
  // Batch Processing Actions (New - 95% API reduction)
  // ============================================

  /**
   * Delta sync - Get only changed stories based on checksums
   */
  def deltaSyncStories: ChainBuilder = exec(
    http("delta_sync_stories")
      .post("/api/stories/delta")
      .headers(authHeaders)
      .body(StringBody("""{
        "clientVersion": 1,
        "storyChecksums": {
          "test-story-1": "checksum1",
          "test-story-2": "checksum2"
        }
      }"""))
      .check(status.in(200, 204, 500))
  ).pause(mediumThink)

  /**
   * Batch URL generation - Get signed URLs for multiple assets at once
   */
  def batchAssetUrls: ChainBuilder = exec(
    http("batch_asset_urls")
      .post("/api/assets/batch-urls")
      .headers(authHeaders)
      .body(StringBody("""{
        "paths": [
          "stories/test-story-1/cover/cover.webp",
          "stories/test-story-1/page-1/background.webp",
          "stories/test-story-2/cover/cover.webp"
        ]
      }"""))
      .check(status.in(200, 207, 500))
  ).pause(shortThink)

  /**
   * Large batch URL request - simulates power user with many assets
   */
  def batchAssetUrlsLarge: ChainBuilder = exec(
    http("batch_asset_urls_large")
      .post("/api/assets/batch-urls")
      .headers(authHeaders)
      .body(StringBody(
        s"""{
          "paths": [${(1 to 30).map(i => s""""stories/story-$i/cover.webp"""").mkString(",")}]
        }"""
      ))
      .check(status.in(200, 207, 500))
  ).pause(mediumThink)

  def getProfile: ChainBuilder = exec(
    http("get_profile")
      .get("/api/profile")
      .headers(authHeaders)
      .check(status.in(200, 404))
  ).pause(shortThink)

  def updateProfile: ChainBuilder = exec(
    http("update_profile")
      .post("/api/profile")
      .headers(authHeaders)
      .body(StringBody("""{"nickname": "TestUser", "notifications": {"enabled": true}}"""))
      .check(status.in(200, 201, 400))
  ).pause(mediumThink)

  def healthCheck: ChainBuilder = exec(
    http("health_check")
      .get("/auth/status")
      .check(status.is(200))
  ).pause(shortThink)

  // ============================================
  // User Persona Scenarios (10 different behaviors)
  // ============================================

  // 1. New User - First time experience
  val newUserScenario: ScenarioBuilder = scenario("User 1: New User Journey")
    .exec(healthCheck)
    .exec(signIn)
    .exec(syncStories)
    .exec(batchAssetUrls)  // Replaced syncAssets (endpoint removed)
    .exec(getAllStories)
    .exec(getStoryById("test-story-1"))
    .exec(updateProfile)

  // 2. Returning User - Uses delta sync for efficient updates
  val returningUserScenario: ScenarioBuilder = scenario("User 2: Returning User")
    .exec(signIn)
    .exec(checkStoriesVersion)
    .exec(deltaSyncStories)  // Use delta sync instead of full sync
    .exec(batchAssetUrls)    // Batch fetch asset URLs
    .exec(getStoriesByCategory("bedtime"))
    .exec(getStoryById("test-story-2"))

  // 3. Power User - Heavy usage with batch operations
  val powerUserScenario: ScenarioBuilder = scenario("User 3: Power User")
    .exec(signIn)
    .exec(deltaSyncStories)  // Delta sync for efficiency
    .exec(getAllStories)
    .exec(batchAssetUrlsLarge)  // Large batch for power users
    .exec(getStoryById("test-story-1"))
    .exec(getStoryById("test-story-2"))
    .exec(getStoryById("test-story-3"))
    .exec(getStoriesByCategory("adventure"))
    .exec(batchAssetUrls)  // Replaced syncAssets (endpoint removed)

  // 4. Settings User - Focuses on profile/settings
  val settingsUserScenario: ScenarioBuilder = scenario("User 4: Settings User")
    .exec(signIn)
    .exec(getProfile)
    .exec(updateProfile)
    .pause(mediumThink)
    .exec(getProfile)
    .exec(updateProfile)

  // 5. Browser User - Just browses
  val browserUserScenario: ScenarioBuilder = scenario("User 5: Browser User")
    .exec(signIn)
    .exec(getStoriesByCategory("bedtime"))
    .exec(getStoriesByCategory("adventure"))
    .exec(getStoriesByCategory("learning"))
    .exec(getAllStories)

  // 6. Quick Checker - Minimal activity
  val quickCheckerScenario: ScenarioBuilder = scenario("User 6: Quick Checker")
    .exec(healthCheck)
    .exec(signIn)
    .exec(checkStoriesVersion)
    .exec(checkAssetsVersion)

  // 7. Sign Out User - Signs in then out
  val signOutUserScenario: ScenarioBuilder = scenario("User 7: Sign Out User")
    .exec(signIn)
    .exec(getAllStories)
    .pause(longThink)
    .exec(signOut)

  // 8. Sync Heavy User - Uses batch operations for efficiency
  val syncHeavyUserScenario: ScenarioBuilder = scenario("User 8: Sync Heavy User")
    .exec(signIn)
    .exec(checkStoriesVersion)
    .exec(deltaSyncStories)  // Delta sync first
    .exec(checkAssetsVersion)
    .exec(batchAssetUrls)    // Then batch asset URLs
    .exec(deltaSyncStories)  // Another delta sync
    .exec(batchAssetUrlsLarge)  // Large batch

  // 9. Profile Manager - Profile operations
  val profileManagerScenario: ScenarioBuilder = scenario("User 9: Profile Manager")
    .exec(signIn)
    .exec(getProfile)
    .exec(updateProfile)
    .exec(getProfile)
    .pause(longThink)
    .exec(updateProfile)
    .exec(getProfile)

  // 10. Mixed User - Mix of old and new batch operations
  val mixedUserScenario: ScenarioBuilder = scenario("User 10: Mixed User")
    .exec(signIn)
    .exec(checkStoriesVersion)
    .exec(deltaSyncStories)  // New batch API
    .exec(getProfile)
    .exec(batchAssetUrls)    // New batch API
    .exec(getStoryById("story-001"))
    .exec(updateProfile)
    .exec(refreshAuthToken)

  // 11. Batch Processing User - Exclusively uses new batch APIs
  val batchProcessingUserScenario: ScenarioBuilder = scenario("User 11: Batch Processing User")
    .exec(signIn)
    .exec(checkStoriesVersion)
    .exec(deltaSyncStories)
    .exec(checkAssetsVersion)
    .exec(batchAssetUrls)
    .pause(mediumThink)
    .exec(deltaSyncStories)
    .exec(batchAssetUrlsLarge)
    .pause(longThink)
    .exec(deltaSyncStories)
    .exec(batchAssetUrls)
}

