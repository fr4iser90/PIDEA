/**
 * ExecutionOptimizer - Advanced optimization algorithms for workflow execution
 * Provides step combination, reordering, resource allocation, parallel execution, and predictive optimization
 */
const EventEmitter = require('events');

/**
 * Optimization strategy configuration
 */
class OptimizationConfig {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.stepCombination = options.stepCombination !== false;
    this.stepReordering = options.stepReordering !== false;
    this.parallelExecution = options.parallelExecution !== false;
    this.resourceOptimization = options.resourceOptimization !== false;
    this.predictiveOptimization = options.predictiveOptimization !== false;
    this.caching = options.caching !== false;
    
    // Step combination settings
    this.maxCombinedSteps = options.maxCombinedSteps || 5;
    this.combinationThreshold = options.combinationThreshold || 0.8; // 80% similarity
    
    // Step reordering settings
    this.reorderingEnabled = options.reorderingEnabled !== false;
    this.dependencyAware = options.dependencyAware !== false;
    this.priorityBased = options.priorityBased !== false;
    
    // Parallel execution settings
    this.maxParallelSteps = options.maxParallelSteps || 3;
    this.parallelThreshold = options.parallelThreshold || 0.6; // 60% independent
    
    // Resource optimization settings
    this.memoryOptimization = options.memoryOptimization !== false;
    this.cpuOptimization = options.cpuOptimization !== false;
    this.networkOptimization = options.networkOptimization !== false;
    
    // Predictive optimization settings
    this.learningEnabled = options.learningEnabled !== false;
    this.predictionConfidence = options.predictionConfidence || 0.7;
    this.historicalDataWeight = options.historicalDataWeight || 0.3;
  }
}

/**
 * Optimization result
 */
class OptimizationResult {
  constructor() {
    this.originalSteps = [];
    this.optimizedSteps = [];
    this.appliedOptimizations = [];
    this.estimatedSavings = {
      time: 0,
      memory: 0,
      cpu: 0
    };
    this.confidence = 0;
    this.risks = [];
    this.metadata = {};
  }

  /**
   * Add applied optimization
   * @param {string} type - Optimization type
   * @param {Object} details - Optimization details
   */
  addOptimization(type, details = {}) {
    this.appliedOptimizations.push({
      type,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Calculate total savings
   * @returns {Object} Total savings
   */
  getTotalSavings() {
    return {
      time: this.estimatedSavings.time,
      memory: this.estimatedSavings.memory,
      cpu: this.estimatedSavings.cpu,
      total: this.estimatedSavings.time + this.estimatedSavings.memory + this.estimatedSavings.cpu
    };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      originalSteps: this.originalSteps.length,
      optimizedSteps: this.optimizedSteps.length,
      appliedOptimizations: this.appliedOptimizations,
      estimatedSavings: this.estimatedSavings,
      confidence: this.confidence,
      risks: this.risks,
      metadata: this.metadata
    };
  }
}

/**
 * Step analysis result
 */
class StepAnalysis {
  constructor(step, index) {
    this.step = step;
    this.index = index;
    this.dependencies = [];
    this.dependents = [];
    this.resourceRequirements = {
      memory: 0,
      cpu: 0,
      network: 0
    };
    this.executionTime = 0;
    this.cacheable = false;
    this.parallelizable = false;
    this.combinable = false;
    this.priority = 1;
    this.risk = 0;
  }

  /**
   * Add dependency
   * @param {number} stepIndex - Dependent step index
   */
  addDependency(stepIndex) {
    if (!this.dependencies.includes(stepIndex)) {
      this.dependencies.push(stepIndex);
    }
  }

  /**
   * Add dependent
   * @param {number} stepIndex - Dependent step index
   */
  addDependent(stepIndex) {
    if (!this.dependents.includes(stepIndex)) {
      this.dependents.push(stepIndex);
    }
  }

  /**
   * Check if step can be executed in parallel
   * @returns {boolean} Can be parallelized
   */
  canBeParallelized() {
    return this.dependencies.length === 0 && this.parallelizable;
  }

  /**
   * Check if step can be combined
   * @param {StepAnalysis} otherStep - Other step to check
   * @returns {boolean} Can be combined
   */
  canBeCombined(otherStep) {
    return this.combinable && otherStep.combinable && 
           this.dependencies.length === otherStep.dependencies.length &&
           this.resourceRequirements.memory + otherStep.resourceRequirements.memory < 512; // 512MB limit
  }
}

/**
 * Execution Optimizer for advanced workflow optimization
 */
class ExecutionOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = new OptimizationConfig(options);
    this.historicalData = new Map(); // workflowName -> historical execution data
    this.optimizationCache = new Map(); // optimization key -> cached result
    this.performanceMetrics = new Map(); // step type -> performance metrics
    
    this.logger = options.logger || console;
  }

