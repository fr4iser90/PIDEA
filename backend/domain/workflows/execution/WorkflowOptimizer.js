/**
 * WorkflowOptimizer - Advanced workflow optimization algorithms
 * Provides workflow optimization with step combination, reordering, redundancy removal,
 * parallel execution, resource optimization, and predictive optimization
 */
const crypto = require('crypto');
const { ExecutionOptimizer } = require('./optimization/ExecutionOptimizer');
const { ExecutionExceptionFactory } = require('./exceptions/ExecutionException');

/**
 * Workflow optimizer for execution optimization
 */
class WorkflowOptimizer {
  constructor(options = {}) {
    this.optimizationRules = new Map();
    this.executionHistory = new Map();
    this.optimizationCache = new Map();
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.enableLearning = options.enableLearning !== false;
    this.enableCaching = options.enableCaching !== false;
    this.enableOptimization = options.enableOptimization !== false;
    
    // Advanced optimization features
    this.enableAdvancedOptimization = options.enableAdvancedOptimization !== false;
    this.enableParallelExecution = options.enableParallelExecution !== false;
    this.enableResourceOptimization = options.enableResourceOptimization !== false;
    this.enablePredictiveOptimization = options.enablePredictiveOptimization !== false;
    
    // Initialize advanced optimizer if enabled
    if (this.enableAdvancedOptimization) {
      this.executionOptimizer = new ExecutionOptimizer({
        enabled: true,
        stepCombination: options.enableStepCombination !== false,
        stepReordering: options.enableStepReordering !== false,
        parallelExecution: this.enableParallelExecution,
        resourceOptimization: this.enableResourceOptimization,
        predictiveOptimization: this.enablePredictiveOptimization,
        caching: this.enableCaching,
        learningEnabled: this.enableLearning,
        logger: options.logger
      });
    }
    
    this.initializeOptimizationRules();
    
    this.logger = options.logger || console;
  }

  /**
   * Initialize optimization rules
   */
  initializeOptimizationRules() {
    // Rule 1: Combine similar steps
    this.optimizationRules.set('combine_similar_steps', {
      name: 'Combine Similar Steps',
      description: 'Combine multiple similar steps into a single optimized step',
      priority: 1,
      apply: (workflow, context) => this.combineSimilarSteps(workflow, context)
    });

    // Rule 2: Reorder steps for efficiency
    this.optimizationRules.set('reorder_steps', {
      name: 'Reorder Steps',
      description: 'Reorder steps for optimal execution order',
      priority: 2,
      apply: (workflow, context) => this.reorderSteps(workflow, context)
    });

    // Rule 3: Remove redundant steps
    this.optimizationRules.set('remove_redundant_steps', {
      name: 'Remove Redundant Steps',
      description: 'Remove steps that are redundant or unnecessary',
      priority: 3,
      apply: (workflow, context) => this.removeRedundantSteps(workflow, context)
    });

    // Rule 4: Optimize step parameters
    this.optimizationRules.set('optimize_parameters', {
      name: 'Optimize Parameters',
      description: 'Optimize step parameters for better performance',
      priority: 4,
      apply: (workflow, context) => this.optimizeParameters(workflow, context)
    });

    // Rule 5: Enable parallel execution
    this.optimizationRules.set('enable_parallel_execution', {
      name: 'Enable Parallel Execution',
      description: 'Identify and enable parallel execution of independent steps',
      priority: 5,
      apply: (workflow, context) => this.enableParallelExecution(workflow, context)
    });

    // Rule 6: Optimize resource allocation
    this.optimizationRules.set('optimize_resource_allocation', {
      name: 'Optimize Resource Allocation',
      description: 'Optimize resource allocation for better performance',
      priority: 6,
      apply: (workflow, context) => this.optimizeResourceAllocation(workflow, context)
    });

    // Rule 7: Apply predictive optimization
    this.optimizationRules.set('predictive_optimization', {
      name: 'Predictive Optimization',
      description: 'Apply predictive optimization based on historical data',
      priority: 7,
      apply: (workflow, context) => this.applyPredictiveOptimization(workflow, context)
    });
  }

