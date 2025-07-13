/**
 * LogicValidationService - Comprehensive business logic validation and integrity checking
 * Provides advanced validation for business rules, data flow, and logical consistency
 */
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('@infrastructure/logging/Logger');

class LogicValidationService {
    constructor(logger = console) {
        this.logger = logger;
        this.logicPatterns = {
            businessRules: [
                'business rule', 'validation rule', 'domain rule', 'business logic',
                'if.*then', 'when.*then', 'must.*be', 'should.*be', 'cannot.*be'
            ],
            dataFlow: [
                'input.*output', 'data.*flow', 'pipeline', 'stream', 'transform',
                'map.*reduce', 'filter.*data', 'process.*data'
            ],
            errorHandling: [
                'try.*catch', 'throw.*error', 'handle.*error', 'error.*handling',
                'exception.*handling', 'fail.*fast', 'graceful.*degradation'
            ],
            stateManagement: [
                'state.*management', 'state.*machine', 'finite.*state', 'state.*transition',
                'immutable.*state', 'state.*update', 'state.*validation'
            ],
            security: [
                'authentication', 'authorization', 'permission', 'access.*control',
                'input.*validation', 'sanitize.*input', 'sql.*injection', 'xss'
            ]
        };
    }

    /**
     * Perform comprehensive logic validation
     * @param {string} projectPath - Project path
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation results
     */
    async validateLogic(projectPath, options = {}) {
        this.logger.info('Starting comprehensive logic validation...');
        
        const validation = {
            projectPath,
            timestamp: new Date(),
            overall: true,
            businessLogic: {},
            dataFlow: {},
            errorHandling: {},
            stateManagement: {},
            security: {},
            violations: [],
            recommendations: [],
            metrics: {
                totalFiles: 0,
                validatedFiles: 0,
                violations: 0,
                logicPatterns: {},
                complexityScores: {}
            }
        };

        try {
            // Get all code files
            const codeFiles = await this.getCodeFiles(projectPath);
            validation.metrics.totalFiles = codeFiles.length;

            // Validate business logic
            validation.businessLogic = await this.validateBusinessLogic(codeFiles, options);
            
            // Validate data flow
            validation.dataFlow = await this.validateDataFlow(codeFiles, options);
            
            // Validate error handling
            validation.errorHandling = await this.validateErrorHandling(codeFiles, options);
            
            // Validate state management
            validation.stateManagement = await this.validateStateManagement(codeFiles, options);
            
            // Validate security logic
            validation.security = await this.validateSecurityLogic(codeFiles, options);

            // Aggregate violations
            validation.violations = [
                ...validation.businessLogic.violations,
                ...validation.dataFlow.violations,
                ...validation.errorHandling.violations,
                ...validation.stateManagement.violations,
                ...validation.security.violations
            ];

            // Generate recommendations
            validation.recommendations = await this.generateLogicRecommendations(validation);

            // Calculate metrics
            validation.metrics = await this.calculateLogicMetrics(validation);

            // Determine overall validity
            validation.overall = validation.violations.filter(v => v.severity === 'critical').length === 0;

            this.logger.info('Logic validation completed', {
                totalViolations: validation.metrics.violations,
                overallValid: validation.overall
            });

            return validation;

        } catch (error) {
            this.logger.error('Logic validation failed:', error);
            validation.overall = false;
            validation.violations.push({
                type: 'validation-error',
                severity: 'critical',
                message: error.message
            });
            return validation;
        }
    }

    /**
     * Validate business logic
     * @param {Array} codeFiles - Code files to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Business logic validation results
     */
    async validateBusinessLogic(codeFiles, options) {
        const validation = {
            isValid: true,
            violations: [],
            patterns: [],
            metrics: {
                businessRules: 0,
                validations: 0,
                calculations: 0
            }
        };

        for (const filePath of codeFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const fileValidation = await this.validateFileBusinessLogic(filePath, content);
                
                validation.violations.push(...fileValidation.violations);
                validation.patterns.push(...fileValidation.patterns);
                validation.metrics.businessRules += fileValidation.metrics.businessRules;
                validation.metrics.validations += fileValidation.metrics.validations;
                validation.metrics.calculations += fileValidation.metrics.calculations;
                
            } catch (error) {
                // Ignore file reading errors
            }
        }

