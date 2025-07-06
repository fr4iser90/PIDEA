/**
 * Analysis Constants - Configuration constants for VibeCoder analysis operations
 */

const ANALYSIS_CONSTANTS = {
    // Risk level thresholds
    RISK_THRESHOLDS: {
        CRITICAL: 50,
        HIGH: 30,
        MEDIUM: 15,
        LOW: 0
    },

    // Risk score multipliers
    RISK_MULTIPLIERS: {
        CRITICAL_VULNERABILITY: 10,
        HIGH_VULNERABILITY: 5,
        MEDIUM_VULNERABILITY: 2,
        CRITICAL_ISSUE: 10,
        HIGH_ISSUE: 5,
        SECRET_FOUND: 5,
        MISSING_SECURITY: 2
    },

    // Score thresholds for recommendations
    SCORE_THRESHOLDS: {
        QUALITY_LOW: 75,
        ARCHITECTURE_LOW: 75,
        MAINTAINABILITY_LOW: 70,
        TESTABILITY_LOW: 70,
        OVERALL_TARGET: 80
    },

    // Default scores
    DEFAULT_SCORES: {
        OVERALL: 100,
        QUALITY: 100,
        ARCHITECTURE: 100,
        SECURITY: 100,
        PERFORMANCE: 100,
        MAINTAINABILITY: 100
    },

    // Common package directories
    COMMON_PACKAGE_DIRS: ['backend', 'frontend', 'api', 'client', 'server', 'app', 'src'],

    // Analysis types
    ANALYSIS_TYPES: {
        PROJECT_STRUCTURE: 'projectStructure',
        CODE_QUALITY: 'codeQuality',
        ARCHITECTURE: 'architecture',
        DEPENDENCIES: 'dependencies',
        PERFORMANCE: 'performance',
        SECURITY: 'security',
        MAINTAINABILITY: 'maintainability',
        TECH_STACK: 'techStack'
    },

    // Phase types
    PHASE_TYPES: {
        ANALYZE: 'analyze',
        REFACTOR: 'refactor',
        GENERATE: 'generate'
    },

    // Priority levels
    PRIORITY_LEVELS: {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },

    // Issue types
    ISSUE_TYPES: {
        PHASE_FAILURE: 'phase_failure',
        INCOMPLETE_OPERATIONS: 'incomplete_operations',
        VALIDATION_ERROR: 'validation_error'
    },

    // Recommendation categories
    RECOMMENDATION_CATEGORIES: {
        VULNERABILITIES: 'vulnerabilities',
        CONFIGURATION: 'configuration',
        SECRETS: 'secrets',
        ADDRESS_VALIDATION: 'address_validation_issues',
        CONTINUE_IMPROVEMENT: 'continue_improvement',
        ONGOING_MAINTENANCE: 'ongoing_maintenance'
    }
};

module.exports = ANALYSIS_CONSTANTS; 