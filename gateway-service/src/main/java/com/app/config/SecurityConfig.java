package com.app.config;

import com.app.security.JwtAuthenticationFilter;
import com.app.security.RequestValidationFilter;
import com.app.security.RateLimitingFilter;
import com.app.config.SecurityHeadersConfig;
import com.app.filter.MetricsFilter;
import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    @PostConstruct
    public void init() {
        SecurityContextHolder.setStrategyName(SecurityContextHolder.MODE_INHERITABLETHREADLOCAL);
    }

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RequestValidationFilter requestValidationFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final SecurityHeadersConfig.SecurityHeadersFilter securityHeadersFilter;
    private final MetricsFilter metricsFilter;
    private final ObjectMapper objectMapper;
    private final Environment environment;

    @Value("${cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Value("${cors.allowed-methods}")
    private List<String> allowedMethods;

    @Value("${cors.allowed-headers}")
    private List<String> allowedHeaders;

    @Value("${cors.allow-credentials}")
    private boolean allowCredentials;

    @Value("${cors.max-age}")
    private long maxAge;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            RequestValidationFilter requestValidationFilter,
            RateLimitingFilter rateLimitingFilter,
            SecurityHeadersConfig.SecurityHeadersFilter securityHeadersFilter,
            MetricsFilter metricsFilter,
            ObjectMapper objectMapper,
            Environment environment) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.requestValidationFilter = requestValidationFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.securityHeadersFilter = securityHeadersFilter;
        this.metricsFilter = metricsFilter;
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        String[] activeProfiles = environment.getActiveProfiles();
        String profilesStr = String.join(",", activeProfiles);
        logger.info("SecurityConfig initializing with activeProfiles=[{}]", profilesStr);

        boolean isTestOrDevProfile = false;
        boolean isProdProfile = false;
        for (String profile : activeProfiles) {
            String lowerProfile = profile.toLowerCase();
            if (lowerProfile.contains("test") || lowerProfile.contains("dev")) {
                isTestOrDevProfile = true;
            }
            if (lowerProfile.contains("prod")) {
                isProdProfile = true;
            }
        }

        if (activeProfiles.length == 0) {
            logger.warn("No active profiles - defaulting to production security");
            isProdProfile = true;
        }

        logger.debug("Profile detection: isTestOrDev={}, isProd={}", isTestOrDevProfile, isProdProfile);

        final boolean allowPrivateEndpoints = isTestOrDevProfile && !isProdProfile;
        logger.info("allowPrivateEndpoints={}", allowPrivateEndpoints);

        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .anonymous(anon -> anon.disable())
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .authorizeHttpRequests(auth -> {
                if (allowPrivateEndpoints) {
                    logger.info("Non-prod: allowing /private/**, /actuator/**, /health/**");
                    auth.requestMatchers("/private/**").permitAll();
                    auth.requestMatchers("/actuator/**").permitAll();
                    auth.requestMatchers("/health/**").permitAll();
                } else {
                    logger.info("Prod: blocking /private/**, /actuator/**, /health/**");
                    auth.requestMatchers("/private/**").denyAll();
                    auth.requestMatchers("/actuator/**").denyAll();
                    auth.requestMatchers("/health/**").denyAll();
                }
                auth.requestMatchers("/auth/**").permitAll();
                auth.requestMatchers("/").permitAll();
                auth.requestMatchers("/api/**").authenticated();
                auth.anyRequest().denyAll();
            })
            .addFilterBefore(metricsFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(requestValidationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authEx) -> {
                    try {
                        String authHeader = request.getHeader("Authorization");
                        boolean malformedAuth = authHeader != null && !authHeader.startsWith("Bearer ");

                        Object attr = request.getAttribute("AUTH_ERROR_CODE");
                        ErrorCode code = attr instanceof ErrorCode
                                ? (ErrorCode) attr
                                : (malformedAuth ? ErrorCode.INVALID_TOKEN : ErrorCode.UNAUTHORIZED_ACCESS);

                        String message;
                        if (code == ErrorCode.TOKEN_EXPIRED) {
                            message = "Token has expired";
                        } else if (malformedAuth) {
                            message = "Malformed Authorization header";
                        } else {
                            message = "Authentication required";
                        }

                        ErrorResponse err = new ErrorResponse();
                        err.setSuccess(false);
                        err.setErrorCode(code.getCode());
                        err.setError(code.getDefaultMessage());
                        err.setMessage(message);
                        err.setPath(request.getRequestURI());
                        err.setTimestamp(Instant.now().toString());
                        err.setRequestId(UUID.randomUUID().toString());

                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write(objectMapper.writeValueAsString(err));
                    } catch (Exception e) {
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication required");
                    }
                })
                .accessDeniedHandler((request, response, accessEx) -> {
                    try {
                        ErrorResponse err = new ErrorResponse();
                        err.setSuccess(false);
                        err.setErrorCode(ErrorCode.INSUFFICIENT_PERMISSIONS.getCode());
                        err.setError(ErrorCode.INSUFFICIENT_PERMISSIONS.getDefaultMessage());
                        err.setMessage("Forbidden");
                        err.setPath(request.getRequestURI());
                        err.setTimestamp(Instant.now().toString());
                        err.setRequestId(UUID.randomUUID().toString());

                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.getWriter().write(objectMapper.writeValueAsString(err));
                    } catch (Exception e) {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden");
                    }
                })
            )
            .headers(headers -> headers
                .frameOptions(frameOptions -> frameOptions.deny())
                .contentTypeOptions(Customizer.withDefaults())
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true)
                )
            );

        return http.build();
    }

    @Bean
    public FilterRegistrationBean<MetricsFilter> metricsFilterRegistration(MetricsFilter filter) {
        FilterRegistrationBean<MetricsFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        logger.debug("Configuring CORS with origins: {}", allowedOrigins);

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(allowedOrigins);
        configuration.setAllowedMethods(allowedMethods);
        configuration.setAllowedHeaders(allowedHeaders);
        configuration.setAllowCredentials(allowCredentials);
        configuration.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
