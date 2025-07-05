/**
 * Constants for SingleRepoStrategy
 */

// Monorepo indicators
const MONOREPO_INDICATORS = [
    'lerna.json',
    'nx.json',
    'rush.json',
    'pnpm-workspace.yaml'
];

// Main directories to analyze
const MAIN_DIRECTORIES = [
    'src', 'app', 'lib', 'components', 'pages', 'api', 'config', 'utils', 'types'
];

// Directories to skip during scanning
const SKIP_DIRECTORIES = [
    'node_modules', '.git', '.vscode', '.idea', 'dist', 'build',
    'coverage', '.nyc_output', '.next', '.nuxt', 'out', 'public'
];

// Lock files for package managers
const LOCK_FILES = {
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'pnpm-lock.yaml': 'pnpm'
};

// Build tools configuration
const BUILD_TOOLS = [
    { name: 'webpack', files: ['webpack.config.js', 'webpack.config.ts'] },
    { name: 'vite', files: ['vite.config.js', 'vite.config.ts'] },
    { name: 'rollup', files: ['rollup.config.js', 'rollup.config.ts'] },
    { name: 'parcel', files: ['package.json'] },
    { name: 'esbuild', files: ['esbuild.config.js'] },
    { name: 'swc', files: ['.swcrc', 'swc.config.js'] }
];

// Test file patterns
const TEST_PATTERNS = [
    '**/*.test.js', '**/*.test.ts', '**/*.test.jsx', '**/*.test.tsx',
    '**/*.spec.js', '**/*.spec.ts', '**/*.spec.jsx', '**/*.spec.tsx',
    '**/__tests__/**/*', '**/tests/**/*', '**/test/**/*'
];

// Test configuration files
const TEST_CONFIGS = [
    'jest.config.js', 'jest.config.ts', 'cypress.config.js',
    'playwright.config.js', 'vitest.config.js'
];

// Linting configuration files
const LINT_CONFIGS = [
    '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml',
    '.prettierrc', '.prettierrc.js', '.prettierrc.json',
    '.stylelintrc', 'stylelint.config.js'
];

// Deployment configuration files
const DEPLOYMENT_CONFIGS = [
    'Dockerfile', 'docker-compose.yml', 'vercel.json',
    'netlify.toml', '.github/workflows', '.gitlab-ci.yml'
];

// Performance configuration files
const PERFORMANCE_FILES = [
    'performance.config.js', 'monitoring.config.js'
];

// Security configuration files
const SECURITY_FILES = [
    '.env.example', 'security.config.js', 'auth.config.js'
];

// Secrets management files
const SECRETS_FILES = [
    '.env', '.env.local', 'secrets.json'
];

// Frontend frameworks
const FRONTEND_FRAMEWORKS = {
    'react': 'react-app',
    'react-dom': 'react-app',
    'vue': 'vue-app',
    'angular': 'angular-app',
    '@angular/core': 'angular-app',
    'svelte': 'svelte-app',
    'next': 'next-app',
    'nuxt': 'nuxt-app'
};

// Backend frameworks
const BACKEND_FRAMEWORKS = {
    'express': 'express-app',
    'koa': 'koa-app',
    'fastify': 'fastify-app',
    '@nestjs/core': 'nest-app'
};

// Build tools for project type detection
const BUILD_TOOLS_DETECTION = {
    'webpack': 'webpack-app',
    'vite': 'vite-app',
    'rollup': 'rollup-app'
};

// Performance dependencies
const PERFORMANCE_DEPENDENCIES = {
    monitoring: ['winston', 'morgan', 'express-status-monitor'],
    caching: ['redis', 'memcached', 'node-cache'],
    optimization: ['compression', 'express-static-gzip']
};

// Security dependencies
const SECURITY_DEPENDENCIES = [
    'helmet', 'express-rate-limit', 'cors', 'bcrypt', 'jsonwebtoken'
];

// Dependency categories
const DEPENDENCY_CATEGORIES = {
    frameworks: [
        'react', 'vue', 'angular', 'express', 'koa', 'fastify',
        'next', 'nuxt', 'svelte', '@nestjs/core'
    ],
    buildTools: [
        'webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'swc',
        'babel', 'typescript', 'sass', 'less'
    ],
    testing: [
        'jest', 'mocha', 'cypress', 'playwright', 'vitest',
        'chai', 'sinon', 'supertest'
    ],
    linting: [
        'eslint', 'prettier', 'stylelint', 'husky', 'lint-staged'
    ],
    databases: [
        'mongoose', 'sequelize', 'prisma', 'typeorm',
        'mysql2', 'pg', 'sqlite3', 'redis'
    ],
    security: [
        'helmet', 'bcrypt', 'jsonwebtoken', 'express-rate-limit',
        'cors', 'express-validator', 'joi'
    ],
    monitoring: [
        'winston', 'morgan', 'express-status-monitor',
        'sentry', 'newrelic', 'datadog'
    ],
    utilities: [
        'lodash', 'moment', 'dayjs', 'uuid', 'crypto',
        'axios', 'node-fetch', 'request'
    ]
};

module.exports = {
    MONOREPO_INDICATORS,
    MAIN_DIRECTORIES,
    SKIP_DIRECTORIES,
    LOCK_FILES,
    BUILD_TOOLS,
    TEST_PATTERNS,
    TEST_CONFIGS,
    LINT_CONFIGS,
    DEPLOYMENT_CONFIGS,
    PERFORMANCE_FILES,
    SECURITY_FILES,
    SECRETS_FILES,
    FRONTEND_FRAMEWORKS,
    BACKEND_FRAMEWORKS,
    BUILD_TOOLS_DETECTION,
    PERFORMANCE_DEPENDENCIES,
    SECURITY_DEPENDENCIES,
    DEPENDENCY_CATEGORIES
}; 