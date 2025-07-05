/**
 * Execution Constants for TaskExecutionEngine
 */

const EXECUTION_CONSTANTS = {
    // Queue and execution settings
    MAX_CONCURRENT_EXECUTIONS: 5,
    EXECUTION_TIMEOUT: 300000, // 5 minutes
    QUEUE_CHECK_INTERVAL: 1000, // 1 second
    
    // Task types
    TASK_TYPES: {
        ANALYSIS: 'analysis',
        SCRIPT: 'script',
        OPTIMIZATION: 'optimization',
        SECURITY: 'security',
        REFACTORING: 'refactoring',
        TESTING: 'testing',
        DEPLOYMENT: 'deployment',
        CUSTOM: 'custom'
    },
    
    // Execution statuses
    EXECUTION_STATUS: {
        PREPARING: 'preparing',
        RUNNING: 'running',
        COMPLETED: 'completed',
        ERROR: 'error',
        CANCELLED: 'cancelled',
        PAUSED: 'paused'
    },
    
    // Event types
    EVENTS: {
        EXECUTION_REQUESTED: 'task:execution:requested',
        EXECUTION_CANCELLED: 'task:execution:cancelled',
        EXECUTION_PAUSED: 'task:execution:paused',
        EXECUTION_RESUMED: 'task:execution:resumed',
        EXECUTION_START: 'task:execution:start',
        EXECUTION_COMPLETE: 'task:execution:complete',
        EXECUTION_ERROR: 'task:execution:error'
    },
    
    // File patterns
    CONFIG_PATTERNS: [
        '.eslintrc*', '.prettierrc*', '.babelrc*', 'tsconfig.json',
        'webpack.config.js', 'vite.config.js', 'jest.config.js',
        '.env*', 'docker-compose.yml', 'Dockerfile'
    ],
    
    // Code file extensions
    CODE_EXTENSIONS: [
        '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', 
        '.php', '.rb', '.go', '.rs'
    ],
    
    // Refactoring types
    REFACTORING_TYPES: {
        EXTRACT_METHOD: 'extract_method',
        EXTRACT_CLASS: 'extract_class',
        RENAME: 'rename',
        MOVE_METHOD: 'move_method'
    },
    
    // Security scan types
    SECURITY_SCAN_TYPES: {
        DEPENDENCIES: 'dependencies',
        CODE: 'code',
        CONFIGURATION: 'configuration'
    },
    
    // Deployment types
    DEPLOYMENT_TYPES: {
        LOCAL: 'local',
        DOCKER: 'docker',
        CLOUD: 'cloud'
    },
    
    // Test types
    TEST_TYPES: {
        UNIT: 'unit',
        INTEGRATION: 'integration',
        E2E: 'e2e'
    }
};

module.exports = EXECUTION_CONSTANTS; 