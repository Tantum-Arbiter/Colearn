#!/bin/bash

echo "=========================================="
echo "Starting functional tests..."
echo "GCS_REPORTS_BUCKET: ${GCS_REPORTS_BUCKET:-NOT SET}"
echo "=========================================="

# Run the tests, capture exit code
./gradlew functionalTest --no-daemon --info
TEST_EXIT_CODE=$?

echo "=========================================="
echo "Tests completed with exit code: $TEST_EXIT_CODE"
echo "=========================================="

# List what reports were generated
echo "Generated reports:"
ls -la build/cucumber-reports/ 2>/dev/null || echo "No reports directory found"

# Upload reports to GCS if bucket is configured
if [ -n "$GCS_REPORTS_BUCKET" ]; then
    echo "=========================================="
    echo "Uploading test reports to GCS..."
    echo "=========================================="

    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    REPORTS_PATH="gs://${GCS_REPORTS_BUCKET}"

    # Check gcloud auth
    echo "Checking gcloud auth..."
    gcloud auth list 2>&1 || echo "gcloud auth list failed"

    # Delete previous reports (keep bucket clean)
    echo "Cleaning previous reports from ${REPORTS_PATH}/latest/..."
    gcloud storage rm -r "${REPORTS_PATH}/latest/**" 2>&1 || echo "No previous reports to clean (or cleanup failed)"

    # Upload new reports to timestamped folder
    echo "Uploading reports to ${REPORTS_PATH}/${TIMESTAMP}/..."
    if gcloud storage cp -r build/cucumber-reports/* "${REPORTS_PATH}/${TIMESTAMP}/" 2>&1; then
        echo "Timestamped upload successful"
    else
        echo "Timestamped upload failed"
    fi

    # Also upload to 'latest' for easy access
    echo "Uploading reports to ${REPORTS_PATH}/latest/..."
    if gcloud storage cp -r build/cucumber-reports/* "${REPORTS_PATH}/latest/" 2>&1; then
        echo "Latest upload successful"
    else
        echo "Latest upload failed"
    fi

    echo "=========================================="
    echo "View HTML report: https://storage.cloud.google.com/${GCS_REPORTS_BUCKET}/latest/cucumber.html"
    echo "=========================================="
else
    echo "GCS_REPORTS_BUCKET not set, skipping report upload"
fi

# Exit with the test exit code
echo "Exiting with code: $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE

