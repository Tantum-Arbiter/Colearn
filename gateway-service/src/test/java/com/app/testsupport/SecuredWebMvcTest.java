package com.app.testsupport;

import com.app.config.JwtConfig;
import com.app.config.SecurityConfig;
import com.app.config.SecurityHeadersConfig;
import com.app.service.ApplicationMetricsService;
import com.app.service.SecurityMonitoringService;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestTemplate;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@ActiveProfiles("test")
@Import({SecurityConfig.class, SecurityHeadersConfig.class, JwtConfig.class})
@MockitoBean(types = {ApplicationMetricsService.class, SecurityMonitoringService.class})
@MockitoBean(name = "defaultRestTemplate", types = RestTemplate.class)
public @interface SecuredWebMvcTest {
}
