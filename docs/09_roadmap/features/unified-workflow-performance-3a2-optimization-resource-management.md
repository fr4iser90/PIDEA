# Unified Workflow Performance 3A.2: Optimization & Resource Management

## 1. Project Overview
- **Feature/Component Name**: Optimization & Resource Management
- **Priority**: High
- **Estimated Time**: 20 hours (2.5 days)
- **Dependencies**: Foundation 1A (Core Interfaces & Context), Foundation 1B (Builder Pattern & Common Steps), Performance 3A.1 (Core Execution Engine Foundation)
- **Related Issues**: No workflow optimization, no resource management, inefficient execution

## 2. Technical Requirements
- **Tech Stack**: Node.js, JavaScript ES6+, Domain-Driven Design, Optimization algorithms
- **Architecture Pattern**: DDD with optimization and resource management
- **Database Changes**: None (uses existing infrastructure)
- **API Changes**: None (internal optimization)
- **Frontend Changes**: None (backend optimization)
- **Backend Changes**: Workflow optimization and resource management

## 3. Implementation Files

#### Files to Create:
- [ ] `backend/domain/workflows/execution/WorkflowOptimizer.js` - Workflow optimization algorithms
- [ ] `backend/domain/workflows/execution/ResourceManager.js` - Resource allocation and monitoring
- [ ] `backend/domain/workflows/execution/ExecutionCache.js` - Execution result caching
- [ ] `backend/domain/workflows/execution/ExecutionMetrics.js` - Performance metrics tracking
- [ ] `backend/domain/workflows/execution/ExecutionPredictor.js` - Execution time prediction
- [ ] `backend/domain/workflows/execution/optimization/StepOptimizer.js` - Step-level optimization
- [ ] `backend/domain/workflows/execution/optimization/WorkflowAnalyzer.js` - Workflow analysis
- [ ] `backend/domain/workflows/execution/resources/ResourceAllocator.js` - Resource allocation
- [ ] `backend/domain/workflows/execution/resources/ResourceMonitor.js` - Resource monitoring

#### Files to Modify:
- [ ] `backend/domain/workflows/execution/SequentialExecutionEngine.js` - Add optimization and resource management
- [ ] `backend/domain/workflows/execution/strategies/BasicSequentialStrategy.js` - Add optimization support

## 4. Implementation Phases

#### Phase 1: Workflow Optimization (8 hours)
- [ ] Implement `WorkflowOptimizer.js` with basic optimization algorithms
- [ ] Create `StepOptimizer.js` for step-level optimization
- [ ] Implement `WorkflowAnalyzer.js` for workflow analysis
- [ ] Add optimization rules and patterns

#### Phase 2: Resource Management (8 hours)
- [ ] Implement `ResourceManager.js` with resource allocation logic
- [ ] Create `ResourceAllocator.js` for resource allocation
- [ ] Implement `ResourceMonitor.js` for resource monitoring
- [ ] Add resource limits and controls

#### Phase 3: Caching & Metrics (4 hours)
- [ ] Implement `ExecutionCache.js` for result caching
- [ ] Create `ExecutionMetrics.js` for performance tracking
- [ ] Implement `ExecutionPredictor.js` for time prediction
- [ ] Integrate with execution engine

## 5. Workflow Optimization Design

