/**
 * AIPrompts - Comprehensive AI prompt templates for different scenarios
 */
class AIPrompts {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Get all available AI prompt templates
     * @returns {Object} All AI prompt templates
     */
    getAllPrompts() {
        return {
            analysis: this.getAnalysisPrompts(),
            development: this.getDevelopmentPrompts(),
            testing: this.getTestingPrompts(),
            optimization: this.getOptimizationPrompts(),
            security: this.getSecurityPrompts(),
            documentation: this.getDocumentationPrompts(),
            refactoring: this.getRefactoringPrompts(),
            debugging: this.getDebuggingPrompts(),
            architecture: this.getArchitecturePrompts(),
            deployment: this.getDeploymentPrompts()
        };
    }

    /**
     * Get analysis AI prompts
     * @returns {Object} Analysis prompts
     */
    getAnalysisPrompts() {
        return {
            projectAnalysis: {
                name: 'Project Analysis',
                description: 'Analyze project structure and architecture',
                category: 'analysis',
                prompt: `Analyze the following project structure and provide insights:

Project Context:
- Project Type: {{PROJECT_TYPE}}
- Technology Stack: {{TECH_STACK}}
- Project Size: {{PROJECT_SIZE}}

Please analyze:
1. **Architecture Patterns**: Identify architectural patterns used (MVC, DDD, Clean Architecture, etc.)
2. **Code Organization**: Evaluate file structure and organization
3. **Dependencies**: Analyze dependency management and potential issues
4. **Best Practices**: Identify adherence to best practices
5. **Technical Debt**: Identify areas of technical debt
6. **Scalability**: Assess scalability considerations
7. **Maintainability**: Evaluate code maintainability
8. **Performance**: Identify potential performance issues

Provide specific recommendations for improvements and prioritize them by impact and effort.`,
                variables: {
                    PROJECT_TYPE: 'web-application',
                    TECH_STACK: 'Node.js, React, Express',
                    PROJECT_SIZE: 'medium'
                }
            },

            codeQualityAnalysis: {
                name: 'Code Quality Analysis',
                description: 'Analyze code quality and identify issues',
                category: 'analysis',
                prompt: `Perform a comprehensive code quality analysis:

Code Context:
- Language: {{LANGUAGE}}
- Framework: {{FRAMEWORK}}
- File Path: {{FILE_PATH}}

Please analyze:
1. **Code Complexity**: Assess cyclomatic complexity and nesting levels
2. **Code Duplication**: Identify duplicate code patterns
3. **Naming Conventions**: Evaluate variable, function, and class naming
4. **Error Handling**: Assess error handling patterns
5. **Documentation**: Evaluate code documentation quality
6. **Testing Coverage**: Assess test coverage and quality
7. **Performance**: Identify performance bottlenecks
8. **Security**: Identify potential security issues
9. **Maintainability**: Assess code maintainability
10. **Readability**: Evaluate code readability

Provide specific recommendations with code examples for improvements.`,
                variables: {
                    LANGUAGE: 'JavaScript',
                    FRAMEWORK: 'React',
                    FILE_PATH: 'src/components/'
                }
            },

            dependencyAnalysis: {
                name: 'Dependency Analysis',
                description: 'Analyze project dependencies',
                category: 'analysis',
                prompt: `Analyze the project dependencies and provide insights:

Dependency Context:
- Package Manager: {{PACKAGE_MANAGER}}
- Total Dependencies: {{TOTAL_DEPS}}
- Development Dependencies: {{DEV_DEPS}}

Please analyze:
1. **Dependency Health**: Check for outdated, vulnerable, or deprecated packages
2. **Dependency Conflicts**: Identify version conflicts or compatibility issues
3. **Bundle Size Impact**: Assess impact on application bundle size
4. **Security Vulnerabilities**: Identify known security issues
5. **Maintenance Status**: Check maintenance status of dependencies
6. **Alternative Packages**: Suggest better alternatives if applicable
7. **Unused Dependencies**: Identify potentially unused dependencies
8. **License Compliance**: Check license compatibility
9. **Performance Impact**: Assess performance impact of dependencies
10. **Update Strategy**: Provide recommendations for dependency updates

Prioritize recommendations by security risk, performance impact, and maintenance effort.`,
                variables: {
                    PACKAGE_MANAGER: 'npm',
                    TOTAL_DEPS: '50',
                    DEV_DEPS: '20'
                }
            },

            performanceAnalysis: {
                name: 'Performance Analysis',
                description: 'Analyze application performance',
                category: 'analysis',
                prompt: `Analyze the application performance and provide optimization recommendations:

Performance Context:
- Application Type: {{APP_TYPE}}
- Performance Metrics: {{METRICS}}
- Current Issues: {{ISSUES}}

Please analyze:
1. **Load Time**: Identify factors affecting initial load time
2. **Runtime Performance**: Assess runtime performance bottlenecks
3. **Memory Usage**: Analyze memory consumption patterns
4. **Network Requests**: Optimize API calls and data fetching
5. **Caching Strategy**: Evaluate caching implementation
6. **Database Performance**: Assess database query optimization
7. **Frontend Optimization**: Identify frontend performance issues
8. **Backend Optimization**: Assess backend performance
9. **Resource Loading**: Optimize resource loading strategies
10. **Monitoring**: Suggest performance monitoring approaches

Provide specific, actionable recommendations with implementation details.`,
                variables: {
                    APP_TYPE: 'SPA',
                    METRICS: 'load time, memory usage, API response time',
                    ISSUES: 'slow initial load, high memory usage'
                }
            }
        };
    }

