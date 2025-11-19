# Pure WireMock Server

A standalone WireMock server with no Java code - just configuration files and Docker deployment.

## Quick Start

```bash
# Build and run
docker-compose up --build

# Or run directly
docker build -t wiremock-server .
docker run -p 8080:8080 -v $(pwd)/mappings:/home/wiremock/mappings:ro wiremock-server
```

WireMock will be available at: http://localhost:8080

## Directory Structure

```
wiremock-server/
├── mappings/              # JSON mapping files
│   ├── firebase-auth.json
│   ├── google-oauth.json
│   └── apple-oauth.json
├── __files/               # Static response files
├── Dockerfile             # Pure WireMock container
├── docker-compose.yml     # Local deployment
└── README.md
```

## Adding New Mappings

1. **Create JSON mapping file** in `mappings/` directory:

```json
{
  "mappings": [
    {
      "id": "my-endpoint",
      "request": {
        "method": "GET",
        "urlPathEqualTo": "/api/test"
      },
      "response": {
        "status": 200,
        "jsonBody": {
          "message": "Hello World"
        }
      }
    }
  ]
}
```

2. **Restart container** to load new mappings:
```bash
docker-compose restart
```

## Dynamic Response Templates

Use Handlebars templating for dynamic responses:

```json
{
  "response": {
    "status": 200,
    "jsonBody": {
      "timestamp": "{{now}}",
      "randomId": "{{randomValue length=10 type='ALPHANUMERIC'}}",
      "requestPath": "{{request.url}}"
    },
    "transformers": ["response-template"]
  }
}
```

## Static Files

Place static response files in `__files/` directory and reference them:

```json
{
  "response": {
    "status": 200,
    "bodyFileName": "large-response.json"
  }
}
```

## Admin API

- `GET /__admin/mappings` - List all mappings
- `POST /__admin/mappings` - Add new mapping
- `GET /__admin/requests` - View recorded requests
- `POST /__admin/reset` - Reset all state
- `GET /__admin/health` - Health check

## Configuration

Environment variables in `docker-compose.yml`:

- `WIREMOCK_OPTIONS` - Additional WireMock command line options
- Default: `--global-response-templating --verbose --enable-browser-proxying`

## Deployment

### Local Development
```bash
docker-compose up
```

### Production
```bash
docker build -t your-registry/wiremock-server .
docker push your-registry/wiremock-server
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wiremock-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: wiremock-server
  template:
    metadata:
      labels:
        app: wiremock-server
    spec:
      containers:
      - name: wiremock
        image: your-registry/wiremock-server
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: mappings
          mountPath: /home/wiremock/mappings
          readOnly: true
      volumes:
      - name: mappings
        configMap:
          name: wiremock-mappings
```
