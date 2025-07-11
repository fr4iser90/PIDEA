/**
 * SequentialExecutionEngine - Enhanced sequential execution engine for workflow execution
 * Provides core execution functionality with optimization, resource management, and caching
 */
const ExecutionContext = require('./ExecutionContext');
const ExecutionResult = require('./ExecutionResult');
const ExecutionQueue = require('./ExecutionQueue');
const ExecutionScheduler = require('./ExecutionScheduler');
const { ExecutionException } = require('./exceptions/ExecutionException');

// Optimization and Resource Management Components
const WorkflowOptimizer = require('./WorkflowOptimizer');
const ResourceManager = require('./ResourceManager');
const ExecutionCache = require('./ExecutionCache');
const ExecutionMetrics = require('./ExecutionMetrics');
const ExecutionPredictor = require('./ExecutionPredictor');

/**
 * Enhanced sequential execution engine for workflow execution
 */
class SequentialExecutionEngine {
  constructor(options = {}) {
    this.maxQueueSize = options.maxQueueSize || 50;
    this.executionTimeout = options.executionTimeout || 300000; // 5 minutes
    this.retryAttempts = options.retryAttempts || 2;
    
    // Core components
    this.executionQueue = new ExecutionQueue({
      maxSize: this.maxQueueSize,
      enablePriority: options.enablePriority !== false,
      enableRetry: options.enableRetry !== false,
      maxRetries: this.retryAttempts
    });
    
    this.executionScheduler = new ExecutionScheduler({
      maxConcurrentExecutions: options.maxConcurrentExecutions || 10,
      enableResourceManagement: options.enableResourceManagement !== false,
      enableDependencyResolution: options.enableDependencyResolution !== false,
      enablePriorityScheduling: options.enablePriorityScheduling !== false
    });
    
    // Optimization and Resource Management Components
    this.workflowOptimizer = new WorkflowOptimizer({
      enableOptimization: options.enableOptimization !== false,
      enableCaching: options.enableOptimizationCaching !== false,
      enableLearning: options.enableOptimizationLearning !== false,
      logger: options.logger
    });
    
    this.resourceManager = new ResourceManager({
      maxMemoryUsage: options.maxMemoryUsage || 512,
      maxCpuUsage: options.maxCpuUsage || 80,
      maxConcurrentExecutions: options.maxConcurrentExecutions || 5,
      enableResourceMonitoring: options.enableResourceMonitoring !== false,
      logger: options.logger
    });
    
    this.executionCache = new ExecutionCache({
      enableCaching: options.enableCaching !== false,
      maxSize: options.cacheMaxSize || 1000,
      ttl: options.cacheTtl || 3600000,
      logger: options.logger
    });
    
    this.executionMetrics = new ExecutionMetrics({
      enableMetrics: options.enableMetrics !== false,
      enableRealTimeMetrics: options.enableRealTimeMetrics !== false,
      logger: options.logger
    });
    
    this.executionPredictor = new ExecutionPredictor({
      enablePrediction: options.enablePrediction !== false,
      logger: options.logger
    });
    
    // Execution state
    this.activeExecutions = new Map();
    this.executionStrategies = new Map();
    
    // Initialize strategies
    this.initializeStrategies();
    
    this.logger = options.logger || console;
  }

  /**
   * Initialize execution strategies
   */
  initializeStrategies() {
    const BasicSequentialStrategy = require('./strategies/BasicSequentialStrategy');
    const SimpleSequentialStrategy = require('./strategies/SimpleSequentialStrategy');
    
    this.executionStrategies.set('basic', new BasicSequentialStrategy());
    this.executionStrategies.set('simple', new SimpleSequentialStrategy());
  }

