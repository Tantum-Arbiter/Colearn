# Prometheus Metrics Documentation

This document provides a comprehensive list of all Prometheus metrics exposed by the Gateway Service.

## Metrics Endpoint

- **URL**: `/private/prometheus`
- **Format**: Prometheus text format
- **Access**: Private endpoint (not exposed to public internet)

## Metric Categories

### 1. Authentication Metrics

#### `app_authentication_total` (Counter)
Records total number of authentication attempts.

**Tags:**
- `provider`: OAuth provider (google, apple)
- `device_type`: Device type (mobile, tablet, desktop, unknown)
- `platform`: Platform (ios, android, windows, macos, linux, unknown)
- `app_version`: Application version (e.g., "1.0.0")
- `result`: Authentication result (success, failure)

**Example:**
```
app_authentication_total{provider="google",device_type="mobile",platform="ios",app_version="1.0.0",result="success"} 42
```

#### `app_authentication_time` (Timer)
Measures authentication processing time in milliseconds.

**Tags:** Same as `app_authentication_total`

**Percentiles:** 0.5 (median), 0.95, 0.99

---

### 2. Token Operation Metrics

#### `app_tokens_refresh_total` (Counter)
Records total number of token refresh operations.

**Tags:**
- `provider`: OAuth provider (google, apple, unknown)
- `device_type`: Device type (mobile, tablet, desktop, unknown)
- `platform`: Platform (ios, android, windows, macos, linux, unknown)
- `result`: Operation result (success, failure)

**Example:**
```
app_tokens_refresh_total{provider="google",device_type="mobile",platform="ios",result="success"} 156
```

#### `app_tokens_refresh_time` (Timer)
Measures token refresh processing time in milliseconds.

**Tags:** Same as `app_tokens_refresh_total`

**Percentiles:** 0.5 (median), 0.95, 0.99

#### `app_tokens_revocation_total` (Counter)
Records total number of token revocation operations (logout).

**Tags:**
- `device_type`: Device type (mobile, tablet, desktop, unknown)
- `platform`: Platform (ios, android, windows, macos, linux, unknown)
- `reason`: Revocation reason (user_logout, invalid_token, error)
- `result`: Operation result (success, failure)

**Example:**
```
app_tokens_revocation_total{device_type="mobile",platform="ios",reason="user_logout",result="success"} 23
```

---

### 3. User Profile Metrics

#### `app_user_profiles_total` (Counter)
Records total number of user profile operations (create, update, retrieve).

**Tags:**
- `user_id`: User identifier (hashed for privacy)
- `operation`: Operation type (created, updated, retrieved)
- `result`: Operation result (success, failure, found, not_found)

**Examples:**
```
app_user_profiles_total{user_id="user-abc123",operation="created",result="success"} 1
app_user_profiles_total{user_id="user-abc123",operation="updated",result="success"} 5
app_user_profiles_total{user_id="user-abc123",operation="retrieved",result="found"} 42
```

**Query Examples:**
```promql
# Profile creations
app_user_profiles_total{operation="created"}

# Profile updates
app_user_profiles_total{operation="updated"}

# Profile retrievals
app_user_profiles_total{operation="retrieved"}

# Successful operations
app_user_profiles_total{result="success"}

# Failed operations
app_user_profiles_total{result="failure"}
```

#### `app_user_profiles_time` (Timer)
Measures user profile operation processing time in milliseconds.

**Tags:** Same as `app_user_profiles_total`

**Percentiles:** 0.5 (median), 0.95, 0.99

**Examples:**
```
app_user_profiles_time_seconds_count{user_id="user-abc123",operation="created",result="success"} 1
app_user_profiles_time_seconds_sum{user_id="user-abc123",operation="created",result="success"} 0.025
app_user_profiles_time_seconds_max{user_id="user-abc123",operation="created",result="success"} 0.025
```

---

### 4. HTTP Request Metrics

#### `app_requests_total` (Counter)
Records total number of HTTP requests.

**Tags:**
- `device_type`: Device type (mobile, tablet, desktop, unknown)
- `platform`: Platform (ios, android, windows, macos, linux, unknown)
- `app_version`: Application version
- `endpoint`: Request endpoint (e.g., "/api/profile")
- `method`: HTTP method (GET, POST, PUT, DELETE)
- `status_code`: HTTP status code (200, 400, 500, etc.)

