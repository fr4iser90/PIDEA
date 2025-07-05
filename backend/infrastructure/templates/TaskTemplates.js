/**
 * TaskTemplates - Comprehensive task template definitions
 */
class TaskTemplates {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Get all available task templates
     * @returns {Object} All task templates
     */
    getAllTemplates() {
        return {
            analysis: this.getAnalysisTemplates(),
            development: this.getDevelopmentTemplates(),
            testing: this.getTestingTemplates(),
            deployment: this.getDeploymentTemplates(),
            maintenance: this.getMaintenanceTemplates(),
            security: this.getSecurityTemplates(),
            performance: this.getPerformanceTemplates(),
            refactoring: this.getRefactoringTemplates(),
            documentation: this.getDocumentationTemplates(),
            automation: this.getAutomationTemplates()
        };
    }

    /**
     * Get analysis task templates
     * @returns {Object} Analysis templates
     */
    getAnalysisTemplates() {
        return {
            projectStructure: {
                name: 'Project Structure Analysis',
                description: 'Analyze project structure and architecture',
                category: 'analysis',
                priority: 'medium',
                estimatedTime: 30,
                steps: [
                    'Scan project directory structure',
                    'Identify main components and modules',
                    'Analyze file organization patterns',
                    'Detect architectural patterns',
                    'Generate structure report'
                ],
                aiPrompts: [
                    'Analyze the project structure and identify architectural patterns',
                    'Suggest improvements for file organization',
                    'Identify potential structural issues'
                ],
                outputs: ['structure-report.json', 'architecture-diagram.md']
            },

            codeQuality: {
                name: 'Code Quality Assessment',
                description: 'Assess code quality and identify issues',
                category: 'analysis',
                priority: 'high',
                estimatedTime: 45,
                steps: [
                    'Run static code analysis tools',
                    'Check code complexity metrics',
                    'Analyze code duplication',
                    'Review coding standards compliance',
                    'Generate quality report'
                ],
                aiPrompts: [
                    'Analyze code quality and identify potential improvements',
                    'Suggest refactoring opportunities',
                    'Identify code smells and anti-patterns'
                ],
                outputs: ['quality-report.json', 'complexity-analysis.md']
            },

            dependencyAnalysis: {
                name: 'Dependency Analysis',
                description: 'Analyze project dependencies and versions',
                category: 'analysis',
                priority: 'medium',
                estimatedTime: 20,
                steps: [
                    'Scan package.json files',
                    'Identify dependency conflicts',
                    'Check for outdated packages',
                    'Analyze security vulnerabilities',
                    'Generate dependency report'
                ],
                aiPrompts: [
                    'Analyze dependencies and suggest optimizations',
                    'Identify potential security issues',
                    'Recommend dependency updates'
                ],
                outputs: ['dependency-report.json', 'security-audit.md']
            },

            performanceAnalysis: {
                name: 'Performance Analysis',
                description: 'Analyze application performance characteristics',
                category: 'analysis',
                priority: 'high',
                estimatedTime: 60,
                steps: [
                    'Run performance profiling tools',
                    'Analyze memory usage patterns',
                    'Check for performance bottlenecks',
                    'Review optimization opportunities',
                    'Generate performance report'
                ],
                aiPrompts: [
                    'Analyze performance characteristics and identify bottlenecks',
                    'Suggest performance optimizations',
                    'Identify memory leaks or inefficiencies'
                ],
                outputs: ['performance-report.json', 'optimization-suggestions.md']
            }
        };
    }

