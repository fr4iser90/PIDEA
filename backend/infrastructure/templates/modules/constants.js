/**
 * Script Templates Constants
 */

const TEMPLATE_CATEGORIES = {
    BUILD: 'build',
    TEST: 'test',
    DEPLOY: 'deploy',
    MAINTENANCE: 'maintenance',
    DEVELOPMENT: 'development',
    DATABASE: 'database',
    SECURITY: 'security',
    MONITORING: 'monitoring',
    AUTOMATION: 'automation',
    UTILITY: 'utility'
};

const FRONTEND_FOLDERS = ['frontend', 'client', 'web', 'app', 'ui'];

const FRONTEND_TECHS = [
    'react', 'vite', 'next', 'vue', 'svelte', 'astro', 'preact', 
    'angular', '@angular', 'solid', 'nuxt', 'gatsby'
];

const DEFAULT_VARIABLES = {
    NODE_ENV: 'production',
    BUILD_DIR: 'dist',
    LOG_DIR: './logs',
    LOG_PATTERN: '*.log',
    OUTPUT_FILE: 'log-analysis.txt',
    CLEAN_PATTERNS: '*.tmp,*.temp,*.log,*.cache,.DS_Store,Thumbs.db',
    DRY_RUN: 'false'
};

const VALIDATION_RULES = {
    REQUIRED_FIELDS: ['name', 'description', 'category', 'template'],
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_TEMPLATE_LENGTH: 10000
};

module.exports = {
    TEMPLATE_CATEGORIES,
    FRONTEND_FOLDERS,
    FRONTEND_TECHS,
    DEFAULT_VARIABLES,
    VALIDATION_RULES
}; 