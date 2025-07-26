/**
 * ParallelExecutionEngine - Domain Layer
 * Executes non-critical steps in parallel with timeout handling and error isolation
 * Implements parallel execution optimization for StepRegistry
 */

const ServiceLogger = require('@logging/ServiceLogger');

class ParallelExecutionEngine {
  constructor(options = {}) {
    this.logger = options.logger || new ServiceLogger('ParallelExecutionEngine');
    this.maxConcurrency = options.maxConcurrency || 10;
    this.timeout = options.timeout || 30000; // 30 seconds
    this.retryAttempts = options.retryAttempts || 1;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    this.stepRegistry = options.stepRegistry; // Store the StepRegistry instance
    
    // Execution statistics
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      timeoutExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
  }

  /**
   * Execute multiple steps in parallel
   * @param {Array<string>} stepNames - Array of step names to execute
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Array<Object>} Array of execution results
   */
  async executeStepsParallel(stepNames, context = {}, options = {}) {
    try {
      this.logger.info('Starting parallel step execution', {
        totalSteps: stepNames.length,
        maxConcurrency: this.maxConcurrency,
        timeout: this.timeout,
        context: this.getContextSummary(context)
      });

      const startTime = Date.now();
      
      // Create execution promises with timeout and retry
      const executionPromises = stepNames.map(stepName => 
        this.executeStepWithTimeout(stepName, context, options)
      );

      // Execute all steps in parallel
      const results = await Promise.allSettled(executionPromises);
      
      // Process results
      const processedResults = this.processExecutionResults(results, stepNames);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Update statistics
      this.updateStatistics(processedResults, totalDuration);

      this.logger.info('Parallel step execution completed', {
        totalSteps: stepNames.length,
        successful: processedResults.filter(r => r.success).length,
        failed: processedResults.filter(r => !r.success).length,
        totalDuration: `${totalDuration}ms`,
        averageDuration: `${Math.round(totalDuration / stepNames.length)}ms`
      });

      return processedResults;

    } catch (error) {
      this.logger.error('Parallel step execution failed:', error.message);
      
      // Return failed results for all steps
      return stepNames.map(stepName => ({
        success: false,
        error: error.message,
        step: stepName,
        timestamp: new Date(),
        executionMode: 'parallel',
        duration: 0
      }));
    }
  }