    /**
     * Get development task templates
     * @returns {Object} Development templates
     */
    getDevelopmentTemplates() {
        return {
            featureDevelopment: {
                name: 'Feature Development',
                description: 'Develop new feature with full lifecycle',
                category: 'development',
                priority: 'high',
                estimatedTime: 240,
                steps: [
                    'Analyze feature requirements',
                    'Design feature architecture',
                    'Implement core functionality',
                    'Add unit tests',
                    'Integrate with existing codebase',
                    'Update documentation'
                ],
                aiPrompts: [
                    'Help design the feature architecture',
                    'Suggest implementation approaches',
                    'Generate test cases for the feature'
                ],
                outputs: ['feature-implementation', 'unit-tests', 'documentation']
            },

            bugFix: {
                name: 'Bug Fix',
                description: 'Fix identified bug with proper testing',
                category: 'development',
                priority: 'high',
                estimatedTime: 90,
                steps: [
                    'Reproduce the bug',
                    'Identify root cause',
                    'Design fix strategy',
                    'Implement fix',
                    'Add regression tests',
                    'Verify fix works'
                ],
                aiPrompts: [
                    'Help identify the root cause of the bug',
                    'Suggest fix strategies',
                    'Generate regression test cases'
                ],
                outputs: ['bug-fix', 'regression-tests', 'fix-documentation']
            },

            codeReview: {
                name: 'Code Review',
                description: 'Perform comprehensive code review',
                category: 'development',
                priority: 'medium',
                estimatedTime: 60,
                steps: [
                    'Review code changes',
                    'Check for best practices',
                    'Identify potential issues',
                    'Suggest improvements',
                    'Document review findings'
                ],
                aiPrompts: [
                    'Review the code for best practices and potential issues',
                    'Suggest improvements and optimizations',
                    'Identify security or performance concerns'
                ],
                outputs: ['review-report.md', 'improvement-suggestions.md']
            },

            refactoring: {
                name: 'Code Refactoring',
                description: 'Refactor code for better maintainability',
                category: 'development',
                priority: 'medium',
                estimatedTime: 120,
                steps: [
                    'Identify refactoring targets',
                    'Plan refactoring strategy',
                    'Implement refactoring changes',
                    'Update tests',
                    'Verify functionality',
                    'Update documentation'
                ],
                aiPrompts: [
                    'Suggest refactoring opportunities',
                    'Help plan the refactoring strategy',
                    'Generate refactored code examples'
                ],
                outputs: ['refactored-code', 'updated-tests', 'refactoring-docs']
            }
        };
    }

    /**
     * Get testing task templates
     * @returns {Object} Testing templates
     */
    getTestingTemplates() {
        return {
            unitTestCreation: {
                name: 'Unit Test Creation',
                description: 'Create comprehensive unit tests',
                category: 'testing',
                priority: 'high',
                estimatedTime: 90,
                steps: [
                    'Analyze code to be tested',
                    'Identify test scenarios',
                    'Create test cases',
                    'Implement test functions',
                    'Add test coverage',
                    'Run and validate tests'
                ],
                aiPrompts: [
                    'Generate comprehensive unit test cases',
                    'Suggest edge cases to test',
                    'Help create test data and mocks'
                ],
                outputs: ['unit-tests', 'test-coverage-report', 'test-documentation']
            },

            integrationTestSetup: {
                name: 'Integration Test Setup',
                description: 'Set up integration testing framework',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 120,
                steps: [
                    'Design integration test strategy',
                    'Set up test environment',
                    'Create test database',
                    'Implement integration tests',
                    'Configure CI/CD pipeline',
                    'Document test procedures'
                ],
                aiPrompts: [
                    'Help design integration test strategy',
                    'Suggest test environment setup',
                    'Generate integration test scenarios'
                ],
                outputs: ['integration-tests', 'test-environment', 'ci-config']
            },

            e2eTestCreation: {
                name: 'End-to-End Test Creation',
                description: 'Create end-to-end test scenarios',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 150,
                steps: [
                    'Define user journeys',
                    'Create test scenarios',
                    'Set up E2E testing framework',
                    'Implement test scripts',
                    'Configure test data',
                    'Set up test automation'
                ],
                aiPrompts: [
                    'Help define user journey test scenarios',
                    'Suggest E2E testing frameworks',
                    'Generate test automation scripts'
                ],
                outputs: ['e2e-tests', 'test-automation', 'user-journey-docs']
            },

            performanceTesting: {
                name: 'Performance Testing',
                description: 'Set up and run performance tests',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 180,
                steps: [
                    'Define performance requirements',
                    'Set up performance testing tools',
                    'Create performance test scenarios',
                    'Run load tests',
                    'Analyze performance metrics',
                    'Generate performance report'
                ],
                aiPrompts: [
                    'Help design performance test scenarios',
                    'Suggest performance testing tools',
                    'Analyze performance test results'
                ],
                outputs: ['performance-tests', 'performance-report', 'optimization-suggestions']
            }
        };
    }

