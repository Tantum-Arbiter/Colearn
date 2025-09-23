package simulation

import io.gatling.core.Predef._
import io.gatling.core.structure.PopulationBuilder
import io.gatling.http.Predef._
import scenarios.TestScenario

import scala.language.postfixOps
import scala.util.Properties

class PeakLoad extends Simulation {
  val host = sys.env.getOrElse("GATEWAY_HOST", "http://localhost:8080")

  val httpProtocol = http.baseUrl(host)
  val scenarios: List[PopulationBuilder] = List(TestScenario.status_scenario)

  setUp(scenarios)
    .protocols(httpProtocol)
    .assertions(
      global.responseTime.percentile(99).lt(600),
      forAll.successfulRequests.percent.is(100)
    )
}