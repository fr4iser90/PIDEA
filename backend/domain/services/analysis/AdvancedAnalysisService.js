/**
 * AdvancedAnalysisService - Integrated analysis with layer and logic validation
 * Combines existing analysis capabilities with advanced layer and logic validation
 */
const LayerValidationService = require('./LayerValidationService');
const LogicValidationService = require('./LogicValidationService');
const TaskAnalysisService = require('../task/TaskAnalysisService');
const ServiceLogger = require('@logging/ServiceLogger');

class AdvancedAnalysisService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || new ServiceLogger('AdvancedAnalysisService');
        this.layerValidationService = dependencies.layerValidationService || new LayerValidationService(this.logger);
        this.logicValidationService = dependencies.logicValidationService || new LogicValidationService(this.logger);
        this.taskAnalysisService = dependencies.taskAnalysisService || new TaskAnalysisService();
    }

    /**
     * Perform comprehensive advanced analysis
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Comprehensive analysis results
     */
    async performAdvancedAnalysis(projectPath, options = {}) {
        this.logger.info('Starting advanced analysis with layer and logic validation for project');
        
        const analysis = {
            projectPath,
            timestamp: new Date(),
            overall: true,
            standardAnalysis: {},
            layerValidation: {},
            logicValidation: {},
            integratedInsights: [],
            recommendations: [],
            metrics: {
                overallScore: 0,
                layerScore: 0,
                logicScore: 0,
                standardScore: 0
            }
        };

        try {
            // Phase 1: Standard Analysis (existing capabilities)
            this.logger.info('Phase 1: Performing standard analysis for project');
            analysis.standardAnalysis = await this.taskAnalysisService.analyzeProject(projectPath, options);

            // Phase 2: Layer Validation (conditional)
            if (options.includeLayerValidation !== false) {
                this.logger.info('Phase 2: Performing layer validation for project');
                analysis.layerValidation = await this.layerValidationService.validateLayers(projectPath, options);
            } else {
                this.logger.info('Phase 2: Skipping layer validation (disabled) for project');
                analysis.layerValidation = {};
            }

            // Phase 3: Logic Validation (conditional)
            if (options.includeLogicValidation !== false) {
                this.logger.info('Phase 3: Performing logic validation for project');
                analysis.logicValidation = await this.logicValidationService.validateLogic(projectPath, options);
            } else {
                this.logger.info('Phase 3: Skipping logic validation (disabled) for project');
                analysis.logicValidation = {};
            }

            // Phase 4: Generate Integrated Insights
            this.logger.info('Phase 4: Generating integrated insights for project');
            analysis.integratedInsights = await this.generateIntegratedInsights(analysis);

            // Phase 5: Generate Comprehensive Recommendations
            this.logger.info('Phase 5: Generating comprehensive recommendations for project');
            analysis.recommendations = await this.generateComprehensiveRecommendations(analysis);

            // Phase 6: Calculate Overall Metrics
            this.logger.info('Phase 6: Calculating overall metrics for project');
            analysis.metrics = await this.calculateOverallMetrics(analysis);

            // Determine overall validity (handle disabled phases)
            const layerValid = options.includeLayerValidation !== false ? analysis.layerValidation.overall : true;
            const logicValid = options.includeLogicValidation !== false ? analysis.logicValidation.overall : true;
            analysis.overall = layerValid && logicValid && analysis.metrics.overallScore >= 70;

            this.logger.info(`Advanced analysis completed successfully - Overall Score: ${analysis.metrics.overallScore}, Layer Score: ${analysis.metrics.layerScore}, Logic Score: ${analysis.metrics.logicScore}, Valid: ${analysis.overall} for project`);

            return analysis;

        } catch (error) {
            this.logger.error('Advanced analysis failed for project:', error.message);
            analysis.overall = false;
            analysis.error = error.message;
            return analysis;
        }
    }

    /**
     * Generate integrated insights from all analysis results
     * @param {Object} analysis - Analysis results
     * @returns {Promise<Array>} Integrated insights
     */
    async generateIntegratedInsights(analysis) {
        const insights = [];

        // Cross-reference layer violations with logic violations
        const layerViolations = analysis.layerValidation?.violations || [];
        const logicViolations = analysis.logicValidation?.violations || [];

        // Find patterns where layer violations correlate with logic issues
        for (const layerViolation of layerViolations) {
            for (const logicViolation of logicViolations) {
                if (this.areViolationsRelated(layerViolation, logicViolation)) {
                    insights.push({
                        type: 'cross-layer-logic-issue',
                        severity: 'high',
                        title: 'Layer and Logic Violation Correlation',
                        description: `Layer violation in ${layerViolation.file} correlates with logic issue: ${logicViolation.message}`,
                        layerViolation: layerViolation,
                        logicViolation: logicViolation,
                        suggestion: 'Address both architectural and logical issues together for better code quality'
                    });
                }
            }
        }

        // Analyze business logic placement in relation to layers
        const businessLogicInWrongLayer = this.findBusinessLogicInWrongLayer(analysis);
        if (businessLogicInWrongLayer.length > 0) {
            insights.push({
                type: 'business-logic-placement',
                severity: 'medium',
                title: 'Business Logic in Wrong Layer',
                description: `Found ${businessLogicInWrongLayer.length} instances of business logic in inappropriate layers`,
                instances: businessLogicInWrongLayer,
                suggestion: 'Move business logic to appropriate domain or application layers'
            });
        }

        // Analyze error handling patterns across layers
        const errorHandlingInsights = this.analyzeErrorHandlingPatterns(analysis);
        insights.push(...errorHandlingInsights);

        // Analyze security patterns across layers
        const securityInsights = this.analyzeSecurityPatterns(analysis);
        insights.push(...securityInsights);

        // Analyze data flow patterns
        const dataFlowInsights = this.analyzeDataFlowPatterns(analysis);
        insights.push(...dataFlowInsights);

        return insights;
    }

    /**
     * Check if two violations are related
     * @param {Object} layerViolation - Layer violation
     * @param {Object} logicViolation - Logic violation
     * @returns {boolean} Are violations related
     */
    areViolationsRelated(layerViolation, logicViolation) {
        // Check if violations are in the same file
        if (layerViolation.file === logicViolation.file) {
            return true;
        }

        // Check if violations have similar patterns
        const layerPatterns = ['boundary-violation', 'import-violation', 'logic-violation'];
        const logicPatterns = ['business-logic', 'error-handling', 'security-vulnerability'];

        return layerPatterns.includes(layerViolation.type) && 
               logicPatterns.includes(logicViolation.type);
    }

    /**
     * Find business logic in wrong layers
     * @param {Object} analysis - Analysis results
     * @returns {Array} Business logic instances in wrong layers
     */
    findBusinessLogicInWrongLayer(analysis) {
        const instances = [];
        const layerValidation = analysis.layerValidation;
        const logicValidation = analysis.logicValidation;

        // Check if layers information is available
        if (!layerValidation?.layers) {
            return instances;
        }

        // Check presentation layer for business logic
        if (layerValidation.layers.presentation && layerValidation.layers.presentation.files) {
            for (const file of layerValidation.layers.presentation.files) {
                const logicViolations = (logicValidation?.violations || []).filter(v => v.file === file);
                if (logicViolations.length > 0) {
                    instances.push({
                        file: file,
                        layer: 'presentation',
                        violations: logicViolations,
                        message: 'Business logic found in presentation layer'
                    });
                }
            }
        }

        // Check infrastructure layer for business logic
        if (layerValidation.layers.infrastructure && layerValidation.layers.infrastructure.files) {
            for (const file of layerValidation.layers.infrastructure.files) {
                const logicViolations = (logicValidation?.violations || []).filter(v => v.file === file);
                if (logicViolations.length > 0) {
                    instances.push({
                        file: file,
                        layer: 'infrastructure',
                        violations: logicViolations,
                        message: 'Business logic found in infrastructure layer'
                    });
                }
            }
        }

        return instances;
    }

    /**
     * Analyze error handling patterns across layers
     * @param {Object} analysis - Analysis results
     * @returns {Array} Error handling insights
     */
    analyzeErrorHandlingPatterns(analysis) {
        const insights = [];
        const errorHandling = analysis.logicValidation.errorHandling;

        // Defensive: If errorHandling or metrics is missing, skip
        if (!errorHandling || !errorHandling.metrics) {
            return insights;
        }

        // Check for missing error handling in critical layers
        if (errorHandling.metrics.tryCatchBlocks === 0) {
            insights.push({
                type: 'missing-error-handling',
                severity: 'high',
                title: 'Missing Error Handling',
                description: 'No error handling detected across the codebase',
                suggestion: 'Implement comprehensive error handling with try-catch blocks and proper error types'
            });
        }

        // Check for inconsistent error handling patterns
        const errorHandlingPatterns = errorHandling.patterns || [];
        if (errorHandlingPatterns.length > 0) {
            const errorTypes = new Set(errorHandlingPatterns.map(p => p.type));
            if (errorTypes.size < 2) {
                insights.push({
                    type: 'inconsistent-error-handling',
                    severity: 'medium',
                    title: 'Inconsistent Error Handling',
                    description: 'Limited variety in error handling patterns detected',
                    suggestion: 'Implement consistent error handling patterns across all layers'
                });
            }
        }

        return insights;
    }

    /**
     * Analyze security patterns across layers
     * @param {Object} analysis - Analysis results
     * @returns {Array} Security insights
     */
    analyzeSecurityPatterns(analysis) {
        const insights = [];
        const security = analysis.logicValidation?.security;

        // Defensive: If security or metrics is missing, skip security analysis
        if (!security || !security.metrics) {
            return insights;
        }

        // Check for missing security measures
        if (security.metrics.securityChecks === 0) {
            insights.push({
                type: 'missing-security',
                severity: 'critical',
                title: 'Missing Security Measures',
                description: 'No security checks detected in the codebase',
                suggestion: 'Implement comprehensive security measures including authentication, authorization, and input validation'
            });
        }

        // Check for security vulnerabilities
        const securityViolations = security.violations || [];
        if (securityViolations.length > 0) {
            insights.push({
                type: 'security-vulnerabilities',
                severity: 'critical',
                title: 'Security Vulnerabilities Detected',
                description: `${securityViolations.length} security vulnerabilities found`,
                violations: securityViolations,
                suggestion: 'Address all security vulnerabilities immediately'
            });
        }

        return insights;
    }

    /**
     * Analyze data flow patterns
     * @param {Object} analysis - Analysis results
     * @returns {Array} Data flow insights
     */
    analyzeDataFlowPatterns(analysis) {
        const insights = [];
        const dataFlow = analysis.logicValidation?.dataFlow;

        // Defensive: If dataFlow or metrics is missing, skip data flow analysis
        if (!dataFlow || !dataFlow.metrics) {
            return insights;
        }

        // Check for data transformation patterns
        if (dataFlow.metrics.dataTransformations === 0) {
            insights.push({
                type: 'missing-data-transformations',
                severity: 'low',
                title: 'Missing Data Transformations',
                description: 'No data transformation patterns detected',
                suggestion: 'Consider implementing data transformation patterns for better data handling'
            });
        }

        // Check for data validation patterns
        if (dataFlow.metrics.dataValidations === 0) {
            insights.push({
                type: 'missing-data-validation',
                severity: 'medium',
                title: 'Missing Data Validation',
                description: 'No data validation patterns detected',
                suggestion: 'Implement comprehensive data validation for all data inputs and transformations'
            });
        }

        return insights;
    }

    /**
     * Generate comprehensive recommendations
     * @param {Object} analysis - Analysis results
     * @returns {Promise<Array>} Comprehensive recommendations
     */
    async generateComprehensiveRecommendations(analysis) {
        const recommendations = [];

        // Priority 1: Critical Issues
        const criticalViolations = [
            ...(analysis.layerValidation?.violations || []),
            ...(analysis.logicValidation?.violations || [])
        ].filter(v => v.severity === 'critical');

        if (criticalViolations.length > 0) {
            recommendations.push({
                priority: 'critical',
                category: 'architecture',
                title: 'Address Critical Violations',
                description: `Found ${criticalViolations.length} critical violations that must be addressed immediately`,
                violations: criticalViolations,
                action: 'Fix all critical violations before proceeding with development',
                estimatedEffort: '2-4 hours per violation'
            });
        }

        // Priority 2: High Priority Issues
        const highViolations = [
            ...(analysis.layerValidation?.violations || []),
            ...(analysis.logicValidation?.violations || [])
        ].filter(v => v.severity === 'high');

        if (highViolations.length > 0) {
            recommendations.push({
                priority: 'high',
                category: 'quality',
                title: 'Address High Priority Issues',
                description: `Found ${highViolations.length} high priority issues that should be addressed soon`,
                violations: highViolations,
                action: 'Address high priority issues in the next development cycle',
                estimatedEffort: '1-2 hours per issue'
            });
        }

        // Priority 3: Architectural Improvements
        const layerRecommendations = analysis.layerValidation.recommendations || [];
        if (layerRecommendations.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'architecture',
                title: 'Architectural Improvements',
                description: 'Several architectural improvements recommended',
                recommendations: layerRecommendations,
                action: 'Plan architectural improvements for future sprints',
                estimatedEffort: '4-8 hours'
            });
        }

        // Priority 4: Code Quality Improvements
        const logicRecommendations = analysis.logicValidation?.recommendations || [];
        if (logicRecommendations.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'quality',
                title: 'Code Quality Improvements',
                description: 'Several code quality improvements recommended',
                recommendations: logicRecommendations,
                action: 'Implement code quality improvements gradually',
                estimatedEffort: '2-6 hours'
            });
        }

        // Priority 5: Performance Optimizations
        if (analysis.standardAnalysis?.performance) {
            const performanceIssues = this.extractPerformanceIssues(analysis.standardAnalysis.performance);
            if (performanceIssues.length > 0) {
                recommendations.push({
                    priority: 'low',
                    category: 'performance',
                    title: 'Performance Optimizations',
                    description: 'Several performance optimization opportunities identified',
                    issues: performanceIssues,
                    action: 'Consider performance optimizations during refactoring',
                    estimatedEffort: '1-3 hours'
                });
            }
        }

        return recommendations;
    }

    /**
     * Extract performance issues from standard analysis
     * @param {Object} performance - Performance analysis
     * @returns {Array} Performance issues
     */
    extractPerformanceIssues(performance) {
        const issues = [];

        if (performance.bundleSize && performance.bundleSize > 1000000) {
            issues.push({
                type: 'large-bundle-size',
                severity: 'medium',
                description: `Bundle size is ${performance.bundleSize} bytes`,
                suggestion: 'Consider code splitting and tree shaking'
            });
        }

        if (performance.slowOperations && performance.slowOperations.length > 0) {
            issues.push({
                type: 'slow-operations',
                severity: 'medium',
                description: `${performance.slowOperations.length} slow operations detected`,
                suggestion: 'Optimize slow operations or implement caching'
            });
        }

        return issues;
    }

    /**
     * Calculate overall metrics
     * @param {Object} analysis - Analysis results
     * @returns {Promise<Object>} Overall metrics
     */
    async calculateOverallMetrics(analysis) {
        const metrics = {
            overallScore: 0,
            layerScore: 0,
            logicScore: 0,
            standardScore: 0,
            breakdown: {
                architecture: 0,
                quality: 0,
                security: 0,
                performance: 0
            }
        };

        // Calculate layer score
        if (analysis.layerValidation?.metrics) {
            metrics.layerScore = analysis.layerValidation.metrics.overallScore || 0;
        }

        // Calculate logic score
        if (analysis.logicValidation?.metrics) {
            metrics.logicScore = analysis.logicValidation.metrics.overallScore || 0;
        }

        // Calculate standard score (simplified)
        if (analysis.standardAnalysis) {
            metrics.standardScore = this.calculateStandardScore(analysis.standardAnalysis);
        }

        // Calculate breakdown scores
        metrics.breakdown.architecture = Math.round((metrics.layerScore * 0.6) + (metrics.standardScore * 0.4));
        metrics.breakdown.quality = Math.round((metrics.logicScore * 0.7) + (metrics.standardScore * 0.3));
        metrics.breakdown.security = this.calculateSecurityScore(analysis);
        metrics.breakdown.performance = this.calculatePerformanceScore(analysis);

        // Calculate overall score (weighted average)
        metrics.overallScore = Math.round(
            (metrics.breakdown.architecture * 0.3) +
            (metrics.breakdown.quality * 0.3) +
            (metrics.breakdown.security * 0.25) +
            (metrics.breakdown.performance * 0.15)
        );

        return metrics;
    }

    /**
     * Calculate standard analysis score
     * @param {Object} standardAnalysis - Standard analysis results
     * @returns {number} Standard score
     */
    calculateStandardScore(standardAnalysis) {
        let score = 100;

        // Deduct points for issues
        if (standardAnalysis.codeQuality && standardAnalysis.codeQuality.issues) {
            score -= standardAnalysis.codeQuality.issues.length * 5;
        }

        if (standardAnalysis.security && standardAnalysis.security.vulnerabilities) {
            score -= standardAnalysis.security.vulnerabilities.length * 10;
        }

        if (standardAnalysis.performance && standardAnalysis.performance.issues) {
            score -= standardAnalysis.performance.issues.length * 3;
        }

        return Math.max(0, score);
    }

    /**
     * Calculate security score
     * @param {Object} analysis - Analysis results
     * @returns {number} Security score
     */
    calculateSecurityScore(analysis) {
        let score = 100;

        // Deduct points for security violations
        const securityViolations = analysis.logicValidation?.security?.violations || [];
        score -= securityViolations.filter(v => v.severity === 'critical').length * 20;
        score -= securityViolations.filter(v => v.severity === 'high').length * 10;
        score -= securityViolations.filter(v => v.severity === 'medium').length * 5;

        // Add points for security measures
        const securityChecks = analysis.logicValidation?.security?.metrics?.securityChecks || 0;
        score += Math.min(securityChecks * 2, 20);

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate performance score
     * @param {Object} analysis - Analysis results
     * @returns {number} Performance score
     */
    calculatePerformanceScore(analysis) {
        let score = 100;

        if (analysis.standardAnalysis?.performance) {
            const performance = analysis.standardAnalysis.performance;

            // Deduct points for performance issues
            if (performance.bundleSize > 1000000) {
                score -= 10;
            }
            if (performance.slowOperations && performance.slowOperations.length > 0) {
                score -= performance.slowOperations.length * 5;
            }
        }

        return Math.max(0, score);
    }

    /**
     * Generate analysis report
     * @param {Object} analysis - Analysis results
     * @returns {Object} Analysis report
     */
    generateAnalysisReport(analysis) {
        return {
            summary: {
                projectPath: analysis.projectPath,
                timestamp: analysis.timestamp,
                overallScore: analysis.metrics.overallScore,
                overallValid: analysis.overall,
                totalViolations: analysis.layerValidation.violations.length + analysis.logicValidation.violations.length
            },
            breakdown: {
                architecture: {
                    score: analysis.metrics.breakdown.architecture,
                    layerValidation: analysis.layerValidation.overall,
                    violations: analysis.layerValidation.violations.length
                },
                quality: {
                    score: analysis.metrics.breakdown.quality,
                    logicValidation: analysis.logicValidation.overall,
                    violations: analysis.logicValidation.violations.length
                },
                security: {
                    score: analysis.metrics.breakdown.security,
                    violations: analysis.logicValidation.security.violations.length
                },
                performance: {
                    score: analysis.metrics.breakdown.performance,
                    issues: analysis.standardAnalysis.performance ? analysis.standardAnalysis.performance.issues : []
                }
            },
            insights: analysis.integratedInsights,
            recommendations: analysis.recommendations,
            details: {
                layerValidation: analysis.layerValidation,
                logicValidation: analysis.logicValidation,
                standardAnalysis: analysis.standardAnalysis
            }
        };
    }
}

module.exports = AdvancedAnalysisService; 