/**
 * StepOptimizer - Step-level optimization for workflow execution
 * Provides optimization for individual workflow steps
 */
const crypto = require('crypto');

/**
 * Step optimizer for workflow execution
 */
class StepOptimizer {
  constructor(options = {}) {
    this.enableStepOptimization = options.enableStepOptimization !== false;
    this.optimizationRules = new Map();
    this.stepCache = new Map();
    this.stepHistory = new Map();
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.enableLearning = options.enableLearning !== false;
    
    // Initialize optimization rules
    this.initializeOptimizationRules();
    
    this.logger = options.logger || console;
  }

  /**
   * Initialize optimization rules
   */
  initializeOptimizationRules() {
    // Rule 1: Parameter optimization
    this.optimizationRules.set('parameter_optimization', {
      name: 'Parameter Optimization',
      description: 'Optimize step parameters for better performance',
      priority: 1,
      apply: (step, context) => this.optimizeParameters(step, context)
    });

    // Rule 2: Step combination
    this.optimizationRules.set('step_combination', {
      name: 'Step Combination',
      description: 'Combine similar steps for efficiency',
      priority: 2,
      apply: (step, context) => this.combineSteps(step, context)
    });

    // Rule 3: Execution strategy optimization
    this.optimizationRules.set('execution_strategy', {
      name: 'Execution Strategy Optimization',
      description: 'Optimize execution strategy for steps',
      priority: 3,
      apply: (step, context) => this.optimizeExecutionStrategy(step, context)
    });

    // Rule 4: Resource optimization
    this.optimizationRules.set('resource_optimization', {
      name: 'Resource Optimization',
      description: 'Optimize resource allocation for steps',
      priority: 4,
      apply: (step, context) => this.optimizeResources(step, context)
    });
  }

  /**
   * Optimize step
   * @param {IWorkflowStep} step - Step to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<IWorkflowStep>} Optimized step
   */
  async optimizeStep(step, context) {
    if (!this.enableStepOptimization) {
      return step;
    }

    try {
      const stepId = this.getStepId(step);
      
      this.logger.debug('StepOptimizer: Optimizing step', {
        stepId,
        stepName: step.getMetadata().name
      });

      // Check step cache
      if (this.stepCache.has(stepId)) {
        const cached = this.stepCache.get(stepId);
        if (this.isCacheValid(cached)) {
          this.logger.debug('StepOptimizer: Using cached optimization', {
            stepId
          });
          return cached.optimizedStep;
        }
      }

      let optimizedStep = step;
      const appliedRules = [];

      // Sort rules by priority
      const sortedRules = Array.from(this.optimizationRules.entries())
        .sort(([, a], [, b]) => a.priority - b.priority);

      // Apply optimization rules
      for (const [ruleId, rule] of sortedRules) {
        try {
          const beforeOptimization = this.getStepMetrics(optimizedStep);
          optimizedStep = await rule.apply(optimizedStep, context);
          const afterOptimization = this.getStepMetrics(optimizedStep);

          if (this.hasStepImprovement(beforeOptimization, afterOptimization)) {
            appliedRules.push({
              ruleId,
              ruleName: rule.name,
              improvement: this.calculateStepImprovement(beforeOptimization, afterOptimization)
            });

            this.logger.debug('StepOptimizer: Rule applied successfully', {
              stepId,
              ruleId,
              ruleName: rule.name
            });
          }
        } catch (error) {
          this.logger.warn('StepOptimizer: Rule failed', {
            stepId,
            ruleId,
            error: error.message
          });
        }
      }

      // Cache optimized step
      this.cacheOptimizedStep(stepId, optimizedStep);

      // Learn from optimization
      if (this.enableLearning) {
        this.learnFromStepOptimization(stepId, optimizedStep, appliedRules);
      }

      this.logger.debug('StepOptimizer: Step optimization completed', {
        stepId,
        appliedRules: appliedRules.length
      });

      return optimizedStep;

    } catch (error) {
      this.logger.error('StepOptimizer: Step optimization failed', {
        stepId: step.getMetadata().name,
        error: error.message
      });
      return step;
    }
  }

