/**
 * Refactoring service for TaskExecutionEngine
 */
const EXECUTION_CONSTANTS = require('../constants/ExecutionConstants');
const RefactoringUtils = require('../utils/RefactoringUtils');
const { logger } = require('@infrastructure/logging/Logger');

class RefactoringService {
    constructor(dependencies = {}, logger = console) {
        this.aiService = dependencies.aiService;
        this.fileSystemService = dependencies.fileSystemService;
        this.refactoringUtils = new RefactoringUtils(logger);
        this.logger = logger;
    }

    /**
     * Execute refactoring task
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Refactoring result
     */
    async executeRefactoringTask(execution) {
        try {
            execution.status = EXECUTION_CONSTANTS.EXECUTION_STATUS.RUNNING;
            execution.currentStep = 'Analyzing code for refactoring opportunities';
            execution.progress = 10;

            const { target, refactoringType } = execution.task.data;

            // Update progress
            this.updateExecutionProgress(execution, 20, 'Identifying refactoring opportunities');

            // Identify refactoring opportunities
            const opportunities = await this.identifyRefactoringOpportunities(target, refactoringType, execution);

            // Update progress
            this.updateExecutionProgress(execution, 40, 'Generating refactoring plans');

            // Generate refactoring plans
            const refactoringPlans = await this.generateRefactoringPlans(opportunities, execution);

            // Update progress
            this.updateExecutionProgress(execution, 60, 'Applying refactoring changes');

            // Apply refactoring if requested
            let appliedRefactoring = [];
            if (execution.options.autoApply) {
                appliedRefactoring = await this.applyRefactoring(refactoringPlans, execution);
            }

            // Update progress
            this.updateExecutionProgress(execution, 80, 'Validating refactoring changes');

            // Validate refactoring changes
            const validationResults = await this.validateRefactoringChanges(appliedRefactoring, execution);

            // Update progress
            this.updateExecutionProgress(execution, 90, 'Generating refactoring report');

            const result = {
                opportunities,
                refactoringPlans,
                appliedRefactoring,
                validationResults,
                summary: {
                    opportunitiesFound: opportunities.length,
                    plansGenerated: refactoringPlans.length,
                    changesApplied: appliedRefactoring.length,
                    validationPassed: validationResults.passed
                },
                metrics: {
                    refactoringDuration: Date.now() - execution.startTime.getTime()
                }
            };

            this.updateExecutionProgress(execution, 100, 'Refactoring completed');

            return result;

        } catch (error) {
            this.logger.error('RefactoringService: Refactoring task failed', {
                executionId: execution.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Identify refactoring opportunities
     * @param {string|Array} target - Target specification
     * @param {string} refactoringType - Type of refactoring
     * @param {Object} execution - Execution object
     * @returns {Promise<Array>} Array of refactoring opportunities
     */
    async identifyRefactoringOpportunities(target, refactoringType, execution) {
        const opportunities = [];
        const files = await this.getTargetFiles(target, execution);

        for (const file of files) {
            if (this.fileSystemService.isCodeFile(file)) {
                try {
                    const content = await this.fileSystemService.readFile(file);
                    const fileOpportunities = await this.refactoringUtils.analyzeFileForRefactoring(
                        content, file, refactoringType
                    );
                    opportunities.push(...fileOpportunities);
                } catch (error) {
                    this.logger.error('RefactoringService: Failed to analyze file for refactoring', {
                        file: file,
                        error: error.message
                    });
                }
            }
        }

        return opportunities;
    }

    /**
     * Generate refactoring plans
     * @param {Array} opportunities - Refactoring opportunities
     * @param {Object} execution - Execution object
     * @returns {Promise<Array>} Array of refactoring plans
     */
    async generateRefactoringPlans(opportunities, execution) {
        const plans = [];

        for (const opportunity of opportunities) {
            try {
                let steps = [];

                switch (opportunity.type) {
                    case EXECUTION_CONSTANTS.REFACTORING_TYPES.EXTRACT_METHOD:
                        steps = await this.refactoringUtils.generateExtractMethodSteps(opportunity);
                        break;
                    case EXECUTION_CONSTANTS.REFACTORING_TYPES.EXTRACT_CLASS:
                        steps = await this.refactoringUtils.generateExtractClassSteps(opportunity);
                        break;
                    case EXECUTION_CONSTANTS.REFACTORING_TYPES.RENAME:
                        steps = await this.refactoringUtils.generateRenameSteps(opportunity);
                        break;
                    case EXECUTION_CONSTANTS.REFACTORING_TYPES.MOVE_METHOD:
                        steps = await this.refactoringUtils.generateMoveMethodSteps(opportunity);
                        break;
                }

                plans.push({
                    opportunity,
                    steps,
                    estimatedEffort: steps.length * 5, // 5 minutes per step
                    priority: opportunity.confidence > 0.8 ? 'high' : 'medium'
                });

            } catch (error) {
                this.logger.error('RefactoringService: Failed to generate refactoring plan', {
                    opportunity: opportunity,
                    error: error.message
                });
            }
        }

        return plans;
    }

    /**
     * Apply refactoring
     * @param {Array} refactoringPlans - Refactoring plans
     * @param {Object} execution - Execution object
     * @returns {Promise<Array>} Array of applied refactoring changes
     */
    async applyRefactoring(refactoringPlans, execution) {
        const appliedChanges = [];

        for (const plan of refactoringPlans) {
            try {
                const changes = [];

                for (const step of plan.steps) {
                    const stepResult = await this.refactoringUtils.applyRefactoringStep(step, plan.opportunity);
                    changes.push(stepResult);
                }

                appliedChanges.push({
                    plan,
                    changes,
                    appliedAt: new Date(),
                    success: true
                });

            } catch (error) {
                this.logger.error('RefactoringService: Failed to apply refactoring', {
                    plan: plan,
                    error: error.message
                });

                appliedChanges.push({
                    plan,
                    changes: [],
                    appliedAt: new Date(),
                    success: false,
                    error: error.message
                });
            }
        }

        return appliedChanges;
    }

    /**
     * Validate refactoring changes
     * @param {Array} appliedRefactoring - Applied refactoring changes
     * @param {Object} execution - Execution object
     * @returns {Promise<Object>} Validation results
     */
    async validateRefactoringChanges(appliedRefactoring, execution) {
        const validationResults = {
            passed: true,
            issues: [],
            warnings: []
        };

        for (const change of appliedRefactoring) {
            if (change.success) {
                for (const stepChange of change.changes) {
                    const validation = await this.refactoringUtils.validateRefactoringChange(stepChange);
                    
                    if (!validation.passed) {
                        validationResults.passed = false;
                        validationResults.issues.push(...validation.issues);
                    }
                    
                    validationResults.warnings.push(...validation.warnings);
                }
            } else {
                validationResults.passed = false;
                validationResults.issues.push(`Failed to apply refactoring: ${change.error}`);
            }
        }

        return validationResults;
    }

    /**
     * Get target files for execution
     * @param {string|Array} target - Target specification
     * @param {Object} execution - Execution object
     * @returns {Promise<Array>} Array of target files
     */
    async getTargetFiles(target, execution) {
        if (typeof target === 'string') {
            // Single file or directory
            if (target.endsWith('*')) {
                // Pattern matching
                const pattern = target.replace('*', '');
                return await this.fileSystemService.findFilesByPattern(pattern, execution.options.projectPath);
            } else {
                // Single file
                return [target];
            }
        } else if (Array.isArray(target)) {
            // Multiple files
            return target;
        } else {
            // Default to all files in project
            return await this.fileSystemService.getAllFiles(execution.options.projectPath);
        }
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

        this.logger.info('RefactoringService: Progress updated', {
            executionId: execution.id,
            progress: execution.progress,
            step: step
        });
    }
}

module.exports = RefactoringService; 