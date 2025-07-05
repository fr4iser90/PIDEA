/**
 * VibeCoderAnalyzeHandler - Handles VibeCoder analyze commands
 * Implements the Command Handler pattern for comprehensive analysis orchestration
 */
class VibeCoderAnalyzeHandler {
    constructor(dependencies = {}) {
        this.validateDependencies(dependencies);
        
        this.commandBus = dependencies.commandBus;
        this.eventBus = dependencies.eventBus;
        this.logger = dependencies.logger;
        this.taskRepository = dependencies.taskRepository;
        
        this.handlerId = this.generateHandlerId();
    }

    /**
     * Validate handler dependencies
     * @param {Object} dependencies - Handler dependencies
     * @throws {Error} If dependencies are invalid
     */
    validateDependencies(dependencies) {
        const required = [
            'commandBus',
            'eventBus',
            'logger',
            'taskRepository'
        ];

        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`Missing required dependency: ${dep}`);
            }
        }
    }

    /**
     * Generate unique handler ID
     * @returns {string} Unique handler ID
     */
    generateHandlerId() {
        return `vibecoder_analyze_handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle VibeCoderAnalyzeCommand
     * @param {VibeCoderAnalyzeCommand} command - VibeCoder analyze command
     * @returns {Promise<Object>} Analysis result
     */
    async handle(command) {
        try {
            this.logger.info('VibeCoderAnalyzeHandler: Starting comprehensive analysis', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                requestedBy: command.requestedBy,
                analysisTypes: command.getAnalysisTypes()
            });

            // Validate command
            const validationResult = await this.validateCommand(command);
            if (!validationResult.isValid) {
                throw new Error(`Command validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Create analysis task
            const task = await this.createAnalysisTask(command);

            // Create execution record
            const execution = await this.createExecutionRecord(task, command);

            // Publish analysis started event
            await this.publishAnalysisStartedEvent(execution, command);

            // Execute sub-commands
            const results = await this.executeSubCommands(command, execution);

            // Consolidate results
            const consolidatedResult = await this.consolidateResults(results, command);

            // Update execution record
            await this.updateExecutionRecord(execution, consolidatedResult);

            // Update task status
            await this.updateTaskStatus(task, consolidatedResult);

            // Publish analysis completed event
            await this.publishAnalysisCompletedEvent(execution, consolidatedResult, command);

            // Log success
            this.logger.info('VibeCoderAnalyzeHandler: Comprehensive analysis completed successfully', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                projectPath: command.projectPath,
                executionId: execution.id,
                duration: consolidatedResult.duration,
                analysisTypes: command.getAnalysisTypes(),
                subCommandCount: results.length
            });

            return {
                success: true,
                analysisId: execution.id,
                taskId: task.id,
                projectPath: command.projectPath,
                analysisTypes: command.getAnalysisTypes(),
                results: consolidatedResult.results,
                consolidatedAnalysis: consolidatedResult.consolidatedAnalysis,
                metrics: consolidatedResult.metrics,
                recommendations: consolidatedResult.recommendations,
                duration: consolidatedResult.duration,
                metadata: consolidatedResult.metadata,
                warnings: consolidatedResult.warnings,
                errors: consolidatedResult.errors
            };

        } catch (error) {
            await this.handleAnalysisError(error, command);
            throw error;
        }
    }

    /**
     * Validate command
     * @param {VibeCoderAnalyzeCommand} command - VibeCoder analyze command
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

        // Validate analysis types
        const analysisTypes = command.getAnalysisTypes();
        if (analysisTypes.length === 0) {
            errors.push('At least one analysis type must be specified');
        }

        // Validate options
        if (command.options) {
            if (command.options.timeout && (typeof command.options.timeout !== 'number' || command.options.timeout < 60000)) {
                errors.push('Timeout must be at least 60000ms');
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
     * Create analysis task
     * @param {VibeCoderAnalyzeCommand} command - VibeCoder analyze command
     * @returns {Promise<Object>} Created task
     */
    async createAnalysisTask(command) {
        const task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'vibecoder_analyze',
            status: 'pending',
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
                commandId: command.commandId,
                analysisTypes: command.getAnalysisTypes(),
                analysisConfiguration: command.getAnalysisConfiguration(),
                outputConfiguration: command.getOutputConfiguration()
            }
        };

        await this.taskRepository.create(task);
        return task;
    }

    /**
     * Create execution record
     * @param {Object} task - Analysis task
     * @param {VibeCoderAnalyzeCommand} command - VibeCoder analyze command
     * @returns {Promise<Object>} Created execution record
     */
    async createExecutionRecord(task, command) {
        const execution = {
            id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            taskId: task.id,
            commandId: command.commandId,
            status: 'running',
            startedAt: new Date(),
            estimatedDuration: this.getEstimatedTime(command),
            metadata: command.getMetadata()
        };

        return execution;
    }

    /**
     * Execute sub-commands
     * @param {VibeCoderAnalyzeCommand} command - VibeCoder analyze command
     * @param {Object} execution - Execution record
     * @returns {Promise<Array>} Array of sub-command results
     */
    async executeSubCommands(command, execution) {
        const subCommands = command.getSubCommands();
        const results = [];
        const startTime = Date.now();

        this.logger.info('VibeCoderAnalyzeHandler: Executing sub-commands', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            subCommandCount: subCommands.length
        });

        // Execute sub-commands in parallel for better performance
        const subCommandPromises = subCommands.map(async (subCommand, index) => {
            try {
                this.logger.info('VibeCoderAnalyzeHandler: Executing sub-command', {
                    handlerId: this.handlerId,
                    commandId: command.commandId,
                    subCommandIndex: index,
                    subCommandType: subCommand.type
                });

                // Create sub-command instance
                const SubCommandClass = await this.getSubCommandClass(subCommand.type);
                const subCommandInstance = new SubCommandClass(subCommand.params);

                // Execute sub-command
                const result = await this.commandBus.execute(subCommandInstance);

                return {
                    index,
                    type: subCommand.type,
                    success: true,
                    result,
                    duration: Date.now() - startTime
                };

            } catch (error) {
                this.logger.error('VibeCoderAnalyzeHandler: Sub-command failed', {
                    handlerId: this.handlerId,
                    commandId: command.commandId,
                    subCommandIndex: index,
                    subCommandType: subCommand.type,
                    error: error.message
                });

                return {
                    index,
                    type: subCommand.type,
                    success: false,
                    error: error.message,
                    duration: Date.now() - startTime
                };
            }
        });

        // Wait for all sub-commands to complete
        const subCommandResults = await Promise.allSettled(subCommandPromises);
        
        // Process results
        subCommandResults.forEach((promiseResult, index) => {
            if (promiseResult.status === 'fulfilled') {
                results.push(promiseResult.value);
            } else {
                results.push({
                    index,
                    type: subCommands[index]?.type || 'unknown',
                    success: false,
                    error: promiseResult.reason?.message || 'Unknown error',
                    duration: Date.now() - startTime
                });
            }
        });

        return results;
    }

    /**
     * Get sub-command class
     * @param {string} commandType - Command type
     * @returns {Promise<Class>} Command class
     */
    async getSubCommandClass(commandType) {
        switch (commandType) {
            case 'AnalyzeRepoStructureCommand':
                return require('../../commands/analyze/AnalyzeRepoStructureCommand');
            case 'AnalyzeArchitectureCommand':
                return require('../../commands/analyze/AnalyzeArchitectureCommand');
            case 'AnalyzeTechStackCommand':
                return require('../../commands/analyze/AnalyzeTechStackCommand');
            case 'AnalyzeCodeQualityCommand':
                return require('../../commands/analyze/AnalyzeCodeQualityCommand');
            case 'AnalyzeDependenciesCommand':
                return require('../../commands/analyze/AnalyzeDependenciesCommand');
            default:
                throw new Error(`Unknown command type: ${commandType}`);
        }
    }

    /**
     * Consolidate results from sub-commands
     * @param {Array} results - Array of sub-command results
     * @param {VibeCoderAnalyzeCommand} command - VibeCoder analyze command
     * @returns {Promise<Object>} Consolidated result
     */
    async consolidateResults(results, command) {
        const startTime = Date.now();
        
        try {
            const successfulResults = results.filter(r => r.success);
            const failedResults = results.filter(r => !r.success);

            // Consolidate analysis data
            const consolidatedAnalysis = {
                projectPath: command.projectPath,
                analysisTypes: command.getAnalysisTypes(),
                timestamp: new Date(),
                summary: {
                    totalSubCommands: results.length,
                    successfulSubCommands: successfulResults.length,
                    failedSubCommands: failedResults.length,
                    successRate: (successfulResults.length / results.length) * 100
                }
            };

            // Consolidate metrics
            const metrics = this.consolidateMetrics(successfulResults);

            // Consolidate recommendations
            const recommendations = this.consolidateRecommendations(successfulResults, command);

            // Generate warnings and errors
            const warnings = this.generateWarnings(successfulResults, failedResults);
            const errors = this.generateErrors(failedResults);

            const duration = Date.now() - startTime;

            return {
                results: successfulResults,
                failedResults,
                consolidatedAnalysis,
                metrics,
                recommendations,
                duration,
                metadata: {
                    handlerId: this.handlerId,
                    commandId: command.commandId,
                    projectPath: command.projectPath,
                    analysisTypes: command.getAnalysisTypes(),
                    consolidationTime: duration
                },
                warnings,
                errors
            };

        } catch (error) {
            this.logger.error('VibeCoderAnalyzeHandler: Result consolidation failed', {
                handlerId: this.handlerId,
                commandId: command.commandId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Consolidate metrics from sub-command results
     * @param {Array} successfulResults - Array of successful results
     * @returns {Object} Consolidated metrics
     */
    consolidateMetrics(successfulResults) {
        const consolidatedMetrics = {
            totalDuration: 0,
            averageDuration: 0,
            totalFiles: 0,
            totalDirectories: 0,
            totalSize: 0,
            analysisCounts: {}
        };

        successfulResults.forEach(result => {
            if (result.result && result.result.metrics) {
                const metrics = result.result.metrics;
                
                consolidatedMetrics.totalDuration += result.duration || 0;
                
                if (metrics.totalFiles) {
                    consolidatedMetrics.totalFiles += metrics.totalFiles;
                }
                
                if (metrics.totalDirectories) {
                    consolidatedMetrics.totalDirectories += metrics.totalDirectories;
                }
                
                if (metrics.totalSize) {
                    consolidatedMetrics.totalSize += metrics.totalSize;
                }

                // Count analysis types
                const analysisType = result.type.replace('Analyze', '').replace('Command', '').toLowerCase();
                consolidatedMetrics.analysisCounts[analysisType] = (consolidatedMetrics.analysisCounts[analysisType] || 0) + 1;
            }
        });

        if (successfulResults.length > 0) {
            consolidatedMetrics.averageDuration = consolidatedMetrics.totalDuration / successfulResults.length;
        }

        return consolidatedMetrics;
    }

    /**
     * Consolidate recommendations from sub-command results
     * @param {Array} successfulResults - Array of successful results
     * @param {VibeCoderAnalyzeCommand} command - VibeCoder analyze command
     * @returns {Array} Consolidated recommendations
     */
    consolidateRecommendations(successfulResults, command) {
        const recommendations = [];
        const recommendationMap = new Map();

        successfulResults.forEach(result => {
            if (result.result && result.result.recommendations) {
                result.result.recommendations.forEach(rec => {
                    const key = `${rec.type}_${rec.severity}`;
                    if (!recommendationMap.has(key)) {
                        recommendationMap.set(key, {
                            ...rec,
                            count: 1,
                            sources: [result.type]
                        });
                    } else {
                        const existing = recommendationMap.get(key);
                        existing.count++;
                        existing.sources.push(result.type);
                    }
                });
            }
        });

        // Convert map to array and sort by severity
        recommendationMap.forEach(rec => {
            recommendations.push(rec);
        });

        // Sort by severity (high, medium, low)
        const severityOrder = { high: 3, medium: 2, low: 1 };
        recommendations.sort((a, b) => {
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) return severityDiff;
            return b.count - a.count;
        });

        return recommendations;
    }

    /**
     * Generate warnings from results
     * @param {Array} successfulResults - Array of successful results
     * @param {Array} failedResults - Array of failed results
     * @returns {Array} Generated warnings
     */
    generateWarnings(successfulResults, failedResults) {
        const warnings = [];

        // Warning for failed sub-commands
        if (failedResults.length > 0) {
            warnings.push({
                type: 'failed_sub_commands',
                severity: 'medium',
                message: `${failedResults.length} sub-command(s) failed`,
                details: failedResults.map(f => ({ type: f.type, error: f.error }))
            });
        }

        // Warning for long execution time
        const totalDuration = successfulResults.reduce((sum, r) => sum + (r.duration || 0), 0);
        if (totalDuration > 300000) { // 5 minutes
            warnings.push({
                type: 'long_execution',
                severity: 'low',
                message: 'Analysis took longer than expected',
                details: { totalDuration, expectedMax: 300000 }
            });
        }

        return warnings;
    }

    /**
     * Generate errors from failed results
     * @param {Array} failedResults - Array of failed results
     * @returns {Array} Generated errors
     */
    generateErrors(failedResults) {
        return failedResults.map(failed => ({
            type: 'sub_command_failed',
            severity: 'high',
            message: `Sub-command ${failed.type} failed`,
            details: { type: failed.type, error: failed.error }
        }));
    }

    /**
     * Get estimated analysis time
     * @param {VibeCoderAnalyzeCommand} command - Command
     * @returns {number} Estimated time in milliseconds
     */
    getEstimatedTime(command) {
        const analysisTypes = command.getAnalysisTypes();
        
        // Base time: 2 minutes
        let estimatedTime = 120000;
        
        // Add time based on analysis types
        analysisTypes.forEach(type => {
            switch (type) {
                case 'repo_structure':
                    estimatedTime += 60000; // 1 minute
                    break;
                case 'architecture':
                    estimatedTime += 90000; // 1.5 minutes
                    break;
                case 'tech_stack':
                    estimatedTime += 45000; // 45 seconds
                    break;
                case 'code_quality':
                    estimatedTime += 90000; // 1.5 minutes
                    break;
                case 'dependencies':
                    estimatedTime += 45000; // 45 seconds
                    break;
            }
        });
        
        return Math.min(estimatedTime, 900000); // Max 15 minutes
    }

    /**
     * Update execution record
     * @param {Object} execution - Execution record
     * @param {Object} result - Analysis result
     * @returns {Promise<void>}
     */
    async updateExecutionRecord(execution, result) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.duration = result.duration;
        execution.result = result;
        
        this.logger.info('VibeCoderAnalyzeHandler: Execution record updated', {
            handlerId: this.handlerId,
            executionId: execution.id,
            status: execution.status,
            duration: execution.duration
        });
    }

    /**
     * Update task status
     * @param {Object} task - Analysis task
     * @param {Object} result - Analysis result
     * @returns {Promise<void>}
     */
    async updateTaskStatus(task, result) {
        task.status = 'completed';
        task.updatedAt = new Date();
        task.result = result;
        
        await this.taskRepository.update(task.id, task);
    }

    /**
     * Publish analysis started event
     * @param {Object} execution - Execution record
     * @param {VibeCoderAnalyzeCommand} command - Command
     * @returns {Promise<void>}
     */
    async publishAnalysisStartedEvent(execution, command) {
        await this.eventBus.publish('vibecoder.analysis.started', {
            type: 'vibecoder_analyze',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            analysisTypes: command.getAnalysisTypes(),
            timestamp: new Date()
        });
    }

    /**
     * Publish analysis completed event
     * @param {Object} execution - Execution record
     * @param {Object} result - Analysis result
     * @param {VibeCoderAnalyzeCommand} command - Command
     * @returns {Promise<void>}
     */
    async publishAnalysisCompletedEvent(execution, result, command) {
        await this.eventBus.publish('vibecoder.analysis.completed', {
            type: 'vibecoder_analyze',
            executionId: execution.id,
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            analysisTypes: command.getAnalysisTypes(),
            result: result,
            timestamp: new Date()
        });
    }

    /**
     * Handle analysis error
     * @param {Error} error - Error object
     * @param {VibeCoderAnalyzeCommand} command - Command
     * @returns {Promise<void>}
     */
    async handleAnalysisError(error, command) {
        this.logger.error('VibeCoderAnalyzeHandler: Analysis failed', {
            handlerId: this.handlerId,
            commandId: command.commandId,
            projectPath: command.projectPath,
            error: error.message,
            stack: error.stack
        });

        // Publish error event
        await this.eventBus.publish('vibecoder.analysis.failed', {
            type: 'vibecoder_analyze',
            commandId: command.commandId,
            projectPath: command.projectPath,
            requestedBy: command.requestedBy,
            analysisTypes: command.getAnalysisTypes(),
            error: error.message,
            timestamp: new Date()
        });
    }

    /**
     * Get handler metadata
     * @returns {Object} Handler metadata
     */
    getMetadata() {
        return {
            handlerId: this.handlerId,
            type: 'VibeCoderAnalyzeHandler',
            version: '1.0.0',
            supportedCommands: ['VibeCoderAnalyzeCommand'],
            capabilities: ['comprehensive_analysis', 'sub_command_orchestration', 'result_consolidation']
        };
    }
}

module.exports = VibeCoderAnalyzeHandler; 