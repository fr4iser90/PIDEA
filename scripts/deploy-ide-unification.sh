#!/bin/bash

# IDE Unification Deployment Script
# Comprehensive deployment script for IDE API and frontend unification features

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_CONFIG="$PROJECT_ROOT/backend/config/deployment-config.js"

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

# Function to display usage
show_usage() {
    echo "Usage: $0 [OPTIONS] <environment>"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -v, --version           Show version information"
    echo "  -t, --test              Run tests before deployment"
    echo "  -b, --build             Build application before deployment"
    echo "  -c, --clean             Clean build artifacts before deployment"
    echo "  -r, --rollback          Rollback to previous version"
    echo "  -m, --monitor           Start monitoring after deployment"
    echo "  -d, --dry-run           Perform dry run (no actual deployment)"
    echo ""
    echo "Environments:"
    echo "  development             Deploy to development environment"
    echo "  staging                 Deploy to staging environment"
    echo "  production              Deploy to production environment"
    echo ""
    echo "Examples:"
    echo "  $0 development          Deploy to development"
    echo "  $0 -t -b production     Deploy to production with tests and build"
    echo "  $0 -r production        Rollback production deployment"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker (for containerized deployment)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed - containerized deployment will be skipped"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_warning "Docker Compose is not installed - containerized deployment will be skipped"
    fi
    
    log_success "Prerequisites check completed"
}

