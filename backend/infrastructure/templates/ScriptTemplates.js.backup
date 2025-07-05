/**
 * ScriptTemplates - Comprehensive script generation templates
 */
class ScriptTemplates {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Get all available script templates
     * @returns {Object} All script templates
     */
    getAllTemplates() {
        return {
            build: this.getBuildTemplates(),
            test: this.getTestTemplates(),
            deploy: this.getDeployTemplates(),
            maintenance: this.getMaintenanceTemplates(),
            development: this.getDevelopmentTemplates(),
            database: this.getDatabaseTemplates(),
            security: this.getSecurityTemplates(),
            monitoring: this.getMonitoringTemplates(),
            automation: this.getAutomationTemplates(),
            utility: this.getUtilityTemplates()
        };
    }

    /**
     * Get build script templates
     * @returns {Object} Build templates
     */
    getBuildTemplates() {
        return {
            webpackBuild: {
                name: 'Webpack Build Script',
                description: 'Build application using Webpack',
                category: 'build',
                template: `#!/bin/bash
# Webpack Build Script
echo "Starting Webpack build..."

# Set environment
export NODE_ENV=production

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/
rm -rf build/

# Run build
echo "Running Webpack build..."
npm run build

# Check build result
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Build size:"
    du -sh dist/ || du -sh build/
else
    echo "Build failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'production',
                    BUILD_DIR: 'dist'
                },
                outputs: ['dist/', 'build/']
            },

            viteBuild: {
                name: 'Vite Build Script',
                description: 'Build application using Vite',
                category: 'build',
                template: `#!/bin/bash
# Vite Build Script
echo "Starting Vite build..."

# Set environment
export NODE_ENV=production

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Run build
echo "Running Vite build..."
npm run build

# Check build result
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Build size:"
    du -sh dist/
    
    # Optional: Preview build
    if [ "$1" = "--preview" ]; then
        echo "Starting preview server..."
        npm run preview
    fi
else
    echo "Build failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'production',
                    BUILD_DIR: 'dist'
                },
                outputs: ['dist/']
            },

            rollupBuild: {
                name: 'Rollup Build Script',
                description: 'Build application using Rollup',
                category: 'build',
                template: `#!/bin/bash
# Rollup Build Script
echo "Starting Rollup build..."

# Set environment
export NODE_ENV=production

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/

# Run build
echo "Running Rollup build..."
npm run build

# Check build result
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Build size:"
    du -sh dist/
else
    echo "Build failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'production',
                    BUILD_DIR: 'dist'
                },
                outputs: ['dist/']
            },

            dockerBuild: {
                name: 'Docker Build Script',
                description: 'Build Docker image',
                category: 'build',
                template: `#!/bin/bash
# Docker Build Script
echo "Starting Docker build..."

# Set variables
IMAGE_NAME="{{IMAGE_NAME}}"
IMAGE_TAG="{{IMAGE_TAG}}"
DOCKERFILE="{{DOCKERFILE}}"

# Validate inputs
if [ -z "$IMAGE_NAME" ]; then
    echo "Error: IMAGE_NAME is required"
    exit 1
fi

if [ -z "$IMAGE_TAG" ]; then
    IMAGE_TAG="latest"
fi

if [ -z "$DOCKERFILE" ]; then
    DOCKERFILE="Dockerfile"
fi

# Check if Dockerfile exists
if [ ! -f "$DOCKERFILE" ]; then
    echo "Error: Dockerfile not found: $DOCKERFILE"
    exit 1
fi

# Build Docker image
echo "Building Docker image: $IMAGE_NAME:$IMAGE_TAG"
docker build -f "$DOCKERFILE" -t "$IMAGE_NAME:$IMAGE_TAG" .

# Check build result
if [ $? -eq 0 ]; then
    echo "Docker build completed successfully!"
    echo "Image: $IMAGE_NAME:$IMAGE_TAG"
    
    # Optional: Push to registry
    if [ "$1" = "--push" ]; then
        echo "Pushing image to registry..."
        docker push "$IMAGE_NAME:$IMAGE_TAG"
    fi
else
    echo "Docker build failed!"
    exit 1
fi`,
                variables: {
                    IMAGE_NAME: 'myapp',
                    IMAGE_TAG: 'latest',
                    DOCKERFILE: 'Dockerfile'
                },
                outputs: ['docker-image']
            }
        };
    }

    /**
     * Get test script templates
     * @returns {Object} Test templates
     */
    getTestTemplates() {
        return {
            unitTests: {
                name: 'Unit Tests Script',
                description: 'Run unit tests',
                category: 'test',
                template: `#!/bin/bash
# Unit Tests Script
echo "Running unit tests..."

# Set environment
export NODE_ENV=test

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run unit tests
echo "Running unit tests..."
npm test

# Check test result
if [ $? -eq 0 ]; then
    echo "Unit tests passed!"
    
    # Generate coverage report if available
    if [ -f "coverage/lcov-report/index.html" ]; then
        echo "Coverage report available at: coverage/lcov-report/index.html"
    fi
else
    echo "Unit tests failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'test'
                },
                outputs: ['test-results', 'coverage/']
            },