    /**
     * Get development AI prompts
     * @returns {Object} Development prompts
     */
    getDevelopmentPrompts() {
        return {
            featureImplementation: {
                name: 'Feature Implementation',
                description: 'Help implement new features',
                category: 'development',
                prompt: `Help implement a new feature with best practices:

Feature Context:
- Feature Name: {{FEATURE_NAME}}
- Description: {{FEATURE_DESCRIPTION}}
- Technology Stack: {{TECH_STACK}}
- Requirements: {{REQUIREMENTS}}

Please provide:
1. **Architecture Design**: Suggest optimal architecture for the feature
2. **Implementation Plan**: Break down implementation into steps
3. **Code Structure**: Provide recommended file structure
4. **API Design**: Design APIs if needed
5. **Database Schema**: Suggest database changes if required
6. **Component Design**: Design React/Vue components if applicable
7. **State Management**: Suggest state management approach
8. **Error Handling**: Design error handling strategy
9. **Testing Strategy**: Provide testing approach
10. **Documentation**: Suggest documentation requirements

Include code examples and best practices for the technology stack.`,
                variables: {
                    FEATURE_NAME: 'User Authentication',
                    FEATURE_DESCRIPTION: 'Implement secure user authentication system',
                    TECH_STACK: 'Node.js, Express, React, JWT',
                    REQUIREMENTS: 'Login, registration, password reset, session management'
                }
            },

            codeReview: {
                name: 'Code Review',
                description: 'Perform comprehensive code review',
                category: 'development',
                prompt: `Perform a comprehensive code review:

Code Context:
- Language: {{LANGUAGE}}
- Framework: {{FRAMEWORK}}
- Code Purpose: {{PURPOSE}}

Please review:
1. **Code Quality**: Assess overall code quality and readability
2. **Best Practices**: Check adherence to language and framework best practices
3. **Performance**: Identify performance issues and optimization opportunities
4. **Security**: Identify potential security vulnerabilities
5. **Error Handling**: Assess error handling and edge cases
6. **Testing**: Evaluate test coverage and quality
7. **Documentation**: Check code documentation
8. **Maintainability**: Assess code maintainability
9. **Scalability**: Consider scalability implications
10. **Accessibility**: Check accessibility considerations if applicable

Provide specific feedback with suggestions for improvements.`,
                variables: {
                    LANGUAGE: 'JavaScript',
                    FRAMEWORK: 'React',
                    PURPOSE: 'User authentication component'
                }
            },

            bugFix: {
                name: 'Bug Fix',
                description: 'Help fix bugs and issues',
                category: 'development',
                prompt: `Help fix the following bug:

Bug Context:
- Bug Description: {{BUG_DESCRIPTION}}
- Error Message: {{ERROR_MESSAGE}}
- Environment: {{ENVIRONMENT}}
- Steps to Reproduce: {{STEPS}}

Please provide:
1. **Root Cause Analysis**: Identify the root cause of the bug
2. **Fix Strategy**: Suggest the best approach to fix the issue
3. **Code Fix**: Provide the corrected code
4. **Testing**: Suggest tests to verify the fix
5. **Prevention**: Suggest ways to prevent similar bugs
6. **Impact Assessment**: Assess the impact of the fix
7. **Alternative Solutions**: Consider alternative approaches
8. **Documentation**: Update relevant documentation
9. **Code Review**: Ensure the fix follows best practices
10. **Deployment**: Consider deployment implications

Include code examples and explain the reasoning behind the fix.`,
                variables: {
                    BUG_DESCRIPTION: 'User authentication fails intermittently',
                    ERROR_MESSAGE: 'JWT authentication validation error',
                    ENVIRONMENT: 'Production',
                    STEPS: 'Login with valid credentials, authentication expires after 1 hour'
                }
            },

            optimization: {
                name: 'Code Optimization',
                description: 'Optimize code for better performance',
                category: 'development',
                prompt: `Help optimize the following code for better performance:

Optimization Context:
- Code Purpose: {{PURPOSE}}
- Performance Issues: {{ISSUES}}
- Current Implementation: {{IMPLEMENTATION}}

Please provide:
1. **Performance Analysis**: Identify performance bottlenecks
2. **Optimization Strategies**: Suggest optimization approaches
3. **Algorithm Improvements**: Optimize algorithms and data structures
4. **Memory Optimization**: Reduce memory usage
5. **Caching Strategy**: Implement appropriate caching
6. **Lazy Loading**: Implement lazy loading where applicable
7. **Code Splitting**: Optimize bundle size
8. **Database Optimization**: Optimize database queries
9. **Network Optimization**: Reduce network requests
10. **Monitoring**: Implement performance monitoring

Provide optimized code examples with performance benchmarks.`,
                variables: {
                    PURPOSE: 'Data processing component',
                    ISSUES: 'Slow rendering, high memory usage',
                    IMPLEMENTATION: 'Current implementation details'
                }
            }
        };
    }

