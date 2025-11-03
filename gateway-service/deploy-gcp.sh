#!/bin/bash

# Grow with Freya Gateway Service - GCP Cloud Run Deployment Script
# This script builds and deploys the gateway service to Google Cloud Run

set -e  # Exit on any error

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"grow-with-freya"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="grow-with-freya-gateway"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
PORT=8080

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if authenticated with gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not authenticated with gcloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Set GCP project
set_project() {
    log_info "Setting GCP project to ${PROJECT_ID}..."
    gcloud config set project ${PROJECT_ID}
    log_success "Project set to ${PROJECT_ID}"
}

# Enable required APIs
enable_apis() {
    log_info "Enabling required GCP APIs..."
    
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable run.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    gcloud services enable secretmanager.googleapis.com
    
    log_success "Required APIs enabled"
}

# Create secrets if they don't exist
create_secrets() {
    log_info "Creating secrets in Secret Manager..."
    
    # List of required secrets
    secrets=(
        "jwt-secret"
        "google-client-id"
        "google-client-secret"
        "apple-client-id"
        "apple-client-secret"
    )
    
    for secret in "${secrets[@]}"; do
        if ! gcloud secrets describe ${secret} &> /dev/null; then
            log_warning "Secret ${secret} does not exist. Creating placeholder..."
            echo "REPLACE_WITH_ACTUAL_VALUE" | gcloud secrets create ${secret} --data-file=-
            log_warning "Please update secret ${secret} with actual value using:"
            log_warning "  echo 'actual-value' | gcloud secrets versions add ${secret} --data-file=-"
        else
            log_info "Secret ${secret} already exists"
        fi
    done
    
    log_success "Secrets check completed"
}

# Build and push Docker image
build_and_push() {
    log_info "Building Docker image..."
    
    # Build the image
    docker build -t ${IMAGE_NAME}:latest .
    
    # Tag with timestamp for versioning
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${TIMESTAMP}
    
    log_info "Pushing Docker image to Container Registry..."
    
    # Configure Docker to use gcloud as credential helper
    gcloud auth configure-docker
    
    # Push both tags
    docker push ${IMAGE_NAME}:latest
    docker push ${IMAGE_NAME}:${TIMESTAMP}
    
    log_success "Docker image built and pushed successfully"
    log_info "Image: ${IMAGE_NAME}:latest"
    log_info "Tagged: ${IMAGE_NAME}:${TIMESTAMP}"
}

# Deploy to Cloud Run
deploy_service() {
    log_info "Deploying to Cloud Run..."
    
    gcloud run deploy ${SERVICE_NAME} \
        --image=${IMAGE_NAME}:latest \
        --platform=managed \
        --region=${REGION} \
        --port=${PORT} \
        --memory=1Gi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        --concurrency=100 \
        --timeout=300 \
        --allow-unauthenticated \
        --set-env-vars="SPRING_PROFILES_ACTIVE=prod" \
        --set-secrets="JWT_SECRET=jwt-secret:latest" \
        --set-secrets="GOOGLE_CLIENT_ID=google-client-id:latest" \
        --set-secrets="GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
        --set-secrets="APPLE_CLIENT_ID=apple-client-id:latest" \
        --set-secrets="APPLE_CLIENT_SECRET=apple-client-secret:latest" \
        --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID}" \
        --set-env-vars="GCP_REGION=${REGION}"
    
    log_success "Service deployed successfully"
}

# Get service URL
get_service_url() {
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
        --platform=managed \
        --region=${REGION} \
        --format="value(status.url)")
    
    log_success "Service URL: ${SERVICE_URL}"
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    if curl -f "${SERVICE_URL}/actuator/health" > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_warning "Health check failed - service may still be starting up"
    fi
}

# Set up monitoring and alerting
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create log-based metrics (if they don't exist)
    log_info "Creating log-based metrics..."
    
    # Error rate metric
    gcloud logging metrics create gateway_error_rate \
        --description="Gateway service error rate" \
        --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="'${SERVICE_NAME}'" AND severity>=ERROR' \
        --value-extractor="" \
        --label-extractors="" || log_warning "Metric gateway_error_rate may already exist"
    
    # Authentication failures metric
    gcloud logging metrics create gateway_auth_failures \
        --description="Gateway authentication failures" \
        --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="'${SERVICE_NAME}'" AND jsonPayload.event="FAILED_LOGIN"' \
        --value-extractor="" \
        --label-extractors="" || log_warning "Metric gateway_auth_failures may already exist"
    
    log_success "Monitoring setup completed"
}

# Main deployment function
main() {
    log_info "Starting deployment of Grow with Freya Gateway Service"
    log_info "Project: ${PROJECT_ID}"
    log_info "Region: ${REGION}"
    log_info "Service: ${SERVICE_NAME}"
    
    check_prerequisites
    set_project
    enable_apis
    create_secrets
    build_and_push
    deploy_service
    get_service_url
    setup_monitoring
    
    log_success "Deployment completed successfully!"
    log_info "Next steps:"
    log_info "1. Update secrets with actual values"
    log_info "2. Configure custom domain (optional)"
    log_info "3. Set up CI/CD pipeline"
    log_info "4. Configure monitoring alerts"
    
    echo ""
    log_info "Service URL: ${SERVICE_URL}"
    log_info "Health Check: ${SERVICE_URL}/actuator/health"
    log_info "Metrics: ${SERVICE_URL}/actuator/metrics"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_prerequisites
        set_project
        build_and_push
        ;;
    "secrets")
        check_prerequisites
        set_project
        create_secrets
        ;;
    "url")
        set_project
        get_service_url
        ;;
    "help")
        echo "Usage: $0 [deploy|build|secrets|url|help]"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  build   - Build and push Docker image only"
        echo "  secrets - Create secrets only"
        echo "  url     - Get service URL"
        echo "  help    - Show this help"
        echo ""
        echo "Environment variables:"
        echo "  GCP_PROJECT_ID - GCP project ID (default: grow-with-freya)"
        echo "  GCP_REGION     - GCP region (default: us-central1)"
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Use '$0 help' for usage information"
        exit 1
        ;;
esac