#### WorkflowOptimizer Implementation
```javascript
/**
 * Workflow optimizer for execution optimization
 */
class WorkflowOptimizer {
  constructor() {
    this.optimizationRules = new Map();
    this.executionHistory = new Map();
    this.optimizationCache = new Map();
    
    this.initializeOptimizationRules();
  }

  /**
   * Initialize optimization rules
   */
  initializeOptimizationRules() {
    // Rule 1: Combine similar steps
    this.optimizationRules.set('combine_similar_steps', {
      name: 'Combine Similar Steps',
      description: 'Combine multiple similar steps into a single optimized step',
      apply: (workflow) => this.combineSimilarSteps(workflow)
    });

    // Rule 2: Reorder steps for efficiency
    this.optimizationRules.set('reorder_steps', {
      name: 'Reorder Steps',
      description: 'Reorder steps for optimal execution order',
      apply: (workflow) => this.reorderSteps(workflow)
    });

    // Rule 3: Remove redundant steps
    this.optimizationRules.set('remove_redundant_steps', {
      name: 'Remove Redundant Steps',
      description: 'Remove steps that are redundant or unnecessary',
      apply: (workflow) => this.removeRedundantSteps(workflow)
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
    
    // Check optimization cache
    if (this.optimizationCache.has(workflowId)) {
      return this.optimizationCache.get(workflowId);
    }

    let optimizedWorkflow = workflow;

    // Apply optimization rules
    for (const [ruleId, rule] of this.optimizationRules) {
      try {
        optimizedWorkflow = await rule.apply(optimizedWorkflow, context);
      } catch (error) {
        console.warn(`WorkflowOptimizer: Rule ${ruleId} failed:`, error.message);
      }
    }

    // Cache optimized workflow
    this.optimizationCache.set(workflowId, optimizedWorkflow);

    return optimizedWorkflow;
  }

  /**
   * Combine similar steps
   * @param {IWorkflow} workflow - Workflow to optimize
   * @returns {IWorkflow} Optimized workflow
   */
  combineSimilarSteps(workflow) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    if (steps.length <= 1) {
      return workflow;
    }

    // Group steps by type
    const stepGroups = {};
    for (const step of steps) {
      const type = step.type;
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

    // Create optimized workflow
    return this.createOptimizedWorkflow(workflow, optimizedSteps);
  }

  /**
   * Reorder steps for efficiency
   * @param {IWorkflow} workflow - Workflow to optimize
   * @returns {IWorkflow} Optimized workflow
   */
  reorderSteps(workflow) {
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

    // Sort steps by priority
    const sortedSteps = [...steps].sort((a, b) => {
      const priorityA = stepPriority[a.type] || 999;
      const priorityB = stepPriority[b.type] || 999;
      return priorityA - priorityB;
    });

    // Create optimized workflow
    return this.createOptimizedWorkflow(workflow, sortedSteps);
  }

  /**
   * Remove redundant steps
   * @param {IWorkflow} workflow - Workflow to optimize
   * @returns {IWorkflow} Optimized workflow
   */
  removeRedundantSteps(workflow) {
    const metadata = workflow.getMetadata();
    const steps = metadata.steps || [];
    
    if (steps.length <= 1) {
      return workflow;
    }

    // Remove duplicate steps
    const uniqueSteps = [];
    const seenSteps = new Set();

    for (const step of steps) {
      const stepKey = `${step.type}_${step.name}`;
      if (!seenSteps.has(stepKey)) {
        seenSteps.add(stepKey);
        uniqueSteps.push(step);
      }
    }

    // Create optimized workflow
    return this.createOptimizedWorkflow(workflow, uniqueSteps);
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
        combined: true
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
      if (step.parameters) {
        Object.assign(merged, step.parameters);
      }
    }
    
    return merged;
  }

  /**
   * Create optimized workflow
   * @param {IWorkflow} originalWorkflow - Original workflow
   * @param {Array} optimizedSteps - Optimized steps
   * @returns {IWorkflow} Optimized workflow
   */
  createOptimizedWorkflow(originalWorkflow, optimizedSteps) {
    const originalMetadata = originalWorkflow.getMetadata();
    
    // Create optimized metadata
    const optimizedMetadata = {
      ...originalMetadata,
      steps: optimizedSteps,
      optimized: true,
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
}
```

