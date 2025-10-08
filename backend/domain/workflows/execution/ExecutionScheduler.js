/**
 * ExecutionScheduler - Schedules workflow execution
 * Provides execution scheduling with priority, dependencies, and resource management
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Execution scheduler for workflow execution
 */
class ExecutionScheduler {
  constructor(options = {}) {
    this.scheduledExecutions = new Map();
    this.executionQueue = new Map();
    this.resourcePool = new Map();
    this.dependencyGraph = new Map();
    
    // Scheduler configuration
    this.config = {
      maxConcurrentExecutions: options.maxConcurrentExecutions || 10,
      enableResourceManagement: options.enableResourceManagement !== false,
      enableDependencyResolution: options.enableDependencyResolution !== false,
      enablePriorityScheduling: options.enablePriorityScheduling !== false,
      defaultTimeout: options.defaultTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 5000
    };
    
    // Scheduler statistics
    this.stats = {
      totalScheduled: 0,
      totalExecuted: 0,
      totalFailed: 0,
      totalCancelled: 0,
      averageSchedulingTime: 0,
      averageExecutionTime: 0,
      resourceUtilization: 0
    };
    
    // Initialize resource pool
    this.initializeResourcePool();
  }

  /**
   * Initialize resource pool
   * @private
   */
  initializeResourcePool() {
    if (!this.config.enableResourceManagement) {
      return;
    }
    
    // Initialize default resources
    this.resourcePool.set('cpu', {
      total: 100,
      available: 100,
      reserved: 0,
      unit: 'percentage'
    });
    
    this.resourcePool.set('memory', {
      total: 8192, // 8GB
      available: 8192,
      reserved: 0,
      unit: 'MB'
    });
    
    this.resourcePool.set('disk', {
      total: 100000, // 100GB
      available: 100000,
      reserved: 0,
      unit: 'MB'
    });
  }

  /**
   * Schedule execution
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {Promise<Object>} Scheduled execution
   */
  async schedule(executionContext) {
    const startTime = Date.now();
    
    try {
      // Validate execution context
      this.validateExecutionContext(executionContext);
      
      // Calculate scheduling parameters
      const schedulingParams = this.calculateSchedulingParams(executionContext);
      
      // Check resource availability
      if (this.config.enableResourceManagement) {
        const resourceCheck = this.checkResourceAvailability(schedulingParams.resourceRequirements);
        if (!resourceCheck.available) {
          throw new Error(`Insufficient resources: ${resourceCheck.reason}`);
        }
      }
      
      // Check dependencies
      if (this.config.enableDependencyResolution) {
        const dependencyCheck = this.checkDependencies(schedulingParams.dependencies);
        if (!dependencyCheck.satisfied) {
          throw new Error(`Dependencies not satisfied: ${dependencyCheck.reason}`);
        }
      }
      
      // Create scheduled execution
      const scheduledExecution = {
        id: executionContext.getId(),
        executionContext,
        scheduledAt: new Date(),
        priority: schedulingParams.priority,
        estimatedDuration: schedulingParams.estimatedDuration,
        resourceRequirements: schedulingParams.resourceRequirements,
        dependencies: schedulingParams.dependencies,
        constraints: schedulingParams.constraints,
        status: 'scheduled',
        retryCount: 0
      };
      
      // Add to scheduled executions
      this.scheduledExecutions.set(scheduledExecution.id, scheduledExecution);
      
      // Add to dependency graph
      if (this.config.enableDependencyResolution) {
        this.addToDependencyGraph(scheduledExecution);
      }
      
      // Reserve resources
      if (this.config.enableResourceManagement) {
        this.reserveResources(scheduledExecution.id, schedulingParams.resourceRequirements);
      }
      
      const schedulingTime = Date.now() - startTime;
      this.updateAverageSchedulingTime(schedulingTime);
      this.stats.totalScheduled++;
      
      return scheduledExecution;
      
    } catch (error) {
      throw new Error(`Scheduling failed: ${error.message}`);
    }
  }

  /**
   * Validate execution context
   * @param {ExecutionContext} executionContext - Execution context
   * @private
   */
  validateExecutionContext(executionContext) {
    if (!executionContext) {
      throw new Error('Execution context is required');
    }
    
    if (!executionContext.getId()) {
      throw new Error('Execution context must have an ID');
    }
    
    if (!executionContext.getWorkflow()) {
      throw new Error('Execution context must have a workflow');
    }
  }

