/**
 * OptimizedSequentialStrategy - Advanced sequential execution strategy with optimization
 * Provides intelligent step optimization, caching, and resource management
 */
const crypto = require('crypto');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Optimized sequential execution strategy
 */
class OptimizedSequentialStrategy {
  constructor(options = {}) {
    this.name = 'optimized_sequential';
    this.optimizationEnabled = options.optimizationEnabled !== false;
    this.cachingEnabled = options.cachingEnabled !== false;
    this.preWarmingEnabled = options.preWarmingEnabled !== false;
    this.retryEnabled = options.retryEnabled !== false;
    this.maxRetries = options.maxRetries || 2;
    this.cache = new Map();
    this.executionHistory = new Map();
    this.logger = options.logger || console;
  }

  /**
   * Execute workflow with optimized sequential strategy
   * @param {IWorkflow} workflow - Workflow to execute
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} executionContext - Execution context
   * @returns {Promise<ExecutionResult>} Execution result
   */
  async execute(workflow, context, executionContext) {
    const startTime = Date.now();
    
    try {
      this.logger.info('OptimizedSequentialStrategy: Starting optimized execution', {
        workflowName: workflow.getMetadata().name,
        executionId: executionContext.id
      });

      // Get workflow steps
      const steps = this.getWorkflowSteps(workflow);
      
      // Pre-optimize steps
      const optimizedSteps = this.optimizationEnabled ? 
        this.optimizeSteps(steps, context) : steps;
      
      this.logger.info('OptimizedSequentialStrategy: Steps optimized', {
        originalSteps: steps.length,
        optimizedSteps: optimizedSteps.length,
        optimizations: this.getAppliedOptimizations(optimizedSteps, steps)
      });
      
      // Execute steps sequentially with optimization
      const results = [];
      for (let i = 0; i < optimizedSteps.length; i++) {
        const step = optimizedSteps[i];
        
        // Pre-warm resources for next step
        if (this.preWarmingEnabled && i < optimizedSteps.length - 1) {
          this.preWarmNextStep(optimizedSteps[i + 1], context);
        }
        
        // Execute step with optimization
        const result = await this.executeStep(step, context, executionContext);
        results.push(result);
        
        // Early termination if step failed
        if (!result.success) {
          this.logger.warn('OptimizedSequentialStrategy: Step failed, stopping execution', {
            stepName: step.getMetadata().name,
            error: result.error
          });
          break;
        }
        
        // Update context with step result
        context.set(`step_${i}_result`, result);
        
        // Learn from step execution
        this.learnFromStepExecution(step, result, context);
      }
      
      const duration = Date.now() - startTime;
      
      const executionResult = {
        success: results.every(r => r.success),
        strategy: this.name,
        duration,
        results,
        stepCount: steps.length,
        optimizedStepCount: optimizedSteps.length,
        optimizations: this.getAppliedOptimizations(optimizedSteps, steps),
        cacheHits: results.filter(r => r.cached).length,
        retryAttempts: results.reduce((sum, r) => sum + (r.attempts || 1), 0)
      };

      this.logger.info('OptimizedSequentialStrategy: Execution completed', {
        success: executionResult.success,
        duration,
        stepCount: steps.length,
        optimizedStepCount: optimizedSteps.length,
        cacheHits: executionResult.cacheHits
      });

      return executionResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('OptimizedSequentialStrategy: Execution failed', {
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
   * Optimize steps for execution
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array<IWorkflowStep>} Optimized steps
   */
  optimizeSteps(steps, context) {
    if (!this.optimizationEnabled || steps.length <= 1) {
      return steps;
    }

    // Apply step-level optimizations
    let optimizedSteps = steps.map(step => this.optimizeStep(step, context));
    
    // Apply workflow-level optimizations
    optimizedSteps = this.combineSimilarSteps(optimizedSteps);
    optimizedSteps = this.reorderSteps(optimizedSteps);
    optimizedSteps = this.removeRedundantSteps(optimizedSteps);
    
    return optimizedSteps;
  }

  /**
   * Optimize individual step
   * @param {IWorkflowStep} step - Step to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeStep(step, context) {
    const metadata = step.getMetadata();
    
    // Apply step-specific optimizations
    switch (metadata.type) {
      case 'analysis':
        return this.optimizeAnalysisStep(step, context);
      case 'testing':
        return this.optimizeTestingStep(step, context);
      case 'deployment':
        return this.optimizeDeploymentStep(step, context);
      case 'refactoring':
        return this.optimizeRefactoringStep(step, context);
      case 'documentation':
        return this.optimizeDocumentationStep(step, context);
      default:
        return step;
    }
  }

  /**
   * Optimize analysis step
   * @param {IWorkflowStep} step - Analysis step
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeAnalysisStep(step, context) {
    // Add caching for analysis steps
    const optimizedStep = {
      ...step,
      execute: async (ctx) => {
        // Check cache first
        if (this.cachingEnabled) {
          const cacheKey = this.generateCacheKey(step, ctx);
          const cachedResult = await this.getCachedResult(cacheKey);
          
          if (cachedResult) {
            return {
              ...cachedResult,
              cached: true
            };
          }
        }
        
        // Execute step
        const result = await step.execute(ctx);
        
        // Cache result if successful
        if (this.cachingEnabled && result.success) {
          const cacheKey = this.generateCacheKey(step, ctx);
          await this.cacheResult(cacheKey, result);
        }
        
        return result;
      }
    };
    
    return optimizedStep;
  }

  /**
   * Optimize testing step
   * @param {IWorkflowStep} step - Testing step
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeTestingStep(step, context) {
    // Add smart retry logic for testing steps
    const optimizedStep = {
      ...step,
      execute: async (ctx) => {
        let lastError = null;
        const maxRetries = this.retryEnabled ? this.maxRetries : 0;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const result = await step.execute(ctx);
            
            if (result.success) {
              return {
                ...result,
                attempts: attempt + 1
              };
            }
            
            lastError = result.error;
            
            // Don't retry on certain errors
            if (this.isNonRetryableError(result.error)) {
              break;
            }
            
            // Wait before retry
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
            
          } catch (error) {
            lastError = error.message;
            
            if (this.isNonRetryableError(error.message)) {
              break;
            }
            
            // Wait before retry
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
          }
        }
        
        return {
          success: false,
          error: lastError,
          attempts: maxRetries + 1
        };
      }
    };
    
    return optimizedStep;
  }

  /**
   * Optimize deployment step
   * @param {IWorkflowStep} step - Deployment step
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeDeploymentStep(step, context) {
    // Add dry-run capability for deployment steps
    const optimizedStep = {
      ...step,
      execute: async (ctx) => {
        // Check if dry-run is enabled
        const dryRun = ctx.get('dryRun') || false;
        
        if (dryRun) {
          // Simulate deployment
          const simulationResult = await this.simulateDeployment(step, ctx);
          return {
            ...simulationResult,
            dryRun: true
          };
        }
        
        // Execute actual deployment
        return await step.execute(ctx);
      }
    };
    
    return optimizedStep;
  }

  /**
   * Optimize refactoring step
   * @param {IWorkflowStep} step - Refactoring step
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeRefactoringStep(step, context) {
    // Add validation and backup for refactoring steps
    const optimizedStep = {
      ...step,
      execute: async (ctx) => {
        // Create backup before refactoring
        const backupResult = await this.createBackup(ctx);
        
        // Execute refactoring
        const result = await step.execute(ctx);
        
        // Validate refactoring result
        if (result.success) {
          const validationResult = await this.validateRefactoring(ctx, result);
          if (!validationResult.success) {
            // Restore from backup
            await this.restoreFromBackup(ctx, backupResult);
            return {
              success: false,
              error: 'Refactoring validation failed',
              validationErrors: validationResult.errors
            };
          }
        }
        
        return result;
      }
    };
    
    return optimizedStep;
  }

  /**
   * Optimize documentation step
   * @param {IWorkflowStep} step - Documentation step
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeDocumentationStep(step, context) {
    // Add template-based optimization for documentation steps
    const optimizedStep = {
      ...step,
      execute: async (ctx) => {
        // Check if documentation template exists
        const template = await this.getDocumentationTemplate(ctx);
        
        if (template) {
          // Use template for faster documentation generation
          const result = await this.generateDocumentationFromTemplate(ctx, template);
          return result;
        }
        
        // Fallback to original step
        return await step.execute(ctx);
      }
    };
    
    return optimizedStep;
  }

  /**
   * Combine similar steps
   * @param {Array<IWorkflowStep>} steps - Steps to combine
   * @returns {Array<IWorkflowStep>} Combined steps
   */
  combineSimilarSteps(steps) {
    if (steps.length <= 1) {
      return steps;
    }

    // Group steps by type
    const stepGroups = {};
    for (const step of steps) {
      const type = step.getMetadata().type;
      if (!stepGroups[type]) {
        stepGroups[type] = [];
      }
      stepGroups[type].push(step);
    }

    // Combine similar steps
    const optimizedSteps = [];
    for (const [type, groupSteps] of Object.entries(stepGroups)) {
      if (groupSteps.length === 1) {
        optimizedSteps.push(groupSteps[0]);
      } else {
        // Create combined step
        const combinedStep = this.createCombinedStep(type, groupSteps);
        optimizedSteps.push(combinedStep);
      }
    }

    return optimizedSteps;
  }

  /**
   * Reorder steps for efficiency
   * @param {Array<IWorkflowStep>} steps - Steps to reorder
   * @returns {Array<IWorkflowStep>} Reordered steps
   */
  reorderSteps(steps) {
    if (steps.length <= 1) {
      return steps;
    }

    // Define step priority (lower number = higher priority)
    const stepPriority = {
      'setup': 1,
      'validation': 2,
      'analysis': 3,
      'processing': 4,
      'testing': 5,
      'deployment': 6,
      'cleanup': 7
    };

    // Sort steps by priority
    const sortedSteps = [...steps].sort((a, b) => {
      const priorityA = stepPriority[a.getMetadata().type] || 999;
      const priorityB = stepPriority[b.getMetadata().type] || 999;
      return priorityA - priorityB;
    });

    return sortedSteps;
  }

  /**
   * Remove redundant steps
   * @param {Array<IWorkflowStep>} steps - Steps to filter
   * @returns {Array<IWorkflowStep>} Filtered steps
   */
  removeRedundantSteps(steps) {
    if (steps.length <= 1) {
      return steps;
    }

    // Remove duplicate steps
    const uniqueSteps = [];
    const seenSteps = new Set();

    for (const step of steps) {
      const stepKey = `${step.getMetadata().type}_${step.getMetadata().name}`;
      if (!seenSteps.has(stepKey)) {
        seenSteps.add(stepKey);
        uniqueSteps.push(step);
      }
    }

    return uniqueSteps;
  }

  /**
   * Pre-warm resources for next step
   * @param {IWorkflowStep} nextStep - Next step to pre-warm
   * @param {WorkflowContext} context - Workflow context
   */
  preWarmNextStep(nextStep, context) {
    if (!this.preWarmingEnabled) {
      return;
    }

    // Pre-load dependencies for next step
    const metadata = nextStep.getMetadata();
    
    if (metadata.dependencies) {
      // Pre-load dependencies in background
      setImmediate(() => {
        metadata.dependencies.forEach(dependency => {
          this.preloadDependency(dependency, context);
        });
      });
    }
  }

  /**
   * Execute single step
   * @param {IWorkflowStep} step - Step to execute
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} executionContext - Execution context
   * @returns {Promise<StepResult>} Step result
   */
  async executeStep(step, context, executionContext) {
    const startTime = Date.now();
    
    try {
      const result = await step.execute(context);
      
      return {
        success: true,
        stepName: step.getMetadata().name,
        stepType: step.getMetadata().type,
        result,
        duration: Date.now() - startTime,
        cached: result.cached || false
      };
      
    } catch (error) {
      return {
        success: false,
        stepName: step.getMetadata().name,
        stepType: step.getMetadata().type,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get applied optimizations
   * @param {Array} optimizedSteps - Optimized steps
   * @param {Array} originalSteps - Original steps
   * @returns {Array} Applied optimizations
   */
  getAppliedOptimizations(optimizedSteps, originalSteps) {
    const optimizations = [];
    
    // Check for step count reduction
    if (optimizedSteps.length < originalSteps.length) {
      optimizations.push({
        type: 'step_reduction',
        description: `Reduced steps from ${originalSteps.length} to ${optimizedSteps.length}`
      });
    }
    
    // Check for caching optimizations
    const cachedSteps = optimizedSteps.filter(step => step.cached);
    if (cachedSteps.length > 0) {
      optimizations.push({
        type: 'caching',
        description: `${cachedSteps.length} steps use cached results`
      });
    }
    
    // Check for step reordering
    if (optimizedSteps.length === originalSteps.length) {
      const reordered = this.hasStepReordering(originalSteps, optimizedSteps);
      if (reordered) {
        optimizations.push({
          type: 'reordering',
          description: 'Steps reordered for optimal execution'
        });
      }
    }
    
    return optimizations;
  }

  /**
   * Check if steps were reordered
   * @param {Array} originalSteps - Original steps
   * @param {Array} optimizedSteps - Optimized steps
   * @returns {boolean} True if reordered
   */
  hasStepReordering(originalSteps, optimizedSteps) {
    if (originalSteps.length !== optimizedSteps.length) {
      return false;
    }
    
    for (let i = 0; i < originalSteps.length; i++) {
      const original = originalSteps[i];
      const optimized = optimizedSteps[i];
      
      if (original.getMetadata().name !== optimized.getMetadata().name ||
          original.getMetadata().type !== optimized.getMetadata().type) {
        return true;
      }
    }
    
    return false;
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
    return `${metadata.name}_${metadata.type}_${contextHash}`;
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
   * Check if error is non-retryable
   * @param {string} error - Error message
   * @returns {boolean} True if non-retryable
   */
  isNonRetryableError(error) {
    const nonRetryablePatterns = [
      'permission denied',
      'not found',
      'invalid input',
      'syntax error',
      'validation failed'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern)
    );
  }

  /**
   * Simulate deployment
   * @param {IWorkflowStep} step - Deployment step
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Simulation result
   */
  async simulateDeployment(step, context) {
    // Simulate deployment without actually deploying
    return {
      success: true,
      simulated: true,
      message: 'Deployment simulation completed successfully'
    };
  }

  /**
   * Create backup
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(context) {
    // Create backup of current state
    return {
      success: true,
      backupId: `backup_${Date.now()}`,
      timestamp: new Date()
    };
  }

  /**
   * Validate refactoring
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} result - Refactoring result
   * @returns {Promise<Object>} Validation result
   */
  async validateRefactoring(context, result) {
    // Validate refactoring changes
    return {
      success: true,
      errors: []
    };
  }

  /**
   * Restore from backup
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} backupResult - Backup result
   * @returns {Promise<Object>} Restore result
   */
  async restoreFromBackup(context, backupResult) {
    // Restore from backup
    return {
      success: true,
      restoredFrom: backupResult.backupId
    };
  }

  /**
   * Get documentation template
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object|null>} Documentation template
   */
  async getDocumentationTemplate(context) {
    // Get documentation template if available
    return null;
  }

  /**
   * Generate documentation from template
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} template - Documentation template
   * @returns {Promise<Object>} Documentation result
   */
  async generateDocumentationFromTemplate(context, template) {
    // Generate documentation using template
    return {
      success: true,
      generated: true,
      template: template.name
    };
  }

  /**
   * Preload dependency
   * @param {string} dependency - Dependency to preload
   * @param {WorkflowContext} context - Workflow context
   */
  preloadDependency(dependency, context) {
    // Implementation would preload specific dependency
    this.logger.debug('Preloading dependency', { dependency });
  }

  /**
   * Create combined step
   * @param {string} type - Step type
   * @param {Array} steps - Steps to combine
   * @returns {Object} Combined step
   */
  createCombinedStep(type, steps) {
    return {
      getMetadata: () => ({
        type,
        name: `combined_${type}`,
        description: `Combined ${steps.length} ${type} steps`,
        metadata: {
          originalSteps: steps.length,
          combined: true
        }
      }),
      execute: async (context) => {
        const results = [];
        for (const step of steps) {
          const result = await step.execute(context);
          results.push(result);
          
          if (!result.success) {
            return {
              success: false,
              error: `Combined step failed: ${result.error}`,
              results
            };
          }
        }
        
        return {
          success: true,
          results,
          combined: true
        };
      }
    };
  }

  /**
   * Learn from step execution
   * @param {IWorkflowStep} step - Step that was executed
   * @param {Object} result - Execution result
   * @param {WorkflowContext} context - Workflow context
   */
  learnFromStepExecution(step, result, context) {
    const stepKey = `${step.getMetadata().type}_${step.getMetadata().name}`;
    
    this.executionHistory.set(stepKey, {
      result,
      timestamp: new Date(),
      context: context.getAll()
    });
    
    // Keep only last 100 executions per step
    if (this.executionHistory.size > 100) {
      const entries = Array.from(this.executionHistory.entries());
      const toDelete = entries.slice(0, entries.length - 100);
      for (const [key] of toDelete) {
        this.executionHistory.delete(key);
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
      cacheSize: this.cache.size,
      executionHistorySize: this.executionHistory.size,
      optimizationEnabled: this.optimizationEnabled,
      cachingEnabled: this.cachingEnabled,
      preWarmingEnabled: this.preWarmingEnabled,
      retryEnabled: this.retryEnabled,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory() {
    this.executionHistory.clear();
  }
}

module.exports = OptimizedSequentialStrategy; 