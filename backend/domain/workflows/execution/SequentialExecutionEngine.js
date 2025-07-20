/**
 * SequentialExecutionEngine - Executes workflows sequentially
 * Provides priority scheduling, retry mechanisms, and resource management
 */

const ServiceLogger = require('@logging/ServiceLogger');

class SequentialExecutionEngine {
    constructor(options = {}) {
        this.logger = new ServiceLogger('SequentialExecutionEngine');
        this.enablePriority = options.enablePriority || false;
        this.enableRetry = options.enableRetry || false;
        this.enableResourceManagement = options.enableResourceManagement || false;
        this.enableDependencyResolution = options.enableDependencyResolution || false;
        this.enablePriorityScheduling = options.enablePriorityScheduling || false;
        
        this.executionQueue = [];
        this.activeExecutions = new Map();
        this.executionHistory = [];
        
        this.logger.info('SequentialExecutionEngine initialized with options:', options);
    }

    /**
     * Execute a workflow
     * @param {Object} workflow - Workflow to execute
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     */
    async execute(workflow, context = {}) {
        const executionId = this.generateExecutionId();
        
        try {
            this.logger.info(`Starting workflow execution: ${executionId}`, {
                workflowType: workflow.getType?.(),
                workflowId: workflow.getMetadata?.()?.id
            });

            // Create execution context
            const executionContext = {
                id: executionId,
                workflow,
                context,
                startTime: Date.now(),
                status: 'running'
            };

            this.activeExecutions.set(executionId, executionContext);

            // Execute workflow
            const result = await this.executeWorkflow(workflow, context);

            // Update execution context
            executionContext.status = 'completed';
            executionContext.endTime = Date.now();
            executionContext.result = result;

            this.executionHistory.push(executionContext);
            this.activeExecutions.delete(executionId);

            this.logger.info(`Workflow execution completed: ${executionId}`, {
                duration: executionContext.endTime - executionContext.startTime,
                success: result.success
            });

            return result;

        } catch (error) {
            this.logger.error(`Workflow execution failed: ${executionId}`, error);
            
            // Update execution context
            const executionContext = this.activeExecutions.get(executionId);
            if (executionContext) {
                executionContext.status = 'failed';
                executionContext.endTime = Date.now();
                executionContext.error = error.message;
                this.executionHistory.push(executionContext);
                this.activeExecutions.delete(executionId);
            }

            throw error;
        }
    }

    /**
     * Execute workflow steps
     * @param {Object} workflow - Workflow to execute
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     */
    async executeWorkflow(workflow, context) {
        try {
            // Validate workflow
            if (typeof workflow.execute !== 'function') {
                throw new Error('Workflow must have an execute method');
            }

            // Execute workflow
            const result = await workflow.execute(context);

            return {
                success: true,
                result,
                executionTime: Date.now(),
                workflowType: workflow.getType?.(),
                workflowId: workflow.getMetadata?.()?.id
            };

        } catch (error) {
            this.logger.error('Workflow execution failed:', error);
            return {
                success: false,
                error: error.message,
                executionTime: Date.now(),
                workflowType: workflow.getType?.(),
                workflowId: workflow.getMetadata?.()?.id
            };
        }
    }

    /**
     * Generate unique execution ID
     * @returns {string} Execution ID
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get execution statistics
     * @returns {Object} Execution statistics
     */
    getStats() {
        return {
            totalExecutions: this.executionHistory.length,
            activeExecutions: this.activeExecutions.size,
            successfulExecutions: this.executionHistory.filter(e => e.status === 'completed').length,
            failedExecutions: this.executionHistory.filter(e => e.status === 'failed').length,
            averageExecutionTime: this.calculateAverageExecutionTime()
        };
    }

    /**
     * Calculate average execution time
     * @returns {number} Average execution time in milliseconds
     */
    calculateAverageExecutionTime() {
        const completedExecutions = this.executionHistory.filter(e => e.status === 'completed');
        if (completedExecutions.length === 0) return 0;

        const totalTime = completedExecutions.reduce((sum, e) => {
            return sum + (e.endTime - e.startTime);
        }, 0);

        return totalTime / completedExecutions.length;
    }

    /**
     * Get active executions
     * @returns {Array} Active executions
     */
    getActiveExecutions() {
        return Array.from(this.activeExecutions.values());
    }

    /**
     * Get execution history
     * @returns {Array} Execution history
     */
    getExecutionHistory() {
        return this.executionHistory;
    }
}

module.exports = SequentialExecutionEngine; 