    /**
     * Get deployment task templates
     * @returns {Object} Deployment templates
     */
    getDeploymentTemplates() {
        return {
            deploymentSetup: {
                name: 'Deployment Setup',
                description: 'Set up deployment pipeline and infrastructure',
                category: 'deployment',
                priority: 'high',
                estimatedTime: 240,
                steps: [
                    'Design deployment architecture',
                    'Set up CI/CD pipeline',
                    'Configure deployment environments',
                    'Set up monitoring and logging',
                    'Create deployment scripts',
                    'Test deployment process'
                ],
                aiPrompts: [
                    'Help design deployment architecture',
                    'Suggest CI/CD pipeline configuration',
                    'Generate deployment scripts'
                ],
                outputs: ['deployment-pipeline', 'deployment-scripts', 'monitoring-setup']
            },

            environmentConfiguration: {
                name: 'Environment Configuration',
                description: 'Configure deployment environments',
                category: 'deployment',
                priority: 'high',
                estimatedTime: 120,
                steps: [
                    'Set up development environment',
                    'Configure staging environment',
                    'Set up production environment',
                    'Configure environment variables',
                    'Set up secrets management',
                    'Test environment configurations'
                ],
                aiPrompts: [
                    'Help design environment configuration strategy',
                    'Suggest environment variable management',
                    'Generate environment setup scripts'
                ],
                outputs: ['environment-configs', 'secrets-management', 'deployment-docs']
            },

            containerization: {
                name: 'Containerization',
                description: 'Containerize application for deployment',
                category: 'deployment',
                priority: 'medium',
                estimatedTime: 180,
                steps: [
                    'Create Dockerfile',
                    'Optimize container image',
                    'Set up multi-stage builds',
                    'Configure container orchestration',
                    'Set up container monitoring',
                    'Test container deployment'
                ],
                aiPrompts: [
                    'Help create optimized Dockerfile',
                    'Suggest container optimization strategies',
                    'Generate container orchestration configs'
                ],
                outputs: ['Dockerfile', 'docker-compose.yml', 'container-configs']
            },

            cloudDeployment: {
                name: 'Cloud Deployment',
                description: 'Deploy application to cloud platform',
                category: 'deployment',
                priority: 'high',
                estimatedTime: 300,
                steps: [
                    'Choose cloud platform',
                    'Set up cloud infrastructure',
                    'Configure cloud services',
                    'Deploy application',
                    'Set up monitoring and alerts',
                    'Configure auto-scaling'
                ],
                aiPrompts: [
                    'Help choose appropriate cloud platform',
                    'Suggest cloud infrastructure setup',
                    'Generate cloud deployment configs'
                ],
                outputs: ['cloud-infrastructure', 'deployment-configs', 'monitoring-setup']
            }
        };
    }