  /**
   * Calculate scheduling parameters
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {Object} Scheduling parameters
   * @private
   */
  calculateSchedulingParams(executionContext) {
    const workflow = executionContext.getWorkflow();
    const metadata = workflow.getMetadata();
    const options = executionContext.getOptions();
    
    // Calculate priority
    let priority = 1;
    if (this.config.enablePriorityScheduling) {
      priority = this.calculatePriority(executionContext);
    }
    
    // Estimate duration
    const estimatedDuration = this.estimateDuration(executionContext);
    
    // Calculate resource requirements
    const resourceRequirements = this.calculateResourceRequirements(executionContext);
    
    // Identify dependencies
    const dependencies = this.identifyDependencies(executionContext);
    
    // Get constraints
    const constraints = this.identifyConstraints(executionContext);
    
    return {
      priority,
      estimatedDuration,
      resourceRequirements,
      dependencies,
      constraints
    };
  }

  /**
   * Calculate execution priority
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {number} Priority score
   * @private
   */
  calculatePriority(executionContext) {
    let priority = 1;
    const options = executionContext.getOptions();
    
    // Increase priority for critical workflows
    if (options.critical) {
      priority += 10;
    }
    
    // Increase priority for high priority tasks
    if (options.priority === 'high') {
      priority += 5;
    }
    
    // Increase priority for urgent tasks
    if (options.urgent) {
      priority += 3;
    }
    
    // Decrease priority for low priority tasks
    if (options.priority === 'low') {
      priority -= 2;
    }
    
    return Math.max(1, priority);
  }

  /**
   * Estimate execution duration
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {number} Estimated duration in milliseconds
   * @private
   */
  estimateDuration(executionContext) {
    const workflow = executionContext.getWorkflow();
    const metadata = workflow.getMetadata();
    const stepCount = metadata.steps?.length || 1;
    
    // Base estimation: 30 seconds per step
    let estimatedDuration = stepCount * 30000;
    
    // Adjust based on workflow type
    const taskMode = workflow.getType();
    switch (taskMode) {
      case 'analysis':
        estimatedDuration *= 1.5; // Analysis workflows take longer
        break;
      case 'testing':
        estimatedDuration *= 2.0; // Testing workflows take much longer
        break;
      case 'deployment':
        estimatedDuration *= 1.2; // Deployment workflows take slightly longer
        break;
      default:
        // Default multiplier
        break;
    }
    
    return estimatedDuration;
  }

  /**
   * Calculate resource requirements
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {Object} Resource requirements
   * @private
   */
  calculateResourceRequirements(executionContext) {
    const workflow = executionContext.getWorkflow();
    const metadata = workflow.getMetadata();
    const stepCount = metadata.steps?.length || 1;
    
    // Base resource requirements
    const requirements = {
      cpu: Math.min(stepCount * 5, 50), // 5% CPU per step, max 50%
      memory: Math.min(stepCount * 100, 2048), // 100MB per step, max 2GB
      disk: Math.min(stepCount * 50, 1000) // 50MB per step, max 1GB
    };
    
    // Adjust based on workflow type
    const taskMode = workflow.getType();
    switch (taskMode) {
      case 'analysis':
        requirements.memory *= 1.5; // Analysis needs more memory
        break;
      case 'testing':
        requirements.cpu *= 1.3; // Testing needs more CPU
        requirements.memory *= 1.2;
        break;
      case 'deployment':
        requirements.disk *= 1.5; // Deployment needs more disk
        break;
      default:
        // Default requirements
        break;
    }
    
    return requirements;
  }