    /**
     * Get testing AI prompts
     * @returns {Object} Testing prompts
     */
    getTestingPrompts() {
        return {
            testGeneration: {
                name: 'Test Generation',
                description: 'Generate comprehensive tests',
                category: 'testing',
                prompt: `Generate comprehensive tests for the following code:

Test Context:
- Code Purpose: {{PURPOSE}}
- Technology Stack: {{TECH_STACK}}
- Testing Framework: {{TESTING_FRAMEWORK}}

Please generate:
1. **Unit Tests**: Comprehensive unit tests for all functions
2. **Integration Tests**: Integration tests for component interactions
3. **Edge Cases**: Tests for edge cases and error conditions
4. **Mock Data**: Appropriate mock data and fixtures
5. **Test Utilities**: Helper functions for testing
6. **Test Configuration**: Test setup and configuration
7. **Coverage Goals**: Achieve high test coverage
8. **Performance Tests**: Performance testing if applicable
9. **Accessibility Tests**: Accessibility testing if applicable
10. **Documentation**: Test documentation and examples

Include test examples with proper assertions and error handling.`,
                variables: {
                    PURPOSE: 'User authentication service',
                    TECH_STACK: 'Node.js, Express, JWT',
                    TESTING_FRAMEWORK: 'Jest'
                }
            },

            testStrategy: {
                name: 'Test Strategy',
                description: 'Design comprehensive testing strategy',
                category: 'testing',
                prompt: `Design a comprehensive testing strategy for the project:

Project Context:
- Project Type: {{PROJECT_TYPE}}
- Technology Stack: {{TECH_STACK}}
- Team Size: {{TEAM_SIZE}}

Please design:
1. **Testing Pyramid**: Define unit, integration, and E2E test distribution
2. **Test Types**: Specify different types of tests needed
3. **Testing Tools**: Recommend testing frameworks and tools
4. **Test Environment**: Design test environment setup
5. **CI/CD Integration**: Integrate testing with CI/CD pipeline
6. **Test Data Management**: Strategy for test data
7. **Performance Testing**: Performance testing approach
8. **Security Testing**: Security testing strategy
9. **Test Maintenance**: Strategy for maintaining tests
10. **Quality Metrics**: Define testing quality metrics

Provide a detailed testing strategy with implementation guidelines.`,
                variables: {
                    PROJECT_TYPE: 'Full-stack web application',
                    TECH_STACK: 'React, Node.js, PostgreSQL',
                    TEAM_SIZE: '5 developers'
                }
            },

            testOptimization: {
                name: 'Test Optimization',
                description: 'Optimize existing tests',
                category: 'testing',
                prompt: `Optimize the existing test suite:

Test Context:
- Current Coverage: {{COVERAGE}}
- Test Issues: {{ISSUES}}
- Performance Problems: {{PERFORMANCE}}

Please optimize:
1. **Test Speed**: Improve test execution speed
2. **Test Reliability**: Make tests more reliable and flake-free
3. **Test Maintenance**: Reduce test maintenance overhead
4. **Test Coverage**: Improve test coverage strategically
5. **Test Organization**: Better organize test structure
6. **Mock Strategy**: Optimize mocking approach
7. **Test Data**: Improve test data management
8. **Parallel Execution**: Enable parallel test execution
9. **Test Reporting**: Improve test reporting and feedback
10. **Test Documentation**: Better document test cases

Provide specific optimization recommendations with examples.`,
                variables: {
                    COVERAGE: '75%',
                    ISSUES: 'Flaky tests, slow execution',
                    PERFORMANCE: 'Tests take 10 minutes to run'
                }
            }
        };
    }

