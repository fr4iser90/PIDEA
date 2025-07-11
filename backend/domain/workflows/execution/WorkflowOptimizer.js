/**
 * WorkflowOptimizer - Workflow optimization algorithms
 * Provides workflow optimization with step combination, reordering, and redundancy removal
 */
const crypto = require('crypto');

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
   * Shutdown optimizer
   */
  async shutdown() {
    this.clearCache();
    this.clearHistory();
    this.logger.info('WorkflowOptimizer: Shutdown completed');
  }
}

module.exports = WorkflowOptimizer; 