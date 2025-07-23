/**
 * AdvancedAnalysisHandler - Handler for comprehensive analysis with layer and logic validation
 */
const AdvancedAnalysisCommand = require('@categories/analysis/AdvancedAnalysisCommand');
const AdvancedAnalysisService = require('@domain/services/analysis/AdvancedAnalysisService');
const TaskRepository = require('@repositories/TaskRepository');
const TaskExecutionRepository = require('@repositories/TaskExecutionRepository');
const AnalysisRepository = require('@repositories/AnalysisRepository');

class AdvancedAnalysisHandler {
    constructor(dependencies = {}) {
        this.handlerId = `advanced-analysis-${Date.now()}`;
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus || { emit: () => {} };
        this.advancedAnalysisService = dependencies.advancedAnalysisService || new AdvancedAnalysisService(dependencies);
        this.taskRepository = dependencies.taskRepository || new TaskRepository();
        this.executionRepository = dependencies.executionRepository || new TaskExecutionRepository();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
    }

    /**
     * Handle advanced analysis command
     * @param {AdvancedAnalysisCommand} command - Advanced analysis command
     * @returns {Promise<Object>} Analysis results
     */
    async handle(command) {
        let execution = null;
        
        try {
            this.logger.info('AdvancedAnalysisHandler: Starting advanced analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                requestedBy: command.requestedBy
            });

            // Validate command
            const validationResult = await this.validateCommand(command);
            if (!validationResult.isValid) {
                throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Validate project path
            await this.validateProjectPath(command.projectPath);

            // Create analysis task
            const task = await this.createAnalysisTask(command);

            // Create execution record
            execution = await this.createExecutionRecord(task, command);

            // Publish analysis started event
            await this.publishAnalysisStartedEvent(execution, command);

            // Perform advanced analysis
            const result = await this.performAdvancedAnalysis(command, execution);

            // Update execution record
            await this.updateExecutionRecord(execution, result);

            // Update task status
            await this.updateTaskStatus(task, result);

            // Save analysis result to repository
            const savedAnalysis = await this.saveAnalysisResult(command, result);

            // Publish analysis completed event
            await this.publishAnalysisCompletedEvent(execution, result, command);

            this.logger.info('AdvancedAnalysisHandler: Advanced analysis completed successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                executionId: execution.id,
                duration: result.duration,
                overallScore: result.analysis.metrics.overallScore
            });

            return {
                success: true,
                commandId: command.commandId,
                executionId: execution.id,
                analysis: result.analysis,
                report: result.report,
                duration: result.duration
            };

        } catch (error) {
            this.logger.error('AdvancedAnalysisHandler: Advanced analysis failed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                error: error.message
            });

            // Update execution record with error
            if (execution) {
                await this.updateExecutionRecordWithError(execution, error);
            }

