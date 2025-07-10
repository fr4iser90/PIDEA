#!/bin/bash

# IDE API Deployment Script
# This script handles the deployment of the Unified IDE API to various environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Default values
ENVIRONMENT="development"
BUILD_TYPE="production"
SKIP_TESTS=false
SKIP_BUILD=false
FORCE_DEPLOY=false
ROLLBACK=false

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
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Deployment environment (development|staging|production)"
    echo "  -b, --build-type TYPE    Build type (development|production)"
    echo "  -s, --skip-tests         Skip running tests"
    echo "  -k, --skip-build         Skip building the application"
    echo "  -f, --force              Force deployment without confirmation"
    echo "  -r, --rollback           Rollback to previous version"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e staging -b production"
    echo "  $0 -e production -f"
    echo "  $0 -r"
}

# Function to parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -b|--build-type)
                BUILD_TYPE="$2"
                shift 2
                ;;
            -s|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -k|--skip-build)
                SKIP_BUILD=true
                shift
                ;;
            -f|--force)
                FORCE_DEPLOY=true
                shift
                ;;
            -r|--rollback)
                ROLLBACK=true
                shift
                ;;
            -h|--help)
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
}

# Function to validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            print_status "Environment: $ENVIRONMENT"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js version $REQUIRED_VERSION or higher is required. Current version: $NODE_VERSION"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check if required directories exist
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to load environment variables
load_environment_vars() {
    print_status "Loading environment variables..."
    
    # Load environment-specific .env file
    ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
        print_success "Loaded environment variables from $ENV_FILE"
    else
        print_warning "Environment file not found: $ENV_FILE"
    fi
    
    # Set NODE_ENV
    export NODE_ENV="$ENVIRONMENT"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install backend dependencies
    cd "$BACKEND_DIR"
    print_status "Installing backend dependencies..."
    npm ci --silent
    
    # Install frontend dependencies
    cd "$FRONTEND_DIR"
    print_status "Installing frontend dependencies..."
    npm ci --silent
    
    cd "$PROJECT_ROOT"
    print_success "Dependencies installed successfully"
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Skipping tests"
        return
    fi
    
    print_status "Running tests..."
    
    # Run backend tests
    cd "$BACKEND_DIR"
    print_status "Running backend tests..."
    npm test --silent
    
    # Run frontend tests
    cd "$FRONTEND_DIR"
    print_status "Running frontend tests..."
    npm test --silent
    
    cd "$PROJECT_ROOT"
    print_success "All tests passed"
}

# Function to build application
build_application() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping build"
        return
    fi
    
    print_status "Building application..."
    
    # Build frontend
    cd "$FRONTEND_DIR"
    print_status "Building frontend..."
    npm run build --silent
    
    # Build backend (if needed)
    cd "$BACKEND_DIR"
    if [ -f "package.json" ] && grep -q '"build"' package.json; then
        print_status "Building backend..."
        npm run build --silent
    fi
    
    cd "$PROJECT_ROOT"
    print_success "Application built successfully"
}

# Function to validate configuration
validate_configuration() {
    print_status "Validating configuration..."
    
    cd "$BACKEND_DIR"
    
    # Run configuration validation
    if node -e "
        const { validateConfig } = require('./config/ide-deployment');
        validateConfig();
    " 2>/dev/null; then
        print_success "Configuration validation passed"
    else
        print_error "Configuration validation failed"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Function to create backup
create_backup() {
    if [ "$ENVIRONMENT" = "development" ]; then
        print_warning "Skipping backup for development environment"
        return
    fi
    
    print_status "Creating backup..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment
    if [ -d "$PROJECT_ROOT/dist" ]; then
        cp -r "$PROJECT_ROOT/dist" "$BACKUP_DIR/"
    fi
    
    # Backup configuration
    if [ -d "$PROJECT_ROOT/config" ]; then
        cp -r "$PROJECT_ROOT/config" "$BACKUP_DIR/"
    fi
    
    print_success "Backup created: $BACKUP_DIR"
}

# Function to deploy application
deploy_application() {
    print_status "Deploying application..."
    
    case $ENVIRONMENT in
        development)
            deploy_development
            ;;
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
    esac
}

# Function to deploy to development
deploy_development() {
    print_status "Deploying to development environment..."
    
    # Start development servers
    cd "$BACKEND_DIR"
    print_status "Starting backend development server..."
    npm run dev &
    BACKEND_PID=$!
    
    cd "$FRONTEND_DIR"
    print_status "Starting frontend development server..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait for servers to start
    sleep 5
    
    # Check if servers are running
    if kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; then
        print_success "Development servers started successfully"
        print_status "Backend PID: $BACKEND_PID"
        print_status "Frontend PID: $FRONTEND_PID"
    else
        print_error "Failed to start development servers"
        exit 1
    fi
}