            integrationTests: {
                name: 'Integration Tests Script',
                description: 'Run integration tests',
                category: 'test',
                template: `#!/bin/bash
# Integration Tests Script
echo "Running integration tests..."

# Set environment
export NODE_ENV=test

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start test database if needed
if [ "$1" = "--with-db" ]; then
    echo "Starting test database..."
    docker-compose -f docker-compose.test.yml up -d
    sleep 10
fi

# Run integration tests
echo "Running integration tests..."
npm run test:integration

# Check test result
if [ $? -eq 0 ]; then
    echo "Integration tests passed!"
else
    echo "Integration tests failed!"
    
    # Stop test database if started
    if [ "$1" = "--with-db" ]; then
        docker-compose -f docker-compose.test.yml down
    fi
    exit 1
fi

# Stop test database if started
if [ "$1" = "--with-db" ]; then
    echo "Stopping test database..."
    docker-compose -f docker-compose.test.yml down
fi`,
                variables: {
                    NODE_ENV: 'test'
                },
                outputs: ['integration-test-results']
            },

            e2eTests: {
                name: 'E2E Tests Script',
                description: 'Run end-to-end tests',
                category: 'test',
                template: `#!/bin/bash
# E2E Tests Script
echo "Running E2E tests..."

# Set environment
export NODE_ENV=test

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start application for testing
echo "Starting application for E2E testing..."
npm run start:test &
APP_PID=$!

# Wait for application to start
sleep 10

# Run E2E tests
echo "Running E2E tests..."
npm run test:e2e

# Store test result
TEST_RESULT=$?

# Stop application
echo "Stopping application..."
kill $APP_PID

# Check test result
if [ $TEST_RESULT -eq 0 ]; then
    echo "E2E tests passed!"
else
    echo "E2E tests failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'test'
                },
                outputs: ['e2e-test-results']
            },

            performanceTests: {
                name: 'Performance Tests Script',
                description: 'Run performance tests',
                category: 'test',
                template: `#!/bin/bash
# Performance Tests Script
echo "Running performance tests..."

# Set environment
export NODE_ENV=test

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start application for testing
echo "Starting application for performance testing..."
npm run start:test &
APP_PID=$!

# Wait for application to start
sleep 10

# Run performance tests
echo "Running performance tests..."
npm run test:performance

# Store test result
TEST_RESULT=$?

# Stop application
echo "Stopping application..."
kill $APP_PID

# Check test result
if [ $TEST_RESULT -eq 0 ]; then
    echo "Performance tests passed!"
    echo "Performance report available at: performance-report.html"
else
    echo "Performance tests failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'test'
                },
                outputs: ['performance-test-results', 'performance-report.html']
            }
        };
    }

    /**
     * Get deployment script templates
     * @returns {Object} Deploy templates
     */
    getDeployTemplates() {
        return {
            productionDeploy: {
                name: 'Production Deployment Script',
                description: 'Deploy to production environment',
                category: 'deploy',
                template: `#!/bin/bash
# Production Deployment Script
echo "Starting production deployment..."

# Set environment
export NODE_ENV=production

# Validate environment
if [ -z "$DEPLOY_ENV" ]; then
    export DEPLOY_ENV="production"
fi

# Run pre-deployment checks
echo "Running pre-deployment checks..."

# Run tests
echo "Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed! Aborting deployment."
    exit 1
fi

# Build application
echo "Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed! Aborting deployment."
    exit 1
fi

# Deploy to production
echo "Deploying to production..."
{{DEPLOY_COMMAND}}

# Check deployment result
if [ $? -eq 0 ]; then
    echo "Production deployment completed successfully!"
    
    # Run health check
    echo "Running health check..."
    {{HEALTH_CHECK_COMMAND}}
    
    if [ $? -eq 0 ]; then
        echo "Health check passed!"
    else
        echo "Health check failed!"
        exit 1
    fi
else
    echo "Production deployment failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'production',
                    DEPLOY_ENV: 'production',
                    DEPLOY_COMMAND: 'npm run deploy:prod',
                    HEALTH_CHECK_COMMAND: 'curl -f http://localhost:3000/health'
                },
                outputs: ['deployment-log']
            },

            stagingDeploy: {
                name: 'Staging Deployment Script',
                description: 'Deploy to staging environment',
                category: 'deploy',
                template: `#!/bin/bash
# Staging Deployment Script
echo "Starting staging deployment..."

# Set environment
export NODE_ENV=staging

# Validate environment
if [ -z "$DEPLOY_ENV" ]; then
    export DEPLOY_ENV="staging"
fi

# Run pre-deployment checks
echo "Running pre-deployment checks..."

# Run tests
echo "Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed! Aborting deployment."
    exit 1
fi

# Build application
echo "Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed! Aborting deployment."
    exit 1
fi

# Deploy to staging
echo "Deploying to staging..."
{{DEPLOY_COMMAND}}

# Check deployment result
if [ $? -eq 0 ]; then
    echo "Staging deployment completed successfully!"
    
    # Run health check
    echo "Running health check..."
    {{HEALTH_CHECK_COMMAND}}
    
    if [ $? -eq 0 ]; then
        echo "Health check passed!"
    else
        echo "Health check failed!"
        exit 1
    fi
else
    echo "Staging deployment failed!"
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'staging',
                    DEPLOY_ENV: 'staging',
                    DEPLOY_COMMAND: 'npm run deploy:staging',
                    HEALTH_CHECK_COMMAND: 'curl -f http://localhost:3000/health'
                },
                outputs: ['deployment-log']
            },

            dockerDeploy: {
                name: 'Docker Deployment Script',
                description: 'Deploy using Docker',
                category: 'deploy',
                template: `#!/bin/bash
# Docker Deployment Script
echo "Starting Docker deployment..."

# Set variables
IMAGE_NAME="{{IMAGE_NAME}}"
IMAGE_TAG="{{IMAGE_TAG}}"
CONTAINER_NAME="{{CONTAINER_NAME}}"
PORT="{{PORT}}"

# Validate inputs
if [ -z "$IMAGE_NAME" ]; then
    echo "Error: IMAGE_NAME is required"
    exit 1
fi

if [ -z "$IMAGE_TAG" ]; then
    IMAGE_TAG="latest"
fi

if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME="$IMAGE_NAME"
fi

if [ -z "$PORT" ]; then
    PORT="3000"
fi

# Stop existing container
echo "Stopping existing container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Pull latest image
echo "Pulling latest image..."
docker pull "$IMAGE_NAME:$IMAGE_TAG"

# Run new container
echo "Starting new container..."
docker run -d \\
    --name "$CONTAINER_NAME" \\
    -p "$PORT:$PORT" \\
    --restart unless-stopped \\
    "$IMAGE_NAME:$IMAGE_TAG"

# Check deployment result
if [ $? -eq 0 ]; then
    echo "Docker deployment completed successfully!"
    
    # Wait for container to start
    echo "Waiting for container to start..."
    sleep 10
    
    # Run health check
    echo "Running health check..."
    curl -f "http://localhost:$PORT/health"
    
    if [ $? -eq 0 ]; then
        echo "Health check passed!"
    else
        echo "Health check failed!"
        exit 1
    fi
else
    echo "Docker deployment failed!"
    exit 1
fi`,
                variables: {
                    IMAGE_NAME: 'myapp',
                    IMAGE_TAG: 'latest',
                    CONTAINER_NAME: 'myapp',
                    PORT: '3000'
                },
                outputs: ['docker-container']
            }
        };
    }

    /**
     * Get maintenance script templates
     * @returns {Object} Maintenance templates
     */
    getMaintenanceTemplates() {
        return {
            dependencyUpdate: {
                name: 'Dependency Update Script',
                description: 'Update project dependencies',
                category: 'maintenance',
                template: `#!/bin/bash
# Dependency Update Script
echo "Starting dependency update..."

# Backup current dependencies
echo "Backing up current dependencies..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || true

# Check for outdated dependencies
echo "Checking for outdated dependencies..."
npm outdated

# Update dependencies
echo "Updating dependencies..."
npm update

# Check for major version updates
echo "Checking for major version updates..."
npx npm-check-updates --target minor

# Run tests after update
echo "Running tests after update..."
npm test

# Check test result
if [ $? -eq 0 ]; then
    echo "Dependency update completed successfully!"
    echo "Tests passed after update."
else
    echo "Tests failed after update. Rolling back..."
    cp package.json.backup package.json
    cp package-lock.json.backup package-lock.json 2>/dev/null || true
    npm install
    echo "Rollback completed."
    exit 1
fi

# Clean up backups
rm package.json.backup package-lock.json.backup 2>/dev/null || true`,
                variables: {},
                outputs: ['updated-dependencies']
            },

            cleanup: {
                name: 'Cleanup Script',
                description: 'Clean up project files and dependencies',
                category: 'maintenance',
                template: `#!/bin/bash
# Cleanup Script
echo "Starting project cleanup..."

# Clean node_modules
echo "Cleaning node_modules..."
rm -rf node_modules/

# Clean build directories
echo "Cleaning build directories..."
rm -rf dist/
rm -rf build/
rm -rf .next/
rm -rf .nuxt/

# Clean cache directories
echo "Cleaning cache directories..."
rm -rf .cache/
rm -rf .parcel-cache/
rm -rf .eslintcache

# Clean log files
echo "Cleaning log files..."
rm -f *.log
rm -f logs/*.log 2>/dev/null || true

# Clean temporary files
echo "Cleaning temporary files..."
find . -name "*.tmp" -delete
find . -name "*.temp" -delete

# Clean coverage reports
echo "Cleaning coverage reports..."
rm -rf coverage/

# Reinstall dependencies
echo "Reinstalling dependencies..."
npm install

echo "Cleanup completed successfully!"`,
                variables: {},
                outputs: ['cleaned-project']
            },

            backup: {
                name: 'Backup Script',
                description: 'Create project backup',
                category: 'maintenance',
                template: `#!/bin/bash
# Backup Script
echo "Starting project backup..."

# Set backup directory
BACKUP_DIR="{{BACKUP_DIR}}"
PROJECT_NAME="{{PROJECT_NAME}}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup: $BACKUP_NAME"
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \\
    --exclude=node_modules \\
    --exclude=.git \\
    --exclude=dist \\
    --exclude=build \\
    --exclude=coverage \\
    --exclude=*.log \\
    .

# Check backup result
if [ $? -eq 0 ]; then
    echo "Backup completed successfully!"
    echo "Backup location: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    
    # Show backup size
    echo "Backup size:"
    du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz"
    
    # Clean old backups (keep last 5)
    echo "Cleaning old backups..."
    ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +6 | xargs rm -f 2>/dev/null || true
else
    echo "Backup failed!"
    exit 1
fi`,
                variables: {
                    BACKUP_DIR: './backups',
                    PROJECT_NAME: 'myproject'
                },
                outputs: ['backup-file']
            }
        };
    }

    /**
     * Get development script templates
     * @returns {Object} Development templates
     */
    getDevelopmentTemplates() {
        return {
            devSetup: {
                name: 'Development Setup Script',
                description: 'Set up development environment',
                category: 'development',
                template: `#!/bin/bash
# Development Setup Script
echo "Setting up development environment..."

# Check Node.js version
echo "Checking Node.js version..."
node --version
npm --version

# Install dependencies
echo "Installing dependencies..."
npm install

# Set up environment variables
echo "Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env 2>/dev/null || echo "No .env.example found"
fi

# Set up database
echo "Setting up database..."
npm run db:setup 2>/dev/null || echo "No database setup script found"

# Run initial build
echo "Running initial build..."
npm run build

# Run tests
echo "Running tests..."
npm test

echo "Development environment setup completed!"`,
                variables: {},
                outputs: ['dev-environment']
            },

            codeGeneration: {
                name: 'Code Generation Script',
                description: 'Generate code using templates',
                category: 'development',
                template: `#!/bin/bash
# Code Generation Script
echo "Starting code generation..."

# Set variables
COMPONENT_NAME="{{COMPONENT_NAME}}"
COMPONENT_TYPE="{{COMPONENT_TYPE}}"
OUTPUT_DIR="{{OUTPUT_DIR}}"

# Validate inputs
if [ -z "$COMPONENT_NAME" ]; then
    echo "Error: COMPONENT_NAME is required"
    exit 1
fi

if [ -z "$COMPONENT_TYPE" ]; then
    COMPONENT_TYPE="component"
fi

if [ -z "$OUTPUT_DIR" ]; then
    OUTPUT_DIR="src/components"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Generate component
echo "Generating $COMPONENT_TYPE: $COMPONENT_NAME"

# Generate component file
cat > "$OUTPUT_DIR/$COMPONENT_NAME.jsx" << EOF
import React from 'react';

const $COMPONENT_NAME = () => {
  return (
    <div>
      <h1>$COMPONENT_NAME</h1>
    </div>
  );
};

export default $COMPONENT_NAME;
EOF

# Generate test file
cat > "$OUTPUT_DIR/$COMPONENT_NAME.test.jsx" << EOF
import React from 'react';
import { render, screen } from '@testing-library/react';
import $COMPONENT_NAME from './$COMPONENT_NAME';

describe('$COMPONENT_NAME', () => {
  it('renders without crashing', () => {
    render(<$COMPONENT_NAME />);
    expect(screen.getByText('$COMPONENT_NAME')).toBeInTheDocument();
  });
});
EOF

echo "Code generation completed successfully!"
echo "Generated files:"
echo "  - $OUTPUT_DIR/$COMPONENT_NAME.jsx"
echo "  - $OUTPUT_DIR/$COMPONENT_NAME.test.jsx"`,
                variables: {
                    COMPONENT_NAME: 'MyComponent',
                    COMPONENT_TYPE: 'component',
                    OUTPUT_DIR: 'src/components'
                },
                outputs: ['generated-component', 'generated-test']
            }
        };
    }

    /**
     * Get database script templates
     * @returns {Object} Database templates
     */
    getDatabaseTemplates() {
        return {
            migration: {
                name: 'Database Migration Script',
                description: 'Run database migrations',
                category: 'database',
                template: `#!/bin/bash
# Database Migration Script
echo "Running database migrations..."

# Set environment
export NODE_ENV="{{NODE_ENV}}"

# Check if migrations directory exists
if [ ! -d "migrations" ]; then
    echo "Error: migrations directory not found"
    exit 1
fi

# Run migrations
echo "Running migrations..."
npm run migrate

# Check migration result
if [ $? -eq 0 ]; then
    echo "Migrations completed successfully!"
else
    echo "Migrations failed!"
    exit 1
fi

# Optional: Seed database
if [ "$1" = "--seed" ]; then
    echo "Seeding database..."
    npm run seed
fi`,
                variables: {
                    NODE_ENV: 'development'
                },
                outputs: ['migration-results']
            },

            backup: {
                name: 'Database Backup Script',
                description: 'Create database backup',
                category: 'database',
                template: `#!/bin/bash
# Database Backup Script
echo "Creating database backup..."

# Set variables
DB_HOST="{{DB_HOST}}"
DB_PORT="{{DB_PORT}}"
DB_NAME="{{DB_NAME}}"
DB_USER="{{DB_USER}}"
BACKUP_DIR="{{BACKUP_DIR}}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/backup_${TIMESTAMP}.sql"

# Check backup result
if [ $? -eq 0 ]; then
    echo "Database backup completed successfully!"
    echo "Backup location: $BACKUP_DIR/backup_${TIMESTAMP}.sql"
    
    # Compress backup
    gzip "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
    echo "Backup compressed: $BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"
    
    # Clean old backups (keep last 10)
    ls -t "$BACKUP_DIR"/*.sql.gz | tail -n +11 | xargs rm -f 2>/dev/null || true
else
    echo "Database backup failed!"
    exit 1
fi`,
                variables: {
                    DB_HOST: 'localhost',
                    DB_PORT: '5432',
                    DB_NAME: 'myapp',
                    DB_USER: 'postgres',
                    BACKUP_DIR: './backups'
                },
                outputs: ['database-backup']
            }
        };
    }

    /**
     * Get security script templates
     * @returns {Object} Security templates
     */
    getSecurityTemplates() {
        return {
            securityAudit: {
                name: 'Security Audit Script',
                description: 'Run security audit',
                category: 'security',
                template: `#!/bin/bash
# Security Audit Script
echo "Running security audit..."

# Install audit tools if needed
if ! command -v npm-audit &> /dev/null; then
    echo "Installing audit tools..."
    npm install -g npm-audit
fi

# Run npm audit
echo "Running npm audit..."
npm audit

# Run security scan
echo "Running security scan..."
npm audit fix --dry-run

# Check for high severity issues
echo "Checking for high severity issues..."
npm audit --audit-level=high

# Generate security report
echo "Generating security report..."
npm audit --json > security-audit-report.json

echo "Security audit completed!"
echo "Report saved to: security-audit-report.json"`,
                variables: {},
                outputs: ['security-audit-report.json']
            },

            vulnerabilityScan: {
                name: 'Vulnerability Scan Script',
                description: 'Scan for vulnerabilities',
                category: 'security',
                template: `#!/bin/bash
# Vulnerability Scan Script
echo "Running vulnerability scan..."

# Install security tools
echo "Installing security tools..."
npm install -g snyk

# Run Snyk security scan
echo "Running Snyk security scan..."
snyk test

# Run Snyk monitor
echo "Running Snyk monitor..."
snyk monitor

# Generate vulnerability report
echo "Generating vulnerability report..."
snyk test --json > vulnerability-report.json

echo "Vulnerability scan completed!"
echo "Report saved to: vulnerability-report.json"`,
                variables: {},
                outputs: ['vulnerability-report.json']
            }
        };
    }

    /**
     * Get monitoring script templates
     * @returns {Object} Monitoring templates
     */
    getMonitoringTemplates() {
        return {
            healthCheck: {
                name: 'Health Check Script',
                description: 'Check application health',
                category: 'monitoring',
                template: `#!/bin/bash
# Health Check Script
echo "Running health check..."

# Set variables
APP_URL="{{APP_URL}}"
HEALTH_ENDPOINT="{{HEALTH_ENDPOINT}}"
TIMEOUT="{{TIMEOUT}}"

# Default values
if [ -z "$APP_URL" ]; then
    APP_URL="http://localhost:3000"
fi

if [ -z "$HEALTH_ENDPOINT" ]; then
    HEALTH_ENDPOINT="/health"
fi

if [ -z "$TIMEOUT" ]; then
    TIMEOUT="30"
fi

# Check application health
echo "Checking application health at: $APP_URL$HEALTH_ENDPOINT"

response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$APP_URL$HEALTH_ENDPOINT")

if [ "$response" = "200" ]; then
    echo "Health check passed! Status: $response"
    exit 0
else
    echo "Health check failed! Status: $response"
    exit 1
fi`,
                variables: {
                    APP_URL: 'http://localhost:3000',
                    HEALTH_ENDPOINT: '/health',
                    TIMEOUT: '30'
                },
                outputs: ['health-check-result']
            },

            performanceMonitor: {
                name: 'Performance Monitor Script',
                description: 'Monitor application performance',
                category: 'monitoring',
                template: `#!/bin/bash
# Performance Monitor Script
echo "Starting performance monitoring..."

# Set variables
APP_URL="{{APP_URL}}"
MONITOR_DURATION="{{MONITOR_DURATION}}"
INTERVAL="{{INTERVAL}}"

# Default values
if [ -z "$APP_URL" ]; then
    APP_URL="http://localhost:3000"
fi

if [ -z "$MONITOR_DURATION" ]; then
    MONITOR_DURATION="300"
fi

if [ -z "$INTERVAL" ]; then
    INTERVAL="10"
fi

# Create monitoring log
LOG_FILE="performance-monitor-$(date +%Y%m%d_%H%M%S).log"

echo "Performance monitoring started at $(date)" > "$LOG_FILE"
echo "Monitoring URL: $APP_URL" >> "$LOG_FILE"
echo "Duration: $MONITOR_DURATION seconds" >> "$LOG_FILE"
echo "Interval: $INTERVAL seconds" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"

# Monitor performance
end_time=$((SECONDS + MONITOR_DURATION))

while [ $SECONDS -lt $end_time ]; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Measure response time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "$APP_URL")
    
    # Check if application is responding
    if [ $? -eq 0 ]; then
        status="OK"
    else
        status="ERROR"
    fi
    
    echo "[$timestamp] Status: $status, Response Time: ${response_time}s" >> "$LOG_FILE"
    
    sleep $INTERVAL
done

echo "Performance monitoring completed!"
echo "Log saved to: $LOG_FILE"`,
                variables: {
                    APP_URL: 'http://localhost:3000',
                    MONITOR_DURATION: '300',
                    INTERVAL: '10'
                },
                outputs: ['performance-log']
            }
        };
    }

    /**
     * Get automation script templates
     * @returns {Object} Automation templates
     */
    getAutomationTemplates() {
        return {
            ciCd: {
                name: 'CI/CD Pipeline Script',
                description: 'Set up CI/CD pipeline',
                category: 'automation',
                template: `#!/bin/bash
# CI/CD Pipeline Script
echo "Setting up CI/CD pipeline..."

# Set environment
export NODE_ENV=production

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run linting
echo "Running linting..."
npm run lint

# Run tests
echo "Running tests..."
npm test

# Build application
echo "Building application..."
npm run build

# Run security audit
echo "Running security audit..."
npm audit --audit-level=high

# Deploy if all checks pass
if [ $? -eq 0 ]; then
    echo "All checks passed! Deploying..."
    npm run deploy
else
    echo "Checks failed! Aborting deployment."
    exit 1
fi`,
                variables: {
                    NODE_ENV: 'production'
                },
                outputs: ['ci-cd-pipeline']
            },

            autoDeploy: {
                name: 'Auto Deploy Script',
                description: 'Automated deployment script',
                category: 'automation',
                template: `#!/bin/bash
# Auto Deploy Script
echo "Starting automated deployment..."

# Set variables
BRANCH="{{BRANCH}}"
ENVIRONMENT="{{ENVIRONMENT}}"

# Check current branch
current_branch=$(git branch --show-current)

if [ "$current_branch" != "$BRANCH" ]; then
    echo "Not on target branch. Current: $current_branch, Target: $BRANCH"
    exit 0
fi

# Pull latest changes
echo "Pulling latest changes..."
git pull origin $BRANCH

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run tests
echo "Running tests..."
npm test

# Build application
echo "Building application..."
npm run build

# Deploy to environment
echo "Deploying to $ENVIRONMENT..."
npm run deploy:$ENVIRONMENT

echo "Automated deployment completed!"`,
                variables: {
                    BRANCH: 'main',
                    ENVIRONMENT: 'production'
                },
                outputs: ['auto-deploy-result']
            }
        };
    }

    /**
     * Get utility script templates
     * @returns {Object} Utility templates
     */
    getUtilityTemplates() {
        return {
            logAnalyzer: {
                name: 'Log Analyzer Script',
                description: 'Analyze application logs',
                category: 'utility',
                template: `#!/bin/bash
# Log Analyzer Script
echo "Analyzing application logs..."

# Set variables
LOG_DIR="{{LOG_DIR}}"
LOG_PATTERN="{{LOG_PATTERN}}"
OUTPUT_FILE="{{OUTPUT_FILE}}"

# Default values
if [ -z "$LOG_DIR" ]; then
    LOG_DIR="./logs"
fi

if [ -z "$LOG_PATTERN" ]; then
    LOG_PATTERN="*.log"
fi

if [ -z "$OUTPUT_FILE" ]; then
    OUTPUT_FILE="log-analysis-$(date +%Y%m%d_%H%M%S).txt"
fi

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    echo "Error: Log directory not found: $LOG_DIR"
    exit 1
fi

# Analyze logs
echo "Analyzing logs in: $LOG_DIR"
echo "Log Analysis Report - $(date)" > "$OUTPUT_FILE"
echo "==========================================" >> "$OUTPUT_FILE"

# Count total log files
log_count=$(find "$LOG_DIR" -name "$LOG_PATTERN" | wc -l)
echo "Total log files found: $log_count" >> "$OUTPUT_FILE"

# Count total lines
total_lines=$(find "$LOG_DIR" -name "$LOG_PATTERN" -exec wc -l {} + | tail -1 | awk '{print $1}')
echo "Total log lines: $total_lines" >> "$OUTPUT_FILE"

# Find error patterns
echo "" >> "$OUTPUT_FILE"
echo "Error Analysis:" >> "$OUTPUT_FILE"
echo "---------------" >> "$OUTPUT_FILE"

error_count=$(find "$LOG_DIR" -name "$LOG_PATTERN" -exec grep -i "error" {} \; | wc -l)
echo "Total errors found: $error_count" >> "$OUTPUT_FILE"

# Find warning patterns
warning_count=$(find "$LOG_DIR" -name "$LOG_PATTERN" -exec grep -i "warning" {} \; | wc -l)
echo "Total warnings found: $warning_count" >> "$OUTPUT_FILE"

# Most common error messages
echo "" >> "$OUTPUT_FILE"
echo "Most Common Error Messages:" >> "$OUTPUT_FILE"
echo "---------------------------" >> "$OUTPUT_FILE"
find "$LOG_DIR" -name "$LOG_PATTERN" -exec grep -i "error" {} \; | sort | uniq -c | sort -nr | head -10 >> "$OUTPUT_FILE"

echo "Log analysis completed!"
echo "Report saved to: $OUTPUT_FILE"`,
                variables: {
                    LOG_DIR: './logs',
                    LOG_PATTERN: '*.log',
                    OUTPUT_FILE: 'log-analysis.txt'
                },
                outputs: ['log-analysis-report']
            },

            fileCleaner: {
                name: 'File Cleaner Script',
                description: 'Clean up temporary and unnecessary files',
                category: 'utility',
                template: `#!/bin/bash
# File Cleaner Script
echo "Cleaning up files..."

# Set variables
CLEAN_PATTERNS="{{CLEAN_PATTERNS}}"
DRY_RUN="{{DRY_RUN}}"

# Default patterns
if [ -z "$CLEAN_PATTERNS" ]; then
    CLEAN_PATTERNS="*.tmp,*.temp,*.log,*.cache,.DS_Store,Thumbs.db"
fi

if [ -z "$DRY_RUN" ]; then
    DRY_RUN="false"
fi

# Convert patterns to array
IFS=',' read -ra patterns <<< "$CLEAN_PATTERNS"

echo "Cleaning patterns: ${patterns[@]}"

# Clean files
for pattern in "${patterns[@]}"; do
    echo "Cleaning pattern: $pattern"
    
    if [ "$DRY_RUN" = "true" ]; then
        # Dry run - just show what would be deleted
        find . -name "$pattern" -type f -print
    else
        # Actually delete files
        deleted_count=$(find . -name "$pattern" -type f -delete -print | wc -l)
        echo "Deleted $deleted_count files matching pattern: $pattern"
    fi
done

echo "File cleanup completed!"`,
                variables: {
                    CLEAN_PATTERNS: '*.tmp,*.temp,*.log,*.cache,.DS_Store,Thumbs.db',
                    DRY_RUN: 'false'
                },
                outputs: ['cleanup-report']
            }
        };
    }

    /**
     * Get template by category and name
     * @param {string} category - Template category
     * @param {string} name - Template name
     * @returns {Object|null} Template or null if not found
     */
    getTemplate(category, name) {
        const templates = this.getAllTemplates();
        return templates[category]?.[name] || null;
    }

    /**
     * Get templates by category
     * @param {string} category - Template category
     * @returns {Object} Templates in category
     */
    getTemplatesByCategory(category) {
        const templates = this.getAllTemplates();
        return templates[category] || {};
    }

    /**
     * Generate script from template
     * @param {string} category - Template category
     * @param {string} name - Template name
     * @param {Object} variables - Variables to substitute
     * @returns {string} Generated script
     */
    generateScript(category, name, variables = {}) {
        const template = this.getTemplate(category, name);
        if (!template) {
            throw new Error(`Template not found: ${category}/${name}`);
        }

        let script = template.template;

        // Substitute variables
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            script = script.replace(new RegExp(placeholder, 'g'), value);
        }

        // Substitute default variables if not provided
        for (const [key, defaultValue] of Object.entries(template.variables || {})) {
            const placeholder = `{{${key}}}`;
            if (!variables[key] && script.includes(placeholder)) {
                script = script.replace(new RegExp(placeholder, 'g'), defaultValue);
            }
        }

        return script;
    }

    /**
     * Search templates by keyword
     * @param {string} keyword - Search keyword
     * @returns {Array} Matching templates
     */
    searchTemplates(keyword) {
        const allTemplates = this.getAllTemplates();
        const results = [];

        for (const [category, templates] of Object.entries(allTemplates)) {
            for (const [name, template] of Object.entries(templates)) {
                if (template.name.toLowerCase().includes(keyword.toLowerCase()) ||
                    template.description.toLowerCase().includes(keyword.toLowerCase()) ||
                    template.category.toLowerCase().includes(keyword.toLowerCase())) {
                    results.push({
                        category,
                        name,
                        template
                    });
                }
            }
        }

        return results;
    }

    /**
     * Create custom template
     * @param {Object} template - Template definition
     * @returns {Object} Created template
     */
    createCustomTemplate(template) {
        const customTemplate = {
            ...template,
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isCustom: true,
            createdAt: new Date()
        };

        if (this.eventBus) {
            this.eventBus.publish('script-template.created', {
                template: customTemplate,
                timestamp: new Date()
            });
        }

        return customTemplate;
    }

    /**
     * Validate template
     * @param {Object} template - Template to validate
     * @returns {Object} Validation result
     */
    validateTemplate(template) {
        const errors = [];

        if (!template.name) {
            errors.push('Template name is required');
        }

        if (!template.description) {
            errors.push('Template description is required');
        }

        if (!template.category) {
            errors.push('Template category is required');
        }

        if (!template.template) {
            errors.push('Template content is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = ScriptTemplates; 