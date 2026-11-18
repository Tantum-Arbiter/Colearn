package com.app.config;

import com.app.service.ApplicationMetricsService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AlertRulesTest {

    private static final Path ALERTS = Path.of("../prometheus/alerts/gateway-alerts.yml");
    private static final Pattern METRIC = Pattern.compile("\\b(app_(?:revenuecat|entitlements)_[a-z_]+)\\b");

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> rules(String group) throws Exception {
        Map<String, Object> config = new Yaml().load(Files.readString(ALERTS));
        for (Map<String, Object> g : (List<Map<String, Object>>) config.get("groups")) {
            if (group.equals(g.get("name"))) {
                return (List<Map<String, Object>>) g.get("rules");
            }
        }
        throw new AssertionError("no group " + group);
    }

    private static Set<String> emittedMetricNames() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        ApplicationMetricsService metrics = new ApplicationMetricsService(registry);
        metrics.recordRevenueCatRequest("active", 5);
        metrics.recordEntitlementDecision("allowed", "cache", false);
        metrics.recordEntitlementRefresh("revenuecat");
        return registry.getMeters().stream()
                .map(meter -> meter.getId().getName().replace('.', '_'))
                .flatMap(name -> Set.of(name + "_total", name + "_seconds_count", name).stream())
                .collect(Collectors.toSet());
    }

    @Test
    void hasAnAlertForEachEntitlementFailureTheRunbookCovers() throws Exception {
        Set<String> names = rules("gateway-entitlements").stream().map(r -> (String) r.get("alert")).collect(Collectors.toSet());

        assertEquals(Set.of("RevenueCatUnauthorized", "RevenueCatErrorRate", "EntitlementsUnverifiedSpike", "EntitlementsRefusalSpike"), names);
    }

    @Test
    void everyMetricTheEntitlementAlertsReadIsOneTheGatewayEmits() throws Exception {
        Set<String> emitted = emittedMetricNames();
        for (Map<String, Object> rule : rules("gateway-entitlements")) {
            Matcher m = METRIC.matcher((String) rule.get("expr"));
            boolean any = false;
            while (m.find()) {
                any = true;
                assertTrue(emitted.contains(m.group(1)), rule.get("alert") + " reads " + m.group(1) + ", which nothing emits");
            }
            assertTrue(any, rule.get("alert") + " reads no entitlement metric");
        }
    }

    @Test
    void everyEntitlementAlertPointsAtTheRunbook() throws Exception {
        for (Map<String, Object> rule : rules("gateway-entitlements")) {
            @SuppressWarnings("unchecked")
            Map<String, String> annotations = (Map<String, String>) rule.get("annotations");
            assertTrue(annotations.get("description").contains("RUNBOOK-ENTITLEMENTS.md#"), rule.get("alert") + " has no runbook link");
        }
    }

    @Test
    void theRunbookHasASectionForEveryLinkTheAlertsUse() throws Exception {
        String runbook = Files.readString(Path.of("RUNBOOK-ENTITLEMENTS.md"));
        Pattern anchor = Pattern.compile("RUNBOOK-ENTITLEMENTS\\.md#([a-z-]+)");
        for (Map<String, Object> rule : rules("gateway-entitlements")) {
            @SuppressWarnings("unchecked")
            Matcher m = anchor.matcher(((Map<String, String>) rule.get("annotations")).get("description"));
            assertTrue(m.find());
            String heading = m.group(1).replace('-', ' ');
            assertTrue(runbook.toLowerCase().contains("## " + heading), "RUNBOOK-ENTITLEMENTS.md has no section '" + heading + "'");
        }
    }
}