#### ResourceManager Implementation
```javascript
/**
 * Resource manager for workflow execution
 */
class ResourceManager {
  constructor(options = {}) {
    this.maxMemoryUsage = options.maxMemoryUsage || 512; // MB
    this.maxCpuUsage = options.maxCpuUsage || 80; // Percentage
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 5;
    this.resourceTimeout = options.resourceTimeout || 300000; // 5 minutes
    
    // Resource tracking
    this.allocatedResources = new Map();
    this.resourceUsage = new Map();
    this.resourceLimits = new Map();
    
    // Initialize resource limits
    this.initializeResourceLimits();
    
    this.logger = options.logger || console;
  }

  /**
   * Initialize resource limits
   */
  initializeResourceLimits() {
    this.resourceLimits.set('memory', this.maxMemoryUsage);
    this.resourceLimits.set('cpu', this.maxCpuUsage);
    this.resourceLimits.set('concurrent', this.maxConcurrentExecutions);
  }

  /**
   * Allocate resources for execution
   * @param {string} executionId - Execution ID
   * @param {Object} requirements - Resource requirements
   * @returns {Promise<Object>} Allocated resources
   */
  async allocateResources(executionId, requirements = {}) {
    try {
      this.logger.info('ResourceManager: Allocating resources', {
        executionId,
        requirements
      });

      // Check resource availability
      const availability = await this.checkResourceAvailability(requirements);
      if (!availability.available) {
        throw new Error(`Insufficient resources: ${availability.reason}`);
      }

      // Allocate resources
      const allocatedResources = {
        executionId,
        memory: requirements.memory || 64, // MB
        cpu: requirements.cpu || 10, // Percentage
        timeout: requirements.timeout || this.resourceTimeout,
        allocatedAt: new Date()
      };

      // Track allocation
      this.allocatedResources.set(executionId, allocatedResources);
      this.resourceUsage.set(executionId, {
        memory: 0,
        cpu: 0,
        startTime: Date.now()
      });

      this.logger.info('ResourceManager: Resources allocated', {
        executionId,
        allocatedResources
      });

      return allocatedResources;

    } catch (error) {
      this.logger.error('ResourceManager: Resource allocation failed', {
        executionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Release resources
   * @param {string} executionId - Execution ID
   * @returns {Promise<boolean>} True if released successfully
   */
  async releaseResources(executionId) {
    try {
      this.logger.info('ResourceManager: Releasing resources', {
        executionId
      });

      // Remove from tracking
      const wasAllocated = this.allocatedResources.has(executionId);
      this.allocatedResources.delete(executionId);
      this.resourceUsage.delete(executionId);

      this.logger.info('ResourceManager: Resources released', {
        executionId,
        wasAllocated
      });

      return wasAllocated;

    } catch (error) {
      this.logger.error('ResourceManager: Resource release failed', {
        executionId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check resource availability
   * @param {Object} requirements - Resource requirements
   * @returns {Promise<Object>} Availability status
   */
  async checkResourceAvailability(requirements = {}) {
    const currentUsage = await this.getCurrentResourceUsage();
    const limits = this.getResourceLimits();

    // Check memory
    const requiredMemory = requirements.memory || 64;
    if (currentUsage.memory + requiredMemory > limits.memory) {
      return {
        available: false,
        reason: `Insufficient memory: ${currentUsage.memory}MB + ${requiredMemory}MB > ${limits.memory}MB`
      };
    }

    // Check CPU
    const requiredCpu = requirements.cpu || 10;
    if (currentUsage.cpu + requiredCpu > limits.cpu) {
      return {
        available: false,
        reason: `Insufficient CPU: ${currentUsage.cpu}% + ${requiredCpu}% > ${limits.cpu}%`
      };
    }

    // Check concurrent executions
    if (this.allocatedResources.size >= limits.concurrent) {
      return {
        available: false,
        reason: `Maximum concurrent executions reached: ${this.allocatedResources.size} >= ${limits.concurrent}`
      };
    }

    return {
      available: true,
      currentUsage,
      limits
    };
  }

  /**
   * Get current resource usage
   * @returns {Promise<Object>} Current resource usage
   */
  async getCurrentResourceUsage() {
    // Calculate total allocated resources
    let totalMemory = 0;
    let totalCpu = 0;

    for (const [executionId, allocation] of this.allocatedResources) {
      totalMemory += allocation.memory;
      totalCpu += allocation.cpu;
    }

    return {
      memory: totalMemory,
      cpu: totalCpu,
      concurrent: this.allocatedResources.size
    };
  }

  /**
   * Get resource limits
   * @returns {Object} Resource limits
   */
  getResourceLimits() {
    return {
      memory: this.resourceLimits.get('memory'),
      cpu: this.resourceLimits.get('cpu'),
      concurrent: this.resourceLimits.get('concurrent')
    };
  }

  /**
   * Get resource utilization
   * @returns {Promise<Object>} Resource utilization
   */
  async getResourceUtilization() {
    const currentUsage = await this.getCurrentResourceUsage();
    const limits = this.getResourceLimits();

    return {
      memory: {
        used: currentUsage.memory,
        limit: limits.memory,
        percentage: (currentUsage.memory / limits.memory) * 100
      },
      cpu: {
        used: currentUsage.cpu,
        limit: limits.cpu,
        percentage: (currentUsage.cpu / limits.cpu) * 100
      },
      concurrent: {
        used: currentUsage.concurrent,
        limit: limits.concurrent,
        percentage: (currentUsage.concurrent / limits.concurrent) * 100
      }
    };
  }

  /**
   * Update resource usage
   * @param {string} executionId - Execution ID
   * @param {Object} usage - Current usage
   */
  updateResourceUsage(executionId, usage) {
    if (this.resourceUsage.has(executionId)) {
      this.resourceUsage.set(executionId, {
        ...this.resourceUsage.get(executionId),
        ...usage,
        lastUpdate: Date.now()
      });
    }
  }

  /**
   * Get resource statistics
   * @returns {Promise<Object>} Resource statistics
   */
  async getResourceStatistics() {
    const utilization = await this.getResourceUtilization();
    const allocations = Array.from(this.allocatedResources.values());

    return {
      utilization,
      allocations: allocations.length,
      averageMemory: allocations.length > 0 ? 
        allocations.reduce((sum, a) => sum + a.memory, 0) / allocations.length : 0,
      averageCpu: allocations.length > 0 ? 
        allocations.reduce((sum, a) => sum + a.cpu, 0) / allocations.length : 0
    };
  }
}
```

