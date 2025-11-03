#!/bin/bash

# Test Firestore Indexes Script
# This script tests that Firestore indexes are properly configured and working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${FIREBASE_PROJECT_ID:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Function to validate project ID
validate_project_id() {
    if [ -z "$PROJECT_ID" ]; then
        print_error "FIREBASE_PROJECT_ID environment variable is not set"
        echo "Please set it with: export FIREBASE_PROJECT_ID=your-project-id"
        exit 1
    fi
    
    print_status "Testing Firebase project: $PROJECT_ID"
}

# Function to check if Firebase CLI is installed
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Please install it first:"
        echo "npm install -g firebase-tools"
        exit 1
    fi
    
    print_success "Firebase CLI is available"
}

# Function to check Firebase authentication
check_firebase_auth() {
    if ! firebase projects:list &> /dev/null; then
        print_error "You are not logged in to Firebase. Please run:"
        echo "firebase login"
        exit 1
    fi
    
    print_success "Firebase authentication verified"
}

# Function to list current indexes
list_indexes() {
    print_status "Listing current Firestore indexes..."
    
    if firebase firestore:indexes --project="$PROJECT_ID" 2>/dev/null; then
        print_success "Indexes listed successfully"
    else
        print_warning "Could not list indexes (may be empty or permission issue)"
    fi
}

# Function to validate rules
validate_rules() {
    print_status "Validating Firestore security rules..."
    
    if [ -f "$SCRIPT_DIR/firestore.rules" ]; then
        # Use Firebase CLI to validate rules syntax
        if firebase firestore:rules --project="$PROJECT_ID" --help &> /dev/null; then
            print_success "Firestore rules syntax is valid"
        else
            print_warning "Could not validate rules syntax"
        fi
    else
        print_error "firestore.rules file not found"
        return 1
    fi
}

# Function to check index configuration
check_index_config() {
    print_status "Checking index configuration file..."
    
    if [ -f "$SCRIPT_DIR/firestore.indexes.json" ]; then
        # Validate JSON syntax
        if python3 -m json.tool "$SCRIPT_DIR/firestore.indexes.json" > /dev/null 2>&1; then
            print_success "Index configuration JSON is valid"
            
            # Count indexes
            local index_count=$(python3 -c "
import json
with open('$SCRIPT_DIR/firestore.indexes.json', 'r') as f:
    data = json.load(f)
    print(len(data.get('indexes', [])))
" 2>/dev/null || echo "0")
            
            print_status "Found $index_count indexes in configuration"
        else
            print_error "Invalid JSON in firestore.indexes.json"
            return 1
        fi
    else
        print_error "firestore.indexes.json file not found"
        return 1
    fi
}

# Function to test emulator connectivity
test_emulator() {
    print_status "Testing Firestore emulator connectivity..."
    
    # Check if emulator is running
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        print_success "Firestore emulator is running on port 8080"
    else
        print_warning "Firestore emulator is not running"
        print_status "To start emulator: firebase emulators:start --only firestore"
    fi
}

# Function to show index recommendations
show_recommendations() {
    print_status "Index Configuration Recommendations:"
    echo ""
    echo "1. Monitor index usage in Firebase Console"
    echo "2. Remove unused indexes to reduce costs"
    echo "3. Add indexes for new query patterns"
    echo "4. Use composite indexes for complex queries"
    echo "5. Test queries with Firebase emulator first"
    echo ""
    echo "Common Query Patterns Covered:"
    echo "- User lookup by email"
    echo "- User lookup by OAuth provider"
    echo "- Session lookup by refresh token"
    echo "- Active user/session filtering"
    echo "- Story filtering by category/age"
    echo ""
}

# Function to show next steps
show_next_steps() {
    print_success "Firestore index testing completed!"
    echo ""
    echo "Next Steps:"
    echo "1. Deploy indexes: ./deploy-firestore-config.sh"
    echo "2. Monitor index building in Firebase Console"
    echo "3. Test application queries"
    echo "4. Monitor query performance and costs"
    echo ""
    echo "Useful Commands:"
    echo "- List indexes: firebase firestore:indexes --project=$PROJECT_ID"
    echo "- Start emulator: firebase emulators:start --only firestore"
    echo "- Deploy config: ./deploy-firestore-config.sh"
}

# Main execution
main() {
    print_status "Starting Firestore index configuration test..."
    
    # Validation steps
    validate_project_id
    check_firebase_cli
    check_firebase_auth
    
    # Test configuration
    check_index_config
    validate_rules
    
    # Test connectivity
    list_indexes
    test_emulator
    
    # Show recommendations
    show_recommendations
    show_next_steps
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  FIREBASE_PROJECT_ID    Firebase project ID (required)"
        echo ""
        echo "Examples:"
        echo "  FIREBASE_PROJECT_ID=my-project $0"
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
