/**
 * BatchSequentialStrategy - Batch processing strategy for workflow execution
 * Groups similar steps and processes them in batches for improved efficiency
 */
const crypto = require('crypto');
const { logger } = require('@infrastructure/logging/Logger');

/**
 * Batch sequential execution strategy
 */
class BatchSequentialStrategy {
  constructor(options = {}) {
    this.name = 'batch_sequential';
    this.batchSize = options.batchSize || 5;
    this.maxBatchSize = options.maxBatchSize || 10;
    this.batchTimeout = options.batchTimeout || 30000; // 30 seconds
    this.enableParallelBatches = options.enableParallelBatches !== false;
    this.maxParallelBatches = options.maxParallelBatches || 3;
    this.batchGroupingEnabled = options.batchGroupingEnabled !== false;
    this.cachingEnabled = options.cachingEnabled !== false;
    this.cache = new Map();
    this.batchHistory = new Map();
    this.logger = options.logger || console;
  }

  /**
   * Execute workflow with batch sequential strategy
   * @param {IWorkflow} workflow - Workflow to execute
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} executionContext - Execution context
   * @returns {Promise<ExecutionResult>} Execution result
   */
  async execute(workflow, context, executionContext) {
    const startTime = Date.now();
    
    try {
      this.logger.info('BatchSequentialStrategy: Starting batch execution', {
        workflowName: workflow.getMetadata().name,
        executionId: executionContext.id
      });

      // Get workflow steps
      const steps = this.getWorkflowSteps(workflow);
      
      // Group steps into batches
      const batches = this.batchGroupingEnabled ? 
        this.createBatches(steps, context) : 
        this.createSimpleBatches(steps);
      
      this.logger.info('BatchSequentialStrategy: Steps batched', {
        totalSteps: steps.length,
        batchCount: batches.length,
        batchSizes: batches.map(batch => batch.length)
      });
      
      // Execute batches
      const batchResults = [];
      let completedSteps = 0;
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        this.logger.info('BatchSequentialStrategy: Executing batch', {
          batchIndex: i + 1,
          batchSize: batch.length,
          totalBatches: batches.length
        });
        
        // Execute batch
        const batchResult = await this.executeBatch(batch, context, executionContext, i);
        batchResults.push(batchResult);
        completedSteps += batch.length;
        
        // Check if batch failed
        if (!batchResult.success) {
          this.logger.warn('BatchSequentialStrategy: Batch failed, stopping execution', {
            batchIndex: i + 1,
            error: batchResult.error
          });
          break;
        }
        
        // Update context with batch results
        context.set(`batch_${i}_result`, batchResult);
        
        // Learn from batch execution
        this.learnFromBatchExecution(batch, batchResult, context, i);
      }
      
      const duration = Date.now() - startTime;
      
      const executionResult = {
        success: batchResults.every(r => r.success),
        strategy: this.name,
        duration,
        batchResults,
        stepCount: steps.length,
        batchCount: batches.length,
        completedSteps,
        batchSizes: batches.map(batch => batch.length),
        cacheHits: batchResults.reduce((sum, r) => sum + (r.cacheHits || 0), 0),
        parallelBatches: this.enableParallelBatches ? this.maxParallelBatches : 1
      };

      this.logger.info('BatchSequentialStrategy: Execution completed', {
        success: executionResult.success,
        duration,
        stepCount: steps.length,
        batchCount: batches.length,
        cacheHits: executionResult.cacheHits
      });

      return executionResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('BatchSequentialStrategy: Execution failed', {
        error: error.message,
        duration
      });
      
      return {
        success: false,
        strategy: this.name,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Get workflow steps
   * @param {IWorkflow} workflow - Workflow to analyze
   * @returns {Array<IWorkflowStep>} Workflow steps
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
   * Create batches based on step similarity
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array<Array<IWorkflowStep>>} Batches of steps
   */
  createBatches(steps, context) {
    if (steps.length <= this.batchSize) {
      return [steps];
    }

    // Group steps by type and similarity
    const stepGroups = this.groupStepsBySimilarity(steps, context);
    
    // Create batches from groups
    const batches = [];
    for (const [groupKey, groupSteps] of stepGroups) {
      const groupBatches = this.splitGroupIntoBatches(groupSteps);
      batches.push(...groupBatches);
    }
    
    return batches;
  }

  /**
   * Create simple batches without grouping
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @returns {Array<Array<IWorkflowStep>>} Batches of steps
   */
  createSimpleBatches(steps) {
    const batches = [];
    
    for (let i = 0; i < steps.length; i += this.batchSize) {
      const batch = steps.slice(i, i + this.batchSize);
      batches.push(batch);
    }
    
    return batches;
  }

  /**
   * Group steps by similarity
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Map<string, Array<IWorkflowStep>>} Groups of similar steps
   */
  groupStepsBySimilarity(steps, context) {
    const groups = new Map();
    
    for (const step of steps) {
      const metadata = step.getMetadata();
      const groupKey = this.getStepGroupKey(step, context);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey).push(step);
    }
    
    return groups;
  }