#### ExecutionCache Implementation
```javascript
/**
 * Execution cache for workflow results
 */
class ExecutionCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 3600000; // 1 hour
    this.cache = new Map();
    this.accessTimes = new Map();
    
    this.logger = options.logger || console;
  }

  /**
   * Get cached result
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @returns {Object|null} Cached result or null
   */
  async getCachedResult(workflow, context) {
    const cacheKey = this.generateCacheKey(workflow, context);
    
    if (!this.cache.has(cacheKey)) {
      return null;
    }

    const cachedItem = this.cache.get(cacheKey);
    
    // Check TTL
    if (Date.now() - cachedItem.timestamp > this.ttl) {
      this.cache.delete(cacheKey);
      this.accessTimes.delete(cacheKey);
      return null;
    }

    // Update access time
    this.accessTimes.set(cacheKey, Date.now());
    
    this.logger.info('ExecutionCache: Cache hit', {
      cacheKey: cacheKey.substring(0, 20) + '...',
      age: Date.now() - cachedItem.timestamp
    });

    return cachedItem.result;
  }

  /**
   * Cache result
   * @param {IWorkflow} workflow - Workflow
   * @param {WorkflowContext} context - Workflow context
   * @param {Object} result - Result to cache
   */
  async cacheResult(workflow, context, result) {
    const cacheKey = this.generateCacheKey(workflow, context);
    
    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    // Cache the result
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    this.accessTimes.set(cacheKey, Date.now());

    this.logger.info('ExecutionCache: Result cached', {
      cacheKey: cacheKey.substring(0, 20) + '...',
      cacheSize: this.cache.size
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
    return `${metadata.name}_${metadata.version}_${contextHash}`;
  }

  /**
   * Hash context for caching
   * @param {WorkflowContext} context - Context
   * @returns {string} Context hash
   */
  hashContext(context) {
    // Simple hash for context
    const contextStr = JSON.stringify(context.getAll());
    return require('crypto').createHash('md5').update(contextStr).digest('hex');
  }

  /**
   * Evict oldest cache entries
   */
  evictOldest() {
    // Find oldest accessed entry
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessTimes) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    // Remove oldest entry
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
      
      this.logger.info('ExecutionCache: Evicted oldest entry', {
        cacheKey: oldestKey.substring(0, 20) + '...'
      });
    }
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    
    this.logger.info('ExecutionCache: Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStatistics() {
    const now = Date.now();
    let hitCount = 0;
    let missCount = 0;

    // Count hits and misses (simplified)
    for (const [key, accessTime] of this.accessTimes) {
      if (now - accessTime < 60000) { // Last minute
        hitCount++;
      } else {
        missCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      hitCount,
      missCount,
      hitRate: (hitCount + missCount) > 0 ? hitCount / (hitCount + missCount) : 0
    };
  }

  /**
   * Get hit rate
   * @returns {number} Hit rate percentage
   */
  getHitRate() {
    const stats = this.getStatistics();
    return stats.hitRate * 100;
  }
}
```

