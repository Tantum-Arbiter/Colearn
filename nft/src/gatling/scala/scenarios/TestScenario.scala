package scenarios

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration.DurationInt
import scala.language.postfixOps

object TestScenario {

  val status_scenario = peak_load("private_status", "/private/status")

  def peak_load(requestName: String, requestEndpoint: String) = scenario("peak load test for " + requestName + " endpoint")
    .exec(http(requestName)
      .get(requestEndpoint)
//      .header("Authorization", "Basic Y21zOmNtc3Bhc3M=")
      .check(status.is(200)))
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds));


  val get_private_status = scenario("GET private status")
    .exec(
      http("private_status")
        .get("/private/status")
//        .header("Authorization", "Basic Y21zOmNtc3Bhc3M=")
        .check(status.is(200))
    )
    .inject(constantUsersPerSec(10) during (5 minutes))
    .throttle(
      reachRps(10) in (30 seconds),
      holdFor(5 minutes),
      reachRps(0) in (30 seconds)
    )


}