  /**
   * Get step group key for batching
   * @param {IWorkflowStep} step - Step to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {string} Group key
   */
  getStepGroupKey(step, context) {
    const metadata = step.getMetadata();
    
    // Primary grouping by type
    let groupKey = metadata.type;
    
    // Secondary grouping by resource requirements
    const resourceRequirements = this.getStepResourceRequirements(step, context);
    if (resourceRequirements) {
      groupKey += `_${resourceRequirements.level}`;
    }
    
    // Tertiary grouping by complexity
    const complexity = this.getStepComplexity(step, context);
    if (complexity) {
      groupKey += `_${complexity}`;
    }
    
    return groupKey;
  }

  /**
   * Get step resource requirements
   * @param {IWorkflowStep} step - Step to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object|null} Resource requirements
   */
  getStepResourceRequirements(step, context) {
    const metadata = step.getMetadata();
    
    // Determine resource level based on step type
    const resourceLevels = {
      'analysis': 'high',
      'testing': 'medium',
      'deployment': 'high',
      'refactoring': 'medium',
      'documentation': 'low',
      'validation': 'low',
      'setup': 'low',
      'cleanup': 'low'
    };
    
    const level = resourceLevels[metadata.type] || 'medium';
    
    return {
      level,
      estimatedMemory: this.estimateMemoryUsage(metadata.type),
      estimatedCpu: this.estimateCpuUsage(metadata.type)
    };
  }

  /**
   * Get step complexity
   * @param {IWorkflowStep} step - Step to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {string} Complexity level
   */
  getStepComplexity(step, context) {
    const metadata = step.getMetadata();
    
    // Determine complexity based on step type and parameters
    const complexityLevels = {
      'analysis': 'high',
      'testing': 'medium',
      'deployment': 'high',
      'refactoring': 'high',
      'documentation': 'low',
      'validation': 'low',
      'setup': 'low',
      'cleanup': 'low'
    };
    
    return complexityLevels[metadata.type] || 'medium';
  }

  /**
   * Estimate memory usage for step type
   * @param {string} stepType - Step type
   * @returns {number} Estimated memory usage in MB
   */
  estimateMemoryUsage(stepType) {
    const memoryEstimates = {
      'analysis': 512,
      'testing': 256,
      'deployment': 1024,
      'refactoring': 512,
      'documentation': 128,
      'validation': 128,
      'setup': 256,
      'cleanup': 128
    };
    
    return memoryEstimates[stepType] || 256;
  }

  /**
   * Estimate CPU usage for step type
   * @param {string} stepType - Step type
   * @returns {number} Estimated CPU usage percentage
   */
  estimateCpuUsage(stepType) {
    const cpuEstimates = {
      'analysis': 80,
      'testing': 60,
      'deployment': 70,
      'refactoring': 75,
      'documentation': 20,
      'validation': 30,
      'setup': 40,
      'cleanup': 25
    };
    
    return cpuEstimates[stepType] || 50;
  }

  /**
   * Split group into batches
   * @param {Array<IWorkflowStep>} groupSteps - Steps in group
   * @returns {Array<Array<IWorkflowStep>>} Batches
   */
  splitGroupIntoBatches(groupSteps) {
    const batches = [];
    
    for (let i = 0; i < groupSteps.length; i += this.batchSize) {
      const batch = groupSteps.slice(i, i + this.batchSize);
      batches.push(batch);
    }
    
    return batches;
  }

