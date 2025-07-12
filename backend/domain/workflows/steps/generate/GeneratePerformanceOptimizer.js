/**
 * GeneratePerformanceOptimizer - Performance optimization for generate operations
 * 
 * This optimizer provides performance optimization strategies for generate operations
 * including caching, parallel processing, resource management, and performance monitoring.
 * It ensures optimal performance while maintaining system stability.
 */
const EventBus = require('../../../../infrastructure/messaging/EventBus');

/**
 * Generate performance optimizer
 */
class GeneratePerformanceOptimizer {
  /**
   * Create a new generate performance optimizer
   * @param {Object} options - Optimizer options
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.logger = options.logger || console;
    this.cache = new Map();
    this.performanceMetrics = new Map();
    this.options = {
      enableCaching: options.enableCaching !== false,
      enableParallelProcessing: options.enableParallelProcessing !== false,
      enableResourceManagement: options.enableResourceManagement !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      cacheSize: options.cacheSize || 100,
      cacheTTL: options.cacheTTL || 8 * 60 * 60 * 1000, // 8 hours
      maxConcurrentOperations: options.maxConcurrentOperations || 10,
      maxMemoryUsage: options.maxMemoryUsage || 1024 * 1024 * 1024, // 1GB
      performanceThreshold: options.performanceThreshold || 300000, // 5 minutes
      ...options
    };

    // Initialize performance monitoring
    if (this.options.enablePerformanceMonitoring) {
      this.initializePerformanceMonitoring();
    }
  }

  /**
   * Optimize script generation performance
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @param {Function} generationFunction - Generation function to optimize
   * @returns {Promise<Object>} Optimized result
   */
  async optimizeScriptGeneration(context, options, generationFunction) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('script', context, options);

    try {
      // Check cache first
      if (this.options.enableCaching) {
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
          this.logger.info('GeneratePerformanceOptimizer: Using cached script generation result');
          return cachedResult;
        }
      }

      // Check resource availability
      if (this.options.enableResourceManagement) {
        await this.checkResourceAvailability();
      }

      // Execute generation with performance monitoring
      const result = await this.executeWithPerformanceMonitoring(
        'script',
        () => generationFunction(context, options),
        context,
        options
      );

      // Cache result
      if (this.options.enableCaching && result.success) {
        this.cacheResult(cacheKey, result);
      }

