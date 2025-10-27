#!/bin/bash

# Entrance Animation Test Runner
# Comprehensive test suite for entrance animation components

set -e

# Colors for outpu
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="__tests__"
RESULTS_DIR="__tests__/results"
COVERAGE_DIR="coverage/entrance-animations"

echo -e "${BLUE} Starting Entrance Animation Test Suite${NC}"
echo "=================================================="

# Create results directory
mkdir -p "$RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"

# Function to run test category
run_test_category() {
    local category=$1
    local description=$2
    local test_pattern=$3

    echo -e "\n${YELLOW} Running $description${NC}"
    echo "----------------------------------------"

    if npm test -- --testPathPattern="$test_pattern" --verbose --coverage --coverageDirectory="$COVERAGE_DIR/$category"; then
        echo -e "${GREEN} $description completed successfully${NC}"
        return 0
    else
        echo -e "${RED} $description failed${NC}"
        return 1
    fi
}

# Function to run performance benchmarks
run_performance_benchmarks() {
    echo -e "\n${YELLOW} Running Performance Benchmarks${NC}"
    echo "----------------------------------------"

    # Run performance tests with specific configuration
    if npm test -- --testPathPattern="entrance-animation-performance" --verbose --maxWorkers=1; then
        echo -e "${GREEN} Performance benchmarks completed${NC}"
        return 0
    else
        echo -e "${RED} Performance benchmarks failed${NC}"
        return 1
    fi
}

# Function to generate test repor
generate_report() {
    echo -e "\n${BLUE} Generating Test Report${NC}"
    echo "----------------------------------------"

    local report_file="$RESULTS_DIR/entrance-animation-summary.md"

    cat > "$report_file" << EOF
# Entrance Animation Test Repor

Generated on: $(date)

## Test Categories

### Unit Tests
- **Location**: \`__tests__/components/ui/entrance-animation.test.tsx\`
- **Coverage**: Basic component functionality, props handling, edge cases
- **Status**: $([ -f "$RESULTS_DIR/unit-tests.xml" ] && echo "Passed" || echo "Failed")

### Performance Tests
- **Location**: \`__tests__/performance/entrance-animation-performance.test.tsx\`
- **Coverage**: Render performance, memory usage, animation initialization
- **Status**: $([ -f "$RESULTS_DIR/performance-tests.xml" ] && echo "Passed" || echo "Failed")

### Integration Tests
- **Location**: \`__tests__/integration/entrance-animation-integration.test.tsx\`
- **Coverage**: Real-world scenarios, navigation, conditional rendering
- **Status**: $([ -f "$RESULTS_DIR/integration-tests.xml" ] && echo "Passed" || echo "Failed")

## Coverage Summary

$([ -d "$COVERAGE_DIR" ] && find "$COVERAGE_DIR" -name "lcov-report" -type d | head -1 | xargs -I {} echo "Coverage reports available in: {}" || echo "Coverage reports not generated")

## Performance Metrics

- **Average Render Time**: < 50ms (target)
- **Memory Usage**: < 1MB increase (target)
- **Animation Init Time**: < 100ms (target)

## Recommendations

1. **Performance**: Monitor render times for complex nested structures
2. **Accessibility**: Ensure all animations respect reduced motion preferences
3. **Memory**: Watch for memory leaks in rapid mount/unmount scenarios
4. **Integration**: Test with real navigation patterns

## Next Steps

- [ ] Add visual regression tests
- [ ] Implement reduced motion suppor
- [ ] Add more accessibility test scenarios
- [ ] Performance optimization for large lists

EOF

    echo -e "${GREEN} Test report generated: $report_file${NC}"
}

# Main test execution
main() {
    local exit_code=0

    echo "Starting test execution..."

    # Run unit tests
    if ! run_test_category "unit" "Unit Tests" "entrance-animation.test.tsx"; then
        exit_code=1
    fi

    # Run performance tests
    if ! run_performance_benchmarks; then
        exit_code=1
    fi

    # Run integration tests
    if ! run_test_category "integration" "Integration Tests" "entrance-animation-integration"; then
        exit_code=1
    fi

    # Generate coverage repor
    echo -e "\n${YELLOW} Generating Coverage Report${NC}"
    echo "----------------------------------------"
    if command -v npx >/dev/null 2>&1; then
        npx nyc report --reporter=html --report-dir="$COVERAGE_DIR/html"
        echo -e "${GREEN}Coverage report generated in: $COVERAGE_DIR/html${NC}"
    fi

    # Generate summary repor
    generate_repor

    # Final summary
    echo -e "\n${BLUE} Test Suite Summary${NC}"
    echo "=================================================="

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN} All entrance animation tests passed!${NC}"
        echo -e " Results available in: $RESULTS_DIR"
        echo -e " Coverage reports in: $COVERAGE_DIR"
    else
        echo -e "${RED} Some tests failed. Check the output above for details.${NC}"
    fi

    return $exit_code
}

# Handle script arguments
case "${1:-all}" in
    "unit")
        run_test_category "unit" "Unit Tests" "entrance-animation.test.tsx"
        ;;
    "performance")
        run_performance_benchmarks
        ;;
    "integration")
        run_test_category "integration" "Integration Tests" "entrance-animation-integration"
        ;;
    "report")
        generate_repor
        ;;
    "all"|*)
        main
        ;;
esac

exit $?