  /**
   * Execute workflow with enhanced optimization and resource management
   * @param {IWorkflow} workflow - Workflow to execute
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} options - Execution options
   * @returns {Promise<ExecutionResult>} Execution result
   */
  async executeWorkflow(workflow, context, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    try {
      this.logger.info('SequentialExecutionEngine: Starting enhanced workflow execution', {
        executionId,
        workflowName: workflow.getMetadata().name,
        strategy: options.strategy || 'basic'
      });

      // Record execution start in metrics
      this.executionMetrics.recordExecutionStart(executionId, {
        name: workflow.getMetadata().name,
        strategy: options.strategy || 'basic'
      });

      // Check cache for existing result
      const cachedResult = await this.executionCache.getCachedResult(workflow, context);
      if (cachedResult) {
        this.logger.info('SequentialExecutionEngine: Using cached result', {
          executionId,
          cacheHit: true
        });
        
        this.executionMetrics.recordExecutionEnd(executionId, cachedResult);
        return cachedResult;
      }

      // Predict execution time and resource requirements
      const prediction = await this.executionPredictor.predictExecutionTime(workflow, context, options);
      const resourcePrediction = await this.executionPredictor.predictResourceRequirements(workflow, context);
      
      this.logger.info('SequentialExecutionEngine: Execution prediction', {
        executionId,
        predictedTime: prediction.executionTime,
        confidence: prediction.confidence,
        resourceRequirements: resourcePrediction
      });

      // Allocate resources
      const allocatedResources = await this.resourceManager.allocateResources(executionId, resourcePrediction);
      
      this.logger.info('SequentialExecutionEngine: Resources allocated', {
        executionId,
        allocatedResources
      });

      // Optimize workflow
      const optimizedWorkflow = await this.workflowOptimizer.optimizeWorkflow(workflow, context);
      
      this.logger.info('SequentialExecutionEngine: Workflow optimized', {
        executionId,
        originalSteps: workflow.getMetadata().steps?.length || 0,
        optimizedSteps: optimizedWorkflow.getMetadata().steps?.length || 0
      });

      // Determine execution strategy
      const strategy = this.determineExecutionStrategy(optimizedWorkflow, context, options);
      
      // Create execution context
      const executionContext = new ExecutionContext({
        id: executionId,
        workflow: optimizedWorkflow,
        context,
        strategy,
        startTime,
        options: {
          ...options,
          prediction,
          resourcePrediction,
          allocatedResources
        }
      });

      // Register execution
      this.activeExecutions.set(executionId, executionContext);

      // Schedule execution
      const scheduledExecution = await this.executionScheduler.schedule(executionContext);

      // Execute workflow
      const result = await this.executeWithStrategy(executionContext, scheduledExecution);

      // Cache successful results
      if (result && result.success !== false) {
        await this.executionCache.cacheResult(workflow, context, result, {
          ttl: options.cacheTtl,
          excludeSensitive: options.excludeSensitiveFromCache
        });
      }

      // Learn from execution
      await this.executionPredictor.learnFromExecution(executionId, optimizedWorkflow, context, result, prediction);
      await this.workflowOptimizer.learnFromExecution(executionId, result);

      // Record execution end in metrics
      this.executionMetrics.recordExecutionEnd(executionId, result);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('SequentialExecutionEngine: Workflow execution failed', {
        executionId,
        error: error.message,
        duration
      });

      // Record error in metrics
      this.executionMetrics.recordError(executionId, 'execution', error);

      throw new ExecutionException('Workflow execution failed', error);
    } finally {
      // Release resources
      await this.resourceManager.releaseResources(executionId);
      
      // Cleanup
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Determine execution strategy
   * @param {IWorkflow} workflow - Workflow to execute
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} options - Execution options
   * @returns {ExecutionStrategy} Execution strategy
   */
  determineExecutionStrategy(workflow, context, options) {
    // Use specified strategy if provided
    if (options.strategy && this.executionStrategies.has(options.strategy)) {
      return this.executionStrategies.get(options.strategy);
    }

    // Default to basic strategy
    return this.executionStrategies.get('basic');
  }

  /**
   * Execute workflow with specific strategy
   * @param {ExecutionContext} executionContext - Execution context
   * @param {Object} scheduledExecution - Scheduled execution
   * @returns {Promise<ExecutionResult>} Execution result
   */
  async executeWithStrategy(executionContext, scheduledExecution) {
    const { strategy, workflow, context } = executionContext;

    // Update context with execution information
    context.setData('executionId', executionContext.getId());
    context.setData('executionStrategy', strategy.name);
    context.setData('scheduledExecution', scheduledExecution);

    // Execute with strategy
    return await strategy.execute(workflow, context, executionContext);
  }

  /**
   * Generate execution ID
   * @returns {string} Execution ID
   */
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution status
   * @param {string} executionId - Execution ID
   * @returns {Object} Execution status
   */
  getExecutionStatus(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return { status: 'not_found' };
    }

    return {
      status: 'active',
      executionId,
      workflowName: execution.getWorkflow().getMetadata().name,
      strategy: execution.getStrategy().name,
      startTime: execution.startTime,
      duration: Date.now() - execution.startTime
    };
  }

