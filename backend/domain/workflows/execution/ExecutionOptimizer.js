/**
 * ExecutionOptimizer - Advanced optimization algorithms for workflow execution
 * Provides intelligent optimization strategies and performance improvements
 */
const crypto = require('crypto');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Execution optimizer for workflow execution
 */
class ExecutionOptimizer {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.optimizationLevel = options.optimizationLevel || 'medium'; // low, medium, high
    this.learningEnabled = options.learningEnabled !== false;
    this.cachingEnabled = options.cachingEnabled !== false;
    this.parallelizationEnabled = options.parallelizationEnabled !== false;
    this.resourceOptimizationEnabled = options.resourceOptimizationEnabled !== false;
    
    this.optimizationCache = new Map();
    this.optimizationHistory = new Map();
    this.performanceProfiles = new Map();
    this.resourceProfiles = new Map();
    this.logger = options.logger || console;
    
    // Optimization strategies
    this.strategies = {
      stepCombination: options.stepCombination !== false,
      stepReordering: options.stepReordering !== false,
      resourcePreallocation: options.resourcePreallocation !== false,
      parallelExecution: options.parallelExecution !== false,
      caching: options.caching !== false,
      predictiveOptimization: options.predictiveOptimization !== false
    };
  }

  /**
   * Optimize workflow execution
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeWorkflow(workflow, context, options = {}) {
    if (!this.enabled) {
      return {
        optimized: false,
        reason: 'Optimization disabled',
        workflow
      };
    }
    
    const startTime = Date.now();
    
    try {
      this.logger.info('ExecutionOptimizer: Starting workflow optimization', {
        workflowName: workflow.getMetadata().name,
        optimizationLevel: this.optimizationLevel
      });

      // Analyze workflow
      const analysis = await this.analyzeWorkflow(workflow, context);
      
      // Check cache for existing optimization
      if (this.cachingEnabled) {
        const cachedOptimization = await this.getCachedOptimization(workflow, context);
        if (cachedOptimization) {
          this.logger.info('ExecutionOptimizer: Using cached optimization');
          return cachedOptimization;
        }
      }
      
      // Apply optimization strategies
      let optimizedWorkflow = workflow;
      const appliedOptimizations = [];
      
      // Step combination optimization
      if (this.strategies.stepCombination) {
        const combinationResult = await this.optimizeStepCombination(workflow, context, analysis);
        if (combinationResult.optimized) {
          optimizedWorkflow = combinationResult.workflow;
          appliedOptimizations.push(combinationResult);
        }
      }
      
      // Step reordering optimization
      if (this.strategies.stepReordering) {
        const reorderingResult = await this.optimizeStepReordering(optimizedWorkflow, context, analysis);
        if (reorderingResult.optimized) {
          optimizedWorkflow = reorderingResult.workflow;
          appliedOptimizations.push(reorderingResult);
        }
      }
      
      // Resource optimization
      if (this.strategies.resourcePreallocation) {
        const resourceResult = await this.optimizeResourceAllocation(optimizedWorkflow, context, analysis);
        if (resourceResult.optimized) {
          optimizedWorkflow = resourceResult.workflow;
          appliedOptimizations.push(resourceResult);
        }
      }
      
      // Parallel execution optimization
      if (this.strategies.parallelExecution && this.parallelizationEnabled) {
        const parallelResult = await this.optimizeParallelExecution(optimizedWorkflow, context, analysis);
        if (parallelResult.optimized) {
          optimizedWorkflow = parallelResult.workflow;
          appliedOptimizations.push(parallelResult);
        }
      }
      
      // Predictive optimization
      if (this.strategies.predictiveOptimization) {
        const predictiveResult = await this.applyPredictiveOptimization(optimizedWorkflow, context, analysis);
        if (predictiveResult.optimized) {
          optimizedWorkflow = predictiveResult.workflow;
          appliedOptimizations.push(predictiveResult);
        }
      }
      
      const optimizationDuration = Date.now() - startTime;
      
      const result = {
        optimized: appliedOptimizations.length > 0,
        workflow: optimizedWorkflow,
        appliedOptimizations,
        analysis,
        optimizationDuration,
        estimatedImprovement: this.calculateEstimatedImprovement(appliedOptimizations)
      };
      
      // Cache optimization result
      if (this.cachingEnabled) {
        await this.cacheOptimization(workflow, context, result);
      }
      
      // Learn from optimization
      if (this.learningEnabled) {
        await this.learnFromOptimization(workflow, context, result);
      }
      
      this.logger.info('ExecutionOptimizer: Workflow optimization completed', {
        optimized: result.optimized,
        appliedOptimizations: appliedOptimizations.length,
        estimatedImprovement: result.estimatedImprovement,
        duration: optimizationDuration
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('ExecutionOptimizer: Workflow optimization failed', {
        error: error.message
      });
      
      return {
        optimized: false,
        error: error.message,
        workflow
      };
    }
  }

  /**
   * Analyze workflow for optimization
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Workflow analysis
   */
  async analyzeWorkflow(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = this.getWorkflowSteps(workflow);
    
    const analysis = {
      stepCount: steps.length,
      stepTypes: steps.map(step => step.getMetadata().type),
      stepDependencies: this.analyzeStepDependencies(steps, context),
      resourceRequirements: this.analyzeResourceRequirements(steps, context),
      performanceCharacteristics: await this.analyzePerformanceCharacteristics(steps, context),
      optimizationOpportunities: this.identifyOptimizationOpportunities(steps, context),
      complexity: this.calculateWorkflowComplexity(steps, context)
    };
    
    return analysis;
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
   * Analyze step dependencies
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Step dependencies
   */
  analyzeStepDependencies(steps, context) {
    const dependencies = {};
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const metadata = step.getMetadata();
      
      dependencies[i] = {
        stepName: metadata.name,
        stepType: metadata.type,
        dependencies: metadata.dependencies || [],
        dependents: [],
        resources: metadata.resources || []
      };
    }
    
    // Build dependency graph
    for (let i = 0; i < steps.length; i++) {
      const stepDeps = dependencies[i];
      
      for (const depName of stepDeps.dependencies) {
        const depIndex = steps.findIndex(s => s.getMetadata().name === depName);
        if (depIndex !== -1) {
          dependencies[depIndex].dependents.push(i);
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Analyze resource requirements
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Resource requirements
   */
  analyzeResourceRequirements(steps, context) {
    const requirements = {
      total: { memory: 0, cpu: 0, disk: 0 },
      byStep: {},
      peak: { memory: 0, cpu: 0, disk: 0 }
    };
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const metadata = step.getMetadata();
      const stepRequirements = this.getStepResourceRequirements(step, context);
      
      requirements.byStep[i] = {
        stepName: metadata.name,
        stepType: metadata.type,
        requirements: stepRequirements
      };
      
      requirements.total.memory += stepRequirements.memory;
      requirements.total.cpu += stepRequirements.cpu;
      requirements.total.disk += stepRequirements.disk || 0;
      
      requirements.peak.memory = Math.max(requirements.peak.memory, stepRequirements.memory);
      requirements.peak.cpu = Math.max(requirements.peak.cpu, stepRequirements.cpu);
      requirements.peak.disk = Math.max(requirements.peak.disk, stepRequirements.disk || 0);
    }
    
    return requirements;
  }

  /**
   * Analyze performance characteristics
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Performance characteristics
   */
  async analyzePerformanceCharacteristics(steps, context) {
    const characteristics = {
      estimatedDuration: 0,
      bottlenecks: [],
      parallelizableSteps: [],
      cacheableSteps: []
    };
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const metadata = step.getMetadata();
      const estimatedDuration = await this.estimateStepDuration(step, context);
      
      characteristics.estimatedDuration += estimatedDuration;
      
      // Identify bottlenecks
      if (estimatedDuration > 10000) { // 10 seconds
        characteristics.bottlenecks.push({
          stepIndex: i,
          stepName: metadata.name,
          estimatedDuration
        });
      }
      
      // Identify parallelizable steps
      if (this.isStepParallelizable(step, context)) {
        characteristics.parallelizableSteps.push(i);
      }
      
      // Identify cacheable steps
      if (this.isStepCacheable(step, context)) {
        characteristics.cacheableSteps.push(i);
      }
    }
    
    return characteristics;
  }

  /**
   * Identify optimization opportunities
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array<Object>} Optimization opportunities
   */
  identifyOptimizationOpportunities(steps, context) {
    const opportunities = [];
    
    // Step combination opportunities
    const similarSteps = this.findSimilarSteps(steps, context);
    if (similarSteps.length > 0) {
      opportunities.push({
        type: 'step_combination',
        description: 'Combine similar steps for efficiency',
        steps: similarSteps,
        estimatedImprovement: 0.3
      });
    }
    
    // Parallel execution opportunities
    const parallelizableSteps = this.findParallelizableSteps(steps, context);
    if (parallelizableSteps.length > 0) {
      opportunities.push({
        type: 'parallel_execution',
        description: 'Execute steps in parallel',
        steps: parallelizableSteps,
        estimatedImprovement: 0.4
      });
    }
    
    // Caching opportunities
    const cacheableSteps = this.findCacheableSteps(steps, context);
    if (cacheableSteps.length > 0) {
      opportunities.push({
        type: 'caching',
        description: 'Cache step results',
        steps: cacheableSteps,
        estimatedImprovement: 0.5
      });
    }
    
    // Resource optimization opportunities
    const resourceOptimizations = this.findResourceOptimizations(steps, context);
    if (resourceOptimizations.length > 0) {
      opportunities.push({
        type: 'resource_optimization',
        description: 'Optimize resource allocation',
        steps: resourceOptimizations,
        estimatedImprovement: 0.2
      });
    }
    
    return opportunities;
  }

  /**
   * Calculate workflow complexity
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {number} Complexity score (0-1)
   */
  calculateWorkflowComplexity(steps, context) {
    if (steps.length === 0) {
      return 0;
    }
    
    let complexity = 0;
    
    // Step count complexity (30% weight)
    const stepCountComplexity = Math.min(steps.length / 10, 1) * 0.3;
    complexity += stepCountComplexity;
    
    // Step type diversity (25% weight)
    const stepTypes = steps.map(step => step.getMetadata().type);
    const uniqueStepTypes = new Set(stepTypes).size;
    const typeDiversityComplexity = Math.min(uniqueStepTypes / 5, 1) * 0.25;
    complexity += typeDiversityComplexity;
    
    // Dependency complexity (25% weight)
    const dependencies = this.analyzeStepDependencies(steps, context);
    const dependencyCount = Object.values(dependencies).reduce((sum, dep) => 
      sum + dep.dependencies.length, 0
    );
    const dependencyComplexity = Math.min(dependencyCount / (steps.length * 2), 1) * 0.25;
    complexity += dependencyComplexity;
    
    // Resource complexity (20% weight)
    const resourceRequirements = this.analyzeResourceRequirements(steps, context);
    const resourceComplexity = Math.min(
      (resourceRequirements.total.memory + resourceRequirements.total.cpu) / 2000, 1
    ) * 0.2;
    complexity += resourceComplexity;
    
    return Math.min(complexity, 1);
  }

  /**
   * Optimize step combination
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} analysis - Workflow analysis
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeStepCombination(workflow, context, analysis) {
    const steps = this.getWorkflowSteps(workflow);
    const similarSteps = this.findSimilarSteps(steps, context);
    
    if (similarSteps.length === 0) {
      return { optimized: false };
    }
    
    // Group similar steps
    const stepGroups = this.groupSimilarSteps(similarSteps, steps);
    const combinedSteps = [];
    
    for (const group of stepGroups) {
      if (group.length === 1) {
        combinedSteps.push(group[0]);
      } else {
        const combinedStep = this.createCombinedStep(group);
        combinedSteps.push(combinedStep);
      }
    }
    
    // Add non-similar steps
    for (let i = 0; i < steps.length; i++) {
      if (!similarSteps.includes(i)) {
        combinedSteps.push(steps[i]);
      }
    }
    
    const optimizedWorkflow = this.createOptimizedWorkflow(workflow, combinedSteps);
    
    return {
      optimized: true,
      type: 'step_combination',
      workflow: optimizedWorkflow,
      originalStepCount: steps.length,
      optimizedStepCount: combinedSteps.length,
      combinedGroups: stepGroups.length
    };
  }

  /**
   * Optimize step reordering
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} analysis - Workflow analysis
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeStepReordering(workflow, context, analysis) {
    const steps = this.getWorkflowSteps(workflow);
    
    if (steps.length <= 1) {
      return { optimized: false };
    }
    
    // Create dependency-aware ordering
    const dependencies = analysis.stepDependencies;
    const orderedSteps = this.topologicalSort(steps, dependencies);
    
    // Apply performance-based ordering
    const performanceOrderedSteps = await this.applyPerformanceOrdering(orderedSteps, context);
    
    const optimizedWorkflow = this.createOptimizedWorkflow(workflow, performanceOrderedSteps);
    
    return {
      optimized: true,
      type: 'step_reordering',
      workflow: optimizedWorkflow,
      originalOrder: steps.map(s => s.getMetadata().name),
      optimizedOrder: performanceOrderedSteps.map(s => s.getMetadata().name)
    };
  }

  /**
   * Optimize resource allocation
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} analysis - Workflow analysis
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeResourceAllocation(workflow, context, analysis) {
    const steps = this.getWorkflowSteps(workflow);
    const resourceRequirements = analysis.resourceRequirements;
    
    // Pre-allocate resources for resource-intensive steps
    const optimizedSteps = steps.map((step, index) => {
      const stepRequirements = resourceRequirements.byStep[index];
      
      if (stepRequirements.requirements.memory > 512 || stepRequirements.requirements.cpu > 70) {
        return this.createResourceOptimizedStep(step, stepRequirements.requirements);
      }
      
      return step;
    });
    
    const optimizedWorkflow = this.createOptimizedWorkflow(workflow, optimizedSteps);
    
    return {
      optimized: true,
      type: 'resource_optimization',
      workflow: optimizedWorkflow,
      optimizedSteps: optimizedSteps.filter((step, index) => 
        step !== steps[index]
      ).length
    };
  }

  /**
   * Optimize parallel execution
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} analysis - Workflow analysis
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeParallelExecution(workflow, context, analysis) {
    const steps = this.getWorkflowSteps(workflow);
    const parallelizableSteps = analysis.performanceCharacteristics.parallelizableSteps;
    
    if (parallelizableSteps.length === 0) {
      return { optimized: false };
    }
    
    // Group steps for parallel execution
    const parallelGroups = this.createParallelGroups(steps, parallelizableSteps, analysis);
    const optimizedSteps = [];
    
    for (const group of parallelGroups) {
      if (group.length === 1) {
        optimizedSteps.push(group[0]);
      } else {
        const parallelStep = this.createParallelStep(group);
        optimizedSteps.push(parallelStep);
      }
    }
    
    const optimizedWorkflow = this.createOptimizedWorkflow(workflow, optimizedSteps);
    
    return {
      optimized: true,
      type: 'parallel_execution',
      workflow: optimizedWorkflow,
      parallelGroups: parallelGroups.length,
      parallelizedSteps: parallelizableSteps.length
    };
  }

  /**
   * Apply predictive optimization
   * @param {IWorkflow} workflow - Workflow to optimize
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} analysis - Workflow analysis
   * @returns {Promise<Object>} Optimization result
   */
  async applyPredictiveOptimization(workflow, context, analysis) {
    const steps = this.getWorkflowSteps(workflow);
    
    // Use historical data to predict optimal execution
    const predictions = await this.predictOptimalExecution(steps, context);
    
    if (!predictions.optimizations) {
      return { optimized: false };
    }
    
    // Apply predicted optimizations
    let optimizedSteps = steps;
    
    for (const optimization of predictions.optimizations) {
      optimizedSteps = await this.applyPredictedOptimization(optimizedSteps, optimization);
    }
    
    const optimizedWorkflow = this.createOptimizedWorkflow(workflow, optimizedSteps);
    
    return {
      optimized: true,
      type: 'predictive_optimization',
      workflow: optimizedWorkflow,
      predictions: predictions.confidence,
      appliedOptimizations: predictions.optimizations.length
    };
  }

  /**
   * Find similar steps
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array<number>} Indices of similar steps
   */
  findSimilarSteps(steps, context) {
    const similarSteps = [];
    
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        if (this.areStepsSimilar(steps[i], steps[j], context)) {
          if (!similarSteps.includes(i)) {
            similarSteps.push(i);
          }
          if (!similarSteps.includes(j)) {
            similarSteps.push(j);
          }
        }
      }
    }
    
    return similarSteps;
  }

  /**
   * Check if steps are similar
   * @param {IWorkflowStep} step1 - First step
   * @param {IWorkflowStep} step2 - Second step
   * @param {WorkflowContext} context - Workflow context
   * @returns {boolean} True if steps are similar
   */
  areStepsSimilar(step1, step2, context) {
    const metadata1 = step1.getMetadata();
    const metadata2 = step2.getMetadata();
    
    // Check type similarity
    if (metadata1.type !== metadata2.type) {
      return false;
    }
    
    // Check resource requirements similarity
    const req1 = this.getStepResourceRequirements(step1, context);
    const req2 = this.getStepResourceRequirements(step2, context);
    
    const memoryDiff = Math.abs(req1.memory - req2.memory) / Math.max(req1.memory, req2.memory);
    const cpuDiff = Math.abs(req1.cpu - req2.cpu) / Math.max(req1.cpu, req2.cpu);
    
    return memoryDiff < 0.2 && cpuDiff < 0.2;
  }

  /**
   * Group similar steps
   * @param {Array<number>} similarStepIndices - Indices of similar steps
   * @param {Array<IWorkflowStep>} steps - All workflow steps
   * @returns {Array<Array<IWorkflowStep>>} Groups of similar steps
   */
  groupSimilarSteps(similarStepIndices, steps) {
    const groups = [];
    const used = new Set();
    
    for (const index of similarStepIndices) {
      if (used.has(index)) {
        continue;
      }
      
      const group = [steps[index]];
      used.add(index);
      
      for (const otherIndex of similarStepIndices) {
        if (!used.has(otherIndex) && this.areStepsSimilar(steps[index], steps[otherIndex])) {
          group.push(steps[otherIndex]);
          used.add(otherIndex);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  /**
   * Create combined step
   * @param {Array<IWorkflowStep>} steps - Steps to combine
   * @returns {IWorkflowStep} Combined step
   */
  createCombinedStep(steps) {
    const firstStep = steps[0];
    const metadata = firstStep.getMetadata();
    
    return {
      getMetadata: () => ({
        name: `combined_${metadata.type}`,
        type: metadata.type,
        description: `Combined ${steps.length} ${metadata.type} steps`,
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
   * Topological sort for dependency-aware ordering
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {Object} dependencies - Step dependencies
   * @returns {Array<IWorkflowStep>} Ordered steps
   */
  topologicalSort(steps, dependencies) {
    const visited = new Set();
    const temp = new Set();
    const order = [];
    
    const visit = (index) => {
      if (temp.has(index)) {
        throw new Error('Circular dependency detected');
      }
      
      if (visited.has(index)) {
        return;
      }
      
      temp.add(index);
      
      for (const depIndex of dependencies[index]?.dependencies || []) {
        visit(depIndex);
      }
      
      temp.delete(index);
      visited.add(index);
      order.push(steps[index]);
    };
    
    for (let i = 0; i < steps.length; i++) {
      if (!visited.has(i)) {
        visit(i);
      }
    }
    
    return order;
  }

  /**
   * Apply performance-based ordering
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Array<IWorkflowStep>>} Performance-ordered steps
   */
  async applyPerformanceOrdering(steps, context) {
    const stepPerformance = await Promise.all(
      steps.map(async (step, index) => ({
        step,
        index,
        performance: await this.estimateStepDuration(step, context)
      }))
    );
    
    // Sort by performance (faster steps first)
    stepPerformance.sort((a, b) => a.performance - b.performance);
    
    return stepPerformance.map(sp => sp.step);
  }

  /**
   * Create resource-optimized step
   * @param {IWorkflowStep} step - Original step
   * @param {Object} requirements - Resource requirements
   * @returns {IWorkflowStep} Resource-optimized step
   */
  createResourceOptimizedStep(step, requirements) {
    const metadata = step.getMetadata();
    
    return {
      ...step,
      getMetadata: () => ({
        ...metadata,
        metadata: {
          ...metadata.metadata,
          resourceOptimized: true,
          preallocatedResources: requirements
        }
      }),
      execute: async (context) => {
        // Pre-allocate resources
        await this.preallocateResources(requirements);
        
        try {
          const result = await step.execute(context);
          return result;
        } finally {
          // Release resources
          await this.releaseResources(requirements);
        }
      }
    };
  }

  /**
   * Create parallel groups
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {Array<number>} parallelizableIndices - Indices of parallelizable steps
   * @param {Object} analysis - Workflow analysis
   * @returns {Array<Array<IWorkflowStep>>} Parallel groups
   */
  createParallelGroups(steps, parallelizableIndices, analysis) {
    const groups = [];
    const used = new Set();
    
    for (const index of parallelizableIndices) {
      if (used.has(index)) {
        continue;
      }
      
      const group = [steps[index]];
      used.add(index);
      
      // Find other steps that can run in parallel
      for (const otherIndex of parallelizableIndices) {
        if (!used.has(otherIndex) && this.canRunInParallel(steps[index], steps[otherIndex], analysis)) {
          group.push(steps[otherIndex]);
          used.add(otherIndex);
        }
      }
      
      groups.push(group);
    }
    
    // Add non-parallelizable steps as individual groups
    for (let i = 0; i < steps.length; i++) {
      if (!used.has(i)) {
        groups.push([steps[i]]);
      }
    }
    
    return groups;
  }

  /**
   * Create parallel step
   * @param {Array<IWorkflowStep>} steps - Steps to run in parallel
   * @returns {IWorkflowStep} Parallel step
   */
  createParallelStep(steps) {
    const firstStep = steps[0];
    const metadata = firstStep.getMetadata();
    
    return {
      getMetadata: () => ({
        name: `parallel_${metadata.type}`,
        type: metadata.type,
        description: `Parallel execution of ${steps.length} steps`,
        metadata: {
          parallelSteps: steps.length,
          parallel: true
        }
      }),
      execute: async (context) => {
        const promises = steps.map(step => step.execute(context));
        const results = await Promise.all(promises);
        
        const success = results.every(r => r.success);
        
        return {
          success,
          results,
          parallel: true,
          error: success ? null : 'One or more parallel steps failed'
        };
      }
    };
  }

  /**
   * Predict optimal execution
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Predictions
   */
  async predictOptimalExecution(steps, context) {
    // This would integrate with a real ML model
    // For now, return basic predictions based on historical data
    
    const stepSignature = this.createStepSignature(steps);
    const historicalData = this.optimizationHistory.get(stepSignature);
    
    if (historicalData && historicalData.successRate > 0.8) {
      return {
        optimizations: historicalData.optimizations,
        confidence: historicalData.successRate
      };
    }
    
    return {
      optimizations: null,
      confidence: 0
    };
  }

  /**
   * Apply predicted optimization
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {Object} optimization - Optimization to apply
   * @returns {Promise<Array<IWorkflowStep>>} Optimized steps
   */
  async applyPredictedOptimization(steps, optimization) {
    // Apply the predicted optimization
    switch (optimization.type) {
      case 'reorder':
        return this.reorderSteps(steps, optimization.order);
      case 'combine':
        return this.combineSteps(steps, optimization.groups);
      default:
        return steps;
    }
  }

  /**
   * Get step resource requirements
   * @param {IWorkflowStep} step - Step to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Resource requirements
   */
  getStepResourceRequirements(step, context) {
    const metadata = step.getMetadata();
    
    const resourceLevels = {
      'analysis': { memory: 512, cpu: 80 },
      'testing': { memory: 256, cpu: 60 },
      'deployment': { memory: 1024, cpu: 70 },
      'refactoring': { memory: 512, cpu: 75 },
      'documentation': { memory: 128, cpu: 20 },
      'validation': { memory: 128, cpu: 30 },
      'setup': { memory: 256, cpu: 40 },
      'cleanup': { memory: 128, cpu: 25 }
    };
    
    return resourceLevels[metadata.type] || { memory: 256, cpu: 50 };
  }

  /**
   * Estimate step duration
   * @param {IWorkflowStep} step - Step to estimate
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<number>} Estimated duration in milliseconds
   */
  async estimateStepDuration(step, context) {
    const metadata = step.getMetadata();
    const stepKey = `${metadata.type}_${metadata.name}`;
    
    // Check performance profiles
    const profile = this.performanceProfiles.get(stepKey);
    if (profile && profile.averageDuration) {
      return profile.averageDuration;
    }
    
    // Use type-based estimates
    const typeEstimates = {
      'analysis': 5000,
      'testing': 3000,
      'deployment': 8000,
      'refactoring': 4000,
      'documentation': 2000,
      'validation': 1500,
      'setup': 2500,
      'cleanup': 1000
    };
    
    return typeEstimates[metadata.type] || 3000;
  }

  /**
   * Check if step is parallelizable
   * @param {IWorkflowStep} step - Step to check
   * @param {WorkflowContext} context - Workflow context
   * @returns {boolean} True if parallelizable
   */
  isStepParallelizable(step, context) {
    const metadata = step.getMetadata();
    
    // Check if step has dependencies
    if (metadata.dependencies && metadata.dependencies.length > 0) {
      return false;
    }
    
    // Check resource requirements
    const requirements = this.getStepResourceRequirements(step, context);
    if (requirements.memory > 1024 || requirements.cpu > 80) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if step is cacheable
   * @param {IWorkflowStep} step - Step to check
   * @param {WorkflowContext} context - Workflow context
   * @returns {boolean} True if cacheable
   */
  isStepCacheable(step, context) {
    const metadata = step.getMetadata();
    
    // Analysis and validation steps are typically cacheable
    const cacheableTypes = ['analysis', 'validation', 'documentation'];
    
    return cacheableTypes.includes(metadata.type);
  }

  /**
   * Find parallelizable steps
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array<number>} Indices of parallelizable steps
   */
  findParallelizableSteps(steps, context) {
    return steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => this.isStepParallelizable(step, context))
      .map(({ index }) => index);
  }

  /**
   * Find cacheable steps
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array<number>} Indices of cacheable steps
   */
  findCacheableSteps(steps, context) {
    return steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => this.isStepCacheable(step, context))
      .map(({ index }) => index);
  }

  /**
   * Find resource optimizations
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @param {WorkflowContext} context - Workflow context
   * @returns {Array<number>} Indices of steps that can be optimized
   */
  findResourceOptimizations(steps, context) {
    return steps
      .map((step, index) => ({ step, index, requirements: this.getStepResourceRequirements(step, context) }))
      .filter(({ requirements }) => requirements.memory > 512 || requirements.cpu > 70)
      .map(({ index }) => index);
  }

  /**
   * Check if steps can run in parallel
   * @param {IWorkflowStep} step1 - First step
   * @param {IWorkflowStep} step2 - Second step
   * @param {Object} analysis - Workflow analysis
   * @returns {boolean} True if can run in parallel
   */
  canRunInParallel(step1, step2, analysis) {
    const metadata1 = step1.getMetadata();
    const metadata2 = step2.getMetadata();
    
    // Check if steps have dependencies on each other
    if (metadata1.dependencies && metadata1.dependencies.includes(metadata2.name)) {
      return false;
    }
    
    if (metadata2.dependencies && metadata2.dependencies.includes(metadata1.name)) {
      return false;
    }
    
    // Check resource conflicts
    const req1 = this.getStepResourceRequirements(step1, null); // No context needed for this check
    const req2 = this.getStepResourceRequirements(step2, null); // No context needed for this check
    
    const totalMemory = req1.memory + req2.memory;
    const totalCpu = req1.cpu + req2.cpu;
    
    return totalMemory <= 2048 && totalCpu <= 150;
  }

  /**
   * Create optimized workflow
   * @param {IWorkflow} originalWorkflow - Original workflow
   * @param {Array<IWorkflowStep>} optimizedSteps - Optimized steps
   * @returns {IWorkflow} Optimized workflow
   */
  createOptimizedWorkflow(originalWorkflow, optimizedSteps) {
    const originalMetadata = originalWorkflow.getMetadata();
    
    const optimizedMetadata = {
      ...originalMetadata,
      steps: optimizedSteps,
      optimized: true,
      originalStepCount: originalMetadata.steps?.length || 0,
      optimizedStepCount: optimizedSteps.length,
      optimizationTimestamp: new Date()
    };
    
    return {
      ...originalWorkflow,
      getMetadata: () => optimizedMetadata
    };
  }

  /**
   * Calculate estimated improvement
   * @param {Array<Object>} optimizations - Applied optimizations
   * @returns {number} Estimated improvement percentage
   */
  calculateEstimatedImprovement(optimizations) {
    if (optimizations.length === 0) {
      return 0;
    }
    
    let totalImprovement = 0;
    
    for (const optimization of optimizations) {
      switch (optimization.type) {
        case 'step_combination':
          totalImprovement += 0.3;
          break;
        case 'step_reordering':
          totalImprovement += 0.2;
          break;
        case 'resource_optimization':
          totalImprovement += 0.15;
          break;
        case 'parallel_execution':
          totalImprovement += 0.4;
          break;
        case 'predictive_optimization':
          totalImprovement += 0.25;
          break;
      }
    }
    
    return Math.min(totalImprovement, 0.8); // Cap at 80% improvement
  }

  /**
   * Create step signature
   * @param {Array<IWorkflowStep>} steps - Workflow steps
   * @returns {string} Step signature
   */
  createStepSignature(steps) {
    const stepTypes = steps.map(step => step.getMetadata().type);
    return stepTypes.join('_');
  }

  /**
   * Preallocate resources
   * @param {Object} requirements - Resource requirements
   * @returns {Promise<void>}
   */
  async preallocateResources(requirements) {
    // Implementation would preallocate actual resources
    this.logger.debug('Preallocating resources', requirements);
  }

  /**
   * Release resources
   * @param {Object} requirements - Resource requirements
   * @returns {Promise<void>}
   */
  async releaseResources(requirements) {
    // Implementation would release actual resources
    this.logger.debug('Releasing resources', requirements);
  }

  /**
   * Get cached optimization
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object|null} Cached optimization
   */
  async getCachedOptimization(workflow, context) {
    const cacheKey = this.generateCacheKey(workflow, context);
    const cached = this.optimizationCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.optimization;
    }
    
    if (cached) {
      this.optimizationCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Cache optimization
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} optimization - Optimization result
   */
  async cacheOptimization(workflow, context, optimization) {
    const cacheKey = this.generateCacheKey(workflow, context);
    
    this.optimizationCache.set(cacheKey, {
      optimization,
      expiry: Date.now() + 3600000 // 1 hour TTL
    });
  }

  /**
   * Learn from optimization
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} result - Optimization result
   */
  async learnFromOptimization(workflow, context, result) {
    const stepSignature = this.createStepSignature(this.getWorkflowSteps(workflow));
    
    this.optimizationHistory.set(stepSignature, {
      optimizations: result.appliedOptimizations,
      successRate: result.estimatedImprovement,
      timestamp: new Date()
    });
  }

  /**
   * Generate cache key
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @returns {string} Cache key
   */
  generateCacheKey(workflow, context) {
    const metadata = workflow.getMetadata();
    const contextHash = this.hashContext(context);
    return `optimization_${metadata.name}_${metadata.type}_${contextHash}`;
  }

  /**
   * Hash context for caching
   * @param {WorkflowContext} context - Workflow context
   * @returns {string} Context hash
   */
  hashContext(context) {
    const contextStr = JSON.stringify(context.getAll());
    return crypto.createHash('md5').update(contextStr).digest('hex');
  }

  /**
   * Get optimizer statistics
   * @returns {Object} Optimizer statistics
   */
  getStatistics() {
    return {
      enabled: this.enabled,
      optimizationLevel: this.optimizationLevel,
      learningEnabled: this.learningEnabled,
      cachingEnabled: this.cachingEnabled,
      parallelizationEnabled: this.parallelizationEnabled,
      resourceOptimizationEnabled: this.resourceOptimizationEnabled,
      cacheSize: this.optimizationCache.size,
      historySize: this.optimizationHistory.size,
      performanceProfilesSize: this.performanceProfiles.size,
      resourceProfilesSize: this.resourceProfiles.size,
      strategies: this.strategies
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.optimizationCache.clear();
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.optimizationHistory.clear();
  }
}

module.exports = ExecutionOptimizer; 