    /**
     * Get maintenance task templates
     * @returns {Object} Maintenance templates
     */
    getMaintenanceTemplates() {
        return {
            dependencyUpdate: {
                name: 'Dependency Update',
                description: 'Update project dependencies to latest versions',
                category: 'maintenance',
                priority: 'medium',
                estimatedTime: 90,
                steps: [
                    'Check for outdated dependencies',
                    'Review changelogs and breaking changes',
                    'Update dependencies incrementally',
                    'Run tests after each update',
                    'Fix compatibility issues',
                    'Update documentation'
                ],
                aiPrompts: [
                    'Help identify which dependencies to update',
                    'Suggest update strategy to minimize breaking changes',
                    'Help resolve compatibility issues'
                ],
                outputs: ['updated-dependencies', 'compatibility-fixes', 'update-documentation']
            },

            codeCleanup: {
                name: 'Code Cleanup',
                description: 'Clean up unused code and improve codebase',
                category: 'maintenance',
                priority: 'low',
                estimatedTime: 120,
                steps: [
                    'Identify unused code and files',
                    'Remove dead code',
                    'Clean up imports and dependencies',
                    'Optimize code structure',
                    'Update documentation',
                    'Run full test suite'
                ],
                aiPrompts: [
                    'Help identify unused code and dead code',
                    'Suggest code cleanup strategies',
                    'Help optimize code structure'
                ],
                outputs: ['cleaned-codebase', 'removed-files-list', 'optimization-report']
            },

            documentationUpdate: {
                name: 'Documentation Update',
                description: 'Update project documentation',
                category: 'maintenance',
                priority: 'medium',
                estimatedTime: 60,
                steps: [
                    'Review existing documentation',
                    'Identify outdated information',
                    'Update README and guides',
                    'Update API documentation',
                    'Update deployment docs',
                    'Validate documentation accuracy'
                ],
                aiPrompts: [
                    'Help identify documentation gaps',
                    'Suggest documentation improvements',
                    'Help generate updated documentation'
                ],
                outputs: ['updated-documentation', 'documentation-gaps-report']
            },

            performanceOptimization: {
                name: 'Performance Optimization',
                description: 'Optimize application performance',
                category: 'maintenance',
                priority: 'medium',
                estimatedTime: 180,
                steps: [
                    'Run performance profiling',
                    'Identify bottlenecks',
                    'Implement optimizations',
                    'Test performance improvements',
                    'Monitor performance metrics',
                    'Document optimizations'
                ],
                aiPrompts: [
                    'Help identify performance bottlenecks',
                    'Suggest performance optimization strategies',
                    'Help implement performance improvements'
                ],
                outputs: ['performance-optimizations', 'performance-metrics', 'optimization-docs']
            }
        };
    }

    /**
     * Get security task templates
     * @returns {Object} Security templates
     */
    getSecurityTemplates() {
        return {
            securityAudit: {
                name: 'Security Audit',
                description: 'Perform comprehensive security audit',
                category: 'security',
                priority: 'high',
                estimatedTime: 120,
                steps: [
                    'Run security scanning tools',
                    'Review code for vulnerabilities',
                    'Check dependency security',
                    'Audit authentication and authorization',
                    'Review data handling practices',
                    'Generate security report'
                ],
                aiPrompts: [
                    'Help identify potential security vulnerabilities',
                    'Suggest security improvements',
                    'Help analyze security scan results'
                ],
                outputs: ['security-audit-report', 'vulnerability-list', 'security-recommendations']
            },

            vulnerabilityFix: {
                name: 'Vulnerability Fix',
                description: 'Fix identified security vulnerabilities',
                category: 'security',
                priority: 'critical',
                estimatedTime: 90,
                steps: [
                    'Analyze vulnerability details',
                    'Plan fix strategy',
                    'Implement security fixes',
                    'Test fixes thoroughly',
                    'Update affected dependencies',
                    'Document security changes'
                ],
                aiPrompts: [
                    'Help analyze vulnerability details',
                    'Suggest secure fix strategies',
                    'Help implement security fixes'
                ],
                outputs: ['security-fixes', 'updated-dependencies', 'security-documentation']
            },

            securityHardening: {
                name: 'Security Hardening',
                description: 'Harden application security measures',
                category: 'security',
                priority: 'high',
                estimatedTime: 150,
                steps: [
                    'Review current security measures',
                    'Implement additional security layers',
                    'Configure security headers',
                    'Set up rate limiting',
                    'Implement input validation',
                    'Test security measures'
                ],
                aiPrompts: [
                    'Help identify security hardening opportunities',
                    'Suggest additional security measures',
                    'Help implement security configurations'
                ],
                outputs: ['security-configurations', 'hardening-implementation', 'security-tests']
            },

            complianceCheck: {
                name: 'Compliance Check',
                description: 'Check compliance with security standards',
                category: 'security',
                priority: 'medium',
                estimatedTime: 180,
                steps: [
                    'Identify applicable standards',
                    'Review compliance requirements',
                    'Check current compliance status',
                    'Implement compliance measures',
                    'Document compliance evidence',
                    'Generate compliance report'
                ],
                aiPrompts: [
                    'Help identify applicable compliance standards',
                    'Suggest compliance implementation strategies',
                    'Help generate compliance documentation'
                ],
                outputs: ['compliance-report', 'compliance-implementation', 'compliance-documentation']
            }
        };
    }