  /**
   * Optimize workflow execution
   * @param {Array} steps - Workflow steps
   * @param {Object} context - Workflow context
   * @param {Object} options - Optimization options
   * @returns {Promise<OptimizationResult>} Optimization result
   */
  async optimizeWorkflow(steps, context, options = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('ExecutionOptimizer: Starting workflow optimization', {
        stepCount: steps.length,
        options: { ...this.config, ...options }
      });

      const result = new OptimizationResult();
      result.originalSteps = steps;

      // Analyze steps
      const stepAnalysis = await this.analyzeSteps(steps, context);
      
      // Apply optimizations based on configuration
      let optimizedSteps = [...steps];

      if (this.config.stepCombination) {
        optimizedSteps = await this.applyStepCombination(optimizedSteps, stepAnalysis, context);
        result.addOptimization('step_combination', {
          originalCount: steps.length,
          optimizedCount: optimizedSteps.length
        });
      }

      if (this.config.stepReordering) {
        optimizedSteps = await this.applyStepReordering(optimizedSteps, stepAnalysis, context);
        result.addOptimization('step_reordering', {
          reordered: true
        });
      }

      if (this.config.parallelExecution) {
        const parallelGroups = await this.identifyParallelGroups(optimizedSteps, stepAnalysis, context);
        result.addOptimization('parallel_execution', {
          parallelGroups: parallelGroups.length,
          parallelSteps: parallelGroups.reduce((sum, group) => sum + group.length, 0)
        });
      }

      if (this.config.resourceOptimization) {
        await this.optimizeResourceAllocation(optimizedSteps, stepAnalysis, context);
        result.addOptimization('resource_allocation', {
          optimized: true
        });
      }

      if (this.config.predictiveOptimization) {
        const prediction = await this.applyPredictiveOptimization(optimizedSteps, stepAnalysis, context);
        result.addOptimization('predictive_optimization', prediction);
      }

      // Calculate estimated savings
      result.optimizedSteps = optimizedSteps;
      result.estimatedSavings = await this.calculateSavings(steps, optimizedSteps, stepAnalysis);
      result.confidence = await this.calculateConfidence(result, stepAnalysis);

      // Identify risks
      result.risks = await this.identifyRisks(result, stepAnalysis);

      const duration = Date.now() - startTime;
      
      this.logger.info('ExecutionOptimizer: Workflow optimization completed', {
        originalSteps: steps.length,
        optimizedSteps: optimizedSteps.length,
        estimatedSavings: result.estimatedSavings,
        confidence: result.confidence,
        duration
      });

      // Cache result
      if (this.config.caching) {
        this.cacheOptimizationResult(steps, context, result);
      }

      // Learn from optimization
      if (this.config.learningEnabled) {
        await this.learnFromOptimization(steps, result, context);
      }

      this.emit('optimization:completed', { result, duration });
      return result;

    } catch (error) {
      this.logger.error('ExecutionOptimizer: Workflow optimization failed', {
        error: error.message,
        stepCount: steps.length
      });
      throw error;
    }
  }

  /**
   * Analyze workflow steps
   * @param {Array} steps - Workflow steps
   * @param {Object} context - Workflow context
   * @returns {Promise<Array<StepAnalysis>>} Step analysis results
   */
  async analyzeSteps(steps, context) {
    const analysis = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepAnalysis = new StepAnalysis(step, i);

      // Analyze step metadata
      const metadata = step.getMetadata ? step.getMetadata() : {};
      stepAnalysis.resourceRequirements = await this.estimateResourceRequirements(step, context);
      stepAnalysis.executionTime = await this.estimateExecutionTime(step, context);
      stepAnalysis.cacheable = this.isStepCacheable(step, context);
      stepAnalysis.parallelizable = this.isStepParallelizable(step, context);
      stepAnalysis.combinable = this.isStepCombinable(step, context);
      stepAnalysis.priority = this.calculateStepPriority(step, context);
      stepAnalysis.risk = this.calculateStepRisk(step, context);

      // Analyze dependencies
      if (metadata.dependencies) {
        metadata.dependencies.forEach(dep => {
          const depIndex = steps.findIndex(s => s.getMetadata?.()?.name === dep);
          if (depIndex !== -1) {
            stepAnalysis.addDependency(depIndex);
          }
        });
      }

      analysis.push(stepAnalysis);
    }

    // Build dependency graph
    for (let i = 0; i < analysis.length; i++) {
      analysis[i].dependencies.forEach(depIndex => {
        if (analysis[depIndex]) {
          analysis[depIndex].addDependent(i);
        }
      });
    }

    return analysis;
  }

  /**
   * Apply step combination optimization
   * @param {Array} steps - Workflow steps
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @param {Object} context - Workflow context
   * @returns {Promise<Array>} Optimized steps
   */
  async applyStepCombination(steps, stepAnalysis, context) {
    const optimizedSteps = [];
    const combined = new Set();

    for (let i = 0; i < steps.length; i++) {
      if (combined.has(i)) {
        continue;
      }

      const currentStep = steps[i];
      const currentAnalysis = stepAnalysis[i];
      let combinedSteps = [currentStep];
      let combinedIndices = [i];

      // Look for combinable steps
      for (let j = i + 1; j < steps.length && combinedSteps.length < this.config.maxCombinedSteps; j++) {
        if (combined.has(j)) {
          continue;
        }

        const nextStep = steps[j];
        const nextAnalysis = stepAnalysis[j];

        if (currentAnalysis.canBeCombined(nextAnalysis)) {
          const similarity = await this.calculateStepSimilarity(currentStep, nextStep, context);
          
          if (similarity >= this.config.combinationThreshold) {
            combinedSteps.push(nextStep);
            combinedIndices.push(j);
            combined.add(j);
          }
        }
      }

      if (combinedSteps.length > 1) {
        // Create combined step
        const combinedStep = await this.createCombinedStep(combinedSteps, context);
        optimizedSteps.push(combinedStep);
        
        this.logger.info('ExecutionOptimizer: Combined steps', {
          indices: combinedIndices,
          combinedCount: combinedSteps.length
        });
      } else {
        optimizedSteps.push(currentStep);
      }

      combined.add(i);
    }

    return optimizedSteps;
  }

  /**
   * Apply step reordering optimization
   * @param {Array} steps - Workflow steps
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @param {Object} context - Workflow context
   * @returns {Promise<Array>} Reordered steps
   */
  async applyStepReordering(steps, stepAnalysis, context) {
    if (!this.config.reorderingEnabled) {
      return steps;
    }

    // Create dependency graph
    const dependencyGraph = this.buildDependencyGraph(stepAnalysis);
    
    // Topological sort with priority consideration
    const sortedIndices = this.topologicalSort(dependencyGraph, stepAnalysis);
    
    return sortedIndices.map(index => steps[index]);
  }

  /**
   * Identify parallel execution groups
   * @param {Array} steps - Workflow steps
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @param {Object} context - Workflow context
   * @returns {Promise<Array<Array>>} Parallel execution groups
   */
  async identifyParallelGroups(steps, stepAnalysis, context) {
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < steps.length; i++) {
      if (processed.has(i)) {
        continue;
      }

      const currentAnalysis = stepAnalysis[i];
      
      if (currentAnalysis.canBeParallelized()) {
        const group = [i];
        processed.add(i);

        // Find other steps that can be executed in parallel
        for (let j = i + 1; j < steps.length; j++) {
          if (processed.has(j)) {
            continue;
          }

          const nextAnalysis = stepAnalysis[j];
          
          if (nextAnalysis.canBeParallelized() && 
              group.length < this.config.maxParallelSteps) {
            
            // Check if steps are independent
            const independent = await this.areStepsIndependent(
              steps[i], steps[j], context
            );
            
            if (independent) {
              group.push(j);
              processed.add(j);
            }
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
   * Optimize resource allocation
   * @param {Array} steps - Workflow steps
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @param {Object} context - Workflow context
   */
  async optimizeResourceAllocation(steps, stepAnalysis, context) {
    // Calculate total resource requirements
    const totalRequirements = stepAnalysis.reduce((total, analysis) => {
      total.memory += analysis.resourceRequirements.memory;
      total.cpu += analysis.resourceRequirements.cpu;
      total.network += analysis.resourceRequirements.network;
      return total;
    }, { memory: 0, cpu: 0, network: 0 });

    // Optimize based on available resources
    const availableResources = await this.getAvailableResources(context);
    
    // Adjust resource allocation based on availability
    for (const analysis of stepAnalysis) {
      if (totalRequirements.memory > availableResources.memory) {
        analysis.resourceRequirements.memory = Math.floor(
          analysis.resourceRequirements.memory * (availableResources.memory / totalRequirements.memory)
        );
      }
      
      if (totalRequirements.cpu > availableResources.cpu) {
        analysis.resourceRequirements.cpu = Math.floor(
          analysis.resourceRequirements.cpu * (availableResources.cpu / totalRequirements.cpu)
        );
      }
    }
  }

  /**
   * Apply predictive optimization
   * @param {Array} steps - Workflow steps
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Prediction result
   */
  async applyPredictiveOptimization(steps, stepAnalysis, context) {
    const workflowName = context.getData?.('workflowName') || 'unknown';
    const historicalData = this.historicalData.get(workflowName);

    if (!historicalData || historicalData.length < 3) {
      return { confidence: 0, predictions: [] };
    }

    const predictions = [];
    let totalConfidence = 0;

    for (const analysis of stepAnalysis) {
      const stepType = analysis.step.getMetadata?.()?.type || 'unknown';
      const stepMetrics = this.performanceMetrics.get(stepType);

      if (stepMetrics) {
        const prediction = {
          stepIndex: analysis.index,
          stepType,
          predictedDuration: stepMetrics.averageDuration,
          predictedMemory: stepMetrics.averageMemory,
          confidence: stepMetrics.confidence
        };

        predictions.push(prediction);
        totalConfidence += stepMetrics.confidence;
      }
    }

    const averageConfidence = predictions.length > 0 ? totalConfidence / predictions.length : 0;

    return {
      confidence: averageConfidence,
      predictions,
      historicalDataPoints: historicalData.length
    };
  }

  /**
   * Calculate estimated savings
   * @param {Array} originalSteps - Original steps
   * @param {Array} optimizedSteps - Optimized steps
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @returns {Promise<Object>} Estimated savings
   */
  async calculateSavings(originalSteps, optimizedSteps, stepAnalysis) {
    const originalTime = stepAnalysis.reduce((sum, analysis) => sum + analysis.executionTime, 0);
    const originalMemory = stepAnalysis.reduce((sum, analysis) => sum + analysis.resourceRequirements.memory, 0);
    const originalCpu = stepAnalysis.reduce((sum, analysis) => sum + analysis.resourceRequirements.cpu, 0);

    // Estimate optimized values (simplified calculation)
    const optimizationFactor = 0.8; // Assume 20% improvement
    const optimizedTime = originalTime * optimizationFactor;
    const optimizedMemory = originalMemory * optimizationFactor;
    const optimizedCpu = originalCpu * optimizationFactor;

    return {
      time: originalTime - optimizedTime,
      memory: originalMemory - optimizedMemory,
      cpu: originalCpu - optimizedCpu
    };
  }

  /**
   * Calculate optimization confidence
   * @param {OptimizationResult} result - Optimization result
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @returns {Promise<number>} Confidence level (0-1)
   */
  async calculateConfidence(result, stepAnalysis) {
    let confidence = 0.5; // Base confidence

    // Factor in historical data
    if (this.historicalData.size > 0) {
      confidence += 0.2;
    }

    // Factor in optimization types applied
    const optimizationCount = result.appliedOptimizations.length;
    confidence += Math.min(optimizationCount * 0.1, 0.3);

    // Factor in step analysis quality
    const analyzedSteps = stepAnalysis.filter(analysis => analysis.executionTime > 0).length;
    const analysisQuality = analyzedSteps / stepAnalysis.length;
    confidence += analysisQuality * 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Identify optimization risks
   * @param {OptimizationResult} result - Optimization result
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @returns {Promise<Array>} Identified risks
   */
  async identifyRisks(result, stepAnalysis) {
    const risks = [];

    // Check for high-risk steps
    const highRiskSteps = stepAnalysis.filter(analysis => analysis.risk > 0.7);
    if (highRiskSteps.length > 0) {
      risks.push({
        type: 'high_risk_steps',
        description: `${highRiskSteps.length} steps have high risk factors`,
        severity: 'medium',
        steps: highRiskSteps.map(analysis => analysis.index)
      });
    }

    // Check for dependency violations
    const dependencyViolations = this.checkDependencyViolations(result.optimizedSteps, stepAnalysis);
    if (dependencyViolations.length > 0) {
      risks.push({
        type: 'dependency_violations',
        description: `${dependencyViolations.length} potential dependency violations`,
        severity: 'high',
        violations: dependencyViolations
      });
    }

    // Check for resource over-allocation
    const totalMemory = stepAnalysis.reduce((sum, analysis) => sum + analysis.resourceRequirements.memory, 0);
    if (totalMemory > 1024) { // 1GB limit
      risks.push({
        type: 'resource_over_allocation',
        description: 'Total memory requirements exceed recommended limit',
        severity: 'medium',
        totalMemory
      });
    }

    return risks;
  }

  // Helper methods

  /**
   * Estimate resource requirements for a step
   * @param {Object} step - Workflow step
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Resource requirements
   */
  async estimateResourceRequirements(step, context) {
    // Default resource requirements
    const defaultRequirements = {
      memory: 64, // 64MB
      cpu: 10,    // 10% CPU
      network: 0  // No network
    };

    // Check if step has resource requirements defined
    const metadata = step.getMetadata ? step.getMetadata() : {};
    if (metadata.resourceRequirements) {
      return { ...defaultRequirements, ...metadata.resourceRequirements };
    }

    // Estimate based on step type
    const stepType = metadata.type || 'unknown';
    const typeRequirements = this.getTypeResourceRequirements(stepType);
    
    return { ...defaultRequirements, ...typeRequirements };
  }

  /**
   * Estimate execution time for a step
   * @param {Object} step - Workflow step
   * @param {Object} context - Workflow context
   * @returns {Promise<number>} Estimated execution time in milliseconds
   */
  async estimateExecutionTime(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    const stepType = metadata.type || 'unknown';
    
    // Check historical data
    const stepMetrics = this.performanceMetrics.get(stepType);
    if (stepMetrics) {
      return stepMetrics.averageDuration;
    }

    // Default estimates based on step type
    const defaultTimes = {
      'analysis': 5000,
      'generation': 3000,
      'refactoring': 2000,
      'testing': 4000,
      'deployment': 10000,
      'unknown': 1000
    };

    return defaultTimes[stepType] || defaultTimes.unknown;
  }

  /**
   * Check if step is cacheable
   * @param {Object} step - Workflow step
   * @param {Object} context - Workflow context
   * @returns {boolean} Is cacheable
   */
  isStepCacheable(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    
    // Steps with side effects are not cacheable
    if (metadata.hasSideEffects) {
      return false;
    }

    // Steps that modify files are not cacheable
    if (metadata.modifiesFiles) {
      return false;
    }

    // Steps with deterministic output are cacheable
    return metadata.deterministic !== false;
  }

  /**
   * Check if step is parallelizable
   * @param {Object} step - Workflow step
   * @param {Object} context - Workflow context
   * @returns {boolean} Is parallelizable
   */
  isStepParallelizable(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    
    // Steps with dependencies are not parallelizable
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
   * Check if step is combinable
   * @param {Object} step - Workflow step
   * @param {Object} context - Workflow context
   * @returns {boolean} Is combinable
   */
  isStepCombinable(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    
    // Steps with side effects are not combinable
    if (metadata.hasSideEffects) {
      return false;
    }

    // Steps that modify files are not combinable
    if (metadata.modifiesFiles) {
      return false;
    }

    // Steps with complex logic are not combinable
    if (metadata.complexity === 'high') {
      return false;
    }

    return true;
  }

  /**
   * Calculate step priority
   * @param {Object} step - Workflow step
   * @param {Object} context - Workflow context
   * @returns {number} Priority (1-10, higher is more important)
   */
  calculateStepPriority(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    
    let priority = 5; // Default priority

    // Critical steps have high priority
    if (metadata.critical) {
      priority += 3;
    }

    // Time-sensitive steps have high priority
    if (metadata.timeSensitive) {
      priority += 2;
    }

    // Steps with many dependents have high priority
    if (metadata.dependents && metadata.dependents.length > 0) {
      priority += Math.min(metadata.dependents.length, 2);
    }

    return Math.min(priority, 10);
  }

  /**
   * Calculate step risk
   * @param {Object} step - Workflow step
   * @param {Object} context - Workflow context
   * @returns {number} Risk level (0-1, higher is riskier)
   */
  calculateStepRisk(step, context) {
    const metadata = step.getMetadata ? step.getMetadata() : {};
    
    let risk = 0.1; // Base risk

    // Steps with side effects have higher risk
    if (metadata.hasSideEffects) {
      risk += 0.3;
    }

    // Steps that modify files have higher risk
    if (metadata.modifiesFiles) {
      risk += 0.2;
    }

    // Complex steps have higher risk
    if (metadata.complexity === 'high') {
      risk += 0.2;
    }

    // Steps with external dependencies have higher risk
    if (metadata.externalDependencies) {
      risk += 0.1;
    }

    return Math.min(risk, 1.0);
  }

  /**
   * Calculate similarity between steps
   * @param {Object} step1 - First step
   * @param {Object} step2 - Second step
   * @param {Object} context - Workflow context
   * @returns {Promise<number>} Similarity score (0-1)
   */
  async calculateStepSimilarity(step1, step2, context) {
    const metadata1 = step1.getMetadata ? step1.getMetadata() : {};
    const metadata2 = step2.getMetadata ? step2.getMetadata() : {};

    let similarity = 0;
    let factors = 0;

    // Compare step types
    if (metadata1.type === metadata2.type) {
      similarity += 0.4;
    }
    factors++;

    // Compare resource requirements
    const req1 = await this.estimateResourceRequirements(step1, context);
    const req2 = await this.estimateResourceRequirements(step2, context);
    
    const memorySimilarity = 1 - Math.abs(req1.memory - req2.memory) / Math.max(req1.memory, req2.memory, 1);
    const cpuSimilarity = 1 - Math.abs(req1.cpu - req2.cpu) / Math.max(req1.cpu, req2.cpu, 1);
    
    similarity += (memorySimilarity + cpuSimilarity) * 0.3;
    factors++;

    // Compare execution time
    const time1 = await this.estimateExecutionTime(step1, context);
    const time2 = await this.estimateExecutionTime(step2, context);
    
    const timeSimilarity = 1 - Math.abs(time1 - time2) / Math.max(time1, time2, 1);
    similarity += timeSimilarity * 0.3;
    factors++;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Create combined step
   * @param {Array} steps - Steps to combine
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Combined step
   */
  async createCombinedStep(steps, context) {
    // Create a wrapper step that executes all steps sequentially
    const combinedStep = {
      getMetadata: () => ({
        name: `combined_${steps.length}_steps`,
        type: 'combined',
        description: `Combined ${steps.length} steps`,
        steps: steps.map(step => step.getMetadata?.()?.name || 'unknown')
      }),
      
      execute: async (execContext) => {
        const results = [];
        
        for (const step of steps) {
          const result = await step.execute(execContext);
          results.push(result);
          
          // Stop if any step fails
          if (!result.success) {
            break;
          }
        }
        
        return {
          success: results.every(r => r.success),
          results,
          combined: true
        };
      }
    };

    return combinedStep;
  }

  /**
   * Build dependency graph
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @returns {Object} Dependency graph
   */
  buildDependencyGraph(stepAnalysis) {
    const graph = {};
    
    for (let i = 0; i < stepAnalysis.length; i++) {
      graph[i] = stepAnalysis[i].dependencies;
    }
    
    return graph;
  }

  /**
   * Topological sort with priority consideration
   * @param {Object} graph - Dependency graph
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @returns {Array} Sorted indices
   */
  topologicalSort(graph, stepAnalysis) {
    const visited = new Set();
    const sorted = [];
    
    const visit = (node) => {
      if (visited.has(node)) {
        return;
      }
      
      visited.add(node);
      
      // Visit dependencies first
      const dependencies = graph[node] || [];
      dependencies.forEach(dep => visit(dep));
      
      sorted.push(node);
    };
    
    // Visit all nodes
    for (const node in graph) {
      visit(parseInt(node));
    }
    
    // Sort by priority within dependency groups
    return sorted.sort((a, b) => {
      const priorityA = stepAnalysis[a]?.priority || 1;
      const priorityB = stepAnalysis[b]?.priority || 1;
      return priorityB - priorityA; // Higher priority first
    });
  }

  /**
   * Check if steps are independent
   * @param {Object} step1 - First step
   * @param {Object} step2 - Second step
   * @param {Object} context - Workflow context
   * @returns {Promise<boolean>} Are independent
   */
  async areStepsIndependent(step1, step2, context) {
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
   * Get available resources
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Available resources
   */
  async getAvailableResources(context) {
    // Default available resources
    return {
      memory: 1024, // 1GB
      cpu: 100,     // 100% CPU
      network: 100  // 100% network
    };
  }

  /**
   * Get type-specific resource requirements
   * @param {string} stepType - Step type
   * @returns {Object} Resource requirements
   */
  getTypeResourceRequirements(stepType) {
    const requirements = {
      'analysis': { memory: 128, cpu: 20, network: 0 },
      'generation': { memory: 256, cpu: 30, network: 0 },
      'refactoring': { memory: 512, cpu: 50, network: 0 },
      'testing': { memory: 256, cpu: 40, network: 0 },
      'deployment': { memory: 1024, cpu: 80, network: 50 },
      'unknown': { memory: 64, cpu: 10, network: 0 }
    };
    
    return requirements[stepType] || requirements.unknown;
  }

  /**
   * Check dependency violations
   * @param {Array} optimizedSteps - Optimized steps
   * @param {Array<StepAnalysis>} stepAnalysis - Step analysis results
   * @returns {Array} Dependency violations
   */
  checkDependencyViolations(optimizedSteps, stepAnalysis) {
    const violations = [];
    
    for (let i = 0; i < optimizedSteps.length; i++) {
      const analysis = stepAnalysis[i];
      
      for (const depIndex of analysis.dependencies) {
        if (depIndex > i) {
          violations.push({
            stepIndex: i,
            dependencyIndex: depIndex,
            description: `Step ${i} depends on step ${depIndex} but comes first in execution order`
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * Cache optimization result
   * @param {Array} steps - Original steps
   * @param {Object} context - Workflow context
   * @param {OptimizationResult} result - Optimization result
   */
  cacheOptimizationResult(steps, context, result) {
    const key = this.generateOptimizationKey(steps, context);
    this.optimizationCache.set(key, {
      result,
      timestamp: new Date(),
      ttl: 3600000 // 1 hour
    });
  }

  /**
   * Generate optimization cache key
   * @param {Array} steps - Workflow steps
   * @param {Object} context - Workflow context
   * @returns {string} Cache key
   */
  generateOptimizationKey(steps, context) {
    const stepSignatures = steps.map(step => {
      const metadata = step.getMetadata ? step.getMetadata() : {};
      return `${metadata.name}:${metadata.type}:${metadata.version || '1.0'}`;
    }).join('|');
    
    const contextHash = JSON.stringify(context.getData ? context.getData() : {});
    
    return `${stepSignatures}|${contextHash}`;
  }

  /**
   * Learn from optimization
   * @param {Array} steps - Original steps
   * @param {OptimizationResult} result - Optimization result
   * @param {Object} context - Workflow context
   */
  async learnFromOptimization(steps, result, context) {
    const workflowName = context.getData?.('workflowName') || 'unknown';
    
    if (!this.historicalData.has(workflowName)) {
      this.historicalData.set(workflowName, []);
    }
    
    const historicalData = this.historicalData.get(workflowName);
    historicalData.push({
      timestamp: new Date(),
      originalSteps: steps.length,
      optimizedSteps: result.optimizedSteps.length,
      savings: result.estimatedSavings,
      confidence: result.confidence,
      appliedOptimizations: result.appliedOptimizations.map(opt => opt.type)
    });
    
    // Keep only recent data (last 100 entries)
    if (historicalData.length > 100) {
      historicalData.splice(0, historicalData.length - 100);
    }
    
    // Update performance metrics
    for (const step of steps) {
      const metadata = step.getMetadata ? step.getMetadata() : {};
      const stepType = metadata.type || 'unknown';
      
      if (!this.performanceMetrics.has(stepType)) {
        this.performanceMetrics.set(stepType, {
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          totalMemory: 0,
          averageMemory: 0,
          confidence: 0
        });
      }
      
      const metrics = this.performanceMetrics.get(stepType);
      metrics.count++;
      
      // Update with estimated values (in real implementation, these would come from actual execution)
      const estimatedDuration = await this.estimateExecutionTime(step, context);
      const estimatedMemory = (await this.estimateResourceRequirements(step, context)).memory;
      
      metrics.totalDuration += estimatedDuration;
      metrics.averageDuration = metrics.totalDuration / metrics.count;
      
      metrics.totalMemory += estimatedMemory;
      metrics.averageMemory = metrics.totalMemory / metrics.count;
      
      // Update confidence based on data points
      metrics.confidence = Math.min(metrics.count / 10, 1.0);
    }
  }

  /**
   * Get optimization statistics
   * @returns {Object} Optimization statistics
   */
  getStatistics() {
    return {
      historicalDataSize: this.historicalData.size,
      optimizationCacheSize: this.optimizationCache.size,
      performanceMetricsSize: this.performanceMetrics.size,
      config: this.config
    };
  }

  /**
   * Clear optimization cache
   */
  clearCache() {
    this.optimizationCache.clear();
    this.logger.info('ExecutionOptimizer: Cleared optimization cache');
  }

  /**
   * Reset optimizer
   */
  reset() {
    this.historicalData.clear();
    this.optimizationCache.clear();
    this.performanceMetrics.clear();
    
    this.logger.info('ExecutionOptimizer: Reset all optimization data');
    this.emit('optimizer:reset');
  }
}

module.exports = {
  ExecutionOptimizer,
  OptimizationConfig,
  OptimizationResult,
  StepAnalysis
}; 