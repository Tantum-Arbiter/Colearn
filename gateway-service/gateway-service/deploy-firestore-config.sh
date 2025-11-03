#!/bin/bash

# Deploy Firestore Configuration Script
# This script deploys Firestore indexes and security rules to Firebase

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${FIREBASE_PROJECT_ID:-}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

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

# Function to check if Firebase CLI is installed
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Please install it first:"
        echo "npm install -g firebase-tools"
        exit 1
    fi
    
    print_success "Firebase CLI is installed"
}

# Function to check if user is logged in to Firebase
check_firebase_auth() {
    if ! firebase projects:list &> /dev/null; then
        print_error "You are not logged in to Firebase. Please run:"
        echo "firebase login"
        exit 1
    fi
    
    print_success "Firebase authentication verified"
}

# Function to validate project ID
validate_project_id() {
    if [ -z "$PROJECT_ID" ]; then
        print_error "FIREBASE_PROJECT_ID environment variable is not set"
        echo "Please set it with: export FIREBASE_PROJECT_ID=your-project-id"
        exit 1
    fi
    
    print_status "Using Firebase project: $PROJECT_ID"
}

# Function to validate files exist
validate_files() {
    if [ ! -f "$SCRIPT_DIR/firestore.indexes.json" ]; then
        print_error "firestore.indexes.json not found in $SCRIPT_DIR"
        exit 1
    fi
    
    if [ ! -f "$SCRIPT_DIR/firestore.rules" ]; then
        print_error "firestore.rules not found in $SCRIPT_DIR"
        exit 1
    fi
    
    print_success "Configuration files found"
}

# Function to deploy Firestore indexes
deploy_indexes() {
    print_status "Deploying Firestore indexes..."
    
    # Use Firebase CLI to deploy indexes
    if firebase firestore:indexes --project="$PROJECT_ID" --non-interactive; then
        print_success "Firestore indexes deployed successfully"
    else
        print_error "Failed to deploy Firestore indexes"
        exit 1
    fi
}

# Function to deploy Firestore rules
deploy_rules() {
    print_status "Deploying Firestore security rules..."
    
    # Use Firebase CLI to deploy rules
    if firebase deploy --only firestore:rules --project="$PROJECT_ID" --non-interactive; then
        print_success "Firestore security rules deployed successfully"
    else
        print_error "Failed to deploy Firestore security rules"
        exit 1
    fi
}

# Function to initialize Firebase project if needed
init_firebase_project() {
    if [ ! -f "$SCRIPT_DIR/firebase.json" ]; then
        print_status "Initializing Firebase project configuration..."
        
        # Create firebase.json configuration
        cat > "$SCRIPT_DIR/firebase.json" << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
EOF
        
        print_success "Firebase configuration created"
    else
        print_status "Firebase configuration already exists"
    fi
}

# Function to show deployment summary
show_summary() {
    print_success "Firestore configuration deployment completed!"
    echo ""
    echo "Summary:"
    echo "- Project ID: $PROJECT_ID"
    echo "- Environment: $ENVIRONMENT"
    echo "- Indexes: Deployed from firestore.indexes.json"
    echo "- Rules: Deployed from firestore.rules"
    echo ""
    echo "Next steps:"
    echo "1. Verify indexes are building in Firebase Console"
    echo "2. Test your application queries"
    echo "3. Monitor index usage and performance"
}

# Main execution
main() {
    print_status "Starting Firestore configuration deployment..."
    
    # Validation steps
    check_firebase_cli
    check_firebase_auth
    validate_project_id
    validate_files
    
    # Initialize Firebase project
    init_firebase_project
    
    # Deploy configuration
    deploy_rules
    deploy_indexes
    
    # Show summary
    show_summary
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --dry-run      Show what would be deployed without actually deploying"
        echo ""
        echo "Environment Variables:"
        echo "  FIREBASE_PROJECT_ID    Firebase project ID (required)"
        echo "  ENVIRONMENT           Deployment environment (default: dev)"
        echo ""
        echo "Examples:"
        echo "  FIREBASE_PROJECT_ID=my-project $0"
        echo "  ENVIRONMENT=prod FIREBASE_PROJECT_ID=my-project $0"
        exit 0
        ;;
    --dry-run)
        print_status "DRY RUN MODE - No changes will be made"
        validate_project_id
        validate_files
        print_status "Would deploy to project: $PROJECT_ID"
        print_status "Would deploy indexes from: firestore.indexes.json"
        print_status "Would deploy rules from: firestore.rules"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
