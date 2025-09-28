#!/bin/bash

# Test Runner Script for Randevubu Server
# Usage: ./tests/run-tests.sh [test-type] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="all"
COVERAGE=false
SETUP_ONLY=false
VERBOSE=false
WATCH=false

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

# Function to show help
show_help() {
    echo "Test Runner for Randevubu Server"
    echo ""
    echo "Usage: $0 [test-type] [options]"
    echo ""
    echo "Test Types:"
    echo "  unit         Run unit tests only"
    echo "  integration  Run integration tests only"
    echo "  e2e          Run end-to-end tests only"
    echo "  security     Run security tests only"
    echo "  all          Run all tests (default)"
    echo ""
    echo "Options:"
    echo "  -c, --coverage    Generate coverage report"
    echo "  -s, --setup       Setup test environment only"
    echo "  -v, --verbose     Verbose output"
    echo "  -w, --watch       Watch mode"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 unit -c          # Run unit tests with coverage"
    echo "  $0 integration -v   # Run integration tests with verbose output"
    echo "  $0 all -c -w        # Run all tests with coverage in watch mode"
    echo "  $0 -s               # Setup test environment only"
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Check if Jest is installed
    if ! npm list jest &> /dev/null; then
        print_status "Installing Jest and testing dependencies..."
        npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
    fi
    
    # Create test database if it doesn't exist
    if [ -z "$TEST_DATABASE_URL" ]; then
        export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/randevubu_test"
        print_warning "TEST_DATABASE_URL not set, using default: $TEST_DATABASE_URL"
    fi
    
    # Create .env.test file if it doesn't exist
    if [ ! -f ".env.test" ]; then
        print_status "Creating .env.test file..."
        cat > .env.test << EOF
NODE_ENV=test
DATABASE_URL=$TEST_DATABASE_URL
JWT_SECRET=test-jwt-secret-key-for-testing-only
JWT_ACCESS_SECRET=test-access-secret-key-for-testing-only
JWT_REFRESH_SECRET=test-refresh-secret-key-for-testing-only
REDIS_URL=redis://localhost:6379
EOF
    fi
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    print_success "Test environment setup complete!"
}

# Function to run tests
run_tests() {
    local test_type=$1
    local coverage_flag=""
    local watch_flag=""
    local verbose_flag=""
    
    if [ "$COVERAGE" = true ]; then
        coverage_flag="--coverage"
    fi
    
    if [ "$WATCH" = true ]; then
        watch_flag="--watch"
    fi
    
    if [ "$VERBOSE" = true ]; then
        verbose_flag="--verbose"
    fi
    
    print_status "Running $test_type tests..."
    
    case $test_type in
        "unit")
            npm run test:unit $coverage_flag $watch_flag $verbose_flag
            ;;
        "integration")
            npm run test:integration $coverage_flag $watch_flag $verbose_flag
            ;;
        "e2e")
            npm run test:e2e $coverage_flag $watch_flag $verbose_flag
            ;;
        "security")
            npm run test:security $coverage_flag $watch_flag $verbose_flag
            ;;
        "all")
            npm test $coverage_flag $watch_flag $verbose_flag
            ;;
        *)
            print_error "Unknown test type: $test_type"
            show_help
            exit 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        print_success "$test_type tests completed successfully!"
    else
        print_error "$test_type tests failed!"
        exit 1
    fi
}

# Function to cleanup test environment
cleanup_test_environment() {
    print_status "Cleaning up test environment..."
    
    # Remove test database if it exists
    if [ ! -z "$TEST_DATABASE_URL" ]; then
        print_status "Cleaning up test database..."
        # Add database cleanup commands here if needed
    fi
    
    print_success "Test environment cleanup complete!"
}
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
        unit|integration|e2e|security|all)
            TEST_TYPE="$1"
                shift
                ;;
            -c|--coverage)
            COVERAGE=true
                shift
                ;;
        -s|--setup)
            SETUP_ONLY=true
                shift
                ;;
        -v|--verbose)
            VERBOSE=true
                shift
                ;;
        -w|--watch)
            WATCH=true
                shift
                ;;
        -h|--help)
            show_help
            exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
# Main execution
main() {
    print_status "Starting test runner..."
    
    # Setup test environment
    setup_test_environment
    
    # If setup only, exit here
    if [ "$SETUP_ONLY" = true ]; then
        print_success "Setup complete. Exiting."
        exit 0
    fi
    
    # Run tests
    run_tests "$TEST_TYPE"
    
    # Show coverage report if requested
    if [ "$COVERAGE" = true ]; then
        print_status "Coverage report generated in coverage/ directory"
        if [ -f "coverage/lcov-report/index.html" ]; then
            print_status "Open coverage/lcov-report/index.html in your browser to view the report"
        fi
    fi
    
        print_success "All tests completed successfully!"
}

# Trap to cleanup on exit
trap cleanup_test_environment EXIT

# Run main function
main