  /**
   * Optimize step parameters
   * @param {IWorkflowStep} step - Step to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeParameters(step, context) {
    const metadata = step.getMetadata();
    const parameters = metadata.parameters || {};
    const optimizedParameters = { ...parameters };

    // Optimize based on step type
    const stepType = metadata.type;
    
    switch (stepType) {
      case 'analysis':
        optimizedParameters.timeout = Math.min(parameters.timeout || 60000, 300000);
        optimizedParameters.parallel = parameters.parallel || true;
        break;
        
      case 'processing':
        optimizedParameters.batchSize = Math.max(parameters.batchSize || 100, 50);
        optimizedParameters.retries = Math.min(parameters.retries || 3, 5);
        break;
        
      case 'testing':
        optimizedParameters.timeout = Math.min(parameters.timeout || 30000, 120000);
        optimizedParameters.parallel = parameters.parallel || true;
        break;
        
      case 'deployment':
        optimizedParameters.rollback = parameters.rollback !== false;
        optimizedParameters.healthCheck = parameters.healthCheck !== false;
        break;
        
      default:
        // Apply  optimizations
        if (optimizedParameters.timeout) {
          optimizedParameters.timeout = Math.min(optimizedParameters.timeout, 300000);
        }
        if (optimizedParameters.retries) {
          optimizedParameters.retries = Math.min(optimizedParameters.retries, 5);
        }
    }

    // Optimize based on context
    if (context.getData('fastMode')) {
      optimizedParameters.timeout = Math.min(optimizedParameters.timeout || 60000, 30000);
      optimizedParameters.parallel = true;
    }

    if (context.getData('productionMode')) {
      optimizedParameters.retries = Math.max(optimizedParameters.retries || 1, 3);
      optimizedParameters.rollback = true;
    }

    return this.createOptimizedStep(step, {
      ...metadata,
      parameters: optimizedParameters,
      optimized: true
    });
  }

  /**
   * Combine steps
   * @param {IWorkflowStep} step - Step to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  combineSteps(step, context) {
    // This is a placeholder for step combination logic
    // In practice, this would be called from the workflow level
    // where multiple steps can be combined
    return step;
  }

  /**
   * Optimize execution strategy
   * @param {IWorkflowStep} step - Step to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeExecutionStrategy(step, context) {
    const metadata = step.getMetadata();
    const optimizedMetadata = { ...metadata };

    // Determine optimal execution strategy
    const stepType = metadata.type;
    const parameters = metadata.parameters || {};
    
    let executionStrategy = 'sequential';
    
    if (stepType === 'analysis' || stepType === 'testing') {
      executionStrategy = parameters.parallel ? 'parallel' : 'sequential';
    } else if (stepType === 'processing' && parameters.batchSize > 100) {
      executionStrategy = 'batch';
    } else if (stepType === 'deployment') {
      executionStrategy = 'rolling';
    }

    // Add execution strategy to metadata
    optimizedMetadata.executionStrategy = executionStrategy;
    optimizedMetadata.optimized = true;

    return this.createOptimizedStep(step, optimizedMetadata);
  }

  /**
   * Optimize resources
   * @param {IWorkflowStep} step - Step to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflowStep} Optimized step
   */
  optimizeResources(step, context) {
    const metadata = step.getMetadata();
    const optimizedMetadata = { ...metadata };

    // Calculate optimal resource requirements
    const resourceRequirements = this.calculateResourceRequirements(metadata, context);
    
    // Add resource requirements to metadata
    optimizedMetadata.resourceRequirements = resourceRequirements;
    optimizedMetadata.optimized = true;

    return this.createOptimizedStep(step, optimizedMetadata);
  }

  /**
   * Calculate resource requirements
   * @param {Object} metadata - Step metadata
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Resource requirements
   */
  calculateResourceRequirements(metadata, context) {
    const stepType = metadata.type;
    const parameters = metadata.parameters || {};
    
    // Base requirements
    let memory = 64; // MB
    let cpu = 10; // Percentage
    let timeout = 60000; // 60 seconds

    // Adjust based on step type
    switch (stepType) {
      case 'setup':
        memory = 32;
        cpu = 5;
        timeout = 30000;
        break;
        
      case 'analysis':
        memory = 128;
        cpu = 20;
        timeout = 300000;
        break;
        
      case 'processing':
        memory = 256;
        cpu = 30;
        timeout = 180000;
        break;
        
      case 'testing':
        memory = 96;
        cpu = 15;
        timeout = 120000;
        break;
        
      case 'deployment':
        memory = 64;
        cpu = 10;
        timeout = 240000;
        break;
        
      case 'cleanup':
        memory = 32;
        cpu = 5;
        timeout = 30000;
        break;
    }

    // Adjust based on parameters
    if (parameters.batchSize) {
      memory = Math.min(memory * Math.ceil(parameters.batchSize / 100), 1024);
    }
    
    if (parameters.parallel) {
      cpu = Math.min(cpu * 2, 80);
    }
    
    if (parameters.timeout) {
      timeout = Math.min(parameters.timeout, 600000); // Max 10 minutes
    }

    // Adjust based on context
    if (context.getData('fastMode')) {
      timeout = Math.min(timeout, 60000);
      memory = Math.min(memory, 256);
    }

    if (context.getData('productionMode')) {
      memory = Math.max(memory, 128);
      cpu = Math.max(cpu, 15);
    }

    return {
      memory,
      cpu,
      timeout,
      estimatedCost: this.calculateStepCost(memory, cpu, timeout)
    };
  }

