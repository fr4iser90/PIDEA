/**
 * SequentialExecutionEngine - Enhanced sequential execution engine for workflow execution
 * Provides core execution functionality with optimization, resource management, and caching
 */
const ExecutionContext = require('./ExecutionContext');
const ExecutionResult = require('./ExecutionResult');
const ExecutionQueue = require('./ExecutionQueue');
const ExecutionScheduler = require('./ExecutionScheduler');
const { ExecutionException } = require('./exceptions/ExecutionException');
const ServiceLogger = require('@logging/ServiceLogger');

// Optimization and Resource Management Components
const WorkflowOptimizer = require('./WorkflowOptimizer');
const ResourceManager = require('./ResourceManager');
const ExecutionCache = require('./ExecutionCache');
const ExecutionMetrics = require('./ExecutionMetrics');
const ExecutionPredictor = require('./ExecutionPredictor');

// New Optimization Components
const { ExecutionOptimizer } = require('./optimization/ExecutionOptimizer');
const { ExecutionMonitor } = require('./monitoring/ExecutionMonitor');
const { ExecutionExceptionFactory } = require('./exceptions/ExecutionException');

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
    
    // New Optimization Components
    this.executionOptimizer = new ExecutionOptimizer({
      enabled: options.enableAdvancedOptimization !== false,
      stepCombination: options.enableStepCombination !== false,
      stepReordering: options.enableStepReordering !== false,
      parallelExecution: options.enableParallelExecution !== false,
      resourceOptimization: options.enableResourceOptimization !== false,
      predictiveOptimization: options.enablePredictiveOptimization !== false,
      caching: options.enableOptimizationCaching !== false,
      learningEnabled: options.enableOptimizationLearning !== false,
      logger: options.logger
    });
    
    this.executionMonitor = new ExecutionMonitor({
      enabled: options.enableMonitoring !== false,
      monitoringInterval: options.monitoringInterval || 1000,
      metricsRetention: options.metricsRetention || 24 * 60 * 60 * 1000,
      alertConfig: {
        executionTimeout: options.executionTimeout || 300000,
        memoryThreshold: options.memoryThreshold || 80,
        cpuThreshold: options.cpuThreshold || 90,
        errorThreshold: options.errorThreshold || 3,
        stepFailureThreshold: options.stepFailureThreshold || 0.5,
        performanceDegradationThreshold: options.performanceDegradationThreshold || 0.3
      },
      logger: options.logger
    });
    
    // Execution state
    this.activeExecutions = new Map();
    this.executionStrategies = new Map();
    
    // Initialize strategies
    this.initializeStrategies();
    
    // Start monitoring
    if (options.enableMonitoring !== false) {
      this.executionMonitor.start();
    }
    
    this.logger = options.logger || new ServiceLogger('SequentialExecutionEngine');
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

      // Register execution for monitoring
      this.executionMonitor.registerExecution(executionId, {
        workflowName: workflow.getMetadata().name,
        stepCount: workflow.getMetadata().steps?.length || 0,
        strategy: options.strategy || 'basic'
      });

      // Advanced workflow optimization
      let optimizedWorkflow = workflow;
      let optimizationResult = null;
      
      if (this.executionOptimizer.config.enabled) {
        try {
          const steps = this.getWorkflowSteps(workflow);
          optimizationResult = await this.executionOptimizer.optimizeWorkflow(steps, context, options);
          optimizedWorkflow = await this.applyOptimizationResult(workflow, optimizationResult, context);
          
          this.logger.info('SequentialExecutionEngine: Advanced workflow optimization completed', {
            executionId,
            originalSteps: steps.length,
            optimizedSteps: optimizationResult.optimizedSteps.length,
            estimatedSavings: optimizationResult.estimatedSavings,
            confidence: optimizationResult.confidence,
            appliedOptimizations: optimizationResult.appliedOptimizations.map(opt => opt.type)
          });
        } catch (error) {
          this.logger.warn('SequentialExecutionEngine: Advanced optimization failed, using basic optimization', {
            executionId,
            error: error.message
          });
          
          // Fallback to basic optimization
          optimizedWorkflow = await this.workflowOptimizer.optimizeWorkflow(workflow, context);
        }
      } else {
        // Use basic optimization
        optimizedWorkflow = await this.workflowOptimizer.optimizeWorkflow(workflow, context);
      }
      
      this.logger.info('SequentialExecutionEngine: Workflow optimization completed', {
        executionId,
        originalSteps: workflow.getMetadata().steps?.length || 0,
        optimizedSteps: optimizedWorkflow.getMetadata().steps?.length || 0,
        optimizationType: optimizationResult ? 'advanced' : 'basic'
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

      // Update monitoring with execution progress
      this.executionMonitor.updateExecution(executionId, {
        completedSteps: result.stepResults?.filter(r => r.success).length || 0,
        failedSteps: result.stepResults?.filter(r => !r.success).length || 0,
        cacheHits: result.cacheHits || 0,
        cacheMisses: result.cacheMisses || 0,
        retryAttempts: result.retryAttempts || 0
      });

      // Learn from execution
      await this.executionPredictor.learnFromExecution(executionId, optimizedWorkflow, context, result, prediction);
      await this.workflowOptimizer.learnFromExecution(executionId, result);
      
      // Learn from optimization if available
      if (optimizationResult) {
        await this.executionOptimizer.learnFromOptimization(
          this.getWorkflowSteps(workflow), 
          optimizationResult, 
          context
        );
      }

      // Record execution end in metrics
      this.executionMetrics.recordExecutionEnd(executionId, result);
      
      // Complete monitoring
      this.executionMonitor.completeExecution(executionId, {
        optimizationSavings: optimizationResult?.estimatedSavings?.time || 0,
        parallelExecutionSavings: optimizationResult?.estimatedSavings?.time || 0
      });

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
   * Get workflow steps
   * @param {IWorkflow} workflow - Workflow to get steps from
   * @returns {Array} Workflow steps
   */
  getWorkflowSteps(workflow) {
    // For composed workflows, get the steps
    if (workflow._steps) {
      return workflow._steps;
    }
    
    // For other workflows, return single step
    return [workflow];
  }

  /**
   * Apply optimization result to workflow
   * @param {IWorkflow} workflow - Original workflow
   * @param {Object} optimizationResult - Optimization result
   * @param {Object} context - Workflow context
   * @returns {Promise<IWorkflow>} Optimized workflow
   */
  async applyOptimizationResult(workflow, optimizationResult, context) {
    if (!optimizationResult || !optimizationResult.optimizedSteps) {
      return workflow;
    }

    // Create optimized workflow with new steps
    const ComposedWorkflow = require('../ComposedWorkflow');
    const optimizedWorkflow = new ComposedWorkflow(
      optimizationResult.optimizedSteps,
      workflow.getMetadata()
    );

    // Copy optimization metadata
    optimizedWorkflow._optimizationResult = optimizationResult;
    optimizedWorkflow._originalWorkflow = workflow;

    return optimizedWorkflow;
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
   * Get advanced optimization statistics
   * @returns {Object} Advanced optimization statistics
   */
  getAdvancedOptimizationStatistics() {
    return this.executionOptimizer.getStatistics();
  }

  /**
   * Get execution monitoring statistics
   * @returns {Object} Monitoring statistics
   */
  getMonitoringStatistics() {
    return this.executionMonitor.getStatistics();
  }

  /**
   * Get execution monitoring data
   * @param {string} executionId - Execution ID
   * @returns {Object} Monitoring data
   */
  getExecutionMonitoringData(executionId) {
    return this.executionMonitor.getExecutionMetrics(executionId);
  }

  /**
   * Get active executions with monitoring data
   * @returns {Array} Active executions with monitoring data
   */
  getActiveExecutionsWithMonitoring() {
    return this.executionMonitor.getActiveExecutions();
  }

  /**
   * Get execution history with monitoring data
   * @param {Object} filters - Filter options
   * @returns {Array} Execution history with monitoring data
   */
  getExecutionHistoryWithMonitoring(filters = {}) {
    return this.executionMonitor.getExecutionHistory(filters);
  }

  /**
   * Get monitoring alerts
   * @param {Object} filters - Filter options
   * @returns {Array} Monitoring alerts
   */
  getMonitoringAlerts(filters = {}) {
    return this.executionMonitor.getAlerts(filters);
  }

  /**
   * Get performance baseline
   * @param {string} workflowName - Workflow name
   * @returns {Object} Performance baseline
   */
  getPerformanceBaseline(workflowName) {
    return this.executionMonitor.getPerformanceBaseline(workflowName);
  }

  /**
   * Analyze workflow for optimization opportunities
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeWorkflow(workflow, context) {
    const WorkflowAnalyzer = require('./optimization/WorkflowAnalyzer');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
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
    
    // Stop monitoring
    if (this.executionMonitor) {
      this.executionMonitor.stop();
    }
    
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
    
    // Shutdown new optimization components
    if (this.executionOptimizer) {
      this.executionOptimizer.reset();
    }
    if (this.executionMonitor) {
      this.executionMonitor.reset();
    }
    
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
      prediction: this.executionPredictor.getPredictionStatistics(),
      advancedOptimization: this.executionOptimizer ? this.executionOptimizer.getStatistics() : null,
      monitoring: this.executionMonitor ? this.executionMonitor.getStatistics() : null
    };
  }
}

module.exports = SequentialExecutionEngine; 