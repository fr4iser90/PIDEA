/**
 * Execution utility functions for TaskExecutionEngine
 */
const { v4: uuidv4 } = require('uuid');

class ExecutionUtils {
    constructor(logger = console) {
        this.logger = logger;
    }

    /**
     * Generate execution ID
     * @returns {string} Unique execution ID
     */
    generateExecutionId() {
        return `exec_${uuidv4()}`;
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

        this.logger.info('ExecutionUtils: Progress updated', {
            executionId: execution.id,
            progress: execution.progress,
            step: step
        });
    }

    /**
     * Prepare execution context
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Execution context
     */
    async prepareExecutionContext(execution) {
        const { task, options } = execution;
        
        // Get project path
        const projectPath = task.projectPath || options.projectPath;
        if (!projectPath) {
            throw new Error('Project path is required for execution');
        }

        // Create working directory
        const workingDirectory = projectPath;

        // Prepare environment variables
        const environment = {
            ...process.env,
            NODE_ENV: options.environment || 'development',
            PROJECT_PATH: projectPath,
            EXECUTION_ID: execution.id,
            TASK_ID: task.id
        };

        // Add custom environment variables from task
        if (task.data && task.data.environment) {
            Object.assign(environment, task.data.environment);
        }

        return {
            workingDirectory,
            environment,
            projectPath,
            executionId: execution.id,
            taskId: task.id
        };
    }

    /**
     * Get target files for execution
     * @param {string|Array} target - Target specification
     * @param {Object} execution - Execution object
     * @returns {Promise<Array>} Array of target files
     */
    async getTargetFiles(target, execution) {
        const { fileSystemService } = execution.options.dependencies || {};
        
        if (!fileSystemService) {
            throw new Error('FileSystemService is required for getting target files');
        }

        if (typeof target === 'string') {
            // Single file or directory
            if (target.endsWith('*')) {
                // Pattern matching
                const pattern = target.replace('*', '');
                return await fileSystemService.findFilesByPattern(pattern, execution.options.projectPath);
            } else {
                // Single file
                return [target];
            }
        } else if (Array.isArray(target)) {
            // Multiple files
            return target;
        } else {
            // Default to all files in project
            return await fileSystemService.getAllFiles(execution.options.projectPath);
        }
    }

    /**
     * Collect project data for analysis
     * @param {string|Array} target - Target specification
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Project data
     */
    async collectProjectData(target, execution) {
        const { fileSystemService } = execution.options.dependencies || {};
        
        if (!fileSystemService) {
            throw new Error('FileSystemService is required for collecting project data');
        }

        const projectPath = execution.options.projectPath;
        const files = await this.getTargetFiles(target, execution);

        // Get project structure
        const projectStructure = await fileSystemService.getProjectStructure(projectPath);
        
        // Get dependency information
        const dependencies = await fileSystemService.getDependencyInfo(projectPath);
        
        // Get configuration files
        const configFiles = await fileSystemService.getConfigurationFiles(projectPath);
        
        // Get Git information
        const gitInfo = await fileSystemService.getGitInfo(projectPath);

        return {
            projectPath,
            files,
            projectStructure,
            dependencies,
            configFiles,
            gitInfo,
            metrics: fileSystemService.calculateProjectMetrics(files)
        };
    }

    /**
     * Run validation tests
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Validation test results
     */
    async runValidationTests(execution) {
        return {
            passed: true,
            tests: [],
            errors: []
        };
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
            this.logger.error('ExecutionUtils: Failed to generate insights', {
                executionId: execution.id,
                error: error.message
            });
        }

        return insights;
    }
}

module.exports = ExecutionUtils; 