  /**
   * Identify dependencies
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {Array} Dependencies
   * @private
   */
  identifyDependencies(executionContext) {
    const dependencies = [];
    
    // Get dependencies from execution context
    const contextDependencies = executionContext.getDependencies();
    dependencies.push(...contextDependencies);
    
    // Get dependencies from workflow
    const workflow = executionContext.getWorkflow();
    const workflowDependencies = workflow.getDependencies();
    dependencies.push(...workflowDependencies);
    
    // Get dependencies from options
    const options = executionContext.getOptions();
    if (options.dependencies) {
      dependencies.push(...options.dependencies);
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Identify constraints
   * @param {ExecutionContext} executionContext - Execution context
   * @returns {Object} Constraints
   * @private
   */
  identifyConstraints(executionContext) {
    const constraints = {};
    
    // Get constraints from execution context
    const contextConstraints = executionContext.getConstraints();
    Object.assign(constraints, contextConstraints);
    
    // Get constraints from options
    const options = executionContext.getOptions();
    if (options.constraints) {
      Object.assign(constraints, options.constraints);
    }
    
    return constraints;
  }

  /**
   * Check resource availability
   * @param {Object} resourceRequirements - Resource requirements
   * @returns {Object} Resource availability check
   * @private
   */
  checkResourceAvailability(resourceRequirements) {
    for (const [resource, requirement] of Object.entries(resourceRequirements)) {
      const pool = this.resourcePool.get(resource);
      if (!pool) {
        return {
          available: false,
          reason: `Resource type '${resource}' not available`
        };
      }
      
      if (pool.available < requirement) {
        return {
          available: false,
          reason: `Insufficient ${resource}: required ${requirement}, available ${pool.available}`
        };
      }
    }
    
    return { available: true };
  }

  /**
   * Check dependencies
   * @param {Array} dependencies - Dependencies
   * @returns {Object} Dependency check
   * @private
   */
  checkDependencies(dependencies) {
    for (const dependency of dependencies) {
      const dependencyExecution = this.scheduledExecutions.get(dependency);
      if (!dependencyExecution) {
        return {
          satisfied: false,
          reason: `Dependency '${dependency}' not found`
        };
      }
      
      if (dependencyExecution.status !== 'completed') {
        return {
          satisfied: false,
          reason: `Dependency '${dependency}' not completed (status: ${dependencyExecution.status})`
        };
      }
    }
    
    return { satisfied: true };
  }

  /**
   * Reserve resources
   * @param {string} executionId - Execution ID
   * @param {Object} resourceRequirements - Resource requirements
   * @private
   */
  reserveResources(executionId, resourceRequirements) {
    for (const [resource, requirement] of Object.entries(resourceRequirements)) {
      const pool = this.resourcePool.get(resource);
      if (pool) {
        pool.available -= requirement;
        pool.reserved += requirement;
      }
    }
    
    // Track resource reservations
    this.executionQueue.set(executionId, {
      resourceRequirements,
      reservedAt: new Date()
    });
  }

  /**
   * Release resources
   * @param {string} executionId - Execution ID
   * @private
   */
  releaseResources(executionId) {
    const queueItem = this.executionQueue.get(executionId);
    if (!queueItem) {
      return;
    }
    
    const { resourceRequirements } = queueItem;
    
    for (const [resource, requirement] of Object.entries(resourceRequirements)) {
      const pool = this.resourcePool.get(resource);
      if (pool) {
        pool.available += requirement;
        pool.reserved -= requirement;
      }
    }
    
    this.executionQueue.delete(executionId);
  }

  /**
   * Add to dependency graph
   * @param {Object} scheduledExecution - Scheduled execution
   * @private
   */
  addToDependencyGraph(scheduledExecution) {
    const { id, dependencies } = scheduledExecution;
    
    // Add node to graph
    if (!this.dependencyGraph.has(id)) {
      this.dependencyGraph.set(id, new Set());
    }
    
    // Add edges for dependencies
    for (const dependency of dependencies) {
      if (!this.dependencyGraph.has(dependency)) {
        this.dependencyGraph.set(dependency, new Set());
      }
      this.dependencyGraph.get(dependency).add(id);
    }
  }

  /**
   * Get scheduled execution
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Scheduled execution
   */
  getScheduledExecution(executionId) {
    return this.scheduledExecutions.get(executionId) || null;
  }

  /**
   * Remove scheduled execution
   * @param {string} executionId - Execution ID
   * @returns {boolean} True if removed
   */
  removeScheduledExecution(executionId) {
    const scheduledExecution = this.scheduledExecutions.get(executionId);
    if (!scheduledExecution) {
      return false;
    }
    
    // Release resources
    if (this.config.enableResourceManagement) {
      this.releaseResources(executionId);
    }
    
    // Remove from dependency graph
    if (this.config.enableDependencyResolution) {
      this.removeFromDependencyGraph(executionId);
    }
    
    this.scheduledExecutions.delete(executionId);
    return true;
  }

  /**
   * Remove from dependency graph
   * @param {string} executionId - Execution ID
   * @private
   */
  removeFromDependencyGraph(executionId) {
    // Remove node from graph
    this.dependencyGraph.delete(executionId);
    
    // Remove edges pointing to this node
    for (const [node, edges] of this.dependencyGraph.entries()) {
      edges.delete(executionId);
    }
  }

  /**
   * Mark execution as completed
   * @param {string} executionId - Execution ID
   * @param {Object} result - Execution result
   */
  markCompleted(executionId, result) {
    const scheduledExecution = this.scheduledExecutions.get(executionId);
    if (!scheduledExecution) {
      return;
    }
    
    scheduledExecution.status = 'completed';
    scheduledExecution.completedAt = new Date();
    scheduledExecution.result = result;
    
    // Release resources
    if (this.config.enableResourceManagement) {
      this.releaseResources(executionId);
    }
    
    this.stats.totalExecuted++;
  }

  /**
   * Mark execution as failed
   * @param {string} executionId - Execution ID
   * @param {Error} error - Execution error
   */
  markFailed(executionId, error) {
    const scheduledExecution = this.scheduledExecutions.get(executionId);
    if (!scheduledExecution) {
      return;
    }
    
    scheduledExecution.status = 'failed';
    scheduledExecution.failedAt = new Date();
    scheduledExecution.error = error;
    
    // Release resources
    if (this.config.enableResourceManagement) {
      this.releaseResources(executionId);
    }
    
    this.stats.totalFailed++;
  }

  /**
   * Cancel execution
   * @param {string} executionId - Execution ID
   * @returns {boolean} True if cancelled
   */
  cancelExecution(executionId) {
    const scheduledExecution = this.scheduledExecutions.get(executionId);
    if (!scheduledExecution) {
      return false;
    }
    
    scheduledExecution.status = 'cancelled';
    scheduledExecution.cancelledAt = new Date();
    
    // Release resources
    if (this.config.enableResourceManagement) {
      this.releaseResources(executionId);
    }
    
    this.stats.totalCancelled++;
    return true;
  }

  /**
   * Get scheduler statistics
   * @returns {Object} Scheduler statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      scheduledExecutions: this.scheduledExecutions.size,
      resourcePool: this.getResourcePoolStatus(),
      dependencyGraphSize: this.dependencyGraph.size
    };
  }

  /**
   * Get resource pool status
   * @returns {Object} Resource pool status
   */
  getResourcePoolStatus() {
    const status = {};
    
    for (const [resource, pool] of this.resourcePool.entries()) {
      status[resource] = {
        total: pool.total,
        available: pool.available,
        reserved: pool.reserved,
        utilization: ((pool.total - pool.available) / pool.total) * 100,
        unit: pool.unit
      };
    }
    
    return status;
  }

  /**
   * Update average scheduling time
   * @param {number} schedulingTime - Scheduling time
   * @private
   */
  updateAverageSchedulingTime(schedulingTime) {
    const totalScheduled = this.stats.totalScheduled;
    const currentAverage = this.stats.averageSchedulingTime;
    
    this.stats.averageSchedulingTime = (currentAverage * (totalScheduled - 1) + schedulingTime) / totalScheduled;
  }

  /**
   * Get ready executions
   * @returns {Array} Ready executions
   */
  getReadyExecutions() {
    const readyExecutions = [];
    
    for (const [id, scheduledExecution] of this.scheduledExecutions.entries()) {
      if (scheduledExecution.status === 'scheduled') {
        // Check if dependencies are satisfied
        if (this.config.enableDependencyResolution) {
          const dependencyCheck = this.checkDependencies(scheduledExecution.dependencies);
          if (!dependencyCheck.satisfied) {
            continue;
          }
        }
        
        // Check if resources are available
        if (this.config.enableResourceManagement) {
          const resourceCheck = this.checkResourceAvailability(scheduledExecution.resourceRequirements);
          if (!resourceCheck.available) {
            continue;
          }
        }
        
        readyExecutions.push(scheduledExecution);
      }
    }
    
    // Sort by priority (highest first)
    if (this.config.enablePriorityScheduling) {
      readyExecutions.sort((a, b) => b.priority - a.priority);
    }
    
    return readyExecutions;
  }

  /**
   * Get scheduler configuration
   * @returns {Object} Scheduler configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Update scheduler configuration
   * @param {Object} config - New configuration
   */
  updateConfiguration(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      scheduledExecutions: this.scheduledExecutions.size,
      config: this.config,
      stats: this.stats,
      resourcePool: this.getResourcePoolStatus()
    };
  }
}

module.exports = ExecutionScheduler; 