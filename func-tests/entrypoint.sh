#!/bin/bash
set -e

echo "Starting functional tests..."

# Run the tests, capture exit code
./gradlew functionalTest --no-daemon --info || TEST_EXIT_CODE=$?
TEST_EXIT_CODE=${TEST_EXIT_CODE:-0}

echo "Tests completed with exit code: $TEST_EXIT_CODE"

# Upload reports to GCS if bucket is configured
if [ -n "$GCS_REPORTS_BUCKET" ]; then
    echo "Uploading test reports to GCS..."
    
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    REPORTS_PATH="gs://${GCS_REPORTS_BUCKET}"
    
    # Delete previous reports (keep bucket clean)
    echo "Cleaning previous reports..."
    gcloud storage rm -r "${REPORTS_PATH}/latest/" 2>/dev/null || true
    
    # Upload new reports to timestamped folder
    echo "Uploading reports to ${REPORTS_PATH}/${TIMESTAMP}/"
    gcloud storage cp -r build/cucumber-reports/* "${REPORTS_PATH}/${TIMESTAMP}/" || true
    
    # Also upload to 'latest' for easy access
    echo "Uploading reports to ${REPORTS_PATH}/latest/"
    gcloud storage cp -r build/cucumber-reports/* "${REPORTS_PATH}/latest/" || true
    
    echo "Reports uploaded successfully!"
    echo "View HTML report: https://storage.cloud.google.com/${GCS_REPORTS_BUCKET}/latest/cucumber.html"
else
    echo "GCS_REPORTS_BUCKET not set, skipping report upload"
fi

# Exit with the test exit code
exit $TEST_EXIT_CODE

