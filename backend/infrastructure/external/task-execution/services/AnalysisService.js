/**
 * Analysis service for TaskExecutionEngine
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');

class AnalysisService {
    constructor(dependencies = {}, logger = console) {
        this.aiService = dependencies.aiService;
        this.fileSystemService = dependencies.fileSystemService;
        this.logger = logger;
    }

    /**
     * Execute analysis task
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Analysis result
     */
    async executeAnalysisTask(execution) {
        try {
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.RUNNING;
            execution.currentStep = 'Analyzing project structure';
            execution.progress = 10;

            // Get project path
            const projectPath = execution.task.projectPath || execution.options.projectPath;
            if (!projectPath) {
                throw new Error('Project path is required for analysis task');
            }

            // Update progress
            this.updateExecutionProgress(execution, 20, 'Collecting project data');

            // Perform AI-powered analysis
            const analysisResult = await this.aiService.analyzeProject(projectPath, {
                userId: execution.options.userId,
                model: execution.options.aiModel || 'gpt-4'
            });

            // Update progress
            this.updateExecutionProgress(execution, 60, 'Processing analysis results');

            // Generate insights and recommendations
            const insights = await this.generateInsights(analysisResult, execution);

            // Update progress
            this.updateExecutionProgress(execution, 90, 'Finalizing analysis');

            const result = {
                analysis: analysisResult.analysis,
                insights,
                projectStructure: analysisResult.projectStructure,
                recommendations: analysisResult.structuredData?.recommendations || [],
                metrics: {
                    filesAnalyzed: analysisResult.projectStructure.files.length,
                    dependencies: Object.keys(analysisResult.projectStructure.dependencies.dependencies || {}).length,
                    analysisDuration: Date.now() - execution.startTime.getTime()
                }
            };

            this.updateExecutionProgress(execution, 100, 'Analysis completed');

            return result;

        } catch (error) {
            this.logger.error('AnalysisService: Analysis task failed', {
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate insights from analysis result
     * @param {Object} analysisResult - Analysis result
     * @param {Object} execution - Execution object
     * @returns {Promise<Array>} Array of insights
     */
    async generateInsights(analysisResult, execution) {
        const insights = [];

        try {
            // Generate insights based on analysis data
            if (analysisResult.analysis) {
                // Code quality insights
                if (analysisResult.analysis.complexity > 10) {
                    insights.push({
                        type: 'complexity',
                        severity: 'high',
                        message: 'High cyclomatic complexity detected',
                        recommendation: 'Consider breaking down complex functions into smaller, more manageable pieces'
                    });
                }

                // Performance insights
                if (analysisResult.analysis.performanceIssues) {
                    insights.push({
                        type: 'performance',
                        severity: 'medium',
                        message: 'Performance issues detected',
                        recommendation: 'Review and optimize slow operations'
                    });
                }

                // Security insights
                if (analysisResult.analysis.securityIssues) {
                    insights.push({
                        type: 'security',
                        severity: 'high',
                        message: 'Security vulnerabilities detected',
                        recommendation: 'Address security issues immediately'
                    });
                }

                // Maintainability insights
                if (analysisResult.analysis.maintainabilityScore < 0.7) {
                    insights.push({
                        type: 'maintainability',
                        severity: 'medium',
                        message: 'Low maintainability score',
                        recommendation: 'Improve code organization and documentation'
                    });
                }
            }

            // Add project-specific insights
            if (analysisResult.projectStructure) {
                const { totalFiles, totalSize } = analysisResult.projectStructure;
                
                if (totalFiles > 1000) {
                    insights.push({
                        type: 'project_size',
                        severity: 'low',
                        message: 'Large project detected',
                        recommendation: 'Consider modularizing the codebase'
                    });
                }

                if (totalSize > 100 * 1024 * 1024) { // 100MB
                    insights.push({
                        type: 'project_size',
                        severity: 'medium',
                        message: 'Large project size detected',
                        recommendation: 'Review and optimize file sizes'
                    });
                }
            }

        } catch (error) {
            this.logger.error('AnalysisService: Failed to generate insights', {
                executionId: execution.id,
                error: error.message
            });
        }

        return insights;
    }

    /**
     * Update execution progress
     * @param {Object} execution - Execution object
     * @param {number} progress - Progress percentage
     * @param {string} step - Current step description
     */
    updateExecutionProgress(execution, progress, step) {
        execution.progress = Math.min(100, Math.max(0, progress));
        execution.currentStep = step;
        execution.lastUpdate = new Date();

        this.logger.info('AnalysisService: Progress updated', {
            executionId: execution.id,
            progress: execution.progress,
            step: step
        });
    }
}

module.exports = AnalysisService; 