**Example:**
```
app_requests_total{device_type="mobile",platform="ios",app_version="1.0.0",endpoint="/api/profile",method="GET",status_code="200"} 1234
```

#### `app_response_time` (Timer)
Measures HTTP response time in milliseconds.

**Tags:** Same as `app_requests_total`

**Percentiles:** 0.5 (median), 0.95, 0.99

---

### 5. Session Metrics

#### `app_sessions_created` (Counter)
Records total number of sessions created.

**Example:**
```
app_sessions_created 567
```

#### `app_sessions_refreshed` (Counter)
Records total number of sessions refreshed.

**Example:**
```
app_sessions_refreshed 1234
```

#### `app_sessions_revoked` (Counter)
Records total number of sessions revoked.

**Example:**
```
app_sessions_revoked 89
```

#### `app_sessions_accessed` (Counter)
Records total number of session access operations.

**Example:**
```
app_sessions_accessed 5678
```

#### `app_sessions_active` (Gauge)
Current number of active sessions.

**Example:**
```
app_sessions_active 234
```

---

### 6. User Metrics

#### `app_users_created` (Counter)
Records total number of users created.

**Example:**
```
app_users_created 567
```

#### `app_users_logins` (Counter)
Records total number of user login operations.

**Example:**
```
app_users_logins 1234
```

#### `app_users_lookups` (Counter)
Records total number of user lookup operations.

**Example:**
```
app_users_lookups 2345
```

---

### 7. Firestore Metrics

#### `app_firestore_operations` (Counter)
Records total number of Firestore operations.

**Tags:**
- `operation`: Operation type (read, write, delete, query)
- `collection`: Firestore collection name
- `result`: Operation result (success, failure)

**Example:**
```
app_firestore_operations{operation="read",collection="users",result="success"} 1234
```

#### `app_firestore_operation_duration` (Timer)
Measures Firestore operation duration in milliseconds.

**Tags:** Same as `app_firestore_operations`

**Percentiles:** 0.5 (median), 0.95, 0.99

#### `app_firestore_queries` (Counter)
Records total number of Firestore queries executed.

**Tags:**
- `collection`: Firestore collection name
- `result`: Query result (success, failure)

**Example:**
```
app_firestore_queries{collection="user_profiles",result="success"} 567
```

---

### 8. Error Metrics

#### `app_errors_total` (Counter)
Records total number of errors.

**Tags:**
- `error_code`: Gateway error code (e.g., "GTW-001", "GTW-110")
- `error_type`: Error type (validation, authentication, downstream, internal)
- `endpoint`: Request endpoint where error occurred

**Example:**
```
app_errors_total{error_code="GTW-110",error_type="authentication",endpoint="/auth/google"} 12
```

#### `app_rate_limit_violations` (Counter)
Records total number of rate limit violations.

**Tags:**
- `endpoint`: Request endpoint
- `client_id`: Client identifier (IP or device ID)

**Example:**
```
app_rate_limit_violations{endpoint="/auth/google",client_id="192.168.1.100"} 5
```

---

### 9. Circuit Breaker Metrics

#### `app_circuitbreaker_state` (Gauge)
Current state of circuit breakers. Each circuit breaker has three gauges (OPEN, HALF_OPEN, CLOSED), with the active state set to 1 and inactive states set to 0.

**Tags:**
- `name`: Circuit breaker name (default)
- `state`: Circuit breaker state (OPEN, HALF_OPEN, CLOSED)

**Examples:**
```
app_circuitbreaker_state{name="default",state="CLOSED"} 1
app_circuitbreaker_state{name="default",state="OPEN"} 0
app_circuitbreaker_state{name="default",state="HALF_OPEN"} 0
```

**Query Examples:**
```promql
# Check if any circuit breaker is OPEN
app_circuitbreaker_state{state="OPEN"} == 1

# Count circuit breakers in HALF_OPEN state
sum(app_circuitbreaker_state{state="HALF_OPEN"})

# Alert when circuit breaker opens
app_circuitbreaker_state{state="OPEN"} == 1
```

#### `app_circuitbreaker_calls` (Counter)
Records circuit breaker call results.

**Tags:**
- `name`: Circuit breaker name
- `outcome`: Call result (success, failure, rejected)

**Example:**
```
app_circuitbreaker_calls{name="default",outcome="success"} 1234
app_circuitbreaker_calls{name="default",outcome="failure"} 42
app_circuitbreaker_calls{name="default",outcome="rejected"} 5
```

