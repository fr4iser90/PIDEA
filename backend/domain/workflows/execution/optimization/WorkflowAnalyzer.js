/**
 * WorkflowAnalyzer - Workflow analysis for optimization opportunities
 * Provides comprehensive analysis of workflows to identify optimization potential
 */
const crypto = require('crypto');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Workflow analyzer for optimization opportunities
 */
class WorkflowAnalyzer {
  constructor(options = {}) {
    this.enableAnalysis = options.enableAnalysis !== false;
    this.analysisRules = new Map();
    this.analysisCache = new Map();
    this.analysisHistory = new Map();
    this.maxCacheSize = options.maxCacheSize || 500;
    this.enableLearning = options.enableLearning !== false;
    
    // Initialize analysis rules
    this.initializeAnalysisRules();
    
    this.logger = options.logger || console;
  }

  /**
   * Initialize analysis rules
   */
  initializeAnalysisRules() {
    // Rule 1: Complexity analysis
    this.analysisRules.set('complexity_analysis', {
      name: 'Complexity Analysis',
      description: 'Analyze workflow complexity and identify bottlenecks',
      priority: 1,
      analyze: (workflow, context) => this.analyzeComplexity(workflow, context)
    });

    // Rule 2: Dependency analysis
    this.analysisRules.set('dependency_analysis', {
      name: 'Dependency Analysis',
      description: 'Analyze step dependencies and identify parallelization opportunities',
      priority: 2,
      analyze: (workflow, context) => this.analyzeDependencies(workflow, context)
    });

    // Rule 3: Resource analysis
    this.analysisRules.set('resource_analysis', {
      name: 'Resource Analysis',
      description: 'Analyze resource usage patterns and identify optimization opportunities',
      priority: 3,
      analyze: (workflow, context) => this.analyzeResources(workflow, context)
    });

    // Rule 4: Performance analysis
    this.analysisRules.set('performance_analysis', {
      name: 'Performance Analysis',
      description: 'Analyze performance characteristics and identify bottlenecks',
      priority: 4,
      analyze: (workflow, context) => this.analyzePerformance(workflow, context)
    });

    // Rule 5: Optimization potential analysis
    this.analysisRules.set('optimization_potential', {
      name: 'Optimization Potential Analysis',
      description: 'Identify overall optimization potential and recommendations',
      priority: 5,
      analyze: (workflow, context) => this.analyzeOptimizationPotential(workflow, context)
    });
  }

