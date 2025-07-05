/**
 * Test Templates Module
 */
const { TEMPLATE_CATEGORIES } = require('./constants');

class TestTemplates {
    /**
     * Get test script templates
     * @returns {Object} Test templates
     */
    static getTemplates() {
        return {
            unitTests: {
                name: 'Unit Tests Script',
                description: 'Run unit tests',
                category: TEMPLATE_CATEGORIES.TEST,
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
                category: TEMPLATE_CATEGORIES.TEST,
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
                category: TEMPLATE_CATEGORIES.TEST,
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
                category: TEMPLATE_CATEGORIES.TEST,
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
}

module.exports = TestTemplates; 