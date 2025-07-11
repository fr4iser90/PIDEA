/**
 * ResourceAllocator - Resource allocation for workflow execution
 * Provides intelligent resource allocation and management
 */
const { EventEmitter } = require('events');

/**
 * Resource allocator for workflow execution
 */
class ResourceAllocator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.enableAllocation = options.enableAllocation !== false;
    this.maxMemoryUsage = options.maxMemoryUsage || 1024; // MB
    this.maxCpuUsage = options.maxCpuUsage || 80; // Percentage
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 10;
    this.allocationTimeout = options.allocationTimeout || 30000; // 30 seconds
    this.enablePredictiveAllocation = options.enablePredictiveAllocation !== false;
    
    // Resource pools
    this.availableResources = {
      memory: this.maxMemoryUsage,
      cpu: this.maxCpuUsage,
      concurrent: this.maxConcurrentExecutions
    };
    
    this.allocatedResources = new Map();
    this.allocationQueue = [];
    this.allocationHistory = new Map();
    
    // Allocation strategies
    this.allocationStrategies = new Map();
    this.initializeAllocationStrategies();
    
    // Predictive allocation
    this.predictionModel = null;
    if (this.enablePredictiveAllocation) {
      this.initializePredictionModel();
    }
    
    this.logger = options.logger || console;
  }

  /**
   * Initialize allocation strategies
   */
  initializeAllocationStrategies() {
    // First-come-first-served strategy
    this.allocationStrategies.set('fifo', {
      name: 'First In First Out',
      description: 'Allocate resources in order of request',
      allocate: (requirements, available) => this.allocateFIFO(requirements, available)
    });

    // Priority-based strategy
    this.allocationStrategies.set('priority', {
      name: 'Priority Based',
      description: 'Allocate resources based on priority',
      allocate: (requirements, available) => this.allocatePriority(requirements, available)
    });

    // Fair-share strategy
    this.allocationStrategies.set('fair_share', {
      name: 'Fair Share',
      description: 'Allocate resources fairly among requests',
      allocate: (requirements, available) => this.allocateFairShare(requirements, available)
    });

    // Predictive strategy
    this.allocationStrategies.set('predictive', {
      name: 'Predictive',
      description: 'Use predictive allocation based on historical data',
      allocate: (requirements, available) => this.allocatePredictive(requirements, available)
    });
  }

  /**
   * Initialize prediction model
   */
  initializePredictionModel() {
    this.predictionModel = {
      historicalData: new Map(),
      patterns: new Map(),
      accuracy: 0.8
    };
  }

  /**
   * Request resource allocation
   * @param {string} executionId - Execution ID
   * @param {Object} requirements - Resource requirements
   * @param {Object} options - Allocation options
   * @returns {Promise<Object>} Allocation result
   */
  async requestAllocation(executionId, requirements = {}, options = {}) {
    if (!this.enableAllocation) {
      return this.getDefaultAllocation(executionId, requirements);
    }

    try {
      this.logger.info('ResourceAllocator: Requesting allocation', {
        executionId,
        requirements
      });

      // Validate requirements
      const validatedRequirements = this.validateRequirements(requirements);
      
      // Check if resources are immediately available
      const immediateAllocation = await this.checkImmediateAvailability(validatedRequirements);
      
      if (immediateAllocation.available) {
        return await this.allocateResources(executionId, validatedRequirements, options);
      }

      // Add to allocation queue
      const queueItem = {
        executionId,
        requirements: validatedRequirements,
        options,
        timestamp: Date.now(),
        priority: options.priority || 'normal'
      };

      this.allocationQueue.push(queueItem);
      this.sortAllocationQueue();

      // Wait for allocation
      return await this.waitForAllocation(executionId, queueItem);

    } catch (error) {
      this.logger.error('ResourceAllocator: Allocation request failed', {
        executionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Allocate resources
   * @param {string} executionId - Execution ID
   * @param {Object} requirements - Resource requirements
   * @param {Object} options - Allocation options
   * @returns {Promise<Object>} Allocation result
   */
  async allocateResources(executionId, requirements, options = {}) {
    const strategy = options.strategy || 'fifo';
    const allocationStrategy = this.allocationStrategies.get(strategy);
    
    if (!allocationStrategy) {
      throw new Error(`Unknown allocation strategy: ${strategy}`);
    }

    // Get current available resources
    const available = this.getAvailableResources();
    
    // Attempt allocation
    const allocation = await allocationStrategy.allocate(requirements, available);
    
    if (allocation.success) {
      // Update resource pools
      this.updateResourcePools(allocation.allocated);
      
      // Track allocation
      this.allocatedResources.set(executionId, {
        ...allocation.allocated,
        executionId,
        allocatedAt: new Date(),
        strategy: strategy
      });

      // Store in history
      this.allocationHistory.set(executionId, {
        requirements,
        allocated: allocation.allocated,
        strategy: strategy,
        timestamp: Date.now()
      });

      this.logger.info('ResourceAllocator: Resources allocated', {
        executionId,
        allocated: allocation.allocated,
        strategy: strategy
      });

      this.emit('resourcesAllocated', { executionId, allocation: allocation.allocated });
      
      return allocation.allocated;
    } else {
      throw new Error(`Resource allocation failed: ${allocation.reason}`);
    }
  }

  /**
   * Release resources
   * @param {string} executionId - Execution ID
   * @returns {Promise<boolean>} True if released successfully
   */
  async releaseResources(executionId) {
    try {
      this.logger.info('ResourceAllocator: Releasing resources', {
        executionId
      });

      const allocation = this.allocatedResources.get(executionId);
      if (!allocation) {
        this.logger.warn('ResourceAllocator: No allocation found for release', {
          executionId
        });
        return false;
      }

      // Return resources to pools
      this.returnResourcesToPools(allocation);
      
      // Remove from tracking
      this.allocatedResources.delete(executionId);
      
      // Update history
      const history = this.allocationHistory.get(executionId);
      if (history) {
        history.releasedAt = new Date();
        history.duration = Date.now() - history.timestamp;
      }

      // Process queue
      await this.processAllocationQueue();

      this.logger.info('ResourceAllocator: Resources released', {
        executionId,
        duration: history ? history.duration : 0
      });

      this.emit('resourcesReleased', { executionId, allocation });
      
      return true;

    } catch (error) {
      this.logger.error('ResourceAllocator: Resource release failed', {
        executionId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Allocate using FIFO strategy
   * @param {Object} requirements - Resource requirements
   * @param {Object} available - Available resources
   * @returns {Promise<Object>} Allocation result
   */
  async allocateFIFO(requirements, available) {
    // Check if resources are sufficient
    if (requirements.memory > available.memory ||
        requirements.cpu > available.cpu ||
        requirements.concurrent > available.concurrent) {
      return {
        success: false,
        reason: 'Insufficient resources for FIFO allocation'
      };
    }

    return {
      success: true,
      allocated: {
        memory: requirements.memory,
        cpu: requirements.cpu,
        concurrent: requirements.concurrent
      }
    };
  }

  /**
   * Allocate using priority strategy
   * @param {Object} requirements - Resource requirements
   * @param {Object} available - Available resources
   * @returns {Promise<Object>} Allocation result
   */
  async allocatePriority(requirements, available) {
    // Priority allocation gives higher priority requests more resources
    const priorityMultiplier = requirements.priority === 'high' ? 1.5 : 1.0;
    
    const adjustedRequirements = {
      memory: Math.ceil(requirements.memory * priorityMultiplier),
      cpu: Math.ceil(requirements.cpu * priorityMultiplier),
      concurrent: requirements.concurrent
    };

    if (adjustedRequirements.memory > available.memory ||
        adjustedRequirements.cpu > available.cpu ||
        adjustedRequirements.concurrent > available.concurrent) {
      return {
        success: false,
        reason: 'Insufficient resources for priority allocation'
      };
    }

    return {
      success: true,
      allocated: adjustedRequirements
    };
  }

  /**
   * Allocate using fair share strategy
   * @param {Object} requirements - Resource requirements
   * @param {Object} available - Available resources
   * @returns {Promise<Object>} Allocation result
   */
  async allocateFairShare(requirements, available) {
    const activeAllocations = this.allocatedResources.size;
    const fairShare = {
      memory: Math.floor(available.memory / (activeAllocations + 1)),
      cpu: Math.floor(available.cpu / (activeAllocations + 1)),
      concurrent: 1
    };

    // Ensure minimum requirements are met
    const allocated = {
      memory: Math.max(requirements.memory, fairShare.memory),
      cpu: Math.max(requirements.cpu, fairShare.cpu),
      concurrent: requirements.concurrent
    };

    if (allocated.memory > available.memory ||
        allocated.cpu > available.cpu ||
        allocated.concurrent > available.concurrent) {
      return {
        success: false,
        reason: 'Insufficient resources for fair share allocation'
      };
    }

    return {
      success: true,
      allocated
    };
  }

  /**
   * Allocate using predictive strategy
   * @param {Object} requirements - Resource requirements
   * @param {Object} available - Available resources
   * @returns {Promise<Object>} Allocation result
   */
  async allocatePredictive(requirements, available) {
    if (!this.predictionModel) {
      return this.allocateFIFO(requirements, available);
    }

    // Predict optimal allocation based on historical data
    const predictedAllocation = this.predictOptimalAllocation(requirements);
    
    const allocated = {
      memory: Math.min(predictedAllocation.memory, available.memory),
      cpu: Math.min(predictedAllocation.cpu, available.cpu),
      concurrent: Math.min(predictedAllocation.concurrent, available.concurrent)
    };

    if (allocated.memory < requirements.memory ||
        allocated.cpu < requirements.cpu ||
        allocated.concurrent < requirements.concurrent) {
      return {
        success: false,
        reason: 'Insufficient resources for predictive allocation'
      };
    }

    return {
      success: true,
      allocated
    };
  }

  /**
   * Predict optimal allocation
   * @param {Object} requirements - Resource requirements
   * @returns {Object} Predicted allocation
   */
  predictOptimalAllocation(requirements) {
    // Simple prediction based on historical patterns
    const patterns = Array.from(this.predictionModel.patterns.values());
    
    if (patterns.length === 0) {
      return requirements;
    }

    // Find similar patterns
    const similarPatterns = patterns.filter(pattern => 
      Math.abs(pattern.requirements.memory - requirements.memory) < 100 &&
      Math.abs(pattern.requirements.cpu - requirements.cpu) < 10
    );

    if (similarPatterns.length === 0) {
      return requirements;
    }

    // Calculate average optimal allocation
    const avgAllocation = {
      memory: 0,
      cpu: 0,
      concurrent: 0
    };

    for (const pattern of similarPatterns) {
      avgAllocation.memory += pattern.optimalAllocation.memory;
      avgAllocation.cpu += pattern.optimalAllocation.cpu;
      avgAllocation.concurrent += pattern.optimalAllocation.concurrent;
    }

    avgAllocation.memory = Math.round(avgAllocation.memory / similarPatterns.length);
    avgAllocation.cpu = Math.round(avgAllocation.cpu / similarPatterns.length);
    avgAllocation.concurrent = Math.round(avgAllocation.concurrent / similarPatterns.length);

    return avgAllocation;
  }

  /**
   * Validate requirements
   * @param {Object} requirements - Resource requirements
   * @returns {Object} Validated requirements
   */
  validateRequirements(requirements) {
    const validated = {
      memory: Math.max(32, Math.min(requirements.memory || 64, this.maxMemoryUsage)),
      cpu: Math.max(1, Math.min(requirements.cpu || 10, this.maxCpuUsage)),
      concurrent: Math.max(1, Math.min(requirements.concurrent || 1, this.maxConcurrentExecutions)),
      priority: requirements.priority || 'normal',
      timeout: requirements.timeout || this.allocationTimeout
    };

    return validated;
  }

  /**
   * Check immediate availability
   * @param {Object} requirements - Resource requirements
   * @returns {Object} Availability status
   */
  async checkImmediateAvailability(requirements) {
    const availableResources = this.getAvailableResources();
    
    const availability = {
      available: requirements.memory <= availableResources.memory &&
                 requirements.cpu <= availableResources.cpu &&
                 requirements.concurrent <= availableResources.concurrent,
      reason: null
    };

    if (!availability.available) {
      availability.reason = 'Insufficient resources for immediate allocation';
    }

    return availability;
  }

  /**
   * Wait for allocation
   * @param {string} executionId - Execution ID
   * @param {Object} queueItem - Queue item
   * @returns {Promise<Object>} Allocation result
   */
  async waitForAllocation(executionId, queueItem) {
    const startTime = Date.now();
    const timeout = queueItem.requirements.timeout;

    while (Date.now() - startTime < timeout) {
      // Check if we can allocate now
      const available = await this.checkImmediateAvailability(queueItem.requirements);
      
      if (available.available) {
        // Remove from queue
        this.removeFromQueue(executionId);
        
        // Allocate resources
        return await this.allocateResources(executionId, queueItem.requirements, queueItem.options);
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Timeout reached
    this.removeFromQueue(executionId);
    throw new Error(`Resource allocation timeout after ${timeout}ms`);
  }

  /**
   * Process allocation queue
   */
  async processAllocationQueue() {
    if (this.allocationQueue.length === 0) {
      return;
    }

    const availableResources = this.getAvailableResources();
    const processedItems = [];

    for (const item of this.allocationQueue) {
      const availability = await this.checkImmediateAvailability(item.requirements);
      
      if (availability.available) {
        try {
          await this.allocateResources(item.executionId, item.requirements, item.options);
          processedItems.push(item.executionId);
        } catch (error) {
          this.logger.warn('ResourceAllocator: Failed to process queued allocation', {
            executionId: item.executionId,
            error: error.message
          });
        }
      }
    }

    // Remove processed items from queue
    for (const executionId of processedItems) {
      this.removeFromQueue(executionId);
    }
  }

  /**
   * Remove from queue
   * @param {string} executionId - Execution ID
   */
  removeFromQueue(executionId) {
    const index = this.allocationQueue.findIndex(item => item.executionId === executionId);
    if (index !== -1) {
      this.allocationQueue.splice(index, 1);
    }
  }

  /**
   * Sort allocation queue
   */
  sortAllocationQueue() {
    const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
    
    this.allocationQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.timestamp - b.timestamp; // FIFO within same priority
    });
  }

  /**
   * Get available resources
   * @returns {Object} Available resources
   */
  getAvailableResources() {
    let totalAllocatedMemory = 0;
    let totalAllocatedCpu = 0;
    let totalAllocatedConcurrent = 0;

    for (const allocation of this.allocatedResources.values()) {
      totalAllocatedMemory += allocation.memory;
      totalAllocatedCpu += allocation.cpu;
      totalAllocatedConcurrent += allocation.concurrent;
    }

    return {
      memory: Math.max(0, this.availableResources.memory - totalAllocatedMemory),
      cpu: Math.max(0, this.availableResources.cpu - totalAllocatedCpu),
      concurrent: Math.max(0, this.availableResources.concurrent - totalAllocatedConcurrent)
    };
  }

  /**
   * Update resource pools
   * @param {Object} allocation - Allocation
   */
  updateResourcePools(allocation) {
    // This is handled by getAvailableResources() which calculates dynamically
  }

  /**
   * Return resources to pools
   * @param {Object} allocation - Allocation
   */
  returnResourcesToPools(allocation) {
    // This is handled by getAvailableResources() which calculates dynamically
  }

  /**
   * Get default allocation
   * @param {string} executionId - Execution ID
   * @param {Object} requirements - Requirements
   * @returns {Object} Default allocation
   */
  getDefaultAllocation(executionId, requirements) {
    return {
      memory: requirements.memory || 64,
      cpu: requirements.cpu || 10,
      concurrent: requirements.concurrent || 1,
      executionId,
      allocatedAt: new Date(),
      strategy: 'default'
    };
  }

  /**
   * Learn from allocation
   * @param {string} executionId - Execution ID
   * @param {Object} result - Execution result
   */
  async learnFromAllocation(executionId, result) {
    if (!this.predictionModel) return;

    const history = this.allocationHistory.get(executionId);
    if (!history) return;

    // Calculate optimal allocation based on execution result
    const optimalAllocation = this.calculateOptimalAllocation(history.allocated, result);
    
    // Store pattern
    const patternKey = `${history.requirements.memory}_${history.requirements.cpu}`;
    this.predictionModel.patterns.set(patternKey, {
      requirements: history.requirements,
      allocated: history.allocated,
      optimalAllocation,
      timestamp: Date.now()
    });

    // Clean up old patterns
    if (this.predictionModel.patterns.size > 1000) {
      const entries = Array.from(this.predictionModel.patterns.entries());
      const toDelete = entries.slice(0, entries.length - 1000);
      for (const [key] of toDelete) {
        this.predictionModel.patterns.delete(key);
      }
    }
  }

  /**
   * Calculate optimal allocation
   * @param {Object} allocated - Allocated resources
   * @param {Object} result - Execution result
   * @returns {Object} Optimal allocation
   */
  calculateOptimalAllocation(allocated, result) {
    // Simple optimization based on execution success and performance
    const success = result.success !== false;
    const duration = result.duration || 0;
    
    if (success && duration < 30000) {
      // Execution was fast, could use fewer resources
      return {
        memory: Math.max(32, Math.floor(allocated.memory * 0.8)),
        cpu: Math.max(5, Math.floor(allocated.cpu * 0.8)),
        concurrent: allocated.concurrent
      };
    } else if (!success || duration > 300000) {
      // Execution failed or was slow, might need more resources
      return {
        memory: Math.min(1024, Math.ceil(allocated.memory * 1.2)),
        cpu: Math.min(80, Math.ceil(allocated.cpu * 1.2)),
        concurrent: allocated.concurrent
      };
    }
    
    return allocated;
  }

  /**
   * Get allocation statistics
   * @returns {Object} Allocation statistics
   */
  getAllocationStatistics() {
    const available = this.getAvailableResources();
    const totalAllocated = this.allocatedResources.size;
    const queueLength = this.allocationQueue.length;
    
    return {
      available,
      totalAllocated,
      queueLength,
      utilization: {
        memory: ((this.maxMemoryUsage - available.memory) / this.maxMemoryUsage) * 100,
        cpu: ((this.maxCpuUsage - available.cpu) / this.maxCpuUsage) * 100,
        concurrent: ((this.maxConcurrentExecutions - available.concurrent) / this.maxConcurrentExecutions) * 100
      },
      strategies: Array.from(this.allocationStrategies.keys()),
      predictiveEnabled: this.enablePredictiveAllocation,
      enabled: this.enableAllocation
    };
  }

  /**
   * Get allocation by execution ID
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Allocation
   */
  getAllocation(executionId) {
    return this.allocatedResources.get(executionId) || null;
  }

  /**
   * Get allocation history
   * @param {string} executionId - Execution ID
   * @returns {Object|null} History
   */
  getAllocationHistory(executionId) {
    return this.allocationHistory.get(executionId) || null;
  }

  /**
   * Clear allocation history
   */
  clearHistory() {
    this.allocationHistory.clear();
    this.logger.info('ResourceAllocator: History cleared');
  }

  /**
   * Shutdown allocator
   */
  async shutdown() {
    this.logger.info('ResourceAllocator: Shutting down');
    
    // Release all allocated resources
    const executionIds = Array.from(this.allocatedResources.keys());
    for (const executionId of executionIds) {
      await this.releaseResources(executionId);
    }
    
    // Clear queue
    this.allocationQueue = [];
    
    // Clear history
    this.clearHistory();
    
    this.logger.info('ResourceAllocator: Shutdown complete');
  }
}

module.exports = ResourceAllocator; 