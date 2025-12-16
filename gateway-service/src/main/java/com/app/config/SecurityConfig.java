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

/**
 * Security Configuration
 * Enterprise-grade security with JWT authentication and CORS
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    /**
     * Configure SecurityContext to use MODE_INHERITABLETHREADLOCAL
     * This ensures the security context is propagated to child threads (e.g., async request processing)
     */
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
        // Use Environment.getActiveProfiles() for reliable profile detection
        String[] activeProfiles = environment.getActiveProfiles();
        String profilesStr = String.join(",", activeProfiles);
        logger.info("SecurityConfig initializing with activeProfiles=[{}]", profilesStr);

        // Check if any active profile contains "dev" or "test"
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

        // Default to prod-like security if no profiles are active
        if (activeProfiles.length == 0) {
            logger.warn("No active profiles detected - defaulting to production security (blocking /private/**)");
            isProdProfile = true;
        }

        logger.info("SecurityConfig profile detection: isTestOrDevProfile={}, isProdProfile={}", isTestOrDevProfile, isProdProfile);

        // Final decision: allow private endpoints only if dev/test and NOT prod
        final boolean allowPrivateEndpoints = isTestOrDevProfile && !isProdProfile;
        logger.info("SecurityConfig decision: allowPrivateEndpoints={}", allowPrivateEndpoints);

        http
            // Disable CSRF for stateless API
            .csrf(csrf -> csrf.disable())

            // Configure CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Stateless session management
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Disable anonymous authentication so missing/invalid JWT yields 401 (not 403)
            .anonymous(anon -> anon.disable())

            // Disable form login and HTTP basic
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())

            // Configure authorization rules
            .authorizeHttpRequests(auth -> {
                // Internal/private endpoints
                // In test/dev profiles: accessible for functional testing and debugging
                // In production: blocked from external clients (use GCP IAP or VPC for internal access)
                if (allowPrivateEndpoints) {
                    logger.info("Non-prod profile - allowing access to /private/**, /actuator/**, /health/**");
                    auth.requestMatchers("/private/**").permitAll();
                    auth.requestMatchers("/actuator/**").permitAll();
                    auth.requestMatchers("/health/**").permitAll();
                } else {
                    logger.info("Production profile - blocking access to /private/**, /actuator/**, /health/**");
                    auth.requestMatchers("/private/**").denyAll();
                    auth.requestMatchers("/actuator/**").denyAll();
                    auth.requestMatchers("/health/**").denyAll();
                }

                // Auth endpoints - accessible for login flow
                // Protected by client validation filter + rate limiting
                auth.requestMatchers("/auth/**").permitAll();

                // Root endpoint - minimal info only
                auth.requestMatchers("/").permitAll();

                // Protected API endpoints - require valid JWT
                auth.requestMatchers("/api/**").authenticated();

                // All other requests denied
                auth.anyRequest().denyAll();
            })

            // Add metrics first so we record even when security short-circuits
            .addFilterBefore(metricsFilter, UsernamePasswordAuthenticationFilter.class)
            // Add security filters in order
            .addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class)
            // Validate requests first, then apply rate limiting
            .addFilterBefore(requestValidationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

            // Exception handling to return standardized JSON for 401/403
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authEx) -> {
                    try {
                        String authHeader = request.getHeader("Authorization");
                        boolean malformedAuth = authHeader != null && !authHeader.startsWith("Bearer ");

                        // Prefer specific auth error code set by filters
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

            // Security headers
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

    // Prevent duplicate registration of MetricsFilter as a servlet filter
    @Bean
    public FilterRegistrationBean<MetricsFilter> metricsFilterRegistration(MetricsFilter filter) {
        FilterRegistrationBean<MetricsFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        logger.info("Configuring CORS with origins from application.yml");

        CorsConfiguration configuration = new CorsConfiguration();

        // Use origins from application.yml (environment-specific)
        configuration.setAllowedOriginPatterns(allowedOrigins);
        logger.info("CORS allowed origins: {}", allowedOrigins);

        // Use methods from application.yml
        configuration.setAllowedMethods(allowedMethods);

        // Use headers from application.yml
        configuration.setAllowedHeaders(allowedHeaders);

        // Use credentials setting from application.yml
        configuration.setAllowCredentials(allowCredentials);

        // Use max age from application.yml
        configuration.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