    /**
     * Get optimization AI prompts
     * @returns {Object} Optimization prompts
     */
    getOptimizationPrompts() {
        return {
            performanceOptimization: {
                name: 'Performance Optimization',
                description: 'Optimize application performance',
                category: 'optimization',
                prompt: `Optimize the application performance:

Performance Context:
- Application Type: {{APP_TYPE}}
- Current Issues: {{ISSUES}}
- Performance Goals: {{GOALS}}

Please optimize:
1. **Frontend Performance**: Optimize React/Vue rendering and bundle size
2. **Backend Performance**: Optimize API endpoints and database queries
3. **Database Optimization**: Optimize database schema and queries
4. **Caching Strategy**: Implement effective caching
5. **Network Optimization**: Reduce network requests and payload size
6. **Resource Loading**: Optimize resource loading and delivery
7. **Memory Management**: Optimize memory usage
8. **Code Splitting**: Implement effective code splitting
9. **Lazy Loading**: Implement lazy loading strategies
10. **Monitoring**: Set up performance monitoring

Provide specific optimization techniques with implementation details.`,
                variables: {
                    APP_TYPE: 'Single Page Application',
                    ISSUES: 'Slow initial load, high memory usage',
                    GOALS: 'Load time < 2s, memory usage < 100MB'
                }
            },

            bundleOptimization: {
                name: 'Bundle Optimization',
                description: 'Optimize application bundle size',
                category: 'optimization',
                prompt: `Optimize the application bundle size:

Bundle Context:
- Current Bundle Size: {{BUNDLE_SIZE}}
- Build Tool: {{BUILD_TOOL}}
- Dependencies: {{DEPENDENCIES}}

Please optimize:
1. **Tree Shaking**: Implement effective tree shaking
2. **Code Splitting**: Split code into smaller chunks
3. **Lazy Loading**: Implement lazy loading for routes and components
4. **Dependency Analysis**: Analyze and optimize dependencies
5. **Asset Optimization**: Optimize images, fonts, and other assets
6. **Compression**: Implement effective compression
7. **CDN Strategy**: Use CDN for static assets
8. **Bundle Analysis**: Analyze bundle composition
9. **Minification**: Optimize minification process
10. **Caching Strategy**: Implement effective caching

Provide specific techniques with configuration examples.`,
                variables: {
                    BUNDLE_SIZE: '2.5MB',
                    BUILD_TOOL: 'Webpack',
                    DEPENDENCIES: 'React, Lodash, Moment.js'
                }
            },

            databaseOptimization: {
                name: 'Database Optimization',
                description: 'Optimize database performance',
                category: 'optimization',
                prompt: `Optimize the database performance:

Database Context:
- Database Type: {{DB_TYPE}}
- Current Issues: {{ISSUES}}
- Data Volume: {{DATA_VOLUME}}

Please optimize:
1. **Query Optimization**: Optimize slow queries
2. **Indexing Strategy**: Design effective indexing
3. **Schema Optimization**: Optimize database schema
4. **Connection Pooling**: Implement connection pooling
5. **Caching Strategy**: Implement database caching
6. **Partitioning**: Implement data partitioning if needed
7. **Archiving Strategy**: Implement data archiving
8. **Monitoring**: Set up database monitoring
9. **Backup Strategy**: Optimize backup and recovery
10. **Scaling Strategy**: Plan for database scaling

Provide specific optimization techniques with SQL examples.`,
                variables: {
                    DB_TYPE: 'PostgreSQL',
                    ISSUES: 'Slow queries, high connection usage',
                    DATA_VOLUME: '10GB with 1M records'
                }
            }
        };
    }

