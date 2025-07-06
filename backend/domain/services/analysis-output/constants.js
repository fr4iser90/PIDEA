const path = require('path');

module.exports = {
    PATHS: {
        OUTPUT_BASE: path.join(process.cwd(), '..', 'output'),
        ANALYSIS: 'analysis',
        PROJECTS: 'projects'
    },
    
    FILE_EXTENSIONS: {
        JSON: '.json',
        MARKDOWN: '.md'
    },
    
    ANALYSIS_TYPES: {
        ARCHITECTURE: 'Architecture',
        CODE_QUALITY: 'Code Quality',
        DEPENDENCIES: 'Dependencies',
        PERFORMANCE: 'Performance',
        SECURITY: 'Security',
        REPOSITORY_STRUCTURE: 'Repository Structure',
        TECH_STACK: 'Tech Stack',
        REFACTORING: 'Refactoring',
        GENERATION: 'Generation'
    },
    
    VULNERABILITY_SEVERITIES: {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },
    
    DEFAULT_VALUES: {
        SECURITY_SCORE: 100,
        RISK_LEVEL: 'low',
        ARCHITECTURE_SCORE: 0,
        OVERALL_SCORE: 0
    },
    
    FILE_SIZE_THRESHOLDS: {
        LARGE_FILE_LINES: 500,
        MAGIC_NUMBERS_THRESHOLD: 20
    },
    
    PERFORMANCE_THRESHOLDS: {
        SLOW_TIME_MS: 1000,
        LARGE_SIZE_BYTES: 1000000
    },
    
    MARKDOWN_TEMPLATES: {
        TABLE_HEADER: '| Metric | Value |\n|--------|-------|\n',
        TABLE_HEADER_WITH_STATUS: '| Metric | Value | Status |\n|--------|-------|--------|\n',
        PACKAGE_TABLE_HEADER: '| Package | Path | Dependencies | Dev Dependencies |\n|---------|------|--------------|------------------|\n',
        VULNERABILITY_TABLE_HEADER: '| Package | Version | Severity | Description |\n|---------|---------|----------|-------------|\n',
        SECURITY_ISSUES_TABLE_HEADER: '| File | Line | Severity | Type | Description |\n|------|------|----------|------|-------------|\n',
        SECRETS_TABLE_HEADER: '| File | Line | Type | Description |\n|------|------|------|-------------|\n',
        LARGEST_FILES_TABLE_HEADER: '| File | Size |\n|------|------|\n',
        FILE_TYPES_TABLE_HEADER: '| Type | Count |\n|------|-------|\n'
    }
}; 