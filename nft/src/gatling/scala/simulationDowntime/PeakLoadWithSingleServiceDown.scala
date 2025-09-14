//package simulationDowntime
//
//import io.gatling.core.Predef._
//import io.gatling.http.Predef._
//import scenarios.TestScenario
//import scala.sys.process._
//import scala.language.postfixOps
//
//class PeakLoadWithSingleServiceDown extends Simulation {
//  val host = "http://localhost:80"
//
//  val httpProtocol = http.baseUrl(host)
//
//  val scenarios = TestScenario.something
//
//  Process("./src/gatling/scala/scripts/failure_simulation_service.sh").run()
//
//  setUp(scenarios)
//    .protocols(httpProtocol)
//    .assertions(
//      global.responseTime.percentile(99).lt(3500),
//      forAll.successfulRequests.percent.is(100)
//    )
//}