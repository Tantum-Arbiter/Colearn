package stepdefs;

import org.junit.platform.suite.api.ConfigurationParameter;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectClasspathResource;

import static io.cucumber.junit.platform.engine.Constants.GLUE_PROPERTY_NAME;

@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "stepdefs")
@RunWith(Cucumber.class)
@CucumberOptions(
    plugin = {"pretty", "html:build/reports/cucumber.html"},
    features = "src/test/resources/features",
    glue = "com.app.func.steps"
)
public class FuncTestsRunner {
}