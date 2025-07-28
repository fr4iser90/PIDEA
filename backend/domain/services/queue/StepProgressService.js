/**
 * StepProgressService - Domain service for step progress tracking
 * Provides comprehensive step-by-step progress monitoring and control
 */

const ServiceLogger = require('@logging/ServiceLogger');

class StepProgressService {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('StepProgressService');
        this.eventBus = dependencies.eventBus;
        
        // Task step progress tracking
        this.taskStepProgress = new Map();
        
        // Step execution history
        this.stepHistory = new Map();
        
        this.logger.info('StepProgressService initialized');
    }

    /**
     * Get comprehensive step progress for a task
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @param {string} userId - User identifier
     * @returns {Object} Step progress with detailed information
     */
    async getTaskStepProgress(projectId, taskId, userId) {
        try {
            this.logger.debug('Getting step progress', { projectId, taskId, userId });

            const taskKey = this.getTaskKey(projectId, taskId);
            const stepProgress = this.taskStepProgress.get(taskKey) || this.initializeTaskStepProgress();
            const stepHistory = this.stepHistory.get(taskKey) || [];

            const progress = {
                projectId,
                taskId,
                userId,
                timestamp: new Date().toISOString(),
                currentStep: stepProgress.currentStep,
                totalSteps: stepProgress.totalSteps,
                completedSteps: stepProgress.completedSteps,
                failedSteps: stepProgress.failedSteps,
                progressPercentage: this.calculateProgressPercentage(stepProgress),
                estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(stepProgress),
                steps: stepProgress.steps.map(step => ({
                    ...step,
                    duration: this.calculateStepDuration(step),
                    status: step.status || 'pending'
                })),
                history: stepHistory.slice(-10), // Last 10 history entries
                metadata: {
                    startedAt: stepProgress.startedAt,
                    lastUpdated: stepProgress.lastUpdated,
                    status: stepProgress.status,
                    errorCount: stepProgress.errorCount,
                    retryCount: stepProgress.retryCount
                }
            };

            this.logger.debug('Step progress retrieved', { 
                projectId, 
                taskId, 
                currentStep: progress.currentStep,
                progressPercentage: progress.progressPercentage
            });

            return progress;

        } catch (error) {
            this.logger.error('Failed to get step progress', { 
                projectId, 
                taskId, 
                userId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Initialize step progress for a task
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @param {Array} steps - Array of step definitions
     * @param {Object} options - Step options
     * @returns {Object} Initialized step progress
     */
    async initializeTaskStepProgress(projectId, taskId, steps = [], options = {}) {
        try {
            this.logger.info('Initializing step progress', { projectId, taskId, stepCount: steps.length });

            const taskKey = this.getTaskKey(projectId, taskId);
            
            const stepProgress = {
                projectId,
                taskId,
                startedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                status: 'initialized',
                currentStep: 0,
                totalSteps: steps.length,
                completedSteps: 0,
                failedSteps: 0,
                errorCount: 0,
                retryCount: 0,
                steps: steps.map((step, index) => ({
                    id: step.id || `step_${index + 1}`,
                    name: step.name || `Step ${index + 1}`,
                    description: step.description || '',
                    status: 'pending',
                    startedAt: null,
                    completedAt: null,
                    duration: 0,
                    progress: 0,
                    error: null,
                    retryCount: 0,
                    maxRetries: step.maxRetries || options.maxRetries || 3,
                    order: index + 1,
                    dependencies: step.dependencies || [],
                    metadata: step.metadata || {}
                }))
            };

            this.taskStepProgress.set(taskKey, stepProgress);
            this.stepHistory.set(taskKey, []);

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('task:step:progress:initialized', {
                    projectId,
                    taskId,
                    stepProgress
                });
            }

            this.logger.info('Step progress initialized', { 
                projectId, 
                taskId, 
                totalSteps: stepProgress.totalSteps 
            });

            return stepProgress;

        } catch (error) {
            this.logger.error('Failed to initialize step progress', { 
                projectId, 
                taskId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Start a specific step
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @param {string} stepId - Step identifier
     * @param {Object} context - Step context
     * @returns {Object} Updated step progress
     */
    async startStep(projectId, taskId, stepId, context = {}) {
        try {
            this.logger.info('Starting step', { projectId, taskId, stepId });

            const taskKey = this.getTaskKey(projectId, taskId);
            const stepProgress = this.taskStepProgress.get(taskKey);
            
            if (!stepProgress) {
                throw new Error(`Step progress not found for task ${taskId}`);
            }

            const step = stepProgress.steps.find(s => s.id === stepId);
            if (!step) {
                throw new Error(`Step ${stepId} not found`);
            }

            // Check dependencies
            const dependenciesMet = await this.checkStepDependencies(stepProgress, step);
            if (!dependenciesMet) {
                throw new Error(`Step dependencies not met for ${stepId}`);
            }

            // Update step status
            step.status = 'running';
            step.startedAt = new Date().toISOString();
            step.progress = 0;
            step.error = null;

            // Update task progress
            stepProgress.currentStep = stepProgress.steps.indexOf(step) + 1;
            stepProgress.status = 'running';
            stepProgress.lastUpdated = new Date().toISOString();

            // Add to history
            this.addToHistory(taskKey, {
                action: 'step_started',
                stepId,
                timestamp: new Date().toISOString(),
                context
            });

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('task:step:started', {
                    projectId,
                    taskId,
                    stepId,
                    step,
                    context
                });
            }

            this.logger.info('Step started', { 
                projectId, 
                taskId, 
                stepId, 
                stepName: step.name 
            });

            return stepProgress;

        } catch (error) {
            this.logger.error('Failed to start step', { 
                projectId, 
                taskId, 
                stepId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Update step progress
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @param {string} stepId - Step identifier
     * @param {number} progress - Progress percentage (0-100)
     * @param {Object} data - Additional step data
     * @returns {Object} Updated step progress
     */
    async updateStepProgress(projectId, taskId, stepId, progress, data = {}) {
        try {
            this.logger.debug('Updating step progress', { 
                projectId, 
                taskId, 
                stepId, 
                progress 
            });

            const taskKey = this.getTaskKey(projectId, taskId);
            const stepProgress = this.taskStepProgress.get(taskKey);
            
            if (!stepProgress) {
                throw new Error(`Step progress not found for task ${taskId}`);
            }

            const step = stepProgress.steps.find(s => s.id === stepId);
            if (!step) {
                throw new Error(`Step ${stepId} not found`);
            }

            // Update step progress
            step.progress = Math.min(100, Math.max(0, progress));
            step.lastUpdated = new Date().toISOString();
            
            // Update task progress
            stepProgress.lastUpdated = new Date().toISOString();

            // Add to history
            this.addToHistory(taskKey, {
                action: 'step_progress',
                stepId,
                progress,
                timestamp: new Date().toISOString(),
                data
            });

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('task:step:progress', {
                    projectId,
                    taskId,
                    stepId,
                    progress,
                    step,
                    data
                });
            }

            return stepProgress;

        } catch (error) {
            this.logger.error('Failed to update step progress', { 
                projectId, 
                taskId, 
                stepId, 
                progress, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Complete a step
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @param {string} stepId - Step identifier
     * @param {Object} result - Step result
     * @returns {Object} Updated step progress
     */
    async completeStep(projectId, taskId, stepId, result = {}) {
        try {
            this.logger.info('Completing step', { projectId, taskId, stepId });

            const taskKey = this.getTaskKey(projectId, taskId);
            const stepProgress = this.taskStepProgress.get(taskKey);
            
            if (!stepProgress) {
                throw new Error(`Step progress not found for task ${taskId}`);
            }

            const step = stepProgress.steps.find(s => s.id === stepId);
            if (!step) {
                throw new Error(`Step ${stepId} not found`);
            }

            // Update step status
            step.status = 'completed';
            step.completedAt = new Date().toISOString();
            step.progress = 100;
            step.result = result;
            step.duration = this.calculateStepDuration(step);

            // Update task progress
            stepProgress.completedSteps++;
            stepProgress.lastUpdated = new Date().toISOString();

            // Check if all steps are completed
            if (stepProgress.completedSteps === stepProgress.totalSteps) {
                stepProgress.status = 'completed';
                stepProgress.completedAt = new Date().toISOString();
            }

            // Add to history
            this.addToHistory(taskKey, {
                action: 'step_completed',
                stepId,
                timestamp: new Date().toISOString(),
                result
            });

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('task:step:completed', {
                    projectId,
                    taskId,
                    stepId,
                    step,
                    result
                });
            }

            this.logger.info('Step completed', { 
                projectId, 
                taskId, 
                stepId, 
                stepName: step.name,
                duration: step.duration 
            });

            return stepProgress;

        } catch (error) {
            this.logger.error('Failed to complete step', { 
                projectId, 
                taskId, 
                stepId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Fail a step
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @param {string} stepId - Step identifier
     * @param {Error} error - Step error
     * @returns {Object} Updated step progress
     */
    async failStep(projectId, taskId, stepId, error) {
        try {
            this.logger.error('Failing step', { projectId, taskId, stepId, error: error.message });

            const taskKey = this.getTaskKey(projectId, taskId);
            const stepProgress = this.taskStepProgress.get(taskKey);
            
            if (!stepProgress) {
                throw new Error(`Step progress not found for task ${taskId}`);
            }

            const step = stepProgress.steps.find(s => s.id === stepId);
            if (!step) {
                throw new Error(`Step ${stepId} not found`);
            }

            // Update step status
            step.status = 'failed';
            step.completedAt = new Date().toISOString();
            step.error = {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            };
            step.duration = this.calculateStepDuration(step);

            // Update task progress
            stepProgress.failedSteps++;
            stepProgress.errorCount++;
            stepProgress.lastUpdated = new Date().toISOString();

            // Check if task should be marked as failed
            if (stepProgress.failedSteps >= stepProgress.totalSteps) {
                stepProgress.status = 'failed';
                stepProgress.completedAt = new Date().toISOString();
            }

            // Add to history
            this.addToHistory(taskKey, {
                action: 'step_failed',
                stepId,
                timestamp: new Date().toISOString(),
                error: step.error
            });

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit('task:step:failed', {
                    projectId,
                    taskId,
                    stepId,
                    step,
                    error: step.error
                });
            }

            return stepProgress;

        } catch (error) {
            this.logger.error('Failed to fail step', { 
                projectId, 
                taskId, 
                stepId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Toggle step status (pause/resume)
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @param {string} stepId - Step identifier
     * @param {string} userId - User identifier
     * @param {string} action - Action to perform ('pause' or 'resume')
     * @returns {Object} Updated step status
     */
    async toggleStepStatus(projectId, taskId, stepId, userId, action) {
        try {
            this.logger.info('Toggling step status', { 
                projectId, 
                taskId, 
                stepId, 
                userId, 
                action 
            });

            const taskKey = this.getTaskKey(projectId, taskId);
            const stepProgress = this.taskStepProgress.get(taskKey);
            
            if (!stepProgress) {
                throw new Error(`Step progress not found for task ${taskId}`);
            }

            const step = stepProgress.steps.find(s => s.id === stepId);
            if (!step) {
                throw new Error(`Step ${stepId} not found`);
            }

            let newStatus;
            switch (action) {
                case 'pause':
                    if (step.status !== 'running') {
                        throw new Error(`Cannot pause step with status ${step.status}`);
                    }
                    newStatus = 'paused';
                    break;
                case 'resume':
                    if (step.status !== 'paused') {
                        throw new Error(`Cannot resume step with status ${step.status}`);
                    }
                    newStatus = 'running';
                    break;
                default:
                    throw new Error(`Invalid action: ${action}`);
            }

            const oldStatus = step.status;
            step.status = newStatus;
            step.lastUpdated = new Date().toISOString();

            // Update task progress
            stepProgress.lastUpdated = new Date().toISOString();

            // Add to history
            this.addToHistory(taskKey, {
                action: `step_${action}d`,
                stepId,
                timestamp: new Date().toISOString(),
                userId,
                oldStatus,
                newStatus
            });

            // Emit event for real-time updates
            if (this.eventBus) {
                this.eventBus.emit(`task:step:${action}d`, {
                    projectId,
                    taskId,
                    stepId,
                    step,
                    userId
                });
            }

            this.logger.info('Step status toggled', { 
                projectId, 
                taskId, 
                stepId, 
                userId, 
                oldStatus, 
                newStatus 
            });

            return {
                success: true,
                stepId,
                oldStatus,
                newStatus,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('Failed to toggle step status', { 
                projectId, 
                taskId, 
                stepId, 
                userId, 
                action, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Get task key for internal storage
     * @param {string} projectId - Project identifier
     * @param {string} taskId - Task identifier
     * @returns {string} Task key
     */
    getTaskKey(projectId, taskId) {
        return `${projectId}:${taskId}`;
    }

    /**
     * Calculate progress percentage
     * @param {Object} stepProgress - Step progress object
     * @returns {number} Progress percentage
     */
    calculateProgressPercentage(stepProgress) {
        if (stepProgress.totalSteps === 0) return 0;
        
        const completedSteps = stepProgress.completedSteps;
        const totalSteps = stepProgress.totalSteps;
        
        return Math.round((completedSteps / totalSteps) * 100);
    }

    /**
     * Calculate estimated time remaining
     * @param {Object} stepProgress - Step progress object
     * @returns {number} Estimated time in milliseconds
     */
    calculateEstimatedTimeRemaining(stepProgress) {
        if (stepProgress.completedSteps === 0) return null;
        
        const completedSteps = stepProgress.completedSteps;
        const totalSteps = stepProgress.totalSteps;
        const elapsedTime = Date.now() - new Date(stepProgress.startedAt).getTime();
        
        const averageTimePerStep = elapsedTime / completedSteps;
        const remainingSteps = totalSteps - completedSteps;
        
        return Math.round(averageTimePerStep * remainingSteps);
    }

    /**
     * Calculate step duration
     * @param {Object} step - Step object
     * @returns {number} Duration in milliseconds
     */
    calculateStepDuration(step) {
        if (!step.startedAt) return 0;
        
        const endTime = step.completedAt ? new Date(step.completedAt) : new Date();
        const startTime = new Date(step.startedAt);
        
        return endTime.getTime() - startTime.getTime();
    }

    /**
     * Check step dependencies
     * @param {Object} stepProgress - Step progress object
     * @param {Object} step - Step object
     * @returns {boolean} True if dependencies are met
     */
    async checkStepDependencies(stepProgress, step) {
        if (!step.dependencies || step.dependencies.length === 0) {
            return true;
        }

        for (const dependencyId of step.dependencies) {
            const dependency = stepProgress.steps.find(s => s.id === dependencyId);
            if (!dependency || dependency.status !== 'completed') {
                return false;
            }
        }

        return true;
    }

    /**
     * Add entry to history
     * @param {string} taskKey - Task key
     * @param {Object} entry - History entry
     */
    addToHistory(taskKey, entry) {
        const history = this.stepHistory.get(taskKey) || [];
        history.push(entry);
        
        // Keep only last 100 entries
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
        
        this.stepHistory.set(taskKey, history);
    }

    /**
     * Initialize task step progress
     * @returns {Object} Initial step progress
     */
    initializeTaskStepProgress() {
        return {
            startedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            status: 'initialized',
            currentStep: 0,
            totalSteps: 0,
            completedSteps: 0,
            failedSteps: 0,
            errorCount: 0,
            retryCount: 0,
            steps: []
        };
    }
}

module.exports = StepProgressService; 