  /**
   * Get enhanced system metrics
   * @returns {Object} Enhanced system metrics
   */
  async getSystemMetrics() {
    const queueStats = this.executionQueue.getStatistics();
    const schedulerStats = this.executionScheduler.getStatistics();
    const optimizationStats = this.workflowOptimizer.getOptimizationStatistics();
    const resourceStats = await this.resourceManager.getResourceStatistics();
    const cacheStats = this.executionCache.getStatistics();
    const metricsStats = this.executionMetrics.getMetricsSummary();
    const predictionStats = this.executionPredictor.getPredictionStatistics();
    
    return {
      // Core metrics
      activeExecutions: this.activeExecutions.size,
      maxQueueSize: this.maxQueueSize,
      queueLength: queueStats.queueLength,
      processingLength: queueStats.processingLength,
      completedLength: queueStats.completedLength,
      failedLength: queueStats.failedLength,
      scheduledExecutions: schedulerStats.scheduledExecutions,
      resourceUtilization: schedulerStats.resourceUtilization,
      averageWaitTime: queueStats.averageWaitTime,
      averageProcessingTime: queueStats.averageProcessingTime,
      
      // Optimization metrics
      optimization: {
        enabled: optimizationStats.enabled,
        cacheSize: optimizationStats.cacheSize,
        rulesCount: optimizationStats.rulesCount,
        learning: optimizationStats.enabledLearning
      },
      
      // Resource management metrics
      resourceManagement: {
        utilization: resourceStats.utilization,
        allocations: resourceStats.allocations,
        averageMemory: resourceStats.averageMemory,
        averageCpu: resourceStats.averageCpu
      },
      
      // Cache metrics
      cache: {
        hitRate: cacheStats.hitRatePercentage,
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        enabled: cacheStats.enabled
      },
      
      // Execution metrics
      metrics: {
        totalExecutions: metricsStats.aggregated.totalExecutions,
        successfulExecutions: metricsStats.aggregated.successfulExecutions,
        failedExecutions: metricsStats.aggregated.failedExecutions,
        averageExecutionTime: metricsStats.aggregated.averageExecutionTime,
        errorRate: metricsStats.aggregated.errorRate,
        throughput: metricsStats.aggregated.throughput
      },
      
      // Prediction metrics
      prediction: {
        enabled: predictionStats.enabled,
        totalPredictions: predictionStats.totalPredictions,
        accuracy: predictionStats.accuracy
      }
    };
  }

  /**
   * Get execution queue statistics
   * @returns {Object} Queue statistics
   */
  getQueueStatistics() {
    return this.executionQueue.getStatistics();
  }

  /**
   * Get scheduler statistics
   * @returns {Object} Scheduler statistics
   */
  getSchedulerStatistics() {
    return this.executionScheduler.getStatistics();
  }

  /**
   * Get resource pool status
   * @returns {Object} Resource pool status
   */
  getResourcePoolStatus() {
    return this.executionScheduler.getResourcePoolStatus();
  }

  /**
   * Get ready executions
   * @returns {Array} Ready executions
   */
  getReadyExecutions() {
    return this.executionScheduler.getReadyExecutions();
  }