  /**
   * Execute batch of steps
   * @param {Array<IWorkflowStep>} batch - Batch of steps
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} executionContext - Execution context
   * @param {number} batchIndex - Batch index
   * @returns {Promise<BatchResult>} Batch execution result
   */
  async executeBatch(batch, context, executionContext, batchIndex) {
    const startTime = Date.now();
    
    try {
      this.logger.info('BatchSequentialStrategy: Executing batch', {
        batchIndex,
        batchSize: batch.length,
        stepTypes: batch.map(step => step.getMetadata().type)
      });

      // Check if batch can be executed in parallel
      const canExecuteParallel = this.canExecuteParallel(batch, context);
      
      let results;
      if (canExecuteParallel && this.enableParallelBatches) {
        results = await this.executeBatchParallel(batch, context, executionContext);
      } else {
        results = await this.executeBatchSequential(batch, context, executionContext);
      }
      
      const duration = Date.now() - startTime;
      
      const batchResult = {
        success: results.every(r => r.success),
        batchIndex,
        batchSize: batch.length,
        duration,
        results,
        parallel: canExecuteParallel && this.enableParallelBatches,
        cacheHits: results.filter(r => r.cached).length,
        stepTypes: batch.map(step => step.getMetadata().type)
      };

      this.logger.info('BatchSequentialStrategy: Batch completed', {
        batchIndex,
        success: batchResult.success,
        duration,
        parallel: batchResult.parallel,
        cacheHits: batchResult.cacheHits
      });

      return batchResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('BatchSequentialStrategy: Batch failed', {
        batchIndex,
        error: error.message,
        duration
      });
      
      return {
        success: false,
        batchIndex,
        batchSize: batch.length,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Check if batch can be executed in parallel
   * @param {Array<IWorkflowStep>} batch - Batch of steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {boolean} True if can execute in parallel
   */
  canExecuteParallel(batch, context) {
    // Check if steps have dependencies on each other
    for (let i = 0; i < batch.length; i++) {
      for (let j = i + 1; j < batch.length; j++) {
        if (this.stepsHaveDependency(batch[i], batch[j], context)) {
          return false;
        }
      }
    }
    
    // Check resource requirements
    const totalMemory = batch.reduce((sum, step) => {
      const requirements = this.getStepResourceRequirements(step, context);
      return sum + (requirements?.estimatedMemory || 256);
    }, 0);
    
    const totalCpu = batch.reduce((sum, step) => {
      const requirements = this.getStepResourceRequirements(step, context);
      return sum + (requirements?.estimatedCpu || 50);
    }, 0);
    
    // Don't execute in parallel if resource requirements are too high
    return totalMemory <= 2048 && totalCpu <= 200;
  }

  /**
   * Check if two steps have dependency
   * @param {IWorkflowStep} step1 - First step
   * @param {IWorkflowStep} step2 - Second step
   * @param {WorkflowContext} context - Workflow context
   * @returns {boolean} True if steps have dependency
   */
  stepsHaveDependency(step1, step2, context) {
    const metadata1 = step1.getMetadata();
    const metadata2 = step2.getMetadata();
    
    // Check if steps operate on the same resources
    if (metadata1.resources && metadata2.resources) {
      const commonResources = metadata1.resources.filter(r => 
        metadata2.resources.includes(r)
      );
      if (commonResources.length > 0) {
        return true;
      }
    }
    
    // Check if steps have explicit dependencies
    if (metadata1.dependencies && metadata1.dependencies.includes(metadata2.name)) {
      return true;
    }
    
    if (metadata2.dependencies && metadata2.dependencies.includes(metadata1.name)) {
      return true;
    }
    
    return false;
  }

  /**
   * Execute batch sequentially
   * @param {Array<IWorkflowStep>} batch - Batch of steps
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Array<StepResult>>} Step results
   */
  async executeBatchSequential(batch, context, executionContext) {
    const results = [];
    
    for (let i = 0; i < batch.length; i++) {
      const step = batch[i];
      
      // Check cache first
      if (this.cachingEnabled) {
        const cacheKey = this.generateCacheKey(step, context);
        const cachedResult = await this.getCachedResult(cacheKey);
        
        if (cachedResult) {
          results.push({
            success: true,
            stepName: step.getMetadata().name,
            stepType: step.getMetadata().type,
            result: cachedResult,
            cached: true,
            duration: 0
          });
          continue;
        }
      }
      
      // Execute step
      const startTime = Date.now();
      const result = await step.execute(context);
      const duration = Date.now() - startTime;
      
      // Cache result if successful
      if (this.cachingEnabled && result.success) {
        const cacheKey = this.generateCacheKey(step, context);
        await this.cacheResult(cacheKey, result);
      }
      
      results.push({
        success: result.success !== false,
        stepName: step.getMetadata().name,
        stepType: step.getMetadata().type,
        result,
        duration,
        cached: false
      });
      
      // Early termination if step failed
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Execute batch in parallel
   * @param {Array<IWorkflowStep>} batch - Batch of steps
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Array<StepResult>>} Step results
   */
  async executeBatchParallel(batch, context, executionContext) {
    // Limit parallel execution to maxParallelBatches
    const limitedBatch = batch.slice(0, this.maxParallelBatches);
    
    const promises = limitedBatch.map(async (step, index) => {
      // Check cache first
      if (this.cachingEnabled) {
        const cacheKey = this.generateCacheKey(step, context);
        const cachedResult = await this.getCachedResult(cacheKey);
        
        if (cachedResult) {
          return {
            success: true,
            stepName: step.getMetadata().name,
            stepType: step.getMetadata().type,
            result: cachedResult,
            cached: true,
            duration: 0,
            parallelIndex: index
          };
        }
      }
      
      // Execute step
      const startTime = Date.now();
      const result = await step.execute(context);
      const duration = Date.now() - startTime;
      
      // Cache result if successful
      if (this.cachingEnabled && result.success) {
        const cacheKey = this.generateCacheKey(step, context);
        await this.cacheResult(cacheKey, result);
      }
      
      return {
        success: result.success !== false,
        stepName: step.getMetadata().name,
        stepType: step.getMetadata().type,
        result,
        duration,
        cached: false,
        parallelIndex: index
      };
    });
    
    return await Promise.all(promises);
  }

  /**
   * Generate cache key
   * @param {IWorkflowStep} step - Step
   * @param {WorkflowContext} context - Context
   * @returns {string} Cache key
   */
  generateCacheKey(step, context) {
    const metadata = step.getMetadata();
    const contextHash = this.hashContext(context);
    return `batch_${metadata.name}_${metadata.type}_${contextHash}`;
  }

  /**
   * Hash context for caching
   * @param {WorkflowContext} context - Context
   * @returns {string} Context hash
   */
  hashContext(context) {
    // Simple hash for context
    const contextStr = JSON.stringify(context.getAll());
    return crypto.createHash('md5').update(contextStr).digest('hex');
  }

  /**
   * Get cached result
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result
   */
  async getCachedResult(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.result;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Cache result
   * @param {string} cacheKey - Cache key
   * @param {Object} result - Result to cache
   */
  async cacheResult(cacheKey, result) {
    this.cache.set(cacheKey, {
      result,
      expiry: Date.now() + 3600000 // 1 hour TTL
    });
  }

  /**
   * Learn from batch execution
   * @param {Array<IWorkflowStep>} batch - Batch that was executed
   * @param {Object} batchResult - Batch execution result
   * @param {WorkflowContext} context - Workflow context
   * @param {number} batchIndex - Batch index
   */
  learnFromBatchExecution(batch, batchResult, context, batchIndex) {
    const batchKey = `batch_${batchIndex}_${batch.map(step => step.getMetadata().type).join('_')}`;
    
    this.batchHistory.set(batchKey, {
      batchResult,
      timestamp: new Date(),
      context: context.getAll(),
      batchSize: batch.length
    });
    
    // Keep only last 50 batch executions
    if (this.batchHistory.size > 50) {
      const entries = Array.from(this.batchHistory.entries());
      const toDelete = entries.slice(0, entries.length - 50);
      for (const [key] of toDelete) {
        this.batchHistory.delete(key);
      }
    }
  }

  /**
   * Get strategy statistics
   * @returns {Object} Strategy statistics
   */
  getStatistics() {
    return {
      name: this.name,
      batchSize: this.batchSize,
      maxBatchSize: this.maxBatchSize,
      batchTimeout: this.batchTimeout,
      enableParallelBatches: this.enableParallelBatches,
      maxParallelBatches: this.maxParallelBatches,
      batchGroupingEnabled: this.batchGroupingEnabled,
      cachingEnabled: this.cachingEnabled,
      cacheSize: this.cache.size,
      batchHistorySize: this.batchHistory.size
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear batch history
   */
  clearBatchHistory() {
    this.batchHistory.clear();
  }
}

module.exports = BatchSequentialStrategy; 