    /**
     * Get security AI prompts
     * @returns {Object} Security prompts
     */
    getSecurityPrompts() {
        return {
            securityAudit: {
                name: 'Security Audit',
                description: 'Perform security audit',
                category: 'security',
                prompt: `Perform a comprehensive security audit:

Security Context:
- Application Type: {{APP_TYPE}}
- Technology Stack: {{TECH_STACK}}
- Security Concerns: {{CONCERNS}}

Please audit:
1. **Authentication**: Review authentication mechanisms
2. **Authorization**: Assess authorization controls
3. **Input Validation**: Check input validation and sanitization
4. **SQL Injection**: Identify SQL injection vulnerabilities
5. **XSS Protection**: Check for XSS vulnerabilities
6. **CSRF Protection**: Assess CSRF protection
7. **Data Encryption**: Review data encryption practices
8. **API Security**: Assess API security measures
9. **Dependency Security**: Check for vulnerable dependencies
10. **Security Headers**: Review security headers

Provide specific security recommendations with implementation details.`,
                variables: {
                    APP_TYPE: 'Web application with user data',
                    TECH_STACK: 'Node.js, Express, React, PostgreSQL',
                    CONCERNS: 'User authentication, data privacy'
                }
            },

            vulnerabilityAssessment: {
                name: 'Vulnerability Assessment',
                description: 'Assess security vulnerabilities',
                category: 'security',
                prompt: `Assess security vulnerabilities in the codebase:

Vulnerability Context:
- Code Language: {{LANGUAGE}}
- Framework: {{FRAMEWORK}}
- Security Focus: {{FOCUS}}

Please assess:
1. **Code Vulnerabilities**: Identify code-level security issues
2. **Dependency Vulnerabilities**: Check for vulnerable dependencies
3. **Configuration Issues**: Identify security misconfigurations
4. **Authentication Weaknesses**: Assess authentication security
5. **Authorization Flaws**: Identify authorization bypasses
6. **Data Exposure**: Check for sensitive data exposure
7. **Injection Vulnerabilities**: Identify injection attack vectors
8. **Session Management**: Assess session security
9. **Error Handling**: Check for information disclosure
10. **Security Best Practices**: Assess adherence to security best practices

Provide specific vulnerability details with remediation steps.`,
                variables: {
                    LANGUAGE: 'JavaScript',
                    FRAMEWORK: 'Express.js',
                    FOCUS: 'API security and data protection'
                }
            },

            securityImplementation: {
                name: 'Security Implementation',
                description: 'Implement security measures',
                category: 'security',
                prompt: `Implement security measures for the application:

Security Context:
- Security Requirements: {{REQUIREMENTS}}
- Technology Stack: {{TECH_STACK}}
- Compliance Needs: {{COMPLIANCE}}

Please implement:
1. **Authentication System**: Implement secure authentication
2. **Authorization Framework**: Implement role-based access control
3. **Input Validation**: Implement comprehensive input validation
4. **Output Encoding**: Implement output encoding and sanitization
5. **Session Management**: Implement secure session handling
6. **Data Encryption**: Implement data encryption at rest and in transit
7. **Security Headers**: Implement security headers
8. **Rate Limiting**: Implement rate limiting and throttling
9. **Logging and Monitoring**: Implement security logging
10. **Security Testing**: Implement security testing framework

Provide implementation details with code examples and configuration.`,
                variables: {
                    REQUIREMENTS: 'Secure user authentication, data protection',
                    TECH_STACK: 'Node.js, Express, JWT, bcrypt',
                    COMPLIANCE: 'GDPR, SOC 2'
                }
            }
        };
    }

    /**
     * Get documentation AI prompts
     * @returns {Object} Documentation prompts
     */
    getDocumentationPrompts() {
        return {
            apiDocumentation: {
                name: 'API Documentation',
                description: 'Generate API documentation',
                category: 'documentation',
                prompt: `Generate comprehensive API documentation:

API Context:
- API Type: {{API_TYPE}}
- Framework: {{FRAMEWORK}}
- Endpoints: {{ENDPOINTS}}

Please document:
1. **API Overview**: Provide API overview and purpose
2. **Authentication**: Document authentication methods
3. **Endpoints**: Document all API endpoints with examples
4. **Request/Response**: Document request and response formats
5. **Error Handling**: Document error codes and messages
6. **Rate Limiting**: Document rate limiting policies
7. **Examples**: Provide practical usage examples
8. **SDK/Client**: Document client libraries if available
9. **Changelog**: Maintain API versioning and changes
10. **Testing**: Provide testing examples and tools

Generate documentation in OpenAPI/Swagger format with examples.`,
                variables: {
                    API_TYPE: 'REST API',
                    FRAMEWORK: 'Express.js',
                    ENDPOINTS: 'User management, authentication, data operations'
                }
            },

            codeDocumentation: {
                name: 'Code Documentation',
                description: 'Generate code documentation',
                category: 'documentation',
                prompt: `Generate comprehensive code documentation:

Code Context:
- Language: {{LANGUAGE}}
- Framework: {{FRAMEWORK}}
- Code Purpose: {{PURPOSE}}

Please document:
1. **Function Documentation**: Document all functions with JSDoc
2. **Class Documentation**: Document classes and methods
3. **Module Documentation**: Document module purpose and exports
4. **Configuration**: Document configuration options
5. **Examples**: Provide usage examples
6. **Architecture**: Document code architecture and patterns
7. **Dependencies**: Document external dependencies
8. **Setup Instructions**: Document setup and installation
9. **Troubleshooting**: Document common issues and solutions
10. **Contributing**: Document contribution guidelines

Generate documentation with proper formatting and examples.`,
                variables: {
                    LANGUAGE: 'JavaScript',
                    FRAMEWORK: 'React',
                    PURPOSE: 'User authentication component library'
                }
            },

            userDocumentation: {
                name: 'User Documentation',
                description: 'Generate user documentation',
                category: 'documentation',
                prompt: `Generate user documentation:

Documentation Context:
- Application Type: {{APP_TYPE}}
- User Audience: {{AUDIENCE}}
- Features: {{FEATURES}}

Please create:
1. **Getting Started**: Quick start guide for new users
2. **User Guide**: Comprehensive user manual
3. **Feature Documentation**: Document all features
4. **Tutorials**: Step-by-step tutorials for common tasks
5. **FAQ**: Frequently asked questions and answers
6. **Troubleshooting**: Common issues and solutions
7. **Best Practices**: User best practices and tips
8. **Screenshots**: Include relevant screenshots
9. **Video Tutorials**: Suggest video tutorial topics
10. **Feedback**: Include feedback and support information

Create user-friendly documentation with clear instructions and examples.`,
                variables: {
                    APP_TYPE: 'Project management application',
                    AUDIENCE: 'Project managers and team members',
                    FEATURES: 'Task management, team collaboration, reporting'
                }
            }
        };
    }