  /**
   * Execute a single step with timeout and retry
   * @param {string} stepName - Step name to execute
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Step execution result
   */
  async executeStepWithTimeout(stepName, context, options) {
    const stepStartTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Step "${stepName}" execution timeout after ${this.timeout}ms`));
        }, this.timeout);
      });

      // Create execution promise with retry
      const executionPromise = this.executeStepWithRetry(stepName, context, options);

      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      return {
        ...result,
        step: stepName,
        duration: stepDuration,
        executionMode: 'parallel',
        timestamp: new Date()
      };

    } catch (error) {
      const stepEndTime = Date.now();
      const stepDuration = stepEndTime - stepStartTime;

      this.logger.error(`Step "${stepName}" execution failed:`, error.message);

      return {
        success: false,
        error: error.message,
        step: stepName,
        duration: stepDuration,
        executionMode: 'parallel',
        timestamp: new Date(),
        isTimeout: error.message.includes('timeout')
      };
    }
  }

  /**
   * Execute a step with retry logic
   * @param {string} stepName - Step name to execute
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Step execution result
   */
  async executeStepWithRetry(stepName, context, options) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts + 1; attempt++) {
      try {
        // Use the provided stepRegistry or create a new one
        const stepRegistry = this.stepRegistry || new (require('../StepRegistry'))();
        
        // Execute step
        const result = await stepRegistry.executeStep(stepName, context, options);
        
        if (result.success) {
          return result;
        } else {
          lastError = new Error(result.error || 'Step execution failed');
        }
        
      } catch (error) {
        lastError = error;
        
        // Log retry attempt
        if (attempt <= this.retryAttempts) {
          this.logger.warn(`Step "${stepName}" attempt ${attempt} failed, retrying...`, error.message);
          
          // Wait before retry
          if (this.retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          }
        }
      }
    }
    
    // All attempts failed
    throw lastError || new Error(`Step "${stepName}" execution failed after ${this.retryAttempts + 1} attempts`);
  }

  /**
   * Process execution results from Promise.allSettled
   * @param {Array} results - Results from Promise.allSettled
   * @param {Array<string>} stepNames - Original step names
   * @returns {Array<Object>} Processed results
   */
  processExecutionResults(results, stepNames) {
    return results.map((result, index) => {
      const stepName = stepNames[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          step: stepName,
          duration: 0,
          executionMode: 'parallel',
          timestamp: new Date(),
          isRejected: true
        };
      }
    });
  }

  /**
   * Update execution statistics
   * @param {Array<Object>} results - Execution results
   * @param {number} totalDuration - Total execution duration
   */
  updateStatistics(results, totalDuration) {
    this.stats.totalExecutions += results.length;
    this.stats.totalExecutionTime += totalDuration;
    
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const timeoutResults = results.filter(r => r.isTimeout);
    
    this.stats.successfulExecutions += successfulResults.length;
    this.stats.failedExecutions += failedResults.length;
    this.stats.timeoutExecutions += timeoutResults.length;
    
    // Calculate average execution time
    if (this.stats.totalExecutions > 0) {
      this.stats.averageExecutionTime = Math.round(this.stats.totalExecutionTime / this.stats.totalExecutions);
    }
  }

  /**
   * Get context summary for logging
   * @param {Object} context - Execution context
   * @returns {Object} Context summary
   */
  getContextSummary(context) {
    return {
      hasUserId: !!context.userId,
      hasProjectId: !!context.projectId,
      hasWorkflowId: !!context.workflowId,
      hasTaskId: !!context.taskId,
      executionMode: context.executionMode,
      priority: context.priority
    };
  }

  /**
   * Get execution statistics
   * @returns {Object} Execution statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalExecutions > 0 
        ? (this.stats.successfulExecutions / this.stats.totalExecutions * 100).toFixed(2) + '%'
        : '0%',
      failureRate: this.stats.totalExecutions > 0 
        ? (this.stats.failedExecutions / this.stats.totalExecutions * 100).toFixed(2) + '%'
        : '0%',
      timeoutRate: this.stats.totalExecutions > 0 
        ? (this.stats.timeoutExecutions / this.stats.totalExecutions * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset execution statistics
   */
  resetStatistics() {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      timeoutExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
    
    this.logger.info('Parallel execution statistics reset');
  }

  /**
   * Update engine configuration
   * @param {Object} config - New configuration
   */
  updateConfiguration(config) {
    if (config.maxConcurrency !== undefined) {
      this.maxConcurrency = config.maxConcurrency;
    }
    
    if (config.timeout !== undefined) {
      this.timeout = config.timeout;
    }
    
    if (config.retryAttempts !== undefined) {
      this.retryAttempts = config.retryAttempts;
    }
    
    if (config.retryDelay !== undefined) {
      this.retryDelay = config.retryDelay;
    }
    
    this.logger.info('Parallel execution engine configuration updated', {
      maxConcurrency: this.maxConcurrency,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay
    });
  }

  /**
   * Health check for parallel execution engine
   * @returns {Object} Health status
   */
  healthCheck() {
    const stats = this.getStatistics();
    
    return {
      status: 'healthy',
      engine: 'ParallelExecutionEngine',
      configuration: {
        maxConcurrency: this.maxConcurrency,
        timeout: this.timeout,
        retryAttempts: this.retryAttempts,
        retryDelay: this.retryDelay
      },
      statistics: stats,
      timestamp: new Date()
    };
  }
}

module.exports = ParallelExecutionEngine; 