---

### 10. Error & Failure Metrics (Sad Cases)

#### `app_authentication_failures` (Counter)
Records authentication failures with detailed error information.

**Tags:**
- `provider`: OAuth provider (google, apple)
- `device_type`: Device type
- `platform`: Platform
- `error_type`: Error type (invalid_token, network_error, etc.)
- `error_code`: Error code (GTW-xxx)

**Example:**
```
app_authentication_failures{provider="google",device_type="mobile",platform="ios",error_type="invalid_token",error_code="GTW-101"} 15
```

#### `app_tokens_refresh_failures` (Counter)
Records token refresh failures.

**Tags:**
- `provider`: OAuth provider
- `device_type`: Device type
- `platform`: Platform
- `error_type`: Error type

**Example:**
```
app_tokens_refresh_failures{provider="google",device_type="mobile",platform="ios",error_type="expired_refresh_token"} 8
```

#### `app_firestore_failures` (Counter)
Records Firestore operation failures.

**Tags:**
- `collection`: Firestore collection name
- `operation`: Operation type (read, write, update, delete)
- `error_type`: Error type (timeout, permission_denied, not_found, etc.)

**Example:**
```
app_firestore_failures{collection="users",operation="read",error_type="timeout"} 3
```

#### `app_firestore_failure_duration` (Timer)
Measures duration of failed Firestore operations.

**Tags:** Same as `app_firestore_failures`

**Example:**
```
app_firestore_failure_duration_seconds_count{collection="users",operation="read",error_type="timeout"} 3
app_firestore_failure_duration_seconds_sum{collection="users",operation="read",error_type="timeout"} 15.5
```

#### `app_profiles_failures` (Counter)
Records profile operation failures.

**Tags:**
- `operation`: Operation type (created, updated, retrieved)
- `error_type`: Error type

**Example:**
```
app_profiles_failures{operation="created",error_type="validation_error"} 2
```

#### `app_sessions_failures` (Counter)
Records session operation failures.

**Tags:**
- `operation`: Operation type (created, refreshed, revoked)
- `error_type`: Error type

**Example:**
```
app_sessions_failures{operation="created",error_type="firestore_error"} 1
```

**Query Examples for Error Rates:**
```promql
# Authentication error rate (last 5 minutes)
rate(app_authentication_failures[5m]) / rate(app_authentication_total[5m])

# Firestore error rate by collection
rate(app_firestore_failures[5m]) / rate(app_firestore_operations[5m])

# Token refresh failure rate
rate(app_tokens_refresh_failures[5m]) / rate(app_tokens_refresh_total[5m])

# Profile operation error rate
rate(app_profiles_failures[5m]) / rate(app_user_profiles_total[5m])
```

---

## Standard Spring Boot Actuator Metrics

In addition to custom application metrics, the following standard Spring Boot Actuator metrics are also available:

### JVM Metrics
- `jvm_memory_used_bytes` - JVM memory usage
- `jvm_memory_max_bytes` - JVM maximum memory
- `jvm_gc_pause_seconds` - Garbage collection pause time
- `jvm_threads_live` - Current number of live threads
- `jvm_classes_loaded` - Number of classes loaded

### HTTP Server Metrics
- `http_server_requests_seconds` - HTTP request duration
  - Tags: method, uri, status, exception

### System Metrics
- `system_cpu_usage` - System CPU usage
- `process_cpu_usage` - Process CPU usage
- `system_load_average_1m` - System load average (1 minute)

---

## Querying Metrics

### Example Prometheus Queries

**Authentication success rate:**
```promql
rate(app_authentication_total{result="success"}[5m]) / rate(app_authentication_total[5m])
```

**Token refresh latency (95th percentile):**
```promql
histogram_quantile(0.95, rate(app_tokens_refresh_time_bucket[5m]))
```

**Active sessions:**
```promql
app_sessions_active
```

**Error rate by error code:**
```promql
rate(app_errors_total[5m])
```

**Profile operations per second:**
```promql
rate(app_user_profiles_total[1m])
```

**Profile creations per second:**
```promql
rate(app_user_profiles_total{operation="created"}[1m])
```

**Profile updates per second:**
```promql
rate(app_user_profiles_total{operation="updated"}[1m])
```

**Profile retrievals per second:**
```promql
rate(app_user_profiles_total{operation="retrieved"}[1m])
```