## 6. Code Standards & Patterns
- **Coding Style**: ESLint with existing project rules, Prettier formatting
- **Naming Conventions**: camelCase for variables/functions, PascalCase for classes, kebab-case for files
- **Error Handling**: Try-catch with specific error types, proper error logging
- **Logging**: Winston logger with structured logging, different levels for operations
- **Testing**: Jest framework, 90% coverage requirement
- **Documentation**: JSDoc for all public methods, README updates

## 7. Testing Strategy

#### Unit Tests: 9 test files (1 per implementation file)
- **Optimization**: 3 test files for workflow optimization
- **Resource Management**: 3 test files for resource management
- **Caching & Metrics**: 3 test files for caching and metrics

#### Test Coverage Requirements:
- **Line Coverage**: 90% minimum
- **Branch Coverage**: 85% minimum
- **Function Coverage**: 100% minimum

## 8. Success Criteria

#### Technical Metrics:
- [ ] Workflow optimization algorithms working
- [ ] Resource management operational
- [ ] Execution caching functional
- [ ] Performance metrics tracking
- [ ] 90% test coverage achieved
- [ ] Zero breaking changes to existing APIs

#### Performance Metrics:
- [ ] 20% improvement in execution speed for optimized workflows
- [ ] Resource utilization optimized
- [ ] Caching working effectively
- [ ] All existing functionality preserved

## 9. Risk Assessment

#### Medium Risk:
- [ ] Optimization complexity - Mitigation: Start with basic algorithms
- [ ] Resource management conflicts - Mitigation: Thorough resource validation

#### Low Risk:
- [ ] Performance impact - Mitigation: Performance testing
- [ ] Caching invalidation - Mitigation: Clear cache management

## 10. AI Auto-Implementation Instructions

#### Task Database Fields:
- **source_type**: 'markdown_doc'
- **source_path**: 'docs/09_roadmap/features/unified-workflow-performance-3a2-optimization-resource-management.md'
- **automation_level**: 'semi_auto'
- **confirmation_required**: true
- **max_attempts**: 3
- **git_branch_required**: true
- **new_chat_required**: true

#### AI Execution Context:
```json
{
  "requires_new_chat": true,
  "git_branch_name": "feature/unified-workflow-performance-3a2",
  "confirmation_keywords": ["fertig", "done", "complete", "optimization resource management ready"],
  "fallback_detection": true,
  "max_confirmation_attempts": 3,
  "timeout_seconds": 1800
}
```

#### Success Indicators:
- [ ] All 9 new files created with proper JSDoc
- [ ] All 2 existing files modified correctly
- [ ] Workflow optimization working
- [ ] Resource management operational
- [ ] Execution caching functional
- [ ] All tests passing
- [ ] No build errors
- [ ] Code follows standards
- [ ] Documentation updated

## 11. References & Resources
- **Technical Documentation**: Workflow optimization, Resource management, Caching strategies
- **API References**: Existing PIDEA patterns and conventions
- **Design Patterns**: Optimization patterns, Resource management patterns
- **Best Practices**: Workflow optimization best practices, Resource management
- **Similar Implementations**: Existing optimization patterns in PIDEA

---

## Database Task Creation Instructions

This subtask will be parsed into a database task with the following mapping:

```sql
INSERT INTO tasks (
  id, project_id, title, description, type, category, priority, status,
  source_type, source_path, source_content, metadata, estimated_hours
) VALUES (
  uuid(), -- Generated
  'pidea-backend', -- From context
  'Unified Workflow Performance 3A.2: Optimization & Resource Management', -- From section 1
  '[Full markdown content]', -- Complete description
  'feature', -- Derived from Technical Requirements
  'backend', -- Derived from context
  'high', -- From section 1
  'pending', -- Initial status
  'markdown_doc', -- Source type
  'docs/09_roadmap/features/unified-workflow-performance-3a2-optimization-resource-management.md', -- Source path
  '[Full markdown content]', -- For reference
  '[JSON with all metadata]', -- All technical details
  20 -- From section 1 (total hours)
);
``` 