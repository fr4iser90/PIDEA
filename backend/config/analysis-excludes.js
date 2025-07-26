/**
 * Centralized Analysis Exclude Patterns Configuration
 * 
 * This file provides standardized exclude patterns for different types of analysis
 * to ensure consistent behavior across all analysis scripts and services.
 * 
 * Usage:
 * const { analysisExcludes } = require('@config/analysis-excludes');
 * const excludePatterns = options.excludePatterns || analysisExcludes.extended;
 */

const analysisExcludes = {
  // Standard excludes for basic analysis - minimal performance impact
  standard: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.jest-cache',
    '.nyc_output'
  ],
  
  // Extended excludes for comprehensive analysis - includes IDE, OS, and temp files
  extended: [
    // Node.js ecosystem
    'node_modules',
    '.npm',
    '.yarn',
    'yarn.lock',
    'package-lock.json',
    '.eslintcache',
    '.babel-cache',
    '.cache',
    '.jest-cache',
    '.nyc_output',
    
    // Build and output directories
    'dist',
    'build',
    '.next',
    '.nuxt',
    '.output',
    '.svelte-kit',
    'out',
    'public/build',
    
    // Coverage and test artifacts
    'coverage',
    '.nyc_output',
    'test-results',
    'playwright-report',
    'cypress/videos',
    'cypress/screenshots',
    
    // Version control
    '.git',
    '.gitignore',
    '.gitattributes',
    '.gitmodules',
    '.gitkeep',
    
    // IDEs and editors
    '.vscode',
    '.idea',
    '.vs',
    '.sublime-project',
    '.sublime-workspace',
    '.atom',
    '.vim',
    '.emacs',
    '.swp',
    '.swo',
    '*~',
    
    // Operating system files
    '.DS_Store',
    'Thumbs.db',
    'desktop.ini',
    '.Trash',
    '.Spotlight-V100',
    '.fseventsd',
    '.VolumeIcon.icns',
    
    // Logs and temporary files
    '*.log',
    '*.tmp',
    '*.temp',
    '*.bak',
    '*.backup',
    '*.swp',
    '*.swo',
    '*~',
    '.tmp',
    'temp',
    'tmp',
    
    // Database and data files
    '*.db',
    '*.sqlite',
    '*.sqlite3',
    '*.db-journal',
    '*.db-wal',
    '*.db-shm',
    
    // Backup and archive files
    '*.zip',
    '*.tar.gz',
    '*.rar',
    '*.7z',
    'backups',
    'backup',
    
    // Environment and secrets
    '.env',
    '.env.local',
    '.env.development',
    '.env.test',
    '.env.production',
    '.secrets',
    'secrets',
    
    // Documentation and generated files
    'docs/_build',
    'docs/.doctrees',
    '*.md.bak',
    '*.md.tmp',
    
    // Docker and container files
    '.dockerignore',
    'Dockerfile.bak',
    'docker-compose.override.yml',
    
    // CI/CD artifacts
    '.github/workflows/.cache',
    '.gitlab-ci.yml.bak',
    'ci-cache',
    
    // Performance and monitoring
    '.lighthouseci',
    'lighthouse-report',
    'performance-report',
    
    // Security and audit
    'audit-report',
    'security-report',
    'vulnerability-report'
  ],
  
  // Minimal excludes for performance-critical analysis - only essential excludes
  minimal: [
    'node_modules',
    '.git',
    'coverage',
    'dist',
    'build'
  ],
  
  // Development-specific excludes - includes development tools and hot-reload
  development: [
    // Standard excludes
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.jest-cache',
    '.nyc_output',
    
    // Development tools
    '.webpack',
    '.parcel-cache',
    '.rollup.cache',
    '.vite',
    '.esbuild',
    '.swc',
    
    // Hot reload and development servers
    '.hot',
    '.hmr',
    'hot-reload',
    
    // Development databases
    'dev.db',
    'development.db',
    'test.db',
    
    // Development logs
    'dev.log',
    'development.log',
    'debug.log'
  ],
  
  // Production-specific excludes - focuses on build artifacts and logs
  production: [
    // Standard excludes
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.jest-cache',
    '.nyc_output',
    
    // Production logs
    'logs',
    '*.log',
    'error.log',
    'access.log',
    
    // Production data
    'data',
    'uploads',
    'static/uploads',
    
    // Production cache
    'cache',
    '.cache',
    'redis-dump',
    
    // Production monitoring
    'metrics',
    'monitoring',
    'health-checks'
  ],
  
  // Testing-specific excludes - focuses on test artifacts and coverage
  testing: [
    // Standard excludes
    ...analysisExcludes.standard,
    
    // Test artifacts
    'test-results',
    'playwright-report',
    'cypress/videos',
    'cypress/screenshots',
    'test-coverage',
    'e2e-results',
    
    // Test databases
    'test.db',
    'test.sqlite',
    'test-data',
    
    // Test logs
    'test.log',
    'test-results.log',
    'e2e.log'
  ]
};

/**
 * Get exclude patterns based on analysis type and options
 * @param {string} type - Analysis type ('standard', 'extended', 'minimal', 'development', 'production', 'testing')
 * @param {Object} options - Additional options
 * @returns {Array} Array of exclude patterns
 */
function getExcludePatterns(type = 'extended', options = {}) {
  const basePatterns = analysisExcludes[type] || analysisExcludes.extended;
  
  // Add custom patterns if provided
  if (options.additionalExcludes) {
    return [...basePatterns, ...options.additionalExcludes];
  }
  
  // Remove patterns if specified
  if (options.removeExcludes) {
    return basePatterns.filter(pattern => !options.removeExcludes.includes(pattern));
  }
  
  return basePatterns;
}

/**
 * Get exclude patterns for file system operations
 * @param {Object} options - Options for file system excludes
 * @returns {Array} Array of exclude patterns
 */
function getFileSystemExcludes(options = {}) {
  const {
    includeHidden = false,
    includeNodeModules = false,
    includeGit = false,
    includeBuild = false,
    includeCoverage = false
  } = options;
  
  let patterns = [...analysisExcludes.minimal];
  
  if (includeHidden) {
    patterns = patterns.filter(p => !p.startsWith('.'));
  }
  
  if (includeNodeModules) {
    patterns = patterns.filter(p => p !== 'node_modules');
  }
  
  if (includeGit) {
    patterns = patterns.filter(p => !p.startsWith('.git'));
  }
  
  if (includeBuild) {
    patterns = patterns.filter(p => !['dist', 'build'].includes(p));
  }
  
  if (includeCoverage) {
    patterns = patterns.filter(p => p !== 'coverage');
  }
  
  return patterns;
}

/**
 * Validate exclude patterns
 * @param {Array} patterns - Patterns to validate
 * @returns {Object} Validation result
 */
function validateExcludePatterns(patterns) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  if (!Array.isArray(patterns)) {
    result.valid = false;
    result.errors.push('Patterns must be an array');
    return result;
  }
  
  patterns.forEach((pattern, index) => {
    if (typeof pattern !== 'string') {
      result.valid = false;
      result.errors.push(`Pattern at index ${index} must be a string`);
    }
    
    if (pattern.length === 0) {
      result.warnings.push(`Empty pattern at index ${index}`);
    }
    
    if (pattern.includes('**') && !pattern.includes('**/')) {
      result.warnings.push(`Pattern "${pattern}" uses ** but not **/ - consider using **/ for directory matching`);
    }
  });
  
  return result;
}

module.exports = {
  analysisExcludes,
  getExcludePatterns,
  getFileSystemExcludes,
  validateExcludePatterns
}; 