  /**
   * Analyze workflow
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeWorkflow(workflow, context) {
    if (!this.enableAnalysis) {
      return this.getDefaultAnalysis(workflow, context);
    }

    try {
      const workflowId = this.getWorkflowId(workflow);
      
      this.logger.info('WorkflowAnalyzer: Starting workflow analysis', {
        workflowId,
        workflowName: workflow.getMetadata().name
      });

      // Check analysis cache
      if (this.analysisCache.has(workflowId)) {
        const cached = this.analysisCache.get(workflowId);
        if (this.isCacheValid(cached)) {
          this.logger.info('WorkflowAnalyzer: Using cached analysis', {
            workflowId
          });
          return cached.analysis;
        }
      }

      const analysisResults = {};
      const recommendations = [];

      // Sort rules by priority
      const sortedRules = Array.from(this.analysisRules.entries())
        .sort(([, a], [, b]) => a.priority - b.priority);

      // Apply analysis rules
      for (const [ruleId, rule] of sortedRules) {
        try {
          const result = await rule.analyze(workflow, context);
          analysisResults[ruleId] = result;
          
          if (result.recommendations) {
            recommendations.push(...result.recommendations);
          }

          this.logger.debug('WorkflowAnalyzer: Rule analysis completed', {
            workflowId,
            ruleId,
            ruleName: rule.name
          });
        } catch (error) {
          this.logger.warn('WorkflowAnalyzer: Rule analysis failed', {
            workflowId,
            ruleId,
            error: error.message
          });
        }
      }

      // Create comprehensive analysis
      const analysis = {
        workflowId,
        workflowName: workflow.getMetadata().name,
        analysisResults,
        recommendations: this.prioritizeRecommendations(recommendations),
        summary: this.createAnalysisSummary(analysisResults),
        metadata: {
          analyzedAt: new Date(),
          contextHash: this.hashContext(context),
          stepCount: workflow.getMetadata().steps?.length || 0
        }
      };

      // Cache analysis
      this.cacheAnalysis(workflowId, analysis);

      // Learn from analysis
      if (this.enableLearning) {
        this.learnFromAnalysis(workflowId, analysis);
      }

      this.logger.info('WorkflowAnalyzer: Analysis completed', {
        workflowId,
        recommendations: analysis.recommendations.length,
        optimizationScore: analysis.summary.optimizationScore
      });

      return analysis;

    } catch (error) {
      this.logger.error('WorkflowAnalyzer: Analysis failed', {
        workflowId: workflow.getMetadata().name,
        error: error.message
      });
      return this.getDefaultAnalysis(workflow, context);
    }
  }

  /**
   * Analyze workflow complexity
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Complexity analysis
   */
  analyzeComplexity(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    const complexityMetrics = {
      totalSteps: steps.length,
      stepTypes: {},
      averageStepComplexity: 0,
      maxStepComplexity: 0,
      complexityDistribution: {},
      bottlenecks: []
    };

    // Analyze step types
    for (const step of steps) {
      const stepMetadata = step.getMetadata ? step.getMetadata() : step;
      const stepType = stepMetadata.type || 'unknown';
      
      if (!complexityMetrics.stepTypes[stepType]) {
        complexityMetrics.stepTypes[stepType] = 0;
      }
      complexityMetrics.stepTypes[stepType]++;
    }

    // Calculate step complexity
    const stepComplexities = steps.map(step => {
      const stepMetadata = step.getMetadata ? step.getMetadata() : step;
      return this.calculateStepComplexity(stepMetadata);
    });

    complexityMetrics.averageStepComplexity = stepComplexities.reduce((sum, c) => sum + c, 0) / stepComplexities.length;
    complexityMetrics.maxStepComplexity = Math.max(...stepComplexities);

    // Identify bottlenecks
    const highComplexityThreshold = complexityMetrics.averageStepComplexity * 2;
    for (let i = 0; i < steps.length; i++) {
      if (stepComplexities[i] > highComplexityThreshold) {
        const stepMetadata = steps[i].getMetadata ? steps[i].getMetadata() : steps[i];
        complexityMetrics.bottlenecks.push({
          stepIndex: i,
          stepName: stepMetadata.name,
          complexity: stepComplexities[i],
          type: stepMetadata.type
        });
      }
    }

    // Create recommendations
    const recommendations = [];
    
    if (complexityMetrics.bottlenecks.length > 0) {
      recommendations.push({
        type: 'complexity_reduction',
        priority: 'high',
        description: `Consider breaking down ${complexityMetrics.bottlenecks.length} high-complexity steps`,
        impact: 'high',
        effort: 'medium'
      });
    }

    if (complexityMetrics.totalSteps > 20) {
      recommendations.push({
        type: 'workflow_simplification',
        priority: 'medium',
        description: 'Consider splitting workflow into smaller sub-workflows',
        impact: 'medium',
        effort: 'high'
      });
    }

    return {
      metrics: complexityMetrics,
      recommendations
    };
  }

  /**
   * Analyze step dependencies
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Dependency analysis
   */
  analyzeDependencies(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    const dependencyMetrics = {
      totalSteps: steps.length,
      dependencies: [],
      parallelizationOpportunities: [],
      criticalPath: [],
      dependencyGraph: {}
    };

    // Build dependency graph
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepMetadata = step.getMetadata ? step.getMetadata() : step;
      
      dependencyMetrics.dependencyGraph[i] = {
        step: stepMetadata,
        dependencies: stepMetadata.dependencies || [],
        dependents: []
      };
    }

    // Find dependents
    for (let i = 0; i < steps.length; i++) {
      const stepDeps = dependencyMetrics.dependencyGraph[i].dependencies;
      for (const depName of stepDeps) {
        const depIndex = steps.findIndex(s => {
          const sMetadata = s.getMetadata ? s.getMetadata() : s;
          return sMetadata.name === depName;
        });
        
        if (depIndex !== -1) {
          dependencyMetrics.dependencyGraph[depIndex].dependents.push(i);
        }
      }
    }