        validation.isValid = validation.violations.filter(v => v.severity === 'critical').length === 0;
        return validation;
    }

    /**
     * Validate business logic in a single file
     * @param {string} filePath - File path
     * @param {string} content - File content
     * @returns {Promise<Object>} File validation results
     */
    async validateFileBusinessLogic(filePath, content) {
        const validation = {
            violations: [],
            patterns: [],
            metrics: {
                businessRules: 0,
                validations: 0,
                calculations: 0
            }
        };

        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Check for business rule patterns
            for (const pattern of this.logicPatterns.businessRules) {
                if (line.toLowerCase().includes(pattern.toLowerCase())) {
                    validation.metrics.businessRules++;
                    validation.patterns.push({
                        type: 'business-rule',
                        line: lineNumber,
                        pattern: pattern,
                        content: line.trim()
                    });
                }
            }

            // Check for validation logic
            if (line.includes('validate') || line.includes('validation') || 
                line.includes('check') || line.includes('verify')) {
                validation.metrics.validations++;
                
                // Check for proper validation structure
                if (!this.isProperValidation(line)) {
                    validation.violations.push({
                        type: 'validation-structure',
                        severity: 'medium',
                        file: filePath,
                        line: lineNumber,
                        message: 'Improper validation structure detected',
                        suggestion: 'Use proper validation patterns with error handling'
                    });
                }
            }

            // Check for calculation logic
            if (line.includes('calculate') || line.includes('compute') || 
                line.includes('formula') || line.includes('algorithm')) {
                validation.metrics.calculations++;
                
                // Check for calculation errors
                if (this.hasCalculationError(line)) {
                    validation.violations.push({
                        type: 'calculation-error',
                        severity: 'high',
                        file: filePath,
                        line: lineNumber,
                        message: 'Potential calculation error detected',
                        suggestion: 'Review calculation logic for accuracy and edge cases'
                    });
                }
            }
        }

        return validation;
    }

    /**
     * Validate data flow
     * @param {Array} codeFiles - Code files to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Data flow validation results
     */
    async validateDataFlow(codeFiles, options) {
        const validation = {
            isValid: true,
            violations: [],
            patterns: [],
            metrics: {
                dataTransformations: 0,
                dataValidations: 0,
                dataPipelines: 0
            }
        };

        for (const filePath of codeFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const fileValidation = await this.validateFileDataFlow(filePath, content);
                
                validation.violations.push(...fileValidation.violations);
                validation.patterns.push(...fileValidation.patterns);
                validation.metrics.dataTransformations += fileValidation.metrics.dataTransformations;
                validation.metrics.dataValidations += fileValidation.metrics.dataValidations;
                validation.metrics.dataPipelines += fileValidation.metrics.dataPipelines;
                
            } catch (error) {
                // Ignore file reading errors
            }
        }

        validation.isValid = validation.violations.filter(v => v.severity === 'critical').length === 0;
        return validation;
    }

    /**
     * Validate data flow in a single file
     * @param {string} filePath - File path
     * @param {string} content - File content
     * @returns {Promise<Object>} File validation results
     */
    async validateFileDataFlow(filePath, content) {
        const validation = {
            violations: [],
            patterns: [],
            metrics: {
                dataTransformations: 0,
                dataValidations: 0,
                dataPipelines: 0
            }
        };

        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Check for data transformation patterns
            if (line.includes('map(') || line.includes('filter(') || 
                line.includes('reduce(') || line.includes('transform(')) {
                validation.metrics.dataTransformations++;
                
                // Check for proper data transformation
                if (!this.isProperDataTransformation(line)) {
                    validation.violations.push({
                        type: 'data-transformation',
                        severity: 'medium',
                        file: filePath,
                        line: lineNumber,
                        message: 'Improper data transformation detected',
                        suggestion: 'Ensure data transformations handle edge cases and errors'
                    });
                }
            }

            // Check for data validation patterns
            if (line.includes('validate') || line.includes('sanitize') || 
                line.includes('clean') || line.includes('normalize')) {
                validation.metrics.dataValidations++;
                
                // Check for proper data validation
                if (!this.isProperDataValidation(line)) {
                    validation.violations.push({
                        type: 'data-validation',
                        severity: 'high',
                        file: filePath,
                        line: lineNumber,
                        message: 'Improper data validation detected',
                        suggestion: 'Implement comprehensive data validation with error handling'
                    });
                }
            }

            // Check for data pipeline patterns
            if (line.includes('pipeline') || line.includes('stream') || 
                line.includes('flow') || line.includes('chain')) {
                validation.metrics.dataPipelines++;
                
                validation.patterns.push({
                    type: 'data-pipeline',
                    line: lineNumber,
                    content: line.trim()
                });
            }
        }

        return validation;
    }

    /**
     * Validate error handling
     * @param {Array} codeFiles - Code files to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Error handling validation results
     */
    async validateErrorHandling(codeFiles, options) {
        const validation = {
            isValid: true,
            violations: [],
            patterns: [],
            metrics: {
                tryCatchBlocks: 0,
                errorHandlers: 0,
                errorTypes: 0
            }
        };

        for (const filePath of codeFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const fileValidation = await this.validateFileErrorHandling(filePath, content);
                
                validation.violations.push(...fileValidation.violations);
                validation.patterns.push(...fileValidation.patterns);
                validation.metrics.tryCatchBlocks += fileValidation.metrics.tryCatchBlocks;
                validation.metrics.errorHandlers += fileValidation.metrics.errorHandlers;
                validation.metrics.errorTypes += fileValidation.metrics.errorTypes;
                
            } catch (error) {
                // Ignore file reading errors
            }
        }

        validation.isValid = validation.violations.filter(v => v.severity === 'critical').length === 0;
        return validation;
    }

    /**
     * Validate error handling in a single file
     * @param {string} filePath - File path
     * @param {string} content - File content
     * @returns {Promise<Object>} File validation results
     */
    async validateFileErrorHandling(filePath, content) {
        const validation = {
            violations: [],
            patterns: [],
            metrics: {
                tryCatchBlocks: 0,
                errorHandlers: 0,
                errorTypes: 0
            }
        };

        const lines = content.split('\n');
        let inTryBlock = false;
        let hasCatchBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Check for try-catch patterns
            if (line.includes('try {') || line.includes('try(')) {
                inTryBlock = true;
                hasCatchBlock = false;
                validation.metrics.tryCatchBlocks++;
            }
            
            if (line.includes('catch') && inTryBlock) {
                hasCatchBlock = true;
                validation.metrics.errorHandlers++;
                
                // Check for proper error handling
                if (!this.isProperErrorHandling(line)) {
                    validation.violations.push({
                        type: 'error-handling',
                        severity: 'high',
                        file: filePath,
                        line: lineNumber,
                        message: 'Improper error handling detected',
                        suggestion: 'Implement proper error handling with specific error types and logging'
                    });
                }
            }
            
            if (line.includes('}') && inTryBlock && !hasCatchBlock) {
                validation.violations.push({
                    type: 'missing-catch',
                    severity: 'critical',
                    file: filePath,
                    line: lineNumber,
                    message: 'Try block without catch block detected',
                    suggestion: 'Always include catch blocks for proper error handling'
                });
                inTryBlock = false;
            }

            // Check for error types
            if (line.includes('Error') || line.includes('Exception')) {
                validation.metrics.errorTypes++;
                
                validation.patterns.push({
                    type: 'error-type',
                    line: lineNumber,
                    content: line.trim()
                });
            }
        }

        return validation;
    }

    /**
     * Validate state management
     * @param {Array} codeFiles - Code files to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} State management validation results
     */
    async validateStateManagement(codeFiles, options) {
        const validation = {
            isValid: true,
            violations: [],
            patterns: [],
            metrics: {
                stateVariables: 0,
                stateTransitions: 0,
                stateValidations: 0
            }
        };

        for (const filePath of codeFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const fileValidation = await this.validateFileStateManagement(filePath, content);
                
                validation.violations.push(...fileValidation.violations);
                validation.patterns.push(...fileValidation.patterns);
                validation.metrics.stateVariables += fileValidation.metrics.stateVariables;
                validation.metrics.stateTransitions += fileValidation.metrics.stateTransitions;
                validation.metrics.stateValidations += fileValidation.metrics.stateValidations;
                
            } catch (error) {
                // Ignore file reading errors
            }
        }

        validation.isValid = validation.violations.filter(v => v.severity === 'critical').length === 0;
        return validation;
    }

    /**
     * Validate state management in a single file
     * @param {string} filePath - File path
     * @param {string} content - File content
     * @returns {Promise<Object>} File validation results
     */
    async validateFileStateManagement(filePath, content) {
        const validation = {
            violations: [],
            patterns: [],
            metrics: {
                stateVariables: 0,
                stateTransitions: 0,
                stateValidations: 0
            }
        };

        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Check for state variable patterns
            if (line.includes('state') || line.includes('State') || 
                line.includes('status') || line.includes('Status')) {
                validation.metrics.stateVariables++;
                
                // Check for proper state management
                if (!this.isProperStateManagement(line)) {
                    validation.violations.push({
                        type: 'state-management',
                        severity: 'medium',
                        file: filePath,
                        line: lineNumber,
                        message: 'Improper state management detected',
                        suggestion: 'Use immutable state updates and proper state validation'
                    });
                }
            }

            // Check for state transition patterns
            if (line.includes('transition') || line.includes('change') || 
                line.includes('update') || line.includes('setState')) {
                validation.metrics.stateTransitions++;
                
                validation.patterns.push({
                    type: 'state-transition',
                    line: lineNumber,
                    content: line.trim()
                });
            }

            // Check for state validation patterns
            if (line.includes('validateState') || line.includes('checkState') || 
                line.includes('stateValidation')) {
                validation.metrics.stateValidations++;
                
                validation.patterns.push({
                    type: 'state-validation',
                    line: lineNumber,
                    content: line.trim()
                });
            }
        }

        return validation;
    }

    /**
     * Validate security logic
     * @param {Array} codeFiles - Code files to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Security logic validation results
     */
    async validateSecurityLogic(codeFiles, options) {
        const validation = {
            isValid: true,
            violations: [],
            patterns: [],
            metrics: {
                securityChecks: 0,
                inputValidations: 0,
                authenticationChecks: 0
            }
        };

        for (const filePath of codeFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const fileValidation = await this.validateFileSecurityLogic(filePath, content);
                
                validation.violations.push(...fileValidation.violations);
                validation.patterns.push(...fileValidation.patterns);
                validation.metrics.securityChecks += fileValidation.metrics.securityChecks;
                validation.metrics.inputValidations += fileValidation.metrics.inputValidations;
                validation.metrics.authenticationChecks += fileValidation.metrics.authenticationChecks;
                
            } catch (error) {
                // Ignore file reading errors
            }
        }

        validation.isValid = validation.violations.filter(v => v.severity === 'critical').length === 0;
        return validation;
    }

    /**
     * Validate security logic in a single file
     * @param {string} filePath - File path
     * @param {string} content - File content
     * @returns {Promise<Object>} File validation results
     */
    async validateFileSecurityLogic(filePath, content) {
        const validation = {
            violations: [],
            patterns: [],
            metrics: {
                securityChecks: 0,
                inputValidations: 0,
                authenticationChecks: 0
            }
        };

        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Check for security vulnerabilities
            if (this.hasSecurityVulnerability(line)) {
                validation.violations.push({
                    type: 'security-vulnerability',
                    severity: 'critical',
                    file: filePath,
                    line: lineNumber,
                    message: 'Security vulnerability detected',
                    suggestion: 'Implement proper security measures and input validation'
                });
            }

            // Check for input validation
            if (line.includes('validate') || line.includes('sanitize') || 
                line.includes('escape') || line.includes('encode')) {
                validation.metrics.inputValidations++;
                
                // Check for proper input validation
                if (!this.isProperInputValidation(line)) {
                    validation.violations.push({
                        type: 'input-validation',
                        severity: 'high',
                        file: filePath,
                        line: lineNumber,
                        message: 'Improper input validation detected',
                        suggestion: 'Implement comprehensive input validation with proper sanitization'
                    });
                }
            }

            // Check for authentication checks
            if (line.includes('auth') || line.includes('login') || 
                line.includes('permission') || line.includes('role')) {
                validation.metrics.authenticationChecks++;
                
                validation.patterns.push({
                    type: 'authentication',
                    line: lineNumber,
                    content: line.trim()
                });
            }

            // Check for security checks
            if (line.includes('security') || line.includes('secure') || 
                line.includes('protect') || line.includes('guard')) {
                validation.metrics.securityChecks++;
                
                validation.patterns.push({
                    type: 'security-check',
                    line: lineNumber,
                    content: line.trim()
                });
            }
        }

        return validation;
    }

    /**
     * Generate logic recommendations
     * @param {Object} validation - Validation results
     * @returns {Promise<Array>} Recommendations
     */
    async generateLogicRecommendations(validation) {
        const recommendations = [];

        // Check for missing error handling
        if (validation.errorHandling.metrics.tryCatchBlocks === 0) {
            recommendations.push({
                type: 'missing-error-handling',
                severity: 'high',
                message: 'No error handling detected in the codebase',
                suggestion: 'Implement comprehensive error handling with try-catch blocks'
            });
        }

        // Check for missing input validation
        if (validation.security.metrics.inputValidations === 0) {
            recommendations.push({
                type: 'missing-input-validation',
                severity: 'critical',
                message: 'No input validation detected in the codebase',
                suggestion: 'Implement comprehensive input validation for all user inputs'
            });
        }

        // Check for missing business logic
        if (validation.businessLogic.metrics.businessRules === 0) {
            recommendations.push({
                type: 'missing-business-logic',
                severity: 'medium',
                message: 'No business rules detected in the codebase',
                suggestion: 'Implement business rules and domain logic'
            });
        }

        // Check for critical violations
        const criticalViolations = validation.violations.filter(v => v.severity === 'critical');
        if (criticalViolations.length > 0) {
            recommendations.push({
                type: 'critical-logic-violations',
                severity: 'critical',
                message: `${criticalViolations.length} critical logic violations detected`,
                suggestion: 'Address critical violations to maintain code integrity'
            });
        }

        return recommendations;
    }

    /**
     * Calculate logic metrics
     * @param {Object} validation - Validation results
     * @returns {Promise<Object>} Metrics
     */
    async calculateLogicMetrics(validation) {
        const metrics = {
            totalFiles: validation.metrics.totalFiles,
            validatedFiles: validation.metrics.totalFiles,
            violations: validation.violations.length,
            logicPatterns: {
                businessRules: validation.businessLogic.metrics.businessRules,
                dataTransformations: validation.dataFlow.metrics.dataTransformations,
                errorHandling: validation.errorHandling.metrics.tryCatchBlocks,
                stateManagement: validation.stateManagement.metrics.stateVariables,
                securityChecks: validation.security.metrics.securityChecks
            },
            complexityScores: {},
            overallScore: 100
        };

        // Calculate overall score
        const criticalViolations = validation.violations.filter(v => v.severity === 'critical').length;
        const highViolations = validation.violations.filter(v => v.severity === 'high').length;
        const mediumViolations = validation.violations.filter(v => v.severity === 'medium').length;

        metrics.overallScore = Math.max(0, 100 - (criticalViolations * 20) - (highViolations * 10) - (mediumViolations * 5));

        return metrics;
    }

    /**
     * Get all code files in project
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Code files
     */
    async getCodeFiles(projectPath) {
        const codeFiles = [];
        
        const scanDirectory = async (dirPath) => {
            try {
                const items = await fs.readdir(dirPath);
                
                for (const item of items) {
                    const itemPath = path.join(dirPath, item);
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        // Skip node_modules and other common directories
                        if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
                            await scanDirectory(itemPath);
                        }
                    } else if (this.isCodeFile(item)) {
                        codeFiles.push(itemPath);
                    }
                }
            } catch (error) {
                // Ignore permission errors
            }
        };

        await scanDirectory(projectPath);
        return codeFiles;
    }

    /**
     * Check if file is a code file
     * @param {string} filename - Filename
     * @returns {boolean} Is code file
     */
    isCodeFile(filename) {
        const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.java', '.py', '.cs', '.php', '.rb', '.go'];
        const ext = path.extname(filename).toLowerCase();
        return codeExtensions.includes(ext);
    }

    /**
     * Check if line has proper validation structure
     * @param {string} line - Line content
     * @returns {boolean} Is proper validation
     */
    isProperValidation(line) {
        return line.includes('if') || line.includes('throw') || line.includes('return');
    }

    /**
     * Check if line has calculation error
     * @param {string} line - Line content
     * @returns {boolean} Has calculation error
     */
    hasCalculationError(line) {
        // Simple heuristic for potential calculation errors
        return line.includes('/ 0') || line.includes('undefined') || line.includes('null');
    }

    /**
     * Check if line has proper data transformation
     * @param {string} line - Line content
     * @returns {boolean} Is proper data transformation
     */
    isProperDataTransformation(line) {
        return line.includes('=>') || line.includes('function') || line.includes('return');
    }

    /**
     * Check if line has proper data validation
     * @param {string} line - Line content
     * @returns {boolean} Is proper data validation
     */
    isProperDataValidation(line) {
        return line.includes('if') || line.includes('throw') || line.includes('return');
    }

    /**
     * Check if line has proper error handling
     * @param {string} line - Line content
     * @returns {boolean} Is proper error handling
     */
    isProperErrorHandling(line) {
        return line.includes('catch') && (line.includes('Error') || line.includes('Exception'));
    }

    /**
     * Check if line has proper state management
     * @param {string} line - Line content
     * @returns {boolean} Is proper state management
     */
    isProperStateManagement(line) {
        return line.includes('const') || line.includes('let') || line.includes('immutable');
    }

    /**
     * Check if line has security vulnerability
     * @param {string} line - Line content
     * @returns {boolean} Has security vulnerability
     */
    hasSecurityVulnerability(line) {
        const vulnerabilities = [
            'eval(', 'innerHTML', 'document.write', 'sql.*string',
            'password.*string', 'secret.*string', 'api.*key.*string'
        ];
        
        return vulnerabilities.some(vuln => {
            const regex = new RegExp(vuln, 'i');
            return regex.test(line);
        });
    }

    /**
     * Check if line has proper input validation
     * @param {string} line - Line content
     * @returns {boolean} Is proper input validation
     */
    isProperInputValidation(line) {
        return line.includes('if') || line.includes('throw') || line.includes('return');
    }
}

module.exports = LogicValidationService; 