# Function to deploy to staging
deploy_staging() {
    print_status "Deploying to staging environment..."
    
    # Copy built files to staging directory
    STAGING_DIR="$PROJECT_ROOT/staging"
    mkdir -p "$STAGING_DIR"
    
    # Copy backend files
    cp -r "$BACKEND_DIR" "$STAGING_DIR/"
    
    # Copy frontend build
    cp -r "$FRONTEND_DIR/dist" "$STAGING_DIR/frontend"
    
    # Start staging server
    cd "$STAGING_DIR/backend"
    NODE_ENV=staging npm start &
    STAGING_PID=$!
    
    sleep 3
    
    if kill -0 $STAGING_PID 2>/dev/null; then
        print_success "Staging deployment completed"
        print_status "Staging server PID: $STAGING_PID"
    else
        print_error "Failed to start staging server"
        exit 1
    fi
}

# Function to deploy to production
deploy_production() {
    print_status "Deploying to production environment..."
    
    # Check if we have production deployment configuration
    if [ ! -f "$PROJECT_ROOT/deploy/production.sh" ]; then
        print_error "Production deployment script not found"
        exit 1
    fi
    
    # Execute production deployment script
    bash "$PROJECT_ROOT/deploy/production.sh"
    
    print_success "Production deployment completed"
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Wait for application to start
    sleep 10
    
    # Check API health endpoint
    API_URL="http://localhost:3000/health"
    if curl -f -s "$API_URL" > /dev/null; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        exit 1
    fi
    
    # Check WebSocket connection
    WS_URL="ws://localhost:3001/ws"
    if command -v websocat &> /dev/null; then
        if echo "ping" | websocat "$WS_URL" > /dev/null 2>&1; then
            print_success "WebSocket health check passed"
        else
            print_warning "WebSocket health check failed (websocat not available)"
        fi
    fi
    
    print_success "Health checks completed"
}

# Function to rollback deployment
rollback_deployment() {
    print_status "Rolling back deployment..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$PROJECT_ROOT/backups" | head -n1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        print_error "No backup found for rollback"
        exit 1
    fi
    
    BACKUP_PATH="$PROJECT_ROOT/backups/$LATEST_BACKUP"
    print_status "Rolling back to: $BACKUP_PATH"
    
    # Restore from backup
    if [ -d "$BACKUP_PATH/dist" ]; then
        rm -rf "$PROJECT_ROOT/dist"
        cp -r "$BACKUP_PATH/dist" "$PROJECT_ROOT/"
    fi
    
    if [ -d "$BACKUP_PATH/config" ]; then
        rm -rf "$PROJECT_ROOT/config"
        cp -r "$BACKUP_PATH/config" "$PROJECT_ROOT/"
    fi
    
    print_success "Rollback completed successfully"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$STAGING_PID" ]; then
        kill $STAGING_PID 2>/dev/null || true
    fi
    
    print_success "Cleanup completed"
}

# Function to show deployment summary
show_deployment_summary() {
    echo ""
    echo "=========================================="
    echo "           DEPLOYMENT SUMMARY"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Build Type: $BUILD_TYPE"
    echo "Timestamp: $(date)"
    echo "Status: SUCCESS"
    echo ""
    
    case $ENVIRONMENT in
        development)
            echo "Development servers are running:"
            echo "- Backend: http://localhost:3000"
            echo "- Frontend: http://localhost:3001"
            echo "- WebSocket: ws://localhost:3001/ws"
            ;;
        staging)
            echo "Staging deployment completed:"
            echo "- URL: http://staging.yourapp.com"
            ;;
        production)
            echo "Production deployment completed:"
            echo "- URL: https://yourapp.com"
            ;;
    esac
    
    echo ""
    echo "Next steps:"
    echo "1. Verify the application is working correctly"
    echo "2. Run smoke tests"
    echo "3. Monitor logs for any issues"
    echo "=========================================="
}

# Main deployment function
main() {
    print_status "Starting IDE API deployment..."
    print_status "Project root: $PROJECT_ROOT"
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Validate environment
    validate_environment
    
    # Check prerequisites
    check_prerequisites
    
    # Load environment variables
    load_environment_vars
    
    # Handle rollback
    if [ "$ROLLBACK" = true ]; then
        rollback_deployment
        exit 0
    fi
    
    # Confirm deployment (unless forced)
    if [ "$FORCE_DEPLOY" = false ] && [ "$ENVIRONMENT" != "development" ]; then
        echo ""
        echo "Deployment Configuration:"
        echo "- Environment: $ENVIRONMENT"
        echo "- Build Type: $BUILD_TYPE"
        echo "- Skip Tests: $SKIP_TESTS"
        echo "- Skip Build: $SKIP_BUILD"
        echo ""
        read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Create backup
    create_backup
    
    # Install dependencies
    install_dependencies
    
    # Run tests
    run_tests
    
    # Build application
    build_application
    
    # Validate configuration
    validate_configuration
    
    # Deploy application
    deploy_application
    
    # Run health checks
    run_health_checks
    
    # Show deployment summary
    show_deployment_summary
    
    print_success "Deployment completed successfully!"
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main function
main "$@" 