    // Find parallelization opportunities
    for (let i = 0; i < steps.length; i++) {
      const step = dependencyMetrics.dependencyGraph[i];
      if (step.dependencies.length === 0) {
        dependencyMetrics.parallelizationOpportunities.push({
          stepIndex: i,
          stepName: step.step.name,
          reason: 'No dependencies'
        });
      }
    }

    // Find independent step groups
    const independentGroups = this.findIndependentStepGroups(dependencyMetrics.dependencyGraph);
    dependencyMetrics.independentGroups = independentGroups;

    // Create recommendations
    const recommendations = [];
    
    if (dependencyMetrics.parallelizationOpportunities.length > 0) {
      recommendations.push({
        type: 'parallelization',
        priority: 'high',
        description: `Found ${dependencyMetrics.parallelizationOpportunities.length} steps that can run in parallel`,
        impact: 'high',
        effort: 'low'
      });
    }

    if (independentGroups.length > 1) {
      recommendations.push({
        type: 'workflow_splitting',
        priority: 'medium',
        description: `Workflow can be split into ${independentGroups.length} independent groups`,
        impact: 'medium',
        effort: 'medium'
      });
    }

    return {
      metrics: dependencyMetrics,
      recommendations
    };
  }

  /**
   * Analyze resource usage
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Resource analysis
   */
  analyzeResources(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    const resourceMetrics = {
      totalSteps: steps.length,
      resourceRequirements: {
        memory: 0,
        cpu: 0,
        timeout: 0
      },
      resourceIntensiveSteps: [],
      resourceDistribution: {},
      estimatedCost: 0
    };

    // Analyze resource requirements
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepMetadata = step.getMetadata ? step.getMetadata() : step;
      const stepResources = this.estimateStepResources(stepMetadata);
      
      resourceMetrics.resourceRequirements.memory += stepResources.memory;
      resourceMetrics.resourceRequirements.cpu += stepResources.cpu;
      resourceMetrics.resourceRequirements.timeout = Math.max(
        resourceMetrics.resourceRequirements.timeout,
        stepResources.timeout
      );

      // Track resource-intensive steps
      if (stepResources.memory > 256 || stepResources.cpu > 30) {
        resourceMetrics.resourceIntensiveSteps.push({
          stepIndex: i,
          stepName: stepMetadata.name,
          resources: stepResources
        });
      }

      // Track resource distribution by type
      const stepType = stepMetadata.type || 'unknown';
      if (!resourceMetrics.resourceDistribution[stepType]) {
        resourceMetrics.resourceDistribution[stepType] = {
          count: 0,
          totalMemory: 0,
          totalCpu: 0
        };
      }
      
      resourceMetrics.resourceDistribution[stepType].count++;
      resourceMetrics.resourceDistribution[stepType].totalMemory += stepResources.memory;
      resourceMetrics.resourceDistribution[stepType].totalCpu += stepResources.cpu;
    }

    // Calculate estimated cost
    resourceMetrics.estimatedCost = this.calculateWorkflowCost(resourceMetrics.resourceRequirements);

    // Create recommendations
    const recommendations = [];
    
    if (resourceMetrics.resourceIntensiveSteps.length > 0) {
      recommendations.push({
        type: 'resource_optimization',
        priority: 'high',
        description: `Found ${resourceMetrics.resourceIntensiveSteps.length} resource-intensive steps`,
        impact: 'high',
        effort: 'medium'
      });
    }

    if (resourceMetrics.resourceRequirements.memory > 2048) {
      recommendations.push({
        type: 'memory_optimization',
        priority: 'medium',
        description: 'Consider optimizing memory usage',
        impact: 'medium',
        effort: 'medium'
      });
    }

    if (resourceMetrics.estimatedCost > 1.0) {
      recommendations.push({
        type: 'cost_optimization',
        priority: 'medium',
        description: 'Consider cost optimization strategies',
        impact: 'medium',
        effort: 'high'
      });
    }

    return {
      metrics: resourceMetrics,
      recommendations
    };
  }

  /**
   * Analyze performance characteristics
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Performance analysis
   */
  analyzePerformance(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    const performanceMetrics = {
      totalSteps: steps.length,
      estimatedExecutionTime: 0,
      performanceBottlenecks: [],
      optimizationOpportunities: [],
      stepPerformance: []
    };

    // Analyze step performance
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepMetadata = step.getMetadata ? step.getMetadata() : step;
      const stepPerformance = this.analyzeStepPerformance(stepMetadata);
      
      performanceMetrics.stepPerformance.push({
        stepIndex: i,
        stepName: stepMetadata.name,
        ...stepPerformance
      });

      performanceMetrics.estimatedExecutionTime += stepPerformance.estimatedTime;

      // Identify bottlenecks
      if (stepPerformance.estimatedTime > 60000) { // More than 1 minute
        performanceMetrics.performanceBottlenecks.push({
          stepIndex: i,
          stepName: stepMetadata.name,
          estimatedTime: stepPerformance.estimatedTime,
          reason: stepPerformance.bottleneckReason
        });
      }

      // Identify optimization opportunities
      if (stepPerformance.optimizationPotential > 0.5) {
        performanceMetrics.optimizationOpportunities.push({
          stepIndex: i,
          stepName: stepMetadata.name,
          potential: stepPerformance.optimizationPotential,
          suggestions: stepPerformance.optimizationSuggestions
        });
      }
    }

    // Create recommendations
    const recommendations = [];
    
    if (performanceMetrics.performanceBottlenecks.length > 0) {
      recommendations.push({
        type: 'performance_optimization',
        priority: 'high',
        description: `Found ${performanceMetrics.performanceBottlenecks.length} performance bottlenecks`,
        impact: 'high',
        effort: 'medium'
      });
    }

    if (performanceMetrics.optimizationOpportunities.length > 0) {
      recommendations.push({
        type: 'step_optimization',
        priority: 'medium',
        description: `Found ${performanceMetrics.optimizationOpportunities.length} steps with optimization potential`,
        impact: 'medium',
        effort: 'low'
      });
    }

    if (performanceMetrics.estimatedExecutionTime > 300000) { // More than 5 minutes
      recommendations.push({
        type: 'execution_time_optimization',
        priority: 'medium',
        description: 'Consider optimizing for faster execution',
        impact: 'medium',
        effort: 'high'
      });
    }

    return {
      metrics: performanceMetrics,
      recommendations
    };
  }

  /**
   * Analyze optimization potential
   * @param {IWorkflow} workflow - Workflow to analyze
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object} Optimization potential analysis
   */
  analyzeOptimizationPotential(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    const potentialMetrics = {
      totalSteps: steps.length,
      optimizationScore: 0,
      optimizationAreas: [],
      quickWins: [],
      longTermImprovements: []
    };

    // Calculate overall optimization score
    let totalScore = 0;
    let maxScore = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepMetadata = step.getMetadata ? step.getMetadata() : step;
      const stepPotential = this.calculateStepOptimizationPotential(stepMetadata);
      
      totalScore += stepPotential.score;
      maxScore += 10; // Max score per step

      if (stepPotential.score > 7) {
        potentialMetrics.quickWins.push({
          stepIndex: i,
          stepName: stepMetadata.name,
          potential: stepPotential.score,
          suggestions: stepPotential.suggestions
        });
      }

      if (stepPotential.score > 5) {
        potentialMetrics.optimizationAreas.push({
          stepIndex: i,
          stepName: stepMetadata.name,
          potential: stepPotential.score,
          area: stepPotential.primaryArea
        });
      }
    }

    potentialMetrics.optimizationScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Identify long-term improvements
    if (steps.length > 15) {
      potentialMetrics.longTermImprovements.push({
        type: 'workflow_refactoring',
        description: 'Consider refactoring into smaller, focused workflows',
        impact: 'high',
        effort: 'high'
      });
    }

    if (potentialMetrics.optimizationScore < 50) {
      potentialMetrics.longTermImprovements.push({
        type: 'architecture_review',
        description: 'Consider architectural improvements',
        impact: 'high',
        effort: 'high'
      });
    }

    // Create recommendations
    const recommendations = [];
    
    if (potentialMetrics.quickWins.length > 0) {
      recommendations.push({
        type: 'quick_wins',
        priority: 'high',
        description: `Found ${potentialMetrics.quickWins.length} quick optimization wins`,
        impact: 'high',
        effort: 'low'
      });
    }

    if (potentialMetrics.optimizationScore < 70) {
      recommendations.push({
        type: 'comprehensive_optimization',
        priority: 'medium',
        description: 'Consider comprehensive workflow optimization',
        impact: 'high',
        effort: 'high'
      });
    }

    return {
      metrics: potentialMetrics,
      recommendations
    };
  }

  /**
   * Calculate step complexity
   * @param {Object} stepMetadata - Step metadata
   * @returns {number} Complexity score
   */
  calculateStepComplexity(stepMetadata) {
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
    
    complexity *= typeComplexity[stepMetadata.type] || 2;
    
    // Add complexity for parameters
    const parameters = stepMetadata.parameters || {};
    if (parameters.batchSize) complexity += Math.log10(parameters.batchSize);
    if (parameters.parallel) complexity += 1;
    if (parameters.retries) complexity += parameters.retries * 0.5;
    
    return Math.round(complexity);
  }

  /**
   * Find independent step groups
   * @param {Object} dependencyGraph - Dependency graph
   * @returns {Array} Independent groups
   */
  findIndependentStepGroups(dependencyGraph) {
    const groups = [];
    const visited = new Set();
    
    for (const [stepIndex, step] of Object.entries(dependencyGraph)) {
      if (visited.has(parseInt(stepIndex))) continue;
      
      const group = this.findConnectedSteps(parseInt(stepIndex), dependencyGraph, visited);
      if (group.length > 0) {
        groups.push(group);
      }
    }
    
    return groups;
  }

  /**
   * Find connected steps
   * @param {number} stepIndex - Step index
   * @param {Object} dependencyGraph - Dependency graph
   * @param {Set} visited - Visited steps
   * @returns {Array} Connected steps
   */
  findConnectedSteps(stepIndex, dependencyGraph, visited) {
    const group = [];
    const queue = [stepIndex];
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (visited.has(current)) continue;
      visited.add(current);
      group.push(current);
      
      const step = dependencyGraph[current];
      
      // Add dependencies
      for (const depName of step.dependencies) {
        const depIndex = Object.keys(dependencyGraph).find(i => 
          dependencyGraph[i].step.name === depName
        );
        if (depIndex && !visited.has(parseInt(depIndex))) {
          queue.push(parseInt(depIndex));
        }
      }
      
      // Add dependents
      for (const depIndex of step.dependents) {
        if (!visited.has(depIndex)) {
          queue.push(depIndex);
        }
      }
    }
    
    return group;
  }

  /**
   * Estimate step resources
   * @param {Object} stepMetadata - Step metadata
   * @returns {Object} Resource requirements
   */
  estimateStepResources(stepMetadata) {
    const stepType = stepMetadata.type;
    const parameters = stepMetadata.parameters || {};
    
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
      timeout = Math.min(parameters.timeout, 600000);
    }

    return { memory, cpu, timeout };
  }

  /**
   * Calculate workflow cost
   * @param {Object} resources - Resource requirements
   * @returns {number} Estimated cost
   */
  calculateWorkflowCost(resources) {
    const memoryCost = resources.memory * 0.001;
    const cpuCost = resources.cpu * 0.01;
    const timeCost = (resources.timeout / 1000) * 0.0001;
    
    return Math.round((memoryCost + cpuCost + timeCost) * 100) / 100;
  }

  /**
   * Analyze step performance
   * @param {Object} stepMetadata - Step metadata
   * @returns {Object} Performance metrics
   */
  analyzeStepPerformance(stepMetadata) {
    const stepType = stepMetadata.type;
    const parameters = stepMetadata.parameters || {};
    
    let estimatedTime = 30000; // 30 seconds default
    let bottleneckReason = null;
    let optimizationPotential = 0;
    let optimizationSuggestions = [];

    // Estimate time based on type
    switch (stepType) {
      case 'setup':
        estimatedTime = 15000;
        break;
        
      case 'analysis':
        estimatedTime = 120000;
        bottleneckReason = 'Analysis steps are typically CPU-intensive';
        optimizationPotential = 0.7;
        optimizationSuggestions.push('Consider parallel processing');
        optimizationSuggestions.push('Optimize algorithms');
        break;
        
      case 'processing':
        estimatedTime = 90000;
        if (parameters.batchSize > 500) {
          bottleneckReason = 'Large batch size may cause memory issues';
          optimizationPotential = 0.6;
          optimizationSuggestions.push('Reduce batch size');
          optimizationSuggestions.push('Consider streaming processing');
        }
        break;
        
      case 'testing':
        estimatedTime = 60000;
        optimizationPotential = 0.5;
        optimizationSuggestions.push('Run tests in parallel');
        break;
        
      case 'deployment':
        estimatedTime = 180000;
        bottleneckReason = 'Deployment steps involve external systems';
        optimizationPotential = 0.4;
        optimizationSuggestions.push('Use rolling deployments');
        break;
        
      case 'cleanup':
        estimatedTime = 15000;
        break;
    }

    // Adjust based on parameters
    if (parameters.timeout) {
      estimatedTime = Math.min(estimatedTime, parameters.timeout);
    }

    return {
      estimatedTime,
      bottleneckReason,
      optimizationPotential,
      optimizationSuggestions
    };
  }

  /**
   * Calculate step optimization potential
   * @param {Object} stepMetadata - Step metadata
   * @returns {Object} Optimization potential
   */
  calculateStepOptimizationPotential(stepMetadata) {
    const stepType = stepMetadata.type;
    const parameters = stepMetadata.parameters || {};
    
    let score = 0;
    let suggestions = [];
    let primaryArea = '';

    // Score based on type
    switch (stepType) {
      case 'analysis':
        score += 3;
        primaryArea = 'performance';
        suggestions.push('Consider parallel processing');
        suggestions.push('Optimize algorithms');
        break;
        
      case 'processing':
        score += 2;
        primaryArea = 'resource_usage';
        if (parameters.batchSize > 500) {
          score += 2;
          suggestions.push('Reduce batch size');
        }
        break;
        
      case 'testing':
        score += 2;
        primaryArea = 'parallelization';
        suggestions.push('Run tests in parallel');
        break;
        
      case 'deployment':
        score += 1;
        primaryArea = 'reliability';
        suggestions.push('Use rolling deployments');
        break;
    }

    // Score based on parameters
    if (!parameters.parallel && (stepType === 'analysis' || stepType === 'testing')) {
      score += 2;
      suggestions.push('Enable parallel execution');
    }

    if (parameters.timeout > 300000) { // More than 5 minutes
      score += 1;
      suggestions.push('Reduce timeout or optimize step');
    }

    if (parameters.retries > 3) {
      score += 1;
      suggestions.push('Review retry strategy');
    }

    return {
      score: Math.min(score, 10),
      suggestions,
      primaryArea
    };
  }

  /**
   * Prioritize recommendations
   * @param {Array} recommendations - Recommendations
   * @returns {Array} Prioritized recommendations
   */
  prioritizeRecommendations(recommendations) {
    const priorityOrder = ['high', 'medium', 'low'];
    const impactOrder = ['high', 'medium', 'low'];
    
    return recommendations.sort((a, b) => {
      // Sort by priority first
      const priorityDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by impact
      return impactOrder.indexOf(a.impact) - impactOrder.indexOf(b.impact);
    });
  }

  /**
   * Create analysis summary
   * @param {Object} analysisResults - Analysis results
   * @returns {Object} Analysis summary
   */
  createAnalysisSummary(analysisResults) {
    const summary = {
      totalRecommendations: 0,
      highPriorityRecommendations: 0,
      optimizationScore: 0,
      keyFindings: []
    };

    for (const [ruleId, result] of Object.entries(analysisResults)) {
      if (result.recommendations) {
        summary.totalRecommendations += result.recommendations.length;
        summary.highPriorityRecommendations += result.recommendations.filter(r => r.priority === 'high').length;
      }
    }

    // Calculate optimization score
    if (analysisResults.optimization_potential && analysisResults.optimization_potential.metrics) {
      summary.optimizationScore = analysisResults.optimization_potential.metrics.optimizationScore;
    }

    // Extract key findings
    for (const [ruleId, result] of Object.entries(analysisResults)) {
      if (result.metrics) {
        if (result.metrics.bottlenecks && result.metrics.bottlenecks.length > 0) {
          summary.keyFindings.push(`${result.metrics.bottlenecks.length} bottlenecks identified`);
        }
        if (result.metrics.parallelizationOpportunities && result.metrics.parallelizationOpportunities.length > 0) {
          summary.keyFindings.push(`${result.metrics.parallelizationOpportunities.length} parallelization opportunities`);
        }
      }
    }

    return summary;
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
   * Hash context
   * @param {WorkflowContext} context - Context
   * @returns {string} Context hash
   */
  hashContext(context) {
    try {
      const contextData = context.getAll();
      const relevantData = this.extractRelevantContextData(contextData);
      const contextStr = JSON.stringify(relevantData);
      return crypto.createHash('md5').update(contextStr).digest('hex');
    } catch (error) {
      return 'default';
    }
  }

  /**
   * Extract relevant context data
   * @param {Object} contextData - Context data
   * @returns {Object} Relevant data
   */
  extractRelevantContextData(contextData) {
    const relevantKeys = [
      'projectId', 'userId', 'environment', 'mode', 'version',
      'config', 'settings', 'parameters'
    ];
    
    const relevant = {};
    for (const key of relevantKeys) {
      if (contextData[key] !== undefined) {
        relevant[key] = contextData[key];
      }
    }
    
    return relevant;
  }

  /**
   * Get default analysis
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Context
   * @returns {Object} Default analysis
   */
  getDefaultAnalysis(workflow, context) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    return {
      workflowId: this.getWorkflowId(workflow),
      workflowName: metadata.name,
      analysisResults: {},
      recommendations: [],
      summary: {
        totalRecommendations: 0,
        highPriorityRecommendations: 0,
        optimizationScore: 50,
        keyFindings: ['Analysis disabled']
      },
      metadata: {
        analyzedAt: new Date(),
        contextHash: this.hashContext(context),
        stepCount: steps.length
      }
    };
  }

  /**
   * Cache analysis
   * @param {string} workflowId - Workflow ID
   * @param {Object} analysis - Analysis result
   */
  cacheAnalysis(workflowId, analysis) {
    // Check cache size and evict if necessary
    if (this.analysisCache.size >= this.maxCacheSize) {
      const entries = Array.from(this.analysisCache.entries());
      const oldestEntry = entries[0];
      this.analysisCache.delete(oldestEntry[0]);
    }

    this.analysisCache.set(workflowId, {
      analysis,
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
   * Learn from analysis
   * @param {string} workflowId - Workflow ID
   * @param {Object} analysis - Analysis result
   */
  learnFromAnalysis(workflowId, analysis) {
    this.analysisHistory.set(workflowId, {
      analysis,
      timestamp: Date.now()
    });

    // Clean up old history
    if (this.analysisHistory.size > 1000) {
      const entries = Array.from(this.analysisHistory.entries());
      const toDelete = entries.slice(0, entries.length - 1000);
      for (const [key] of toDelete) {
        this.analysisHistory.delete(key);
      }
    }
  }

  /**
   * Get analysis statistics
   * @returns {Object} Analysis statistics
   */
  getAnalysisStatistics() {
    return {
      cacheSize: this.analysisCache.size,
      maxCacheSize: this.maxCacheSize,
      historySize: this.analysisHistory.size,
      rulesCount: this.analysisRules.size,
      enabled: this.enableAnalysis,
      learning: this.enableLearning
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    this.logger.info('WorkflowAnalyzer: Cache cleared');
  }

  /**
   * Clear analysis history
   */
  clearHistory() {
    this.analysisHistory.clear();
    this.logger.info('WorkflowAnalyzer: History cleared');
  }

  /**
   * Shutdown analyzer
   */
  shutdown() {
    this.logger.info('WorkflowAnalyzer: Shutting down');
    
    // Clear cache and history
    this.clearCache();
    this.clearHistory();
    
    this.logger.info('WorkflowAnalyzer: Shutdown complete');
  }
}

module.exports = WorkflowAnalyzer; 