    /**
     * Get refactoring AI prompts
     * @returns {Object} Refactoring prompts
     */
    getRefactoringPrompts() {
        return {
            codeRefactoring: {
                name: 'Code Refactoring',
                description: 'Refactor code for better maintainability',
                category: 'refactoring',
                prompt: `Refactor the following code for better maintainability:

Refactoring Context:
- Code Purpose: {{PURPOSE}}
- Current Issues: {{ISSUES}}
- Refactoring Goals: {{GOALS}}

Please refactor:
1. **Code Structure**: Improve code organization and structure
2. **Function Extraction**: Extract reusable functions
3. **Class Design**: Improve class design and inheritance
4. **Naming**: Improve variable, function, and class naming
5. **Complexity Reduction**: Reduce code complexity
6. **Duplication Removal**: Remove code duplication
7. **Error Handling**: Improve error handling patterns
8. **Performance**: Optimize performance where possible
9. **Readability**: Improve code readability
10. **Testing**: Ensure refactored code is testable

Provide refactored code with explanations of changes.`,
                variables: {
                    PURPOSE: 'Data processing utility',
                    ISSUES: 'High complexity, code duplication',
                    GOALS: 'Improve maintainability and readability'
                }
            },

            architectureRefactoring: {
                name: 'Architecture Refactoring',
                description: 'Refactor application architecture',
                category: 'refactoring',
                prompt: `Refactor the application architecture:

Architecture Context:
- Current Architecture: {{CURRENT_ARCH}}
- Issues: {{ISSUES}}
- Goals: {{GOALS}}

Please refactor:
1. **Architecture Patterns**: Implement appropriate architectural patterns
2. **Module Separation**: Improve module separation and boundaries
3. **Dependency Management**: Improve dependency management
4. **Data Flow**: Optimize data flow and state management
5. **API Design**: Improve API design and structure
6. **Database Design**: Optimize database design
7. **Scalability**: Improve scalability considerations
8. **Maintainability**: Enhance maintainability
9. **Testing**: Improve testability
10. **Documentation**: Update architecture documentation

Provide architectural recommendations with implementation guidance.`,
                variables: {
                    CURRENT_ARCH: 'Monolithic application',
                    ISSUES: 'Tight coupling, difficult to scale',
                    GOALS: 'Microservices architecture, better scalability'
                }
            }
        };
    }