  /**
   * Cancel execution
   * @param {string} executionId - Execution ID
   * @returns {boolean} True if cancelled
   */
  cancelExecution(executionId) {
    // Cancel in scheduler
    const cancelled = this.executionScheduler.cancelExecution(executionId);
    
    // Remove from active executions
    this.activeExecutions.delete(executionId);
    
    this.logger.info('SequentialExecutionEngine: Execution cancelled', {
      executionId,
      cancelled
    });
    
    return cancelled;
  }

  /**
   * Get execution by ID
   * @param {string} executionId - Execution ID
   * @returns {ExecutionContext|null} Execution context
   */
  getExecution(executionId) {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * Get all active executions
   * @returns {Array<ExecutionContext>} Active executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution strategy by name
   * @param {string} strategyName - Strategy name
   * @returns {ExecutionStrategy|null} Execution strategy
   */
  getStrategy(strategyName) {
    return this.executionStrategies.get(strategyName) || null;
  }

  /**
   * Register execution strategy
   * @param {string} name - Strategy name
   * @param {ExecutionStrategy} strategy - Execution strategy
   */
  registerStrategy(name, strategy) {
    this.executionStrategies.set(name, strategy);
    this.logger.info('SequentialExecutionEngine: Strategy registered', { name });
  }

  /**
   * Get all registered strategies
   * @returns {Array<string>} Strategy names
   */
  getRegisteredStrategies() {
    return Array.from(this.executionStrategies.keys());
  }

  /**
   * Update engine configuration
   * @param {Object} config - New configuration
   */
  updateConfiguration(config) {
    if (config.maxQueueSize !== undefined) {
      this.maxQueueSize = config.maxQueueSize;
    }
    
    if (config.executionTimeout !== undefined) {
      this.executionTimeout = config.executionTimeout;
    }
    
    if (config.retryAttempts !== undefined) {
      this.retryAttempts = config.retryAttempts;
    }
    
    // Update queue configuration
    if (config.queue) {
      this.executionQueue.updateConfiguration(config.queue);
    }
    
    // Update scheduler configuration
    if (config.scheduler) {
      this.executionScheduler.updateConfiguration(config.scheduler);
    }
    
    this.logger.info('SequentialExecutionEngine: Configuration updated', config);
  }

  /**
   * Get engine configuration
   * @returns {Object} Engine configuration
   */
  getConfiguration() {
    return {
      maxQueueSize: this.maxQueueSize,
      executionTimeout: this.executionTimeout,
      retryAttempts: this.retryAttempts,
      queue: this.executionQueue.getConfiguration(),
      scheduler: this.executionScheduler.getConfiguration()
    };
  }

  /**
   * Get enhanced health status
   * @returns {Object} Enhanced health status
   */
  getHealthStatus() {
    const queueHealth = this.executionQueue.getHealthStatus();
    const schedulerHealth = this.executionScheduler.getHealthStatus();
    const resourceHealth = this.resourceManager.getResourceUtilization();
    const cacheHealth = this.executionCache.getStatistics();
    const metricsHealth = this.executionMetrics.getMetricsSummary();
    
    // Determine overall health status
    let overallStatus = 'healthy';
    const issues = [];
    
    if (queueHealth.status !== 'healthy') {
      overallStatus = 'warning';
      issues.push(`Queue: ${queueHealth.status}`);
    }
    
    if (schedulerHealth.status !== 'healthy') {
      overallStatus = 'warning';
      issues.push(`Scheduler: ${schedulerHealth.status}`);
    }
    
    if (resourceHealth.allocated.memory.percentage > 90) {
      overallStatus = 'warning';
      issues.push('High memory usage');
    }
    
    if (resourceHealth.allocated.cpu.percentage > 90) {
      overallStatus = 'warning';
      issues.push('High CPU usage');
    }
    
    if (metricsHealth.aggregated.errorRate > 0.1) {
      overallStatus = 'warning';
      issues.push('High error rate');
    }
    
    return {
      status: overallStatus,
      issues,
      components: {
        queue: queueHealth,
        scheduler: schedulerHealth,
        resourceManagement: {
          status: resourceHealth.allocated.memory.percentage > 90 || resourceHealth.allocated.cpu.percentage > 90 ? 'warning' : 'healthy',
          utilization: resourceHealth
        },
        cache: {
          status: cacheHealth.enabled ? 'healthy' : 'disabled',
          hitRate: cacheHealth.hitRatePercentage
        },
        metrics: {
          status: metricsHealth.aggregated.errorRate > 0.1 ? 'warning' : 'healthy',
          errorRate: metricsHealth.aggregated.errorRate
        }
      },
      timestamp: new Date()
    };
  }

  /**
   * Get optimization statistics
   * @returns {Object} Optimization statistics
   */
  getOptimizationStatistics() {
    return this.workflowOptimizer.getOptimizationStatistics();
  }

  /**
   * Get resource management statistics
   * @returns {Promise<Object>} Resource management statistics
   */
  async getResourceManagementStatistics() {
    return await this.resourceManager.getResourceStatistics();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStatistics() {
    return this.executionCache.getStatistics();
  }

  /**
   * Get execution metrics
   * @returns {Object} Execution metrics
   */
  getExecutionMetrics() {
    return this.executionMetrics.getMetricsSummary();
  }

  /**
   * Get prediction statistics
   * @returns {Object} Prediction statistics
   */
  getPredictionStatistics() {
    return this.executionPredictor.getPredictionStatistics();
  }

  /**
   * Analyze workflow for optimization opportunities
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeWorkflow(workflow, context) {
    const WorkflowAnalyzer = require('./optimization/WorkflowAnalyzer');
    const analyzer = new WorkflowAnalyzer({
      enableAnalysis: true,
      logger: this.logger
    });
    
    return await analyzer.analyzeWorkflow(workflow, context);
  }

  /**
   * Clear optimization cache
   */
  clearOptimizationCache() {
    this.workflowOptimizer.clearCache();
    this.logger.info('SequentialExecutionEngine: Optimization cache cleared');
  }

  /**
   * Clear execution cache
   */
  clearExecutionCache() {
    this.executionCache.clear();
    this.logger.info('SequentialExecutionEngine: Execution cache cleared');
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.clearOptimizationCache();
    this.clearExecutionCache();
    this.logger.info('SequentialExecutionEngine: All caches cleared');
  }

  /**
   * Shutdown engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('SequentialExecutionEngine: Shutting down');
    
    // Cancel all active executions
    for (const [executionId, execution] of this.activeExecutions.entries()) {
      this.cancelExecution(executionId);
    }
    
    // Clear queues
    this.executionQueue.clear();
    this.executionQueue.clearCompleted();
    this.executionQueue.clearFailed();
    
    // Clear active executions
    this.activeExecutions.clear();
    
    // Shutdown optimization and resource management components
    await this.workflowOptimizer.shutdown();
    await this.resourceManager.shutdown();
    this.executionCache.shutdown();
    this.executionMetrics.shutdown();
    this.executionPredictor.shutdown();
    
    this.logger.info('SequentialExecutionEngine: Shutdown complete');
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      maxQueueSize: this.maxQueueSize,
      executionTimeout: this.executionTimeout,
      retryAttempts: this.retryAttempts,
      activeExecutions: this.activeExecutions.size,
      registeredStrategies: this.getRegisteredStrategies(),
      queue: this.executionQueue.toJSON(),
      scheduler: this.executionScheduler.toJSON(),
      optimization: this.workflowOptimizer.getOptimizationStatistics(),
      resourceManagement: this.resourceManager.getResourceStatistics(),
      cache: this.executionCache.getStatistics(),
      metrics: this.executionMetrics.getMetricsSummary(),
      prediction: this.executionPredictor.getPredictionStatistics()
    };
  }
}

module.exports = SequentialExecutionEngine; 