      // Update performance metrics
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics('script', duration, result.success);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics('script', duration, false);
      throw error;
    }
  }

  /**
   * Optimize scripts generation performance
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @param {Function} generationFunction - Generation function to optimize
   * @returns {Promise<Object>} Optimized result
   */
  async optimizeScriptsGeneration(context, options, generationFunction) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('scripts', context, options);

    try {
      // Check cache first
      if (this.options.enableCaching) {
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
          this.logger.info('GeneratePerformanceOptimizer: Using cached scripts generation result');
          return cachedResult;
        }
      }

      // Check resource availability
      if (this.options.enableResourceManagement) {
        await this.checkResourceAvailability();
      }

      // Execute generation with parallel processing if enabled
      let result;
      if (this.options.enableParallelProcessing && options.scriptTypes && options.scriptTypes.length > 1) {
        result = await this.executeParallelGeneration(context, options, generationFunction);
      } else {
        result = await this.executeWithPerformanceMonitoring(
          'scripts',
          () => generationFunction(context, options),
          context,
          options
        );
      }

      // Cache result
      if (this.options.enableCaching && result.success) {
        this.cacheResult(cacheKey, result);
      }

      // Update performance metrics
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics('scripts', duration, result.success);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics('scripts', duration, false);
      throw error;
    }
  }

  /**
   * Optimize documentation generation performance
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @param {Function} generationFunction - Generation function to optimize
   * @returns {Promise<Object>} Optimized result
   */
  async optimizeDocumentationGeneration(context, options, generationFunction) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('documentation', context, options);

    try {
      // Check cache first
      if (this.options.enableCaching) {
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
          this.logger.info('GeneratePerformanceOptimizer: Using cached documentation generation result');
          return cachedResult;
        }
      }

      // Check resource availability
      if (this.options.enableResourceManagement) {
        await this.checkResourceAvailability();
      }

      // Execute generation with performance monitoring
      const result = await this.executeWithPerformanceMonitoring(
        'documentation',
        () => generationFunction(context, options),
        context,
        options
      );

      // Cache result
      if (this.options.enableCaching && result.success) {
        this.cacheResult(cacheKey, result);
      }

      // Update performance metrics
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics('documentation', duration, result.success);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics('documentation', duration, false);
      throw error;
    }
  }

  /**
   * Execute generation with performance monitoring
   * @param {string} type - Generation type
   * @param {Function} generationFunction - Generation function
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async executeWithPerformanceMonitoring(type, generationFunction, context, options) {
    const startTime = Date.now();
    const operationId = this.generateOperationId();

    try {
      // Publish performance monitoring event
      if (this.options.enablePerformanceMonitoring) {
        await this.publishPerformanceEvent('start', {
          operationId,
          type,
          startTime,
          context: context.get('projectPath'),
          options
        });
      }

      // Execute generation function
      const result = await generationFunction();

      // Calculate duration
      const duration = Date.now() - startTime;

      // Check performance threshold
      if (duration > this.options.performanceThreshold) {
        this.logger.warn(`GeneratePerformanceOptimizer: ${type} generation exceeded performance threshold`, {
          duration,
          threshold: this.options.performanceThreshold,
          operationId
        });
      }

      // Publish completion event
      if (this.options.enablePerformanceMonitoring) {
        await this.publishPerformanceEvent('complete', {
          operationId,
          type,
          duration,
          success: result.success,
          context: context.get('projectPath')
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error event
      if (this.options.enablePerformanceMonitoring) {
        await this.publishPerformanceEvent('error', {
          operationId,
          type,
          duration,
          error: error.message,
          context: context.get('projectPath')
        });
      }

      throw error;
    }
  }

  /**
   * Execute parallel generation for multiple script types
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @param {Function} generationFunction - Generation function
   * @returns {Promise<Object>} Combined result
   */
  async executeParallelGeneration(context, options, generationFunction) {
    const scriptTypes = options.scriptTypes || [];
    const results = [];

    // Create individual generation tasks
    const tasks = scriptTypes.map(scriptType => {
      const individualOptions = { ...options, scriptType };
      return this.executeWithPerformanceMonitoring(
        'script',
        () => generationFunction(context, individualOptions),
        context,
        individualOptions
      );
    });

    // Execute tasks in parallel with concurrency limit
    const concurrencyLimit = Math.min(
      this.options.maxConcurrentOperations,
      tasks.length
    );

    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
      const batch = tasks.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.allSettled(batch);
      
      for (const batchResult of batchResults) {
        if (batchResult.status === 'fulfilled') {
          results.push(batchResult.value);
        } else {
          results.push({
            success: false,
            error: batchResult.reason.message
          });
        }
      }
    }

    // Combine results
    return this.combineParallelResults(results);
  }

  /**
   * Combine parallel generation results
   * @param {Array<Object>} results - Individual results
   * @returns {Object} Combined result
   */
  combineParallelResults(results) {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    return {
      success: failedResults.length === 0,
      totalScripts: results.length,
      successfulScripts: successfulResults.length,
      failedScripts: failedResults.length,
      results: results,
      timestamp: new Date()
    };
  }

  /**
   * Generate cache key
   * @param {string} type - Generation type
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {string} Cache key
   */
  generateCacheKey(type, context, options) {
    const projectPath = context.get('projectPath');
    const optionsHash = JSON.stringify(options);
    return `${type}_${projectPath}_${this.hashString(optionsHash)}`;
  }

  /**
   * Simple string hashing function
   * @param {string} str - String to hash
   * @returns {string} Hash value
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached result
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result
   */
  getCachedResult(cacheKey) {
    if (!this.options.enableCaching) {
      return null;
    }

    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache result
   * @param {string} cacheKey - Cache key
   * @param {Object} result - Result to cache
   */
  cacheResult(cacheKey, result) {
    if (!this.options.enableCaching) {
      return;
    }

    // Check cache size limit
    if (this.cache.size >= this.options.cacheSize) {
      this.evictOldestCacheEntry();
    }

    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.options.cacheTTL,
      createdAt: Date.now()
    });
  }

  /**
   * Evict oldest cache entry
   */
  evictOldestCacheEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.createdAt < oldestTime) {
        oldestTime = value.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Check resource availability
   * @returns {Promise<void>}
   */
  async checkResourceAvailability() {
    // Check memory usage
    const used = process.memoryUsage();
    const usedMB = used.heapUsed / 1024 / 1024;
    
    if (usedMB > this.options.maxMemoryUsage / 1024 / 1024) {
      this.logger.warn('GeneratePerformanceOptimizer: High memory usage detected', {
        usedMB: Math.round(usedMB),
        maxMB: Math.round(this.options.maxMemoryUsage / 1024 / 1024)
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }

    // Check CPU usage (basic check)
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    const cpuUsagePercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
    
    if (cpuUsagePercent > 80) {
      this.logger.warn('GeneratePerformanceOptimizer: High CPU usage detected', {
        cpuUsagePercent: Math.round(cpuUsagePercent)
      });
    }
  }

  /**
   * Update performance metrics
   * @param {string} type - Generation type
   * @param {number} duration - Execution duration
   * @param {boolean} success - Success status
   */
  updatePerformanceMetrics(type, duration, success) {
    if (!this.options.enablePerformanceMonitoring) {
      return;
    }

    const metrics = this.performanceMetrics.get(type) || {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0
    };

    metrics.totalExecutions++;
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.totalExecutions;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);

    if (success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    this.performanceMetrics.set(type, metrics);
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    // Set up periodic performance reporting
    setInterval(() => {
      this.reportPerformanceMetrics();
    }, 5 * 60 * 1000); // Report every 5 minutes
  }

  /**
   * Report performance metrics
   */
  async reportPerformanceMetrics() {
    const report = {
      timestamp: new Date(),
      metrics: {}
    };

    for (const [type, metrics] of this.performanceMetrics.entries()) {
      report.metrics[type] = {
        ...metrics,
        successRate: metrics.totalExecutions > 0 
          ? (metrics.successfulExecutions / metrics.totalExecutions) * 100 
          : 0
      };
    }

    await this.publishPerformanceEvent('report', report);
  }

  /**
   * Publish performance event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  async publishPerformanceEvent(eventType, data) {
    try {
      await this.eventBus.publish(`generate.performance.${eventType}`, {
        ...data,
        timestamp: new Date(),
        optimizer: 'GeneratePerformanceOptimizer'
      });
    } catch (error) {
      this.logger.warn('Failed to publish performance event:', error.message);
    }
  }

  /**
   * Generate operation ID
   * @returns {string} Operation ID
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance metrics
   * @param {string} type - Generation type (optional)
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics(type = null) {
    if (type) {
      return this.performanceMetrics.get(type) || null;
    }
    
    const allMetrics = {};
    for (const [key, value] of this.performanceMetrics.entries()) {
      allMetrics[key] = value;
    }
    return allMetrics;
  }

  /**
   * Clear performance metrics
   * @param {string} type - Generation type (optional)
   */
  clearPerformanceMetrics(type = null) {
    if (type) {
      this.performanceMetrics.delete(type);
    } else {
      this.performanceMetrics.clear();
    }
  }

  /**
   * Clear cache
   * @param {string} cacheKey - Cache key (optional)
   */
  clearCache(cacheKey = null) {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get optimizer metadata
   * @returns {Object} Optimizer metadata
   */
  getMetadata() {
    return {
      name: 'GeneratePerformanceOptimizer',
      description: 'Performance optimization for generate operations',
      version: '1.0.0',
      cacheSize: this.cache.size,
      maxCacheSize: this.options.cacheSize,
      performanceMetrics: this.getPerformanceMetrics(),
      options: this.options
    };
  }

  /**
   * Set optimizer options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clone optimizer
   * @returns {GeneratePerformanceOptimizer} Cloned optimizer
   */
  clone() {
    return new GeneratePerformanceOptimizer({
      eventBus: this.eventBus,
      logger: this.logger,
      ...this.options
    });
  }
}

module.exports = GeneratePerformanceOptimizer; 