    /**
     * Get debugging AI prompts
     * @returns {Object} Debugging prompts
     */
    getDebuggingPrompts() {
        return {
            errorDebugging: {
                name: 'Error Debugging',
                description: 'Help debug errors and issues',
                category: 'debugging',
                prompt: `Help debug the following error:

Error Context:
- Error Message: {{ERROR_MESSAGE}}
- Error Type: {{ERROR_TYPE}}
- Environment: {{ENVIRONMENT}}
- Code Context: {{CODE_CONTEXT}}

Please help:
1. **Error Analysis**: Analyze the error and identify root cause
2. **Debugging Steps**: Provide step-by-step debugging approach
3. **Code Investigation**: Suggest code investigation strategies
4. **Logging**: Recommend logging and debugging tools
5. **Testing**: Suggest testing approaches to reproduce the issue
6. **Fix Strategy**: Provide fix strategy and implementation
7. **Prevention**: Suggest ways to prevent similar errors
8. **Monitoring**: Recommend monitoring and alerting
9. **Documentation**: Document the debugging process
10. **Learning**: Extract lessons learned from the debugging

Provide comprehensive debugging guidance with examples.`,
                variables: {
                    ERROR_MESSAGE: 'JWT authentication validation failed',
                    ERROR_TYPE: 'Authentication Error',
                    ENVIRONMENT: 'Production',
                    CODE_CONTEXT: 'User authentication middleware'
                }
            },

            performanceDebugging: {
                name: 'Performance Debugging',
                description: 'Debug performance issues',
                category: 'debugging',
                prompt: `Help debug performance issues:

Performance Context:
- Performance Issue: {{ISSUE}}
- Symptoms: {{SYMPTOMS}}
- Environment: {{ENVIRONMENT}}

Please help:
1. **Performance Profiling**: Suggest profiling tools and techniques
2. **Bottleneck Identification**: Help identify performance bottlenecks
3. **Memory Analysis**: Analyze memory usage and leaks
4. **Network Analysis**: Analyze network performance issues
5. **Database Analysis**: Analyze database performance
6. **Frontend Analysis**: Analyze frontend performance issues
7. **Backend Analysis**: Analyze backend performance issues
8. **Monitoring Setup**: Set up performance monitoring
9. **Optimization**: Suggest performance optimizations
10. **Testing**: Implement performance testing

Provide comprehensive performance debugging guidance.`,
                variables: {
                    ISSUE: 'Slow application response time',
                    SYMPTOMS: 'High CPU usage, slow page loads',
                    ENVIRONMENT: 'Production with high traffic'
                }
            }
        };
    }

    /**
     * Get architecture AI prompts
     * @returns {Object} Architecture prompts
     */
    getArchitecturePrompts() {
        return {
            systemDesign: {
                name: 'System Design',
                description: 'Design system architecture',
                category: 'architecture',
                prompt: `Design system architecture for the following requirements:

System Context:
- System Type: {{SYSTEM_TYPE}}
- Requirements: {{REQUIREMENTS}}
- Constraints: {{CONSTRAINTS}}

Please design:
1. **Architecture Overview**: High-level system architecture
2. **Component Design**: Design system components
3. **Data Flow**: Design data flow and interactions
4. **Database Design**: Design database architecture
5. **API Design**: Design API architecture
6. **Security Design**: Design security architecture
7. **Scalability Design**: Design for scalability
8. **Performance Design**: Design for performance
9. **Monitoring Design**: Design monitoring and logging
10. **Deployment Design**: Design deployment architecture

Provide comprehensive architecture design with diagrams and explanations.`,
                variables: {
                    SYSTEM_TYPE: 'E-commerce platform',
                    REQUIREMENTS: 'High availability, scalability, security',
                    CONSTRAINTS: 'Budget, timeline, team size'
                }
            },

            microservicesDesign: {
                name: 'Microservices Design',
                description: 'Design microservices architecture',
                category: 'architecture',
                prompt: `Design microservices architecture:

Microservices Context:
- Application Type: {{APP_TYPE}}
- Current Architecture: {{CURRENT_ARCH}}
- Requirements: {{REQUIREMENTS}}

Please design:
1. **Service Decomposition**: Decompose into microservices
2. **Service Boundaries**: Define service boundaries
3. **Communication Patterns**: Design inter-service communication
4. **Data Management**: Design data management strategy
5. **API Gateway**: Design API gateway
6. **Service Discovery**: Design service discovery
7. **Load Balancing**: Design load balancing
8. **Monitoring**: Design monitoring and observability
9. **Deployment**: Design deployment strategy
10. **Testing**: Design testing strategy

Provide comprehensive microservices design with implementation guidance.`,
                variables: {
                    APP_TYPE: 'Online marketplace',
                    CURRENT_ARCH: 'Monolithic application',
                    REQUIREMENTS: 'Scalability, maintainability, team autonomy'
                }
            }
        };
    }