  /**
   * Optimize workflow
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<IWorkflow>} Optimized workflow
   */
  async optimizeWorkflow(workflow, context) {
    const workflowId = this.getWorkflowId(workflow);
    
    try {
      this.logger.info('WorkflowOptimizer: Starting workflow optimization', {
        workflowId,
        workflowName: workflow.getMetadata().name
      });

      // Check optimization cache
      if (this.enableCaching && this.optimizationCache.has(workflowId)) {
        const cached = this.optimizationCache.get(workflowId);
        if (this.isCacheValid(cached)) {
          this.logger.info('WorkflowOptimizer: Using cached optimization', {
            workflowId,
            cacheAge: Date.now() - cached.timestamp
          });
          return cached.optimizedWorkflow;
        }
      }

      let optimizedWorkflow = workflow;
      const appliedRules = [];

      // Use advanced optimization if available
      if (this.executionOptimizer && this.enableAdvancedOptimization) {
        try {
          this.logger.info('WorkflowOptimizer: Using advanced optimization', {
            workflowId,
            workflowName: workflow.getMetadata().name
          });

          const steps = this.getWorkflowSteps(workflow);
          const optimizationResult = await this.executionOptimizer.optimizeWorkflow(steps, context);
          
          if (optimizationResult && optimizationResult.optimizedSteps) {
            optimizedWorkflow = await this.applyOptimizationResult(workflow, optimizationResult, context);
            
            appliedRules.push({
              ruleId: 'advanced_optimization',
              ruleName: 'Advanced Optimization',
              improvement: optimizationResult.estimatedSavings,
              confidence: optimizationResult.confidence,
              appliedOptimizations: optimizationResult.appliedOptimizations.map(opt => opt.type)
            });

            this.logger.info('WorkflowOptimizer: Advanced optimization applied', {
              workflowId,
              originalSteps: steps.length,
              optimizedSteps: optimizationResult.optimizedSteps.length,
              estimatedSavings: optimizationResult.estimatedSavings,
              confidence: optimizationResult.confidence
            });
          }
        } catch (error) {
          this.logger.warn('WorkflowOptimizer: Advanced optimization failed, falling back to basic rules', {
            workflowId,
            error: error.message
          });
        }
      }

      // Apply basic optimization rules if advanced optimization failed or is disabled
      if (appliedRules.length === 0) {
        // Sort rules by priority
        const sortedRules = Array.from(this.optimizationRules.entries())
          .sort(([, a], [, b]) => a.priority - b.priority);

        // Apply optimization rules
        for (const [ruleId, rule] of sortedRules) {
          try {
            const beforeOptimization = this.getWorkflowMetrics(optimizedWorkflow);
            optimizedWorkflow = await rule.apply(optimizedWorkflow, context);
            const afterOptimization = this.getWorkflowMetrics(optimizedWorkflow);

            if (this.hasImprovement(beforeOptimization, afterOptimization)) {
              appliedRules.push({
                ruleId,
                ruleName: rule.name,
                improvement: this.calculateImprovement(beforeOptimization, afterOptimization)
              });

              this.logger.info('WorkflowOptimizer: Rule applied successfully', {
                workflowId,
                ruleId,
                ruleName: rule.name,
                improvement: this.calculateImprovement(beforeOptimization, afterOptimization)
              });
            }
          } catch (error) {
            this.logger.warn('WorkflowOptimizer: Rule failed', {
              workflowId,
              ruleId,
              error: error.message
            });
          }
        }
      }

      // Cache optimized workflow
      if (this.enableCaching) {
        this.cacheOptimizedWorkflow(workflowId, optimizedWorkflow);
      }

      // Learn from optimization
      if (this.enableLearning) {
        this.learnFromOptimization(workflowId, optimizedWorkflow, appliedRules);
      }

      this.logger.info('WorkflowOptimizer: Optimization completed', {
        workflowId,
        appliedRules: appliedRules.length,
        originalSteps: this.getWorkflowMetrics(workflow).stepCount,
        optimizedSteps: this.getWorkflowMetrics(optimizedWorkflow).stepCount
      });

      return optimizedWorkflow;

    } catch (error) {
      this.logger.error('WorkflowOptimizer: Optimization failed', {
        workflowId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Combine similar steps
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflow} Optimized workflow
   */
  combineSimilarSteps(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    if (steps.length <= 1) {
      return workflow;
    }

    // Group steps by type and similarity
    const stepGroups = this.groupSimilarSteps(steps);
    
    // Combine similar steps
    const optimizedSteps = [];
    for (const [groupKey, groupSteps] of Object.entries(stepGroups)) {
      if (groupSteps.length === 1) {
        optimizedSteps.push(groupSteps[0]);
      } else {
        // Create combined step
        const combinedStep = this.createCombinedStep(groupKey, groupSteps);
        optimizedSteps.push(combinedStep);
      }
    }

    // Create optimized workflow
    return this.createOptimizedWorkflow(workflow, optimizedSteps, 'combine_similar_steps');
  }

  /**
   * Group similar steps
   * @param {Array} steps - Steps to group
   * @returns {Object} Grouped steps
   */
  groupSimilarSteps(steps) {
    const groups = {};
    
    for (const step of steps) {
      const groupKey = this.getStepGroupKey(step);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(step);
    }
    
    return groups;
  }

  /**
   * Get step group key
   * @param {Object} step - Step
   * @returns {string} Group key
   */
  getStepGroupKey(step) {
    const metadata = step.getMetadata ? step.getMetadata() : step;
    return `${metadata.type}_${metadata.category || 'default'}`;
  }

  /**
   * Reorder steps for efficiency
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflow} Optimized workflow
   */
  reorderSteps(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    if (steps.length <= 1) {
      return workflow;
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

    // Sort steps by priority and dependencies
    const sortedSteps = this.sortStepsByPriority(steps, stepPriority, context);

    // Create optimized workflow
    return this.createOptimizedWorkflow(workflow, sortedSteps, 'reorder_steps');
  }

  /**
   * Sort steps by priority and dependencies
   * @param {Array} steps - Steps to sort
   * @param {Object} stepPriority - Priority mapping
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array} Sorted steps
   */
  sortStepsByPriority(steps, stepPriority, context) {
    // Create dependency graph
    const dependencyGraph = this.buildDependencyGraph(steps, context);
    
    // Topological sort with priority
    return this.topologicalSort(steps, dependencyGraph, stepPriority);
  }

  /**
   * Build dependency graph
   * @param {Array} steps - Steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Map} Dependency graph
   */
  buildDependencyGraph(steps, context) {
    const graph = new Map();
    
    for (let i = 0; i < steps.length; i++) {
      graph.set(i, []);
      
      // Check dependencies based on step metadata
      const step = steps[i];
      const metadata = step.getMetadata ? step.getMetadata() : step;
      
      if (metadata.dependencies) {
        for (const depName of metadata.dependencies) {
          const depIndex = steps.findIndex(s => {
            const sMetadata = s.getMetadata ? s.getMetadata() : s;
            return sMetadata.name === depName;
          });
          
          if (depIndex !== -1 && depIndex < i) {
            graph.get(depIndex).push(i);
          }
        }
      }
    }
    
    return graph;
  }

  /**
   * Topological sort with priority
   * @param {Array} steps - Steps
   * @param {Map} dependencyGraph - Dependency graph
   * @param {Object} stepPriority - Priority mapping
   * @returns {Array} Sorted steps
   */
  topologicalSort(steps, dependencyGraph, stepPriority) {
    const visited = new Set();
    const result = [];
    
    const visit = (node) => {
      if (visited.has(node)) return;
      visited.add(node);
      
      // Visit dependencies first
      const dependencies = dependencyGraph.get(node) || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      
      result.push(steps[node]);
    };
    
    // Sort nodes by priority for consistent ordering
    const nodes = Array.from(dependencyGraph.keys()).sort((a, b) => {
      const aMetadata = steps[a].getMetadata ? steps[a].getMetadata() : steps[a];
      const bMetadata = steps[b].getMetadata ? steps[b].getMetadata() : steps[b];
      const aPriority = stepPriority[aMetadata.type] || 999;
      const bPriority = stepPriority[bMetadata.type] || 999;
      return aPriority - bPriority;
    });
    
    for (const node of nodes) {
      visit(node);
    }
    
    return result;
  }

  /**
   * Remove redundant steps
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflow} Optimized workflow
   */
  removeRedundantSteps(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    if (steps.length <= 1) {
      return workflow;
    }

    // Remove duplicate steps
    const uniqueSteps = [];
    const seenSteps = new Set();

    for (const step of steps) {
      const stepKey = this.getStepUniquenessKey(step);
      if (!seenSteps.has(stepKey)) {
        seenSteps.add(stepKey);
        uniqueSteps.push(step);
      }
    }

    // Remove unnecessary steps based on context
    const filteredSteps = this.filterUnnecessarySteps(uniqueSteps, context);

    // Create optimized workflow
    return this.createOptimizedWorkflow(workflow, filteredSteps, 'remove_redundant_steps');
  }

  /**
   * Get step uniqueness key
   * @param {Object} step - Step
   * @returns {string} Uniqueness key
   */
  getStepUniquenessKey(step) {
    const metadata = step.getMetadata ? step.getMetadata() : step;
    return `${metadata.type}_${metadata.name}_${JSON.stringify(metadata.parameters || {})}`;
  }

  /**
   * Filter unnecessary steps
   * @param {Array} steps - Steps to filter
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array} Filtered steps
   */
  filterUnnecessarySteps(steps, context) {
    return steps.filter(step => {
      const metadata = step.getMetadata ? step.getMetadata() : step;
      
      // Skip steps that are explicitly disabled
      if (metadata.disabled) {
        return false;
      }
      
      // Skip steps that don't match context conditions
      if (metadata.conditions) {
        return this.evaluateConditions(metadata.conditions, context);
      }
      
      return true;
    });
  }

  /**
   * Evaluate conditions
   * @param {Object} conditions - Conditions to evaluate
   * @param {WorkflowContext} context - Workflow context
   * @returns {boolean} True if conditions are met
   */
  evaluateConditions(conditions, context) {
    // Simple condition evaluation
    for (const [key, value] of Object.entries(conditions)) {
      const contextValue = context.getData(key);
      if (contextValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Optimize parameters
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflow} Optimized workflow
   */
  optimizeParameters(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    if (steps.length === 0) {
      return workflow;
    }

    // Optimize step parameters
    const optimizedSteps = steps.map(step => this.optimizeStepParameters(step, context));

    // Create optimized workflow
    return this.createOptimizedWorkflow(workflow, optimizedSteps, 'optimize_parameters');
  }

  /**
   * Optimize step parameters
   * @param {Object} step - Step to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Optimized step
   */
  optimizeStepParameters(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : step;
    const optimizedParameters = { ...metadata.parameters };

    // Apply parameter optimizations based on context
    if (optimizedParameters.timeout && context.getData('fastMode')) {
      optimizedParameters.timeout = Math.min(optimizedParameters.timeout, 30000);
    }

    if (optimizedParameters.retries && context.getData('productionMode')) {
      optimizedParameters.retries = Math.max(optimizedParameters.retries, 3);
    }

    // Create optimized step
    return {
      ...step,
      getMetadata: () => ({
        ...metadata,
        parameters: optimizedParameters,
        optimized: true
      })
    };
  }

  /**
   * Learn from optimization
   * @param {string} workflowId - Workflow ID
   * @param {IWorkflow} optimizedWorkflow - Optimized workflow
   * @param {Array} appliedRules - Applied rules
   */
  learnFromOptimization(workflowId, optimizedWorkflow, appliedRules) {
    this.executionHistory.set(workflowId, {
      optimizedWorkflow,
      appliedRules,
      timestamp: new Date()
    });

    // Clean up old history (keep last 1000 optimizations)
    if (this.executionHistory.size > 1000) {
      const entries = Array.from(this.executionHistory.entries());
      const toDelete = entries.slice(0, entries.length - 1000);
      for (const [key] of toDelete) {
        this.executionHistory.delete(key);
      }
    }
  }

  /**
   * Learn from execution
   * @param {string} executionId - Execution ID
   * @param {Object} result - Execution result
   */
  async learnFromExecution(executionId, result) {
    // Store execution history for future optimization
    this.executionHistory.set(executionId, {
      result,
      timestamp: new Date()
    });

    // Clean up old history (keep last 1000 executions)
    if (this.executionHistory.size > 1000) {
      const entries = Array.from(this.executionHistory.entries());
      const toDelete = entries.slice(0, entries.length - 1000);
      for (const [key] of toDelete) {
        this.executionHistory.delete(key);
      }
    }
  }

  /**
   * Get workflow ID
   * @param {IWorkflow} workflow - Workflow
   * @returns {string} Workflow ID
   */
  getWorkflowId(workflow) {
    const metadata = workflow.getMetadata();
    return `${metadata.name}_${metadata.version}`;
  }

  /**
   * Get workflow metrics
   * @param {IWorkflow} workflow - Workflow
   * @returns {Object} Workflow metrics
   */
  getWorkflowMetrics(workflow) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    return {
      stepCount: steps.length,
      estimatedDuration: this.estimateWorkflowDuration(steps),
      complexity: this.calculateWorkflowComplexity(steps)
    };
  }

  /**
   * Estimate workflow duration
   * @param {Array} steps - Steps
   * @returns {number} Estimated duration in milliseconds
   */
  estimateWorkflowDuration(steps) {
    return steps.reduce((total, step) => {
      const metadata = step.getMetadata ? step.getMetadata() : step;
      return total + (metadata.estimatedDuration || 1000);
    }, 0);
  }

  /**
   * Calculate workflow complexity
   * @param {Array} steps - Steps
   * @returns {number} Complexity score
   */
  calculateWorkflowComplexity(steps) {
    return steps.reduce((total, step) => {
      const metadata = step.getMetadata ? step.getMetadata() : step;
      return total + (metadata.complexity || 1);
    }, 0);
  }

  /**
   * Check if optimization has improvement
   * @param {Object} before - Before metrics
   * @param {Object} after - After metrics
   * @returns {boolean} True if improved
   */
  hasImprovement(before, after) {
    return after.stepCount < before.stepCount || 
           after.estimatedDuration < before.estimatedDuration ||
           after.complexity < before.complexity;
  }

  /**
   * Calculate improvement percentage
   * @param {Object} before - Before metrics
   * @param {Object} after - After metrics
   * @returns {number} Improvement percentage
   */
  calculateImprovement(before, after) {
    const stepImprovement = before.stepCount > 0 ? 
      ((before.stepCount - after.stepCount) / before.stepCount) * 100 : 0;
    
    const durationImprovement = before.estimatedDuration > 0 ? 
      ((before.estimatedDuration - after.estimatedDuration) / before.estimatedDuration) * 100 : 0;
    
    return Math.max(stepImprovement, durationImprovement);
  }

  /**
   * Create combined step
   * @param {string} type - Step type
   * @param {Array} steps - Steps to combine
   * @returns {Object} Combined step
   */
  createCombinedStep(type, steps) {
    return {
      type,
      name: `combined_${type}`,
      description: `Combined ${steps.length} ${type} steps`,
      parameters: this.mergeStepParameters(steps),
      metadata: {
        originalSteps: steps.length,
        combined: true,
        estimatedDuration: steps.reduce((total, step) => {
          const metadata = step.getMetadata ? step.getMetadata() : step;
          return total + (metadata.estimatedDuration || 1000);
        }, 0)
      }
    };
  }

  /**
   * Merge step parameters
   * @param {Array} steps - Steps to merge
   * @returns {Object} Merged parameters
   */
  mergeStepParameters(steps) {
    const merged = {};
    
    for (const step of steps) {
      const metadata = step.getMetadata ? step.getMetadata() : step;
      if (metadata.parameters) {
        Object.assign(merged, metadata.parameters);
      }
    }
    
    return merged;
  }

  /**
   * Create optimized workflow
   * @param {IWorkflow} originalWorkflow - Original workflow
   * @param {Array} optimizedSteps - Optimized steps
   * @param {string} optimizationType - Type of optimization applied
   * @returns {IWorkflow} Optimized workflow
   */
  createOptimizedWorkflow(originalWorkflow, optimizedSteps, optimizationType) {
    const originalMetadata = originalWorkflow.getMetadata();
    
    // Create optimized metadata
    const optimizedMetadata = {
      ...originalMetadata,
      steps: optimizedSteps,
      optimized: true,
      optimizationType,
      originalStepCount: originalMetadata.steps?.length || 0,
      optimizedStepCount: optimizedSteps.length,
      optimizationTimestamp: new Date()
    };

    // Create optimized workflow instance
    return {
      ...originalWorkflow,
      getMetadata: () => optimizedMetadata
    };
  }

  /**
   * Cache optimized workflow
   * @param {string} workflowId - Workflow ID
   * @param {IWorkflow} optimizedWorkflow - Optimized workflow
   */
  cacheOptimizedWorkflow(workflowId, optimizedWorkflow) {
    // Check cache size and evict if necessary
    if (this.optimizationCache.size >= this.maxCacheSize) {
      const entries = Array.from(this.optimizationCache.entries());
      const oldestEntry = entries[0];
      this.optimizationCache.delete(oldestEntry[0]);
    }

    this.optimizationCache.set(workflowId, {
      optimizedWorkflow,
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
    const maxAge = 3600000; // 1 hour
    return cacheAge < maxAge;
  }

  /**
   * Get optimization statistics
   * @returns {Object} Optimization statistics
   */
  getOptimizationStatistics() {
    return {
      cacheSize: this.optimizationCache.size,
      maxCacheSize: this.maxCacheSize,
      historySize: this.executionHistory.size,
      rulesCount: this.optimizationRules.size,
      enabledLearning: this.enableLearning,
      enabledCaching: this.enableCaching,
      enabled: this.enableOptimization
    };
  }

  /**
   * Clear optimization cache
   */
  clearCache() {
    this.optimizationCache.clear();
    this.logger.info('WorkflowOptimizer: Cache cleared');
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.executionHistory.clear();
    this.logger.info('WorkflowOptimizer: History cleared');
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
   * Enable parallel execution
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflow} Optimized workflow
   */
  enableParallelExecution(workflow, context) {
    if (!this.enableParallelExecution) {
      return workflow;
    }

    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    if (steps.length <= 1) {
      return workflow;
    }

    // Identify parallel execution groups
    const parallelGroups = this.identifyParallelGroups(steps, context);
    
    if (parallelGroups.length === 0) {
      return workflow;
    }

    // Create parallel execution workflow
    const optimizedSteps = this.createParallelExecutionSteps(steps, parallelGroups);
    
    return this.createOptimizedWorkflow(workflow, optimizedSteps, 'enable_parallel_execution');
  }

  /**
   * Identify parallel execution groups
   * @param {Array} steps - Steps to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array} Parallel execution groups
   */
  identifyParallelGroups(steps, context) {
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < steps.length; i++) {
      if (processed.has(i)) {
        continue;
      }

      const currentStep = steps[i];
      
      if (this.canExecuteInParallel(currentStep, context)) {
        const group = [i];
        processed.add(i);

        // Find other steps that can be executed in parallel
        for (let j = i + 1; j < steps.length; j++) {
          if (processed.has(j)) {
            continue;
          }

          const nextStep = steps[j];
          
          if (this.canExecuteInParallel(nextStep, context) && 
              this.areStepsIndependent(currentStep, nextStep, context)) {
            group.push(j);
            processed.add(j);
          }
        }

        if (group.length > 1) {
          groups.push(group);
        }
      }
    }

    return groups;
  }

  /**
   * Check if step can execute in parallel
   * @param {Object} step - Step to check
   * @param {WorkflowContext} context - Workflow context
   * @returns {boolean} Can execute in parallel
   */
  canExecuteInParallel(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    
    // Steps with dependencies cannot execute in parallel
    if (metadata.dependencies && metadata.dependencies.length > 0) {
      return false;
    }

    // Steps with side effects might not be parallelizable
    if (metadata.hasSideEffects) {
      return false;
    }

    // Steps that modify shared resources are not parallelizable
    if (metadata.modifiesSharedResources) {
      return false;
    }

    return true;
  }

  /**
   * Check if steps are independent
   * @param {Object} step1 - First step
   * @param {Object} step2 - Second step
   * @param {WorkflowContext} context - Workflow context
   * @returns {boolean} Are independent
   */
  areStepsIndependent(step1, step2, context) {
    const metadata1 = step1.getMetadata ? step1.getMetadata() : {};
    const metadata2 = step2.getMetadata ? step2.getMetadata() : {};
    
    // Check if steps modify the same resources
    if (metadata1.modifiesResources && metadata2.modifiesResources) {
      const resources1 = new Set(metadata1.modifiesResources);
      const resources2 = new Set(metadata2.modifiesResources);
      
      for (const resource of resources1) {
        if (resources2.has(resource)) {
          return false;
        }
      }
    }
    
    // Check if steps have conflicting side effects
    if (metadata1.hasSideEffects && metadata2.hasSideEffects) {
      return false;
    }
    
    return true;
  }

  /**
   * Create parallel execution steps
   * @param {Array} steps - Original steps
   * @param {Array} parallelGroups - Parallel execution groups
   * @returns {Array} Optimized steps
   */
  createParallelExecutionSteps(steps, parallelGroups) {
    const optimizedSteps = [];
    const processed = new Set();

    // Add parallel groups
    for (const group of parallelGroups) {
      const parallelSteps = group.map(index => steps[index]);
      const parallelStep = this.createParallelStep(parallelSteps);
      optimizedSteps.push(parallelStep);
      
      // Mark steps as processed
      group.forEach(index => processed.add(index));
    }

    // Add remaining sequential steps
    for (let i = 0; i < steps.length; i++) {
      if (!processed.has(i)) {
        optimizedSteps.push(steps[i]);
      }
    }

    return optimizedSteps;
  }

  /**
   * Create parallel step
   * @param {Array} steps - Steps to execute in parallel
   * @returns {Object} Parallel step
   */
  createParallelStep(steps) {
    return {
      getMetadata: () => ({
        name: `parallel_${steps.length}_steps`,
        type: 'parallel',
        description: `Execute ${steps.length} steps in parallel`,
        steps: steps.map(step => step.getMetadata?.()?.name || 'unknown'),
        parallel: true
      }),
      
      execute: async (context) => {
        const results = await Promise.all(steps.map(step => step.execute(context)));
        
        return {
          success: results.every(r => r.success),
          results,
          parallel: true,
          stepCount: steps.length
        };
      }
    };
  }

  /**
   * Optimize resource allocation
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflow} Optimized workflow
   */
  optimizeResourceAllocation(workflow, context) {
    if (!this.enableResourceOptimization) {
      return workflow;
    }

    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    if (steps.length === 0) {
      return workflow;
    }

    // Optimize resource allocation for each step
    const optimizedSteps = steps.map(step => this.optimizeStepResourceAllocation(step, context));
    
    return this.createOptimizedWorkflow(workflow, optimizedSteps, 'optimize_resource_allocation');
  }

  /**
   * Optimize step resource allocation
   * @param {Object} step - Step to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Optimized step
   */
  optimizeStepResourceAllocation(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    
    // Get available resources
    const availableResources = this.getAvailableResources(context);
    
    // Optimize resource requirements
    const optimizedResources = this.calculateOptimalResources(metadata, availableResources);
    
    // Create optimized step
    return {
      ...step,
      getMetadata: () => ({
        ...metadata,
        resourceRequirements: optimizedResources
      })
    };
  }

  /**
   * Get available resources
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Available resources
   */
  getAvailableResources(context) {
    // Default available resources
    return {
      memory: 1024, // 1GB
      cpu: 100,     // 100% CPU
      network: 100  // 100% network
    };
  }

  /**
   * Calculate optimal resources
   * @param {Object} metadata - Step metadata
   * @param {Object} availableResources - Available resources
   * @returns {Object} Optimal resources
   */
  calculateOptimalResources(metadata, availableResources) {
    const requirements = metadata.resourceRequirements || {};
    
    return {
      memory: Math.min(requirements.memory || 64, availableResources.memory),
      cpu: Math.min(requirements.cpu || 10, availableResources.cpu),
      network: Math.min(requirements.network || 0, availableResources.network)
    };
  }

  /**
   * Apply predictive optimization
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @returns {IWorkflow} Optimized workflow
   */
  applyPredictiveOptimization(workflow, context) {
    if (!this.enablePredictiveOptimization) {
      return workflow;
    }

    const workflowName = workflow.getMetadata().name;
    const historicalData = this.executionHistory.get(workflowName);

    if (!historicalData || historicalData.length < 3) {
      return workflow;
    }

    // Apply predictive optimizations based on historical data
    const optimizedSteps = this.applyPredictiveOptimizations(workflow, historicalData, context);
    
    return this.createOptimizedWorkflow(workflow, optimizedSteps, 'predictive_optimization');
  }

  /**
   * Apply predictive optimizations
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {Array} historicalData - Historical execution data
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array} Optimized steps
   */
  applyPredictiveOptimizations(workflow, historicalData, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    // Analyze historical performance
    const performanceAnalysis = this.analyzeHistoricalPerformance(historicalData);
    
    // Apply optimizations based on analysis
    return steps.map(step => this.applyPredictiveOptimizationToStep(step, performanceAnalysis, context));
  }

  /**
   * Analyze historical performance
   * @param {Array} historicalData - Historical execution data
   * @returns {Object} Performance analysis
   */
  analyzeHistoricalPerformance(historicalData) {
    const analysis = {
      averageDuration: 0,
      averageMemory: 0,
      averageCpu: 0,
      failureRate: 0,
      optimizationOpportunities: []
    };

    if (historicalData.length === 0) {
      return analysis;
    }

    // Calculate averages
    const totalDuration = historicalData.reduce((sum, data) => sum + (data.duration || 0), 0);
    const totalMemory = historicalData.reduce((sum, data) => sum + (data.memory || 0), 0);
    const totalCpu = historicalData.reduce((sum, data) => sum + (data.cpu || 0), 0);
    const failures = historicalData.filter(data => !data.success).length;

    analysis.averageDuration = totalDuration / historicalData.length;
    analysis.averageMemory = totalMemory / historicalData.length;
    analysis.averageCpu = totalCpu / historicalData.length;
    analysis.failureRate = failures / historicalData.length;

    // Identify optimization opportunities
    if (analysis.averageDuration > 5000) {
      analysis.optimizationOpportunities.push('long_duration');
    }
    if (analysis.averageMemory > 512) {
      analysis.optimizationOpportunities.push('high_memory');
    }
    if (analysis.failureRate > 0.1) {
      analysis.optimizationOpportunities.push('high_failure_rate');
    }

    return analysis;
  }

  /**
   * Apply predictive optimization to step
   * @param {Object} step - Step to optimize
   * @param {Object} performanceAnalysis - Performance analysis
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Optimized step
   */
  applyPredictiveOptimizationToStep(step, performanceAnalysis, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    
    // Apply optimizations based on performance analysis
    const optimizations = [];

    if (performanceAnalysis.optimizationOpportunities.includes('long_duration')) {
      optimizations.push('timeout_increase');
    }
    if (performanceAnalysis.optimizationOpportunities.includes('high_memory')) {
      optimizations.push('memory_optimization');
    }
    if (performanceAnalysis.optimizationOpportunities.includes('high_failure_rate')) {
      optimizations.push('retry_increase');
    }

    // Create optimized step
    return {
      ...step,
      getMetadata: () => ({
        ...metadata,
        predictiveOptimizations: optimizations
      })
    };
  }

  /**
   * Shutdown optimizer
   */
  async shutdown() {
    this.clearCache();
    this.clearHistory();
    this.logger.info('WorkflowOptimizer: Shutdown completed');
  }
}

module.exports = WorkflowOptimizer; 