package com.app.config;

import com.app.security.JwtAuthenticationFilter;
import com.app.security.RequestValidationFilter;
import com.app.security.RateLimitingFilter;
import com.app.config.SecurityHeadersConfig;
import com.app.filter.MetricsFilter;
import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Security Configuration
 * Enterprise-grade security with JWT authentication and CORS
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RequestValidationFilter requestValidationFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final SecurityHeadersConfig.SecurityHeadersFilter securityHeadersFilter;
    private final MetricsFilter metricsFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            RequestValidationFilter requestValidationFilter,
            RateLimitingFilter rateLimitingFilter,
            SecurityHeadersConfig.SecurityHeadersFilter securityHeadersFilter,
            MetricsFilter metricsFilter,
            ObjectMapper objectMapper) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.requestValidationFilter = requestValidationFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.securityHeadersFilter = securityHeadersFilter;
        this.metricsFilter = metricsFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
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
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/health/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/private/**").permitAll()
                .requestMatchers("/").permitAll()
                .requestMatchers("/public/**").permitAll()

                // Protected API endpoints
                .requestMatchers("/api/**").authenticated()

                // All other requests are permitted so unmapped paths return 404 (not 401)
                .anyRequest().permitAll()
            )

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
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow specific origins (update for production)
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",
            "https://*.expo.dev",
            "https://*.growwithfreya.com"
        ));

        // Allow specific methods
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
        ));

        // Allow specific headers
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "X-Device-ID",
            "X-Session-ID",
            "X-Client-Platform",
            "X-Client-Version",
            "X-Timestamp",
            "X-Nonce",
            "X-Signature"
        ));

        // Allow credentials
        configuration.setAllowCredentials(true);

        // Cache preflight response for 1 hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