    /**
     * Get performance task templates
     * @returns {Object} Performance templates
     */
    getPerformanceTemplates() {
        return {
            performanceProfiling: {
                name: 'Performance Profiling',
                description: 'Profile application performance',
                category: 'performance',
                priority: 'medium',
                estimatedTime: 120,
                steps: [
                    'Set up profiling tools',
                    'Run performance profiling',
                    'Analyze profiling data',
                    'Identify performance bottlenecks',
                    'Generate performance report',
                    'Plan optimization strategy'
                ],
                aiPrompts: [
                    'Help analyze performance profiling data',
                    'Suggest performance optimization strategies',
                    'Help identify performance bottlenecks'
                ],
                outputs: ['performance-profile', 'bottleneck-analysis', 'optimization-plan']
            },

            cachingImplementation: {
                name: 'Caching Implementation',
                description: 'Implement caching strategies',
                category: 'performance',
                priority: 'medium',
                estimatedTime: 180,
                steps: [
                    'Analyze caching opportunities',
                    'Design caching strategy',
                    'Implement caching layer',
                    'Configure cache invalidation',
                    'Test caching effectiveness',
                    'Monitor cache performance'
                ],
                aiPrompts: [
                    'Help identify caching opportunities',
                    'Suggest caching strategies',
                    'Help implement caching solutions'
                ],
                outputs: ['caching-implementation', 'cache-configuration', 'performance-metrics']
            },

            databaseOptimization: {
                name: 'Database Optimization',
                description: 'Optimize database performance',
                category: 'performance',
                priority: 'high',
                estimatedTime: 240,
                steps: [
                    'Analyze database queries',
                    'Identify slow queries',
                    'Optimize query performance',
                    'Add database indexes',
                    'Configure database settings',
                    'Test optimization results'
                ],
                aiPrompts: [
                    'Help analyze database query performance',
                    'Suggest query optimization strategies',
                    'Help identify indexing opportunities'
                ],
                outputs: ['optimized-queries', 'database-indexes', 'performance-improvements']
            },

            loadTesting: {
                name: 'Load Testing',
                description: 'Perform load testing and capacity planning',
                category: 'performance',
                priority: 'medium',
                estimatedTime: 300,
                steps: [
                    'Design load test scenarios',
                    'Set up load testing environment',
                    'Run load tests',
                    'Analyze test results',
                    'Identify capacity limits',
                    'Plan scaling strategy'
                ],
                aiPrompts: [
                    'Help design load test scenarios',
                    'Suggest load testing strategies',
                    'Help analyze load test results'
                ],
                outputs: ['load-test-results', 'capacity-analysis', 'scaling-recommendations']
            }
        };
    }