            throw error;
        }
    }

    /**
     * Validate command
     * @param {AdvancedAnalysisCommand} command - Advanced analysis command
     * @returns {Promise<Object>} Validation result
     */
    async validateCommand(command) {
        const errors = [];
        const warnings = [];

        // Validate command structure
        if (!command.projectPath) {
            errors.push('Project path is required');
        }

        if (!command.requestedBy) {
            errors.push('Requested by is required');
        }

        // Validate options
        if (command.options) {
            if (command.options.timeout && (typeof command.options.timeout !== 'number' || command.options.timeout < 60000)) {
                errors.push('Timeout must be at least 60 seconds');
            }

            if (command.options.exportFormat && !['json', 'markdown', 'html', 'pdf'].includes(command.options.exportFormat)) {
                errors.push('Invalid export format');
            }
        }

        // Check business rules
        const businessValidation = command.validateBusinessRules();
        if (!businessValidation.isValid) {
            errors.push(...businessValidation.errors);
        }
        warnings.push(...businessValidation.warnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate project path
     * @param {string} projectPath - Project path
     */
    async validateProjectPath(projectPath) {
        const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
        
        try {
            const stats = await fs.stat(projectPath);
            if (!stats.isDirectory()) {
                throw new Error('Project path must be a directory');
            }
        } catch (error) {
            throw new Error(`Invalid project path: ${error.message}`);
        }
    }

    /**
     * Create analysis task
     * @param {AdvancedAnalysisCommand} command - Advanced analysis command
     * @returns {Promise<Object>} Created task
     */
    async createAnalysisTask(command) {
        const task = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `Advanced Analysis: ${command.projectPath}`,
            description: command.getDescription(),
            type: 'analysis',
            priority: command.getPriority(),
            status: 'pending',
            assignedTo: command.requestedBy,
            createdAt: new Date(),
            scheduledAt: command.scheduledAt,
            estimatedDuration: command.getEstimatedDuration(),
            metadata: {
                commandId: command.commandId,
                projectPath: command.projectPath,
                analysisOptions: command.getAnalysisOptions(),
                resourceRequirements: command.getResourceRequirements()
            }
        };

        await this.taskRepository.save(task);
        return task;
    }

    /**
     * Create execution record
     * @param {Object} task - Analysis task
     * @param {AdvancedAnalysisCommand} command - Advanced analysis command
     * @returns {Promise<Object>} Created execution
     */
    async createExecutionRecord(task, command) {
        const execution = {
            id: `execution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            taskId: task.id,
            commandId: command.commandId,
            status: 'running',
            startedAt: new Date(),
            currentStep: 'Initializing advanced analysis',
            progress: 0,
            metadata: {
                handlerId: this.handlerId,
                projectPath: command.projectPath,
                analysisOptions: command.getAnalysisOptions()
            }
        };

        await this.executionRepository.save(execution);
        return execution;
    }

    /**
     * Publish analysis started event
     * @param {Object} execution - Execution record
     * @param {AdvancedAnalysisCommand} command - Advanced analysis command
     */
    async publishAnalysisStartedEvent(execution, command) {
        this.eventBus.emit('advanced-analysis:started', {
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            timestamp: new Date()
        });
    }

    /**
     * Perform advanced analysis
     * @param {AdvancedAnalysisCommand} command - Advanced analysis command
     * @param {Object} execution - Execution record
     * @returns {Promise<Object>} Analysis results
     */
    async performAdvancedAnalysis(command, execution) {
        const startTime = Date.now();
        
        try {
            this.logger.info('AdvancedAnalysisHandler: Performing advanced analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath
            });

            // Update execution progress
            await this.updateExecutionProgress(execution, 10, 'Starting advanced analysis');

            // Perform advanced analysis
            const analysis = await this.advancedAnalysisService.performAdvancedAnalysis(
                command.projectPath,
                command.getAnalysisOptions()
            );

            // Update execution progress
            await this.updateExecutionProgress(execution, 80, 'Analysis completed, generating report');

            // Generate report if requested
            let report = null;
            if (command.options.generateReport) {
                report = this.advancedAnalysisService.generateAnalysisReport(analysis);
            }

            // Update execution progress
            await this.updateExecutionProgress(execution, 100, 'Advanced analysis completed');

            const duration = Date.now() - startTime;

            return {
                analysis,
                report,
                duration,
                metadata: {
                    handlerId: this.handlerId,
                    executionId: execution.id,
                    projectPath: command.projectPath,
                    analysisOptions: command.getAnalysisOptions(),
                    outputConfiguration: command.getOutputConfiguration()
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('AdvancedAnalysisHandler: Advanced analysis failed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                duration,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update execution record
     * @param {Object} execution - Execution record
     * @param {Object} result - Analysis result
     */
    async updateExecutionRecord(execution, result) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.duration = result.duration;
        execution.result = {
            success: true,
            analysis: result.analysis,
            report: result.report
        };
        execution.metadata = {
            ...execution.metadata,
            ...result.metadata
        };

        await this.executionRepository.save(execution);
    }

    /**
     * Update execution record with error
     * @param {Object} execution - Execution record
     * @param {Error} error - Error
     */
    async updateExecutionRecordWithError(execution, error) {
        execution.status = 'failed';
        execution.completedAt = new Date();
        execution.error = {
            message: error.message,
            stack: error.stack
        };

        await this.executionRepository.save(execution);
    }

    /**
     * Update task status
     * @param {Object} task - Analysis task
     * @param {Object} result - Analysis result
     */
    async updateTaskStatus(task, result) {
        task.status = 'completed';
        task.completedAt = new Date();
        task.duration = result.duration;
        task.result = {
            success: true,
            overallScore: result.analysis.metrics.overallScore,
            violations: result.analysis.layerValidation.violations.length + result.analysis.logicValidation.violations.length
        };

        await this.taskRepository.save(task);
    }

    /**
     * Publish analysis completed event
     * @param {Object} execution - Execution record
     * @param {Object} result - Analysis result
     * @param {AdvancedAnalysisCommand} command - Advanced analysis command
     */
    async publishAnalysisCompletedEvent(execution, result, command) {
        this.eventBus.emit('advanced-analysis:completed', {
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            duration: result.duration,
            overallScore: result.analysis.metrics.overallScore,
            violations: result.analysis.layerValidation.violations.length + result.analysis.logicValidation.violations.length,
            timestamp: new Date()
        });
    }

    /**
     * Update execution progress
     * @param {Object} execution - Execution record
     * @param {number} progress - Progress percentage
     * @param {string} step - Current step
     */
    async updateExecutionProgress(execution, progress, step) {
        execution.progress = progress;
        execution.currentStep = step;
        execution.updatedAt = new Date();

        await this.executionRepository.save(execution);

        // Publish progress event
        this.eventBus.emit('advanced-analysis:progress', {
            executionId: execution.id,
            progress,
            step,
            timestamp: new Date()
        });
    }

    /**
     * Save analysis result to repository
     * @param {AdvancedAnalysisCommand} command - Advanced analysis command
     * @param {Object} result - Analysis result
     */
    async saveAnalysisResult(command, result) {
        try {
            // Check if we already have recent analysis data
            const existingAnalysis = await this.checkExistingAnalysis(command.projectPath, 'advanced-analysis');
            
            // Compare with existing data to see if update is needed
            const needsUpdate = await this.shouldUpdateAnalysis(existingAnalysis, result);
            
            if (!needsUpdate) {
                this.logger.info('AdvancedAnalysisHandler: Analysis data is up-to-date, skipping save', {
                    handlerId: this.handlerId,
                    commandId: command.commandId,
                    projectPath: command.projectPath,
                    existingAnalysisId: existingAnalysis?.id
                });
                return existingAnalysis;
            }

            const analysisResult = {
                id: existingAnalysis?.id || `analysis-${command.commandId}`,
                projectId: command.projectPath,
                analysisType: 'advanced-analysis',
                projectPath: command.projectPath,
                commandId: command.commandId,
                data: result.analysis,
                report: result.report,
                metadata: {
                    handlerId: this.handlerId,
                    executionId: result.metadata?.executionId,
                    analysisOptions: command.getAnalysisOptions(),
                    outputConfiguration: command.getOutputConfiguration(),
                    duration: result.duration,
                    overallScore: result.analysis.metrics?.overallScore || 0,
                    violations: (result.analysis.layerValidation?.violations?.length || 0) + 
                               (result.analysis.logicValidation?.violations?.length || 0),
                    lastUpdated: new Date().toISOString(),
                    updateReason: existingAnalysis ? 'data_changed' : 'new_analysis'
                },
                timestamp: new Date(),
                status: 'completed'
            };

            await this.analysisRepository.save(analysisResult);

            this.logger.info('AdvancedAnalysisHandler: Analysis result saved to repository', {
                handlerId: this.handlerId,
                analysisId: analysisResult.id,
                commandId: command.commandId,
                projectPath: command.projectPath,
                isUpdate: !!existingAnalysis,
                updateReason: analysisResult.metadata.updateReason
            });

            return analysisResult;

        } catch (error) {
            this.logger.error('AdvancedAnalysisHandler: Failed to save analysis result to repository', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                error: error.message
            });
            // Don't throw error to avoid breaking the main flow
        }
    }

    /**
     * Check if analysis already exists for this project
     * @param {string} projectPath - Project path
     * @param {string} analysisType - Analysis type
     * @returns {Promise<Object|null>} Existing analysis or null
     */
    async checkExistingAnalysis(projectPath, analysisType) {
        try {
            const existingAnalyses = await this.analysisRepository.findByProjectIdAndType(projectPath, analysisType);
            return existingAnalyses.length > 0 ? existingAnalyses[0] : null;
        } catch (error) {
            this.logger.warn('AdvancedAnalysisHandler: Failed to check existing analysis', {
                projectPath,
                analysisType,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Determine if analysis should be updated based on data changes
     * @param {Object} existingAnalysis - Existing analysis data
     * @param {Object} newResult - New analysis result
     * @returns {Promise<boolean>} Whether update is needed
     */
    async shouldUpdateAnalysis(existingAnalysis, newResult) {
        if (!existingAnalysis) {
            return true; // No existing analysis, definitely need to save
        }

        // Check if analysis is recent (within last hour)
        const lastUpdate = new Date(existingAnalysis.timestamp || existingAnalysis.created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (lastUpdate > oneHourAgo) {
            this.logger.info('AdvancedAnalysisHandler: Analysis is recent, checking for data changes', {
                lastUpdate: lastUpdate.toISOString(),
                analysisId: existingAnalysis.id
            });
        }

        // Compare key metrics to see if significant changes occurred
        const existingData = existingAnalysis.data || existingAnalysis.result_data || {};
        const newData = newResult.analysis;

        // Compare overall score (if changed by more than 5 points, consider it significant)
        const existingScore = existingData.metrics?.overallScore || 0;
        const newScore = newData.metrics?.overallScore || 0;
        const scoreDiff = Math.abs(newScore - existingScore);

        if (scoreDiff > 5) {
            this.logger.info('AdvancedAnalysisHandler: Significant score change detected, updating analysis', {
                existingScore,
                newScore,
                scoreDiff
            });
            return true;
        }

        // Compare violation counts
        const existingViolations = (existingData.layerValidation?.violations?.length || 0) + 
                                  (existingData.logicValidation?.violations?.length || 0);
        const newViolations = (newData.layerValidation?.violations?.length || 0) + 
                             (newData.logicValidation?.violations?.length || 0);

        if (existingViolations !== newViolations) {
            this.logger.info('AdvancedAnalysisHandler: Violation count changed, updating analysis', {
                existingViolations,
                newViolations
            });
            return true;
        }

        // Check if analysis is older than 24 hours (force update)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (lastUpdate < oneDayAgo) {
            this.logger.info('AdvancedAnalysisHandler: Analysis is older than 24 hours, updating', {
                lastUpdate: lastUpdate.toISOString()
            });
            return true;
        }

        this.logger.info('AdvancedAnalysisHandler: No significant changes detected, skipping update', {
            existingScore,
            newScore,
            existingViolations,
            newViolations
        });

        return false;
    }
}

module.exports = AdvancedAnalysisHandler; 