    /**
     * Get deployment AI prompts
     * @returns {Object} Deployment prompts
     */
    getDeploymentPrompts() {
        return {
            deploymentStrategy: {
                name: 'Deployment Strategy',
                description: 'Design deployment strategy',
                category: 'deployment',
                prompt: `Design deployment strategy for the application:

Deployment Context:
- Application Type: {{APP_TYPE}}
- Infrastructure: {{INFRASTRUCTURE}}
- Requirements: {{REQUIREMENTS}}

Please design:
1. **Deployment Architecture**: Design deployment architecture
2. **Environment Strategy**: Design environment strategy
3. **CI/CD Pipeline**: Design CI/CD pipeline
4. **Container Strategy**: Design containerization strategy
5. **Orchestration**: Design container orchestration
6. **Monitoring**: Design monitoring and alerting
7. **Rollback Strategy**: Design rollback procedures
8. **Security**: Design deployment security
9. **Scaling**: Design auto-scaling strategy
10. **Disaster Recovery**: Design disaster recovery plan

Provide comprehensive deployment strategy with implementation details.`,
                variables: {
                    APP_TYPE: 'Web application',
                    INFRASTRUCTURE: 'Cloud (AWS/Azure/GCP)',
                    REQUIREMENTS: 'High availability, zero downtime, security'
                }
            },

            infrastructureDesign: {
                name: 'Infrastructure Design',
                description: 'Design infrastructure architecture',
                category: 'deployment',
                prompt: `Design infrastructure architecture:

Infrastructure Context:
- Application Requirements: {{REQUIREMENTS}}
- Cloud Provider: {{CLOUD_PROVIDER}}
- Budget: {{BUDGET}}

Please design:
1. **Network Architecture**: Design network architecture
2. **Compute Resources**: Design compute resources
3. **Storage Strategy**: Design storage strategy
4. **Database Architecture**: Design database infrastructure
5. **Load Balancing**: Design load balancing
6. **Security**: Design security infrastructure
7. **Monitoring**: Design monitoring infrastructure
8. **Backup Strategy**: Design backup and recovery
9. **Cost Optimization**: Design cost optimization
10. **Compliance**: Design compliance requirements

Provide comprehensive infrastructure design with cost estimates.`,
                variables: {
                    REQUIREMENTS: 'High availability, scalability, security',
                    CLOUD_PROVIDER: 'AWS',
                    BUDGET: 'Medium budget with cost optimization'
                }
            }
        };
    }

    /**
     * Get prompt by category and name
     * @param {string} category - Prompt category
     * @param {string} name - Prompt name
     * @returns {Object|null} Prompt or null if not found
     */
    getPrompt(category, name) {
        const prompts = this.getAllPrompts();
        return prompts[category]?.[name] || null;
    }

    /**
     * Get prompts by category
     * @param {string} category - Prompt category
     * @returns {Object} Prompts in category
     */
    getPromptsByCategory(category) {
        const prompts = this.getAllPrompts();
        return prompts[category] || {};
    }

    /**
     * Generate prompt with variables
     * @param {string} category - Prompt category
     * @param {string} name - Prompt name
     * @param {Object} variables - Variables to substitute
     * @returns {string} Generated prompt
     */
    generatePrompt(category, name, variables = {}) {
        const promptTemplate = this.getPrompt(category, name);
        if (!promptTemplate) {
            throw new Error(`Prompt not found: ${category}/${name}`);
        }

        let prompt = promptTemplate.prompt;

        // Substitute variables
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
        }

        // Substitute default variables if not provided
        for (const [key, defaultValue] of Object.entries(promptTemplate.variables || {})) {
            const placeholder = `{{${key}}}`;
            if (!variables[key] && prompt.includes(placeholder)) {
                prompt = prompt.replace(new RegExp(placeholder, 'g'), defaultValue);
            }
        }

        return prompt;
    }

    /**
     * Search prompts by keyword
     * @param {string} keyword - Search keyword
     * @returns {Array} Matching prompts
     */
    searchPrompts(keyword) {
        const allPrompts = this.getAllPrompts();
        const results = [];

        for (const [category, prompts] of Object.entries(allPrompts)) {
            for (const [name, prompt] of Object.entries(prompts)) {
                if (prompt.name.toLowerCase().includes(keyword.toLowerCase()) ||
                    prompt.description.toLowerCase().includes(keyword.toLowerCase()) ||
                    prompt.category.toLowerCase().includes(keyword.toLowerCase())) {
                    results.push({
                        category,
                        name,
                        prompt
                    });
                }
            }
        }

        return results;
    }

    /**
     * Create custom prompt
     * @param {Object} prompt - Prompt definition
     * @returns {Object} Created prompt
     */
    createCustomPrompt(prompt) {
        const customPrompt = {
            ...prompt,
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isCustom: true,
            createdAt: new Date()
        };

        if (this.eventBus) {
            this.eventBus.publish('ai-prompt.created', {
                prompt: customPrompt,
                timestamp: new Date()
            });
        }

        return customPrompt;
    }

    /**
     * Validate prompt
     * @param {Object} prompt - Prompt to validate
     * @returns {Object} Validation result
     */
    validatePrompt(prompt) {
        const errors = [];

        if (!prompt.name) {
            errors.push('Prompt name is required');
        }

        if (!prompt.description) {
            errors.push('Prompt description is required');
        }

        if (!prompt.category) {
            errors.push('Prompt category is required');
        }

        if (!prompt.prompt) {
            errors.push('Prompt content is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = AIPrompts; 