    /**
     * Get refactoring task templates
     * @returns {Object} Refactoring templates
     */
    getRefactoringTemplates() {
        return {
            codeRefactoring: {
                name: 'Code Refactoring',
                description: 'Refactor code for better maintainability',
                category: 'refactoring',
                priority: 'medium',
                estimatedTime: 180,
                steps: [
                    'Identify refactoring targets',
                    'Plan refactoring strategy',
                    'Implement refactoring changes',
                    'Update tests',
                    'Verify functionality',
                    'Update documentation'
                ],
                aiPrompts: [
                    'Help identify refactoring opportunities',
                    'Suggest refactoring strategies',
                    'Help implement refactoring changes'
                ],
                outputs: ['refactored-code', 'updated-tests', 'refactoring-documentation']
            },

            architectureRefactoring: {
                name: 'Architecture Refactoring',
                description: 'Refactor application architecture',
                category: 'refactoring',
                priority: 'high',
                estimatedTime: 480,
                steps: [
                    'Analyze current architecture',
                    'Design new architecture',
                    'Plan migration strategy',
                    'Implement architectural changes',
                    'Migrate existing code',
                    'Test new architecture'
                ],
                aiPrompts: [
                    'Help analyze current architecture',
                    'Suggest architectural improvements',
                    'Help design new architecture'
                ],
                outputs: ['new-architecture', 'migration-plan', 'architectural-documentation']
            },

            dependencyRefactoring: {
                name: 'Dependency Refactoring',
                description: 'Refactor dependency structure',
                category: 'refactoring',
                priority: 'medium',
                estimatedTime: 120,
                steps: [
                    'Analyze current dependencies',
                    'Identify dependency issues',
                    'Plan dependency restructuring',
                    'Update dependency configuration',
                    'Test dependency changes',
                    'Update documentation'
                ],
                aiPrompts: [
                    'Help analyze dependency structure',
                    'Suggest dependency improvements',
                    'Help restructure dependencies'
                ],
                outputs: ['restructured-dependencies', 'dependency-configuration', 'dependency-docs']
            },

            testRefactoring: {
                name: 'Test Refactoring',
                description: 'Refactor test suite for better maintainability',
                category: 'refactoring',
                priority: 'low',
                estimatedTime: 150,
                steps: [
                    'Analyze current test suite',
                    'Identify test issues',
                    'Plan test refactoring',
                    'Refactor test code',
                    'Update test configuration',
                    'Verify test coverage'
                ],
                aiPrompts: [
                    'Help analyze test suite structure',
                    'Suggest test refactoring strategies',
                    'Help refactor test code'
                ],
                outputs: ['refactored-tests', 'test-configuration', 'test-documentation']
            }
        };
    }

    /**
     * Get documentation task templates
     * @returns {Object} Documentation templates
     */
    getDocumentationTemplates() {
        return {
            apiDocumentation: {
                name: 'API Documentation',
                description: 'Create comprehensive API documentation',
                category: 'documentation',
                priority: 'medium',
                estimatedTime: 120,
                steps: [
                    'Analyze API endpoints',
                    'Document API specifications',
                    'Create usage examples',
                    'Generate API documentation',
                    'Add interactive examples',
                    'Publish documentation'
                ],
                aiPrompts: [
                    'Help document API endpoints',
                    'Suggest API documentation structure',
                    'Help generate usage examples'
                ],
                outputs: ['api-documentation', 'usage-examples', 'interactive-docs']
            },

            userDocumentation: {
                name: 'User Documentation',
                description: 'Create user guides and tutorials',
                category: 'documentation',
                priority: 'medium',
                estimatedTime: 180,
                steps: [
                    'Identify user needs',
                    'Create user personas',
                    'Design documentation structure',
                    'Write user guides',
                    'Create tutorials',
                    'Add screenshots and examples'
                ],
                aiPrompts: [
                    'Help identify user documentation needs',
                    'Suggest documentation structure',
                    'Help create user guides and tutorials'
                ],
                outputs: ['user-guides', 'tutorials', 'documentation-structure']
            },

            technicalDocumentation: {
                name: 'Technical Documentation',
                description: 'Create technical documentation for developers',
                category: 'documentation',
                priority: 'medium',
                estimatedTime: 150,
                steps: [
                    'Analyze technical requirements',
                    'Document system architecture',
                    'Create development guides',
                    'Document deployment procedures',
                    'Add troubleshooting guides',
                    'Create maintenance documentation'
                ],
                aiPrompts: [
                    'Help document system architecture',
                    'Suggest technical documentation structure',
                    'Help create development guides'
                ],
                outputs: ['technical-docs', 'architecture-docs', 'development-guides']
            },

            codeDocumentation: {
                name: 'Code Documentation',
                description: 'Document code with comments and JSDoc',
                category: 'documentation',
                priority: 'low',
                estimatedTime: 90,
                steps: [
                    'Review code for documentation gaps',
                    'Add inline comments',
                    'Create JSDoc documentation',
                    'Document complex algorithms',
                    'Add code examples',
                    'Generate documentation'
                ],
                aiPrompts: [
                    'Help identify documentation gaps in code',
                    'Suggest code documentation improvements',
                    'Help generate JSDoc documentation'
                ],
                outputs: ['code-documentation', 'jsdoc-docs', 'code-examples']
            }
        };
    }