  /**
   * Calculate step cost
   * @param {number} memory - Memory in MB
   * @param {number} cpu - CPU percentage
   * @param {number} timeout - Timeout in milliseconds
   * @returns {number} Estimated cost
   */
  calculateStepCost(memory, cpu, timeout) {
    const memoryCost = memory * 0.001; // $0.001 per MB
    const cpuCost = cpu * 0.01; // $0.01 per CPU %
    const timeCost = (timeout / 1000) * 0.0001; // $0.0001 per second
    
    return Math.round((memoryCost + cpuCost + timeCost) * 100) / 100;
  }

  /**
   * Learn from step optimization
   * @param {string} stepId - Step ID
   * @param {IWorkflowStep} optimizedStep - Optimized step
   * @param {Array} appliedRules - Applied rules
   */
  learnFromStepOptimization(stepId, optimizedStep, appliedRules) {
    this.stepHistory.set(stepId, {
      optimizedStep,
      appliedRules,
      timestamp: Date.now()
    });

    // Clean up old history
    if (this.stepHistory.size > 1000) {
      const entries = Array.from(this.stepHistory.entries());
      const toDelete = entries.slice(0, entries.length - 1000);
      for (const [key] of toDelete) {
        this.stepHistory.delete(key);
      }
    }
  }

  /**
   * Learn from step execution
   * @param {string} stepId - Step ID
   * @param {Object} result - Step execution result
   * @param {Object} optimization - Applied optimization
   */
  async learnFromStepExecution(stepId, result, optimization) {
    if (!this.enableLearning) return;

    const executionData = {
      stepId,
      result,
      optimization,
      timestamp: Date.now()
    };

    // Store execution data for future optimization
    this.stepHistory.set(`${stepId}_${Date.now()}`, executionData);

    // Clean up old data
    if (this.stepHistory.size > 2000) {
      const entries = Array.from(this.stepHistory.entries());
      const toDelete = entries.slice(0, entries.length - 2000);
      for (const [key] of toDelete) {
        this.stepHistory.delete(key);
      }
    }
  }

  /**
   * Get step ID
   * @param {IWorkflowStep} step - Step
   * @returns {string} Step ID
   */
  getStepId(step) {
    const metadata = step.getMetadata();
    return `${metadata.type}_${metadata.name}_${metadata.version || '1.0'}`;
  }

  /**
   * Get step metrics
   * @param {IWorkflowStep} step - Step
   * @returns {Object} Step metrics
   */
  getStepMetrics(step) {
    const metadata = step.getMetadata();
    const parameters = metadata.parameters || {};
    
    return {
      complexity: this.calculateStepComplexity(metadata),
      estimatedDuration: parameters.timeout || 60000,
      resourceIntensity: this.calculateResourceIntensity(parameters),
      optimizationPotential: this.calculateOptimizationPotential(metadata)
    };
  }

  /**
   * Calculate step complexity
   * @param {Object} metadata - Step metadata
   * @returns {number} Complexity score
   */
  calculateStepComplexity(metadata) {
    let complexity = 1;
    
    // Base complexity by type
    const typeComplexity = {
      'setup': 1,
      'validation': 2,
      'analysis': 4,
      'processing': 3,
      'testing': 3,
      'deployment': 4,
      'cleanup': 1
    };
    
    complexity *= typeComplexity[metadata.type] || 2;
    
    // Add complexity for parameters
    const parameters = metadata.parameters || {};
    if (parameters.batchSize) complexity += Math.log10(parameters.batchSize);
    if (parameters.parallel) complexity += 1;
    if (parameters.retries) complexity += parameters.retries * 0.5;
    
    return Math.round(complexity);
  }