# Function to validate environment
validate_environment() {
    local environment=$1
    log_info "Validating environment configuration for $environment..."
    
    # Set environment variable
    export NODE_ENV=$environment
    
    # Run environment validation
    if node -e "
        const DeploymentConfig = require('$DEPLOYMENT_CONFIG');
        const config = new DeploymentConfig();
        const validation = config.validate();
        if (!validation.isValid) {
            console.error('Environment validation failed:');
            validation.errors.forEach(error => console.error('- ' + error));
            process.exit(1);
        }
        console.log('Environment validation passed');
    "; then
        log_success "Environment validation passed"
    else
        log_error "Environment validation failed"
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install backend dependencies
    cd "$PROJECT_ROOT/backend"
    if npm ci --production; then
        log_success "Backend dependencies installed"
    else
        log_error "Failed to install backend dependencies"
        exit 1
    fi
    
    # Install frontend dependencies
    cd "$PROJECT_ROOT/frontend"
    if npm ci; then
        log_success "Frontend dependencies installed"
    else
        log_error "Failed to install frontend dependencies"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Function to run tests
run_tests() {
    log_info "Running tests..."
    
    # Run backend tests
    cd "$PROJECT_ROOT/backend"
    if npm test; then
        log_success "Backend tests passed"
    else
        log_error "Backend tests failed"
        exit 1
    fi
    
    # Run frontend tests
    cd "$PROJECT_ROOT/frontend"
    if npm test; then
        log_success "Frontend tests passed"
    else
        log_error "Frontend tests failed"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Function to build application
build_application() {
    log_info "Building application..."
    
    # Build frontend
    cd "$PROJECT_ROOT/frontend"
    if npm run build; then
        log_success "Frontend build completed"
    else
        log_error "Frontend build failed"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Function to clean build artifacts
clean_build() {
    log_info "Cleaning build artifacts..."
    
    # Clean frontend build
    cd "$PROJECT_ROOT/frontend"
    rm -rf dist node_modules/.cache
    
    # Clean backend build artifacts
    cd "$PROJECT_ROOT/backend"
    rm -rf logs/*.log
    
    cd "$PROJECT_ROOT"
    log_success "Build artifacts cleaned"
}

# Function to deploy to development
deploy_development() {
    log_info "Deploying to development environment..."
    
    # Start development servers
    if command -v docker-compose &> /dev/null; then
        log_info "Starting development environment with Docker Compose..."
        docker-compose up -d
    else
        log_info "Starting development environment without Docker..."
        
        # Start backend
        cd "$PROJECT_ROOT/backend"
        npm run dev &
        BACKEND_PID=$!
        
        # Start frontend
        cd "$PROJECT_ROOT/frontend"
        npm run dev &
        FRONTEND_PID=$!
        
        # Wait for services to start
        sleep 10
        
        log_success "Development environment started (Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID)"
    fi
}

# Function to deploy to staging
deploy_staging() {
    log_info "Deploying to staging environment..."
    
    # Create staging backup
    create_backup "staging"
    
    # Deploy using Docker Compose
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.staging.yml up -d --build
    else
        log_error "Docker Compose is required for staging deployment"
        exit 1
    fi
    
    log_success "Staging deployment completed"
}

# Function to deploy to production
deploy_production() {
    log_info "Deploying to production environment..."
    
    # Create production backup
    create_backup "production"
    
    # Deploy using Docker Compose
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.prod.yml up -d --build
    else
        log_error "Docker Compose is required for production deployment"
        exit 1
    fi
    
    log_success "Production deployment completed"
}

# Function to create backup
create_backup() {
    local environment=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$PROJECT_ROOT/backups/$environment/$timestamp"
    
    log_info "Creating backup for $environment environment..."
    
    mkdir -p "$backup_dir"
    
    # Backup database (if applicable)
    if [ "$environment" = "production" ] || [ "$environment" = "staging" ]; then
        if command -v pg_dump &> /dev/null; then
            pg_dump "$DATABASE_URL" > "$backup_dir/database.sql"
        fi
    fi
    
    # Backup configuration
    cp -r "$PROJECT_ROOT/backend/config" "$backup_dir/"
    
    # Create backup manifest
    cat > "$backup_dir/manifest.json" << EOF
{
  "environment": "$environment",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "backup_type": "pre_deployment"
}
EOF
    
    log_success "Backup created at $backup_dir"
}

# Function to perform health checks
perform_health_checks() {
    local environment=$1
    log_info "Performing health checks for $environment environment..."
    
    # Get health check endpoints from configuration
    local health_endpoints=(
        "http://localhost:8090/api/health"
        "http://localhost:8090/api/ide/health"
        "http://localhost:8090/api/health/database"
        "http://localhost:8090/api/health/websocket"
    )
    
    local failed_checks=0
    
    for endpoint in "${health_endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null; then
            log_success "Health check passed: $endpoint"
        else
            log_error "Health check failed: $endpoint"
            ((failed_checks++))
        fi
    done
    
    if [ $failed_checks -eq 0 ]; then
        log_success "All health checks passed"
    else
        log_error "$failed_checks health check(s) failed"
        return 1
    fi
}

# Function to rollback deployment
rollback_deployment() {
    local environment=$1
    log_info "Rolling back $environment deployment..."
    
    # Find latest backup
    local backup_dir="$PROJECT_ROOT/backups/$environment"
    local latest_backup=$(ls -t "$backup_dir" 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    log_info "Rolling back to backup: $latest_backup"
    
    # Stop current deployment
    if command -v docker-compose &> /dev/null; then
        docker-compose down
    fi
    
    # Restore from backup
    local backup_path="$backup_dir/$latest_backup"
    
    # Restore database (if applicable)
    if [ -f "$backup_path/database.sql" ]; then
        if command -v psql &> /dev/null; then
            psql "$DATABASE_URL" < "$backup_path/database.sql"
        fi
    fi
    
    # Restore configuration
    if [ -d "$backup_path/config" ]; then
        cp -r "$backup_path/config" "$PROJECT_ROOT/backend/"
    fi
    
    # Restart deployment
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    fi
    
    log_success "Rollback completed"
}

# Function to start monitoring
start_monitoring() {
    log_info "Starting monitoring..."
    
    # Start monitoring in background
    (
        while true; do
            if ! perform_health_checks "$ENVIRONMENT" > /dev/null 2>&1; then
                log_error "Health check failed during monitoring"
                # Could trigger alerts here
            fi
            sleep 60
        done
    ) &
    
    MONITORING_PID=$!
    log_success "Monitoring started (PID: $MONITORING_PID)"
}

# Function to perform dry run
dry_run() {
    local environment=$1
    log_info "Performing dry run for $environment deployment..."
    
    log_info "Would perform the following actions:"
    log_info "1. Validate environment configuration"
    log_info "2. Install dependencies"
    if [ "$RUN_TESTS" = true ]; then
        log_info "3. Run tests"
    fi
    if [ "$BUILD_APP" = true ]; then
        log_info "4. Build application"
    fi
    log_info "5. Deploy to $environment"
    log_info "6. Perform health checks"
    
    log_success "Dry run completed - no actual deployment performed"
}

# Main deployment function
main() {
    local environment=$1
    
    # Validate environment parameter
    if [[ ! "$environment" =~ ^(development|staging|production)$ ]]; then
        log_error "Invalid environment: $environment"
        show_usage
        exit 1
    fi
    
    ENVIRONMENT=$environment
    
    log_info "Starting IDE Unification deployment to $environment environment..."
    
    # Check prerequisites
    check_prerequisites
    
    # Validate environment configuration
    validate_environment "$environment"
    
    # Perform dry run if requested
    if [ "$DRY_RUN" = true ]; then
        dry_run "$environment"
        exit 0
    fi
    
    # Clean build artifacts if requested
    if [ "$CLEAN_BUILD" = true ]; then
        clean_build
    fi
    
    # Install dependencies
    install_dependencies
    
    # Run tests if requested
    if [ "$RUN_TESTS" = true ]; then
        run_tests
    fi
    
    # Build application if requested
    if [ "$BUILD_APP" = true ]; then
        build_application
    fi
    
    # Deploy based on environment
    case "$environment" in
        "development")
            deploy_development
            ;;
        "staging")
            deploy_staging
            ;;
        "production")
            deploy_production
            ;;
    esac
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 30
    
    # Perform health checks
    if perform_health_checks "$environment"; then
        log_success "Deployment completed successfully"
        
        # Start monitoring if requested
        if [ "$START_MONITORING" = true ]; then
            start_monitoring
        fi
        
        # Display deployment information
        log_info "Deployment Summary:"
        log_info "- Environment: $environment"
        log_info "- Backend URL: http://localhost:8090"
        log_info "- Frontend URL: http://localhost:4040"
        log_info "- Health Check: http://localhost:8090/api/health"
        
    else
        log_error "Deployment failed health checks"
        exit 1
    fi
}

# Parse command line arguments
RUN_TESTS=false
BUILD_APP=false
CLEAN_BUILD=false
ROLLBACK=false
START_MONITORING=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--version)
            echo "IDE Unification Deployment Script v1.0.0"
            exit 0
            ;;
        -t|--test)
            RUN_TESTS=true
            shift
            ;;
        -b|--build)
            BUILD_APP=true
            shift
            ;;
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -m|--monitor)
            START_MONITORING=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -*)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            ENVIRONMENT="$1"
            shift
            ;;
    esac
done

# Check if environment is provided
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    show_usage
    exit 1
fi

# Handle rollback
if [ "$ROLLBACK" = true ]; then
    rollback_deployment "$ENVIRONMENT"
    exit 0
fi

# Run main deployment
main "$ENVIRONMENT" 