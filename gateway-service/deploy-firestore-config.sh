#!/bin/bash

# Deploy Firestore Configuration Script
# Deploys Firestore indexes and security rules to Firebase

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${FIREBASE_PROJECT_ID:-colean-func}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --dry-run          Preview changes without deploying"
    echo "  --project PROJECT  Firebase project ID (default: colean-func)"
    echo "  --help, -h         Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  FIREBASE_PROJECT_ID    Firebase project ID (default: colean-func)"
    echo "  ENVIRONMENT           Environment name (default: dev)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy to colean-func"
    echo "  $0 --project my-project              # Deploy to specific project"
    echo "  $0 --dry-run                         # Preview changes only"
    echo "  FIREBASE_PROJECT_ID=prod-project $0  # Use environment variable"
}

# Function to validate prerequisites
validate_prerequisites() {
    print_status "Validating prerequisites..."
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Please install it first:"
        echo "npm install -g firebase-tools"
        exit 1
    fi
    
    # Check Firebase authentication
    if ! firebase projects:list &> /dev/null; then
        print_error "You are not logged in to Firebase. Please run:"
        echo "firebase login"
        exit 1
    fi
    
    # Validate project ID
    if [ -z "$PROJECT_ID" ]; then
        print_error "Firebase project ID is not set"
        show_usage
        exit 1
    fi
    
    print_success "Prerequisites validated"
}

# Function to validate configuration files
validate_config_files() {
    print_status "Validating configuration files..."
    
    # Check if firestore.indexes.json exists
    if [ ! -f "$SCRIPT_DIR/firestore.indexes.json" ]; then
        print_error "firestore.indexes.json not found in $SCRIPT_DIR"
        exit 1
    fi
    
    # Check if firestore.rules exists
    if [ ! -f "$SCRIPT_DIR/firestore.rules" ]; then
        print_error "firestore.rules not found in $SCRIPT_DIR"
        exit 1
    fi
    
    # Validate JSON syntax
    if ! python3 -m json.tool "$SCRIPT_DIR/firestore.indexes.json" > /dev/null 2>&1; then
        print_error "Invalid JSON syntax in firestore.indexes.json"
        exit 1
    fi
    
    print_success "Configuration files validated"
}

# Function to deploy indexes
deploy_indexes() {
    print_status "Deploying Firestore indexes to project: $PROJECT_ID"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would deploy indexes from firestore.indexes.json"
        return 0
    fi
    
    # Deploy indexes
    if firebase deploy --only firestore:indexes --project="$PROJECT_ID"; then
        print_success "Firestore indexes deployed successfully"
    else
        print_error "Failed to deploy Firestore indexes"
        exit 1
    fi
}

# Function to deploy security rules
deploy_rules() {
    print_status "Deploying Firestore security rules to project: $PROJECT_ID"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would deploy rules from firestore.rules"
        return 0
    fi
    
    # Deploy rules
    if firebase deploy --only firestore:rules --project="$PROJECT_ID"; then
        print_success "Firestore security rules deployed successfully"
    else
        print_error "Failed to deploy Firestore security rules"
        exit 1
    fi
}

# Function to show deployment summary
show_summary() {
    print_success "Firestore configuration deployment completed!"
    echo ""
    echo "Project: $PROJECT_ID"
    echo "Environment: $ENVIRONMENT"
    echo ""
    echo "Next steps:"
    echo "1. Monitor index building in Firebase Console"
    echo "2. Test your application queries"
    echo "3. Verify security rules are working correctly"
    echo ""
    echo "Useful commands:"
    echo "- Check indexes: firebase firestore:indexes --project=$PROJECT_ID"
    echo "- Test rules: firebase emulators:start --only firestore"
    echo "- Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_status "Starting Firestore configuration deployment..."
    print_status "Target project: $PROJECT_ID"
    print_status "Environment: $ENVIRONMENT"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi
    
    echo ""
    
    # Validation
    validate_prerequisites
    validate_config_files
    
    # Deployment
    deploy_indexes
    deploy_rules
    
    # Summary
    show_summary
}

# Run main function
main