  /**
   * Calculate resource intensity
   * @param {Object} parameters - Step parameters
   * @returns {number} Resource intensity score
   */
  calculateResourceIntensity(parameters) {
    let intensity = 1;
    
    if (parameters.batchSize) intensity += parameters.batchSize / 100;
    if (parameters.parallel) intensity *= 1.5;
    if (parameters.timeout) intensity += parameters.timeout / 60000;
    
    return Math.round(intensity);
  }

  /**
   * Calculate optimization potential
   * @param {Object} metadata - Step metadata
   * @returns {number} Optimization potential (0-1)
   */
  calculateOptimizationPotential(metadata) {
    let potential = 0;
    
    // Higher potential for complex steps
    const complexity = this.calculateStepComplexity(metadata);
    potential += Math.min(complexity / 10, 0.5);
    
    // Higher potential for steps with many parameters
    const parameters = metadata.parameters || {};
    const paramCount = Object.keys(parameters).length;
    potential += Math.min(paramCount / 10, 0.3);
    
    // Higher potential for certain step types
    const highPotentialTypes = ['analysis', 'processing', 'deployment'];
    if (highPotentialTypes.includes(metadata.type)) {
      potential += 0.2;
    }
    
    return Math.min(potential, 1);
  }

  /**
   * Check if step has improvement
   * @param {Object} before - Before metrics
   * @param {Object} after - After metrics
   * @returns {boolean} True if improved
   */
  hasStepImprovement(before, after) {
    return after.complexity < before.complexity ||
           after.estimatedDuration < before.estimatedDuration ||
           after.resourceIntensity < before.resourceIntensity;
  }

  /**
   * Calculate step improvement
   * @param {Object} before - Before metrics
   * @param {Object} after - After metrics
   * @returns {number} Improvement percentage
   */
  calculateStepImprovement(before, after) {
    const complexityImprovement = before.complexity > 0 ? 
      ((before.complexity - after.complexity) / before.complexity) * 100 : 0;
    
    const durationImprovement = before.estimatedDuration > 0 ? 
      ((before.estimatedDuration - after.estimatedDuration) / before.estimatedDuration) * 100 : 0;
    
    const resourceImprovement = before.resourceIntensity > 0 ? 
      ((before.resourceIntensity - after.resourceIntensity) / before.resourceIntensity) * 100 : 0;
    
    return Math.max(complexityImprovement, durationImprovement, resourceImprovement);
  }

  /**
   * Create optimized step
   * @param {IWorkflowStep} originalStep - Original step
   * @param {Object} optimizedMetadata - Optimized metadata
   * @returns {IWorkflowStep} Optimized step
   */
  createOptimizedStep(originalStep, optimizedMetadata) {
    return {
      ...originalStep,
      getMetadata: () => optimizedMetadata
    };
  }

  /**
   * Cache optimized step
   * @param {string} stepId - Step ID
   * @param {IWorkflowStep} optimizedStep - Optimized step
   */
  cacheOptimizedStep(stepId, optimizedStep) {
    // Check cache size and evict if necessary
    if (this.stepCache.size >= this.maxCacheSize) {
      const entries = Array.from(this.stepCache.entries());
      const oldestEntry = entries[0];
      this.stepCache.delete(oldestEntry[0]);
    }

    this.stepCache.set(stepId, {
      optimizedStep,
      timestamp: Date.now()
    });
  }

  /**
   * Check if cache is valid
   * @param {Object} cached - Cached item
   * @returns {boolean} True if valid
   */
  isCacheValid(cached) {
    const cacheAge = Date.now() - cached.timestamp;
    const maxAge = 1800000; // 30 minutes
    return cacheAge < maxAge;
  }

  /**
   * Get optimization statistics
   * @returns {Object} Optimization statistics
   */
  getOptimizationStatistics() {
    return {
      cacheSize: this.stepCache.size,
      maxCacheSize: this.maxCacheSize,
      historySize: this.stepHistory.size,
      rulesCount: this.optimizationRules.size,
      enabled: this.enableStepOptimization,
      learning: this.enableLearning
    };
  }

  /**
   * Clear step cache
   */
  clearCache() {
    this.stepCache.clear();
    this.logger.info('StepOptimizer: Cache cleared');
  }

  /**
   * Clear step history
   */
  clearHistory() {
    this.stepHistory.clear();
    this.logger.info('StepOptimizer: History cleared');
  }

  /**
   * Shutdown step optimizer
   */
  shutdown() {
    this.logger.info('StepOptimizer: Shutting down');
    
    // Clear cache and history
    this.clearCache();
    this.clearHistory();
    
    this.logger.info('StepOptimizer: Shutdown complete');
  }
}

module.exports = StepOptimizer; 