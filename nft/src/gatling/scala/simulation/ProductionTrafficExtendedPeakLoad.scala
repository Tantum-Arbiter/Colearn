//package simulation
//
//import io.gatling.core.Predef._
//import io.gatling.core.structure.PopulationBuilder
//import io.gatling.http.Predef._
//import scenarios.TestScenario
//import scala.language.postfixOps
//import scala.sys.process.Process
//
//class ProductionTrafficExtendedPeakLoad extends Simulation {
//  val host = "http://localhost:8080"
//
//  val httpProtocol = http.baseUrl(host)
//  val scenarios: List[PopulationBuilder] = List(TestScenario.status_scenario)
//
//  Process("./src/gatling/scala/scripts/failure_simulation_service.sh").run()
//
//  setUp(scenarios)
//    .protocols(httpProtocol)
//    .assertions(
//      global.responseTime.percentile(99).lt(600),
//      forAll.successfulRequests.percent.is(100)
//    )
//}