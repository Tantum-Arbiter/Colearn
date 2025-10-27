# Gateway Service

This application is a monolithic service that serves as a gateway to various backend services. It is built using FastAPI and is designed to handle HTTP requests, route them to the appropriate backend services, and return the responses to the clients.

It handles:
- User authentication and authorization
- Request routing to backend services / CMS
- Response aggregation and formatting
- Error handling and logging
- Rate limiting and throttling

# Local Developmen
### Reaching GCP via Postman requires a bearer token
Run:
```
gcloud auth print-identity-token
--audiences=https://gateway-service-jludng4t5a-ew.a.run.app
--impersonate-service-account=svc-deploy-functional@apt-icon-472307-b7.iam.gserviceaccount.com
```

# APIs
The Gateway Service exposes the following APIs:

## Private APIs
- `GET /private/healthcheck`: Health check endpoint to verify the service is running.
- `GET /private/info`: API documentation endpoint showing config.
- `GET /private/prometheus`: Prometheus metrics endpoint.

## Authentication APIs
_TBD_

## User Content APIs
_Upload / get data from CMS TBD_