**Firestore operation latency (median):**
```promql
histogram_quantile(0.5, rate(app_firestore_operation_duration_bucket[5m]))
```

---

## Alerting Examples

### High Error Rate
```yaml
- alert: HighErrorRate
  expr: rate(app_errors_total[5m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }} errors/sec"
```

### Authentication Failures
```yaml
- alert: HighAuthenticationFailureRate
  expr: rate(app_authentication_total{result="failure"}[5m]) / rate(app_authentication_total[5m]) > 0.1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High authentication failure rate"
    description: "{{ $value | humanizePercentage }} of authentications are failing"
```

### Circuit Breaker Open
```yaml
- alert: CircuitBreakerOpen
  expr: app_circuitbreaker_state{state="OPEN"} == 1
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Circuit breaker {{ $labels.name }} is OPEN"
    description: "Circuit breaker has opened, downstream service may be unavailable"
```

### High Error Rates
```yaml
- alert: HighFirestoreErrorRate
  expr: rate(app_firestore_failures[5m]) / rate(app_firestore_operations[5m]) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High Firestore error rate"
    description: "{{ $value | humanizePercentage }} of Firestore operations are failing"

- alert: HighAuthenticationFailureRate
  expr: rate(app_authentication_failures[5m]) / rate(app_authentication_total[5m]) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High authentication failure rate"
    description: "{{ $value | humanizePercentage }} of authentication attempts are failing"

- alert: HighTokenRefreshFailureRate
  expr: rate(app_tokens_refresh_failures[5m]) / rate(app_tokens_refresh_total[5m]) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High token refresh failure rate"
    description: "{{ $value | humanizePercentage }} of token refresh attempts are failing"
```

---

## Metrics Configuration

Metrics are configured in `application-prod.yml` and `application-dev.yml`:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
    distribution:
      percentiles-histogram:
        http.server.requests: true
        app.response.time: true
        app.authentication.time: true
        app.tokens.refresh.time: true
        app.profiles.creation.time: true
        app.profiles.update.time: true
        app.profiles.retrieval.time: true
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
        app.response.time: 0.5, 0.95, 0.99
        app.authentication.time: 0.5, 0.95, 0.99
```

---

## API Endpoint Coverage

### Endpoints with Metrics

| Endpoint | Request Metrics | Operation Metrics | Timing Metrics |
|----------|----------------|-------------------|----------------|
| `POST /auth/google` | Yes | Yes `app_authentication_total` | Yes `app_authentication_time` |
| `POST /auth/apple` | Yes | Yes `app_authentication_total` | Yes `app_authentication_time` |
| `POST /auth/refresh` | Yes | Yes `app_tokens_refresh_total` | Yes `app_tokens_refresh_time` |
| `POST /auth/revoke` | Yes | Yes `app_tokens_revocation_total` | No |
| `GET /api/profile` | Yes | Yes `app_user_profiles_total{operation="retrieved"}` | Yes `app_user_profiles_time{operation="retrieved"}` |
| `POST /api/profile` | Yes | Yes `app_user_profiles_total{operation="created/updated"}` | Yes `app_user_profiles_time{operation="created/updated"}` |
| `GET /` | Yes | No | No |
| `GET /private/prometheus` | No | No | No |

**Legend:**
- Yes = Metrics recorded
- No = No metrics (not needed for health checks or metrics endpoints)

**Request Metrics** are automatically recorded by `MetricsFilter` for all endpoints.

**Operation Metrics** are custom metrics specific to the business operation.

**Timing Metrics** measure the processing time of the operation.

---

## Testing Metrics

Functional tests for metrics are located in:
- `func-tests/src/test/resources/features/prometheus-metrics.feature`

Unit tests for metrics service are located in:
- `gateway-service/src/test/java/com/app/service/ApplicationMetricsServiceTest.java`

---

## Notes

1. **Privacy**: User IDs in metrics are hashed to protect user privacy.
2. **Cardinality**: Be cautious with high-cardinality tags (e.g., user_id) as they can impact Prometheus performance.
3. **Retention**: Configure Prometheus retention based on your monitoring needs.
4. **Scraping**: Configure Prometheus to scrape `/private/prometheus` endpoint at appropriate intervals (e.g., 15s, 30s).
5. **Security**: The `/private/prometheus` endpoint should only be accessible from your monitoring infrastructure, not the public internet.