    /**
     * Get automation task templates
     * @returns {Object} Automation templates
     */
    getAutomationTemplates() {
        return {
            ciCdSetup: {
                name: 'CI/CD Setup',
                description: 'Set up continuous integration and deployment',
                category: 'automation',
                priority: 'high',
                estimatedTime: 240,
                steps: [
                    'Choose CI/CD platform',
                    'Configure build pipeline',
                    'Set up automated testing',
                    'Configure deployment automation',
                    'Set up monitoring and alerts',
                    'Test automation pipeline'
                ],
                aiPrompts: [
                    'Help choose appropriate CI/CD platform',
                    'Suggest CI/CD pipeline configuration',
                    'Help configure automation workflows'
                ],
                outputs: ['ci-cd-pipeline', 'automation-configs', 'deployment-automation']
            },

            testAutomation: {
                name: 'Test Automation',
                description: 'Automate testing processes',
                category: 'automation',
                priority: 'medium',
                estimatedTime: 180,
                steps: [
                    'Design test automation strategy',
                    'Set up test automation framework',
                    'Create automated test scripts',
                    'Configure test execution',
                    'Set up test reporting',
                    'Integrate with CI/CD'
                ],
                aiPrompts: [
                    'Help design test automation strategy',
                    'Suggest test automation frameworks',
                    'Help create automated test scripts'
                ],
                outputs: ['test-automation', 'automated-scripts', 'test-reports']
            },

            deploymentAutomation: {
                name: 'Deployment Automation',
                description: 'Automate deployment processes',
                category: 'automation',
                priority: 'high',
                estimatedTime: 300,
                steps: [
                    'Design deployment automation',
                    'Create deployment scripts',
                    'Configure environment management',
                    'Set up rollback procedures',
                    'Configure monitoring and alerts',
                    'Test deployment automation'
                ],
                aiPrompts: [
                    'Help design deployment automation strategy',
                    'Suggest deployment automation tools',
                    'Help create deployment scripts'
                ],
                outputs: ['deployment-automation', 'deployment-scripts', 'rollback-procedures']
            },

            monitoringAutomation: {
                name: 'Monitoring Automation',
                description: 'Set up automated monitoring and alerting',
                category: 'automation',
                priority: 'medium',
                estimatedTime: 150,
                steps: [
                    'Design monitoring strategy',
                    'Set up monitoring tools',
                    'Configure automated alerts',
                    'Set up log aggregation',
                    'Configure performance monitoring',
                    'Test monitoring system'
                ],
                aiPrompts: [
                    'Help design monitoring strategy',
                    'Suggest monitoring tools and configurations',
                    'Help set up automated alerts'
                ],
                outputs: ['monitoring-setup', 'alert-configurations', 'monitoring-dashboard']
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
     * Get template recommendations based on project type
     * @param {string} projectType - Project type
     * @returns {Array} Recommended templates
     */
    getRecommendationsByProjectType(projectType) {
        const recommendations = {
            'react-app': [
                'featureDevelopment',
                'unitTestCreation',
                'codeReview',
                'performanceAnalysis'
            ],
            'vue-app': [
                'featureDevelopment',
                'unitTestCreation',
                'codeReview',
                'performanceAnalysis'
            ],
            'express-app': [
                'apiDocumentation',
                'securityAudit',
                'performanceOptimization',
                'deploymentSetup'
            ],
            'nest-app': [
                'apiDocumentation',
                'securityAudit',
                'performanceOptimization',
                'deploymentSetup'
            ],
            'typescript-library': [
                'codeDocumentation',
                'unitTestCreation',
                'dependencyUpdate',
                'codeCleanup'
            ]
        };

        return recommendations[projectType] || [];
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
            this.eventBus.publish('template.created', {
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

        if (!template.steps || !Array.isArray(template.steps) || template.steps.length === 0) {
            errors.push('Template must have at least one step');
        }

        if (!template.priority) {
            errors.push('Template priority is required');
        }

        if (!template.estimatedTime) {
            errors.push('Template estimated time is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = TaskTemplates; 