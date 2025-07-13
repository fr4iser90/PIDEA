/**
 * ResourceManager - Resource allocation and monitoring for workflow execution
 * Provides resource management with allocation, monitoring, and limits
 */
const os = require('os');
const { logger } = require('@infrastructure/logging/Logger');

/**
 * Resource manager for workflow execution
 */
class ResourceManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
    
    this.maxMemoryUsage = options.maxMemoryUsage || 512; // MB
    this.maxCpuUsage = options.maxCpuUsage || 80; // Percentage
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 5;
    this.resourceTimeout = options.resourceTimeout || 300000; // 5 minutes
    this.enableResourceMonitoring = options.enableResourceMonitoring !== false;
    this.enableResourceLimits = options.enableResourceLimits !== false;
    
    // Resource tracking
    this.allocatedResources = new Map();
    this.resourceUsage = new Map();
    this.resourceLimits = new Map();
    this.resourceHistory = new Map();
    
    // Initialize resource limits
    this.initializeResourceLimits();
    
    // Monitoring interval
    this.monitoringInterval = null;
    this.monitoringIntervalMs = options.monitoringIntervalMs || 5000; // 5 seconds
    
    // Start monitoring if enabled
    if (this.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }
  }

  /**
   * Initialize resource limits
   */
  initializeResourceLimits() {
    this.resourceLimits.set('memory', this.maxMemoryUsage);
    this.resourceLimits.set('cpu', this.maxCpuUsage);
    this.resourceLimits.set('concurrent', this.maxConcurrentExecutions);
    this.resourceLimits.set('timeout', this.resourceTimeout);
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
        allocatedAt: new Date(),
        requirements
      };

      // Track allocation
      this.allocatedResources.set(executionId, allocatedResources);
      this.resourceUsage.set(executionId, {
        memory: 0,
        cpu: 0,
        startTime: Date.now(),
        lastUpdate: Date.now()
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

      // Get allocation before removal
      const allocation = this.allocatedResources.get(executionId);
      const usage = this.resourceUsage.get(executionId);

      // Remove from tracking
      const wasAllocated = this.allocatedResources.has(executionId);
      this.allocatedResources.delete(executionId);
      this.resourceUsage.delete(executionId);

      // Store in history
      if (allocation && usage) {
        this.resourceHistory.set(executionId, {
          allocation,
          usage,
          releasedAt: new Date(),
          duration: Date.now() - usage.startTime
        });
      }

      this.logger.info('ResourceManager: Resources released', {
        executionId,
        wasAllocated,
        duration: usage ? Date.now() - usage.startTime : 0
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
      limits,
      estimatedWaitTime: this.estimateWaitTime(requirements)
    };
  }

  /**
   * Estimate wait time for resources
   * @param {Object} requirements - Resource requirements
   * @returns {number} Estimated wait time in milliseconds
   */
  estimateWaitTime(requirements) {
    // Simple estimation based on current usage and history
    const currentUsage = this.getCurrentResourceUsage();
    const limits = this.getResourceLimits();
    
    // Calculate resource pressure
    const memoryPressure = currentUsage.memory / limits.memory;
    const cpuPressure = currentUsage.cpu / limits.cpu;
    const concurrentPressure = currentUsage.concurrent / limits.concurrent;
    
    const maxPressure = Math.max(memoryPressure, cpuPressure, concurrentPressure);
    
    // Estimate wait time based on pressure
    if (maxPressure < 0.5) {
      return 0; // No wait
    } else if (maxPressure < 0.8) {
      return 5000; // 5 seconds
    } else if (maxPressure < 0.95) {
      return 30000; // 30 seconds
    } else {
      return 120000; // 2 minutes
    }
  }

  /**
   * Get current resource usage
   * @returns {Object} Current resource usage
   */
  getCurrentResourceUsage() {
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
   * Get system resource usage
   * @returns {Promise<Object>} System resource usage
   */
  async getSystemResourceUsage() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      // Get CPU usage (simplified)
      const cpus = os.cpus();
      const cpuUsage = this.calculateCpuUsage(cpus);
      
      return {
        totalMemory: Math.round(totalMemory / 1024 / 1024), // MB
        usedMemory: Math.round(usedMemory / 1024 / 1024), // MB
        freeMemory: Math.round(freeMemory / 1024 / 1024), // MB
        memoryUsage: Math.round((usedMemory / totalMemory) * 100), // Percentage
        cpuUsage: Math.round(cpuUsage * 100), // Percentage
        loadAverage: os.loadavg(),
        uptime: os.uptime()
      };
    } catch (error) {
      this.logger.error('ResourceManager: Failed to get system resource usage', {
        error: error.message
      });
      return {
        totalMemory: 0,
        usedMemory: 0,
        freeMemory: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        loadAverage: [0, 0, 0],
        uptime: 0
      };
    }
  }

  /**
   * Calculate CPU usage
   * @param {Array} cpus - CPU information
   * @returns {number} CPU usage percentage
   */
  calculateCpuUsage(cpus) {
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return 1 - (totalIdle / totalTick);
  }

  /**
   * Get resource limits
   * @returns {Object} Resource limits
   */
  getResourceLimits() {
    return {
      memory: this.resourceLimits.get('memory'),
      cpu: this.resourceLimits.get('cpu'),
      concurrent: this.resourceLimits.get('concurrent'),
      timeout: this.resourceLimits.get('timeout')
    };
  }

  /**
   * Get resource utilization
   * @returns {Promise<Object>} Resource utilization
   */
  async getResourceUtilization() {
    const currentUsage = await this.getCurrentResourceUsage();
    const limits = this.getResourceLimits();
    const systemUsage = await this.getSystemResourceUsage();

    return {
      allocated: {
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
      },
      system: systemUsage,
      efficiency: this.calculateEfficiency(currentUsage, systemUsage)
    };
  }

  /**
   * Calculate resource efficiency
   * @param {Object} allocatedUsage - Allocated usage
   * @param {Object} systemUsage - System usage
   * @returns {Object} Efficiency metrics
   */
  calculateEfficiency(allocatedUsage, systemUsage) {
    const memoryEfficiency = systemUsage.totalMemory > 0 ? 
      (allocatedUsage.memory / systemUsage.totalMemory) * 100 : 0;
    
    const cpuEfficiency = systemUsage.cpuUsage > 0 ? 
      (allocatedUsage.cpu / systemUsage.cpuUsage) * 100 : 0;
    
    return {
      memoryEfficiency: Math.round(memoryEfficiency),
      cpuEfficiency: Math.round(cpuEfficiency),
      overallEfficiency: Math.round((memoryEfficiency + cpuEfficiency) / 2)
    };
  }

  /**
   * Update resource usage
   * @param {string} executionId - Execution ID
   * @param {Object} usage - Current usage
   */
  updateResourceUsage(executionId, usage) {
    if (this.resourceUsage.has(executionId)) {
      const currentUsage = this.resourceUsage.get(executionId);
      this.resourceUsage.set(executionId, {
        ...currentUsage,
        ...usage,
        lastUpdate: Date.now()
      });
    }
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorResources();
      } catch (error) {
        this.logger.error('ResourceManager: Resource monitoring failed', {
          error: error.message
        });
      }
    }, this.monitoringIntervalMs);

    this.logger.info('ResourceManager: Resource monitoring started', {
      interval: this.monitoringIntervalMs
    });
  }

  /**
   * Stop resource monitoring
   */
  stopResourceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('ResourceManager: Resource monitoring stopped');
    }
  }

  /**
   * Monitor resources
   */
  async monitorResources() {
    const utilization = await this.getResourceUtilization();
    
    // Check for resource violations
    const violations = this.checkResourceViolations(utilization);
    
    if (violations.length > 0) {
      this.logger.warn('ResourceManager: Resource violations detected', {
        violations
      });
      
      // Take corrective actions
      await this.handleResourceViolations(violations);
    }

    // Log resource usage periodically
    // this.logger.debug('ResourceManager: Resource monitoring', {
    //   utilization: {
    //     memory: utilization.allocated.memory.percentage,
    //     cpu: utilization.allocated.cpu.percentage,
    //     concurrent: utilization.allocated.concurrent.percentage
    //   }
    // });
  }

  /**
   * Check resource violations
   * @param {Object} utilization - Resource utilization
   * @returns {Array} Violations
   */
  checkResourceViolations(utilization) {
    const violations = [];
    
    // Check memory usage
    if (utilization.allocated.memory.percentage > 90) {
      violations.push({
        type: 'memory',
        severity: 'high',
        message: `Memory usage is ${utilization.allocated.memory.percentage.toFixed(1)}%`
      });
    }
    
    // Check CPU usage
    if (utilization.allocated.cpu.percentage > 90) {
      violations.push({
        type: 'cpu',
        severity: 'high',
        message: `CPU usage is ${utilization.allocated.cpu.percentage.toFixed(1)}%`
      });
    }
    
    // Check concurrent executions
    if (utilization.allocated.concurrent.percentage > 95) {
      violations.push({
        type: 'concurrent',
        severity: 'medium',
        message: `Concurrent executions at ${utilization.allocated.concurrent.percentage.toFixed(1)}%`
      });
    }
    
    return violations;
  }

  /**
   * Handle resource violations
   * @param {Array} violations - Resource violations
   */
  async handleResourceViolations(violations) {
    for (const violation of violations) {
      switch (violation.type) {
        case 'memory':
          await this.handleMemoryViolation(violation);
          break;
        case 'cpu':
          await this.handleCpuViolation(violation);
          break;
        case 'concurrent':
          await this.handleConcurrentViolation(violation);
          break;
      }
    }
  }

  /**
   * Handle memory violation
   * @param {Object} violation - Memory violation
   */
  async handleMemoryViolation(violation) {
    // Find executions with highest memory usage
    const executions = Array.from(this.allocatedResources.entries())
      .sort(([, a], [, b]) => b.memory - a.memory);
    
    if (executions.length > 0) {
      const [executionId] = executions[0];
      this.logger.warn('ResourceManager: High memory usage detected', {
        executionId,
        violation: violation.message
      });
    }
  }

  /**
   * Handle CPU violation
   * @param {Object} violation - CPU violation
   */
  async handleCpuViolation(violation) {
    // Find executions with highest CPU usage
    const executions = Array.from(this.allocatedResources.entries())
      .sort(([, a], [, b]) => b.cpu - a.cpu);
    
    if (executions.length > 0) {
      const [executionId] = executions[0];
      this.logger.warn('ResourceManager: High CPU usage detected', {
        executionId,
        violation: violation.message
      });
    }
  }

  /**
   * Handle concurrent violation
   * @param {Object} violation - Concurrent violation
   */
  async handleConcurrentViolation(violation) {
    this.logger.warn('ResourceManager: High concurrent execution count', {
      violation: violation.message,
      currentExecutions: this.allocatedResources.size
    });
  }

  /**
   * Get resource statistics
   * @returns {Promise<Object>} Resource statistics
   */
  async getResourceStatistics() {
    const utilization = await this.getResourceUtilization();
    const allocations = Array.from(this.allocatedResources.values());
    const history = Array.from(this.resourceHistory.values());

    return {
      utilization,
      allocations: {
        current: allocations.length,
        total: history.length + allocations.length
      },
      averageMemory: allocations.length > 0 ? 
        allocations.reduce((sum, a) => sum + a.memory, 0) / allocations.length : 0,
      averageCpu: allocations.length > 0 ? 
        allocations.reduce((sum, a) => sum + a.cpu, 0) / allocations.length : 0,
      averageDuration: history.length > 0 ? 
        history.reduce((sum, h) => sum + h.duration, 0) / history.length : 0,
      limits: this.getResourceLimits(),
      monitoring: {
        enabled: this.enableResourceMonitoring,
        interval: this.monitoringIntervalMs
      }
    };
  }

  /**
   * Update resource limits
   * @param {Object} newLimits - New resource limits
   */
  updateResourceLimits(newLimits) {
    for (const [key, value] of Object.entries(newLimits)) {
      if (this.resourceLimits.has(key)) {
        this.resourceLimits.set(key, value);
      }
    }

    this.logger.info('ResourceManager: Resource limits updated', newLimits);
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
   * Get usage by execution ID
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Usage
   */
  getUsage(executionId) {
    return this.resourceUsage.get(executionId) || null;
  }

  /**
   * Get history by execution ID
   * @param {string} executionId - Execution ID
   * @returns {Object|null} History
   */
  getHistory(executionId) {
    return this.resourceHistory.get(executionId) || null;
  }

  /**
   * Clear resource history
   */
  clearHistory() {
    this.resourceHistory.clear();
    this.logger.info('ResourceManager: Resource history cleared');
  }

  /**
   * Shutdown resource manager
   */
  async shutdown() {
    this.logger.info('ResourceManager: Shutting down');
    
    // Stop monitoring
    this.stopResourceMonitoring();
    
    // Release all allocated resources
    const executionIds = Array.from(this.allocatedResources.keys());
    for (const executionId of executionIds) {
      await this.releaseResources(executionId);
    }
    
    this.logger.info('ResourceManager: Shutdown complete');
  }
}

module.exports = ResourceManager; 