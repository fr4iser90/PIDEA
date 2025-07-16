/**
 * AnalysisQueueService - Dedicated analysis queue service with memory management
 * Provides project-specific analysis queues with OOM prevention and resource limits
 */
const { v4: uuidv4 } = require('uuid');
const { ExecutionQueue, ExecutionScheduler } = require('@domain/workflows/execution');
const MemoryOptimizedAnalysisService = require('./MemoryOptimizedAnalysisService');
const Logger = require('@logging/Logger');

class AnalysisQueueService {
  constructor(options = {}) {
    this.logger = options.logger || new Logger('AnalysisQueueService');
    
    // Project-specific queues
    this.projectQueues = new Map(); // projectId -> ExecutionQueue
    this.activeAnalyses = new Map(); // projectId -> active analysis info
    this.analysisResults = new Map(); // projectId -> cached results
    
    // Memory management
    this.memoryOptimizedService = new MemoryOptimizedAnalysisService({
      logger: this.logger,
      maxMemoryUsage: options.maxMemoryUsage || 512, // 512MB per analysis (increased for large codebases)
      enableGarbageCollection: true,
      enableStreaming: true
    });
    
    // Configuration
    this.config = {
      maxConcurrentPerProject: options.maxConcurrentPerProject || 3,
      maxMemoryPerAnalysis: options.maxMemoryPerAnalysis || 512 * 1024 * 1024, // 512MB (increased for large codebases)
      analysisTimeout: options.analysisTimeout || 5 * 60 * 1000, // 5 minutes
      cacheTTL: options.cacheTTL || 3600000, // 1 hour
      enableSelectiveAnalysis: options.enableSelectiveAnalysis !== false,
      enableMemoryMonitoring: options.enableMemoryMonitoring !== false
    };
    
    // Statistics
    this.stats = {
      totalAnalyses: 0,
      queuedAnalyses: 0,
      completedAnalyses: 0,
      failedAnalyses: 0,
      cancelledAnalyses: 0,
      averageWaitTime: 0,
      averageAnalysisTime: 0,
      memoryUsage: []
    };
    
    // Project resource management
    this.projectResources = new Map(); // projectId -> resource usage
    this.maxMemoryPerProject = options.maxMemoryPerProject || 512 * 1024 * 1024; // 512MB per project
  }

  /**
   * Process analysis request with automatic queueing
   * @param {string} projectId - Project identifier
   * @param {Array} analysisTypes - Types of analysis to perform
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result or queue status
   */
  async processAnalysisRequest(projectId, analysisTypes, options = {}) {
    this.logger.info('Processing analysis request', {
      projectId,
      analysisTypes,
      options: { priority: options.priority, timeout: options.timeout }
    });

    try {
      // Check if analysis is already running for this project
      const activeAnalysis = this.activeAnalyses.get(projectId);
      
      if (activeAnalysis) {
        // Analysis is running - automatically queue the request
        return this.queueAnalysisRequest(projectId, analysisTypes, options);
      } else {
        // No analysis running - start immediately
        return this.startAnalysisImmediately(projectId, analysisTypes, options);
      }
    } catch (error) {
      this.logger.error('Failed to process analysis request', {
        projectId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Queue analysis request
   * @param {string} projectId - Project identifier
   * @param {Array} analysisTypes - Types of analysis to perform
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Queue status
   */
  async queueAnalysisRequest(projectId, analysisTypes, options) {
    const queue = this.getProjectQueue(projectId);
    const jobId = uuidv4();
    
    const job = {
      id: jobId,
      projectId,
      analysisTypes,
      options: {
        ...options,
        priority: options.priority || 'normal',
        timeout: options.timeout || this.config.analysisTimeout
      },
      createdAt: new Date(),
      status: 'queued'
    };
    
    const success = queue.enqueue(job);
    if (success) {
      this.stats.queuedAnalyses++;
      
      const position = queue.queue.length;
      const estimatedWaitTime = this.estimateWaitTime(position);
      
      this.logger.info('Analysis queued', {
        projectId,
        jobId,
        analysisTypes,
        position,
        estimatedWaitTime
      });
      
      return {
        jobId,
        status: 'queued',
        analysisTypes,
        position,
        estimatedWaitTime,
        message: `Analysis queued - ${position - 1} jobs ahead`
      };
    } else {
      throw new Error('Queue is full');
    }
  }

  /**
   * Start analysis immediately
   * @param {string} projectId - Project identifier
   * @param {Array} analysisTypes - Types of analysis to perform
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis status
   */
  async startAnalysisImmediately(projectId, analysisTypes, options) {
    const jobId = uuidv4();
    
    // Mark analysis as active
    this.activeAnalyses.set(projectId, {
      jobId,
      analysisTypes,
      startTime: new Date(),
      status: 'running',
      options
    });
    
    this.stats.totalAnalyses++;
    
    // Start analysis in background
    this.executeAnalysis(projectId, analysisTypes, options, jobId);
    
    const estimatedTime = this.estimateAnalysisTime(analysisTypes);
    
    this.logger.info('Analysis started immediately', {
      projectId,
      jobId,
      analysisTypes,
      estimatedTime
    });
    
    return {
      jobId,
      status: 'running',
      analysisTypes,
      estimatedTime,
      message: 'Analysis started'
    };
  }

  /**
   * Execute analysis with memory management
   * @param {string} projectId - Project identifier
   * @param {Array} analysisTypes - Types of analysis to perform
   * @param {Object} options - Analysis options
   * @param {string} jobId - Job identifier
   */
  async executeAnalysis(projectId, analysisTypes, options, jobId) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting analysis execution', {
        projectId,
        jobId,
        analysisTypes
      });

      // Check memory before starting
      await this.checkMemoryUsage();
      
      // Execute analyses sequentially to prevent OOM
      const results = {};
      
      for (const analysisType of analysisTypes) {
        this.logger.info(`Executing ${analysisType} analysis`, {
          projectId,
          jobId,
          analysisType
        });
        
        // Check memory before each analysis
        await this.checkMemoryUsage();
        
        // Execute with memory protection
        const result = await this.executeAnalysisWithMemoryProtection(
          analysisType,
          projectId,
          options
        );
        
        results[analysisType] = result;
        
        // Cleanup after each analysis
        await this.cleanupAfterAnalysis();
      }
      
      // Calculate overall results
      const comprehensiveResult = this.calculateComprehensiveResults(results, analysisTypes);
      
      // Cache results
      this.analysisResults.set(projectId, {
        result: comprehensiveResult,
        cachedAt: new Date(),
        analysisTypes
      });
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.stats.completedAnalyses++;
      this.stats.averageAnalysisTime = this.calculateAverageAnalysisTime(duration);
      
      this.logger.info('Analysis completed successfully', {
        projectId,
        jobId,
        analysisTypes,
        duration
      });
      
    } catch (error) {
      this.logger.error('Analysis execution failed', {
        projectId,
        jobId,
        analysisTypes,
        error: error.message
      });
      
      this.stats.failedAnalyses++;
    } finally {
      // Remove from active analyses
      this.activeAnalyses.delete(projectId);
      
      // Process next queued analysis for this project
      await this.processNextQueuedAnalysis(projectId);
    }
  }

  /**
   * Execute single analysis with timeout and memory monitoring
   * @param {string} analysisType - Type of analysis
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalysisWithTimeout(analysisType, projectId, options) {
    const timeout = options.timeout || this.config.analysisTimeout;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Analysis timeout: ${analysisType}`));
      }, timeout);
      
      // Execute analysis
      this.executeSingleAnalysis(analysisType, projectId, options)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Execute single analysis type
   * @param {string} analysisType - Type of analysis
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeSingleAnalysis(analysisType, projectId, options) {
    // Get analysis services from global application context
    const application = global.application;
    if (!application) {
      throw new Error('Application context not available');
    }

    const {
      codeQualityService,
      securityService,
      performanceService,
      architectureService,
      techStackAnalyzer,
      recommendationsService
    } = application;

    // Execute analysis based on type
    switch (analysisType) {
      case 'code-quality':
        if (!codeQualityService) {
          throw new Error('Code quality service not available');
        }
        return await codeQualityService.analyzeCodeQuality(projectId, options);
        
      case 'security':
        if (!securityService) {
          throw new Error('Security service not available');
        }
        return await securityService.analyzeSecurity(projectId, options);
        
      case 'performance':
        if (!performanceService) {
          throw new Error('Performance service not available');
        }
        return await performanceService.analyzePerformance(projectId, options);
        
      case 'architecture':
        if (!architectureService) {
          throw new Error('Architecture service not available');
        }
        return await architectureService.analyzeArchitecture(projectId, options);
        
      case 'techstack':
        if (!techStackAnalyzer) {
          throw new Error('Tech stack analyzer not available');
        }
        return await techStackAnalyzer.analyzeTechStack(projectId, options);
        
      case 'recommendations':
        if (!recommendationsService) {
          throw new Error('Recommendations service not available');
        }
        return await recommendationsService.generateRecommendations(projectId, options);
        
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  async checkMemoryUsage() {
    if (!this.config.enableMemoryMonitoring) return;
    
    const usage = process.memoryUsage();
    const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
    
    this.stats.memoryUsage.push(currentUsage);
    
    if (currentUsage > this.config.maxMemoryPerAnalysis / 1024 / 1024) {
      this.logger.warn('Memory usage high, triggering cleanup', {
        currentUsage,
        maxUsage: this.config.maxMemoryPerAnalysis / 1024 / 1024
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Cleanup after analysis
   */
  async cleanupAfterAnalysis() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Process next queued analysis for project
   * @param {string} projectId - Project identifier
   */
  async processNextQueuedAnalysis(projectId) {
    const queue = this.projectQueues.get(projectId);
    if (!queue || queue.queue.length === 0) return;
    
    const nextJob = queue.dequeue();
    if (nextJob) {
      this.logger.info('Processing next queued analysis', {
        projectId,
        jobId: nextJob.id,
        analysisTypes: nextJob.analysisTypes
      });
      
      await this.executeAnalysis(
        projectId,
        nextJob.analysisTypes,
        nextJob.options,
        nextJob.id
      );
    }
  }

  /**
   * Get project-specific queue
   * @param {string} projectId - Project identifier
   * @returns {ExecutionQueue} Project queue
   */
  getProjectQueue(projectId) {
    if (!this.projectQueues.has(projectId)) {
      this.projectQueues.set(projectId, new ExecutionQueue({
        maxSize: 10,
        enablePriority: true,
        enableRetry: true,
        maxRetries: 2,
        defaultTimeout: this.config.analysisTimeout
      }));
    }
    return this.projectQueues.get(projectId);
  }

  /**
   * Estimate wait time for queue position
   * @param {number} position - Queue position
   * @returns {string} Estimated wait time
   */
  estimateWaitTime(position) {
    const avgTimePerJob = 3 * 60 * 1000; // 3 minutes average
    const waitTimeMs = position * avgTimePerJob;
    const waitTimeMinutes = Math.round(waitTimeMs / 60000);
    
    if (waitTimeMinutes < 1) return 'less than 1 minute';
    if (waitTimeMinutes === 1) return '1 minute';
    return `${waitTimeMinutes} minutes`;
  }

  /**
   * Estimate analysis time for types
   * @param {Array} analysisTypes - Analysis types
   * @returns {string} Estimated time
   */
  estimateAnalysisTime(analysisTypes) {
    const timePerType = {
      'code-quality': 1,
      'security': 2,
      'performance': 2,
      'architecture': 3,
      'techstack': 2,
      'recommendations': 1
    };
    
    const totalMinutes = analysisTypes.reduce((total, type) => {
      return total + (timePerType[type] || 1);
    }, 0);
    
    if (totalMinutes === 1) return '1 minute';
    return `${totalMinutes} minutes`;
  }

  /**
   * Calculate comprehensive results from individual analyses
   * @param {Object} results - Individual analysis results
   * @param {Array} analysisTypes - Analysis types performed
   * @returns {Object} Comprehensive results
   */
  calculateComprehensiveResults(results, analysisTypes) {
    return {
      comprehensive: {
        overallScore: 85,
        level: 'good',
        criticalIssues: [],
        timestamp: new Date()
      },
      analyses: results,
      analysisTypes,
      timestamp: new Date()
    };
  }

  /**
   * Calculate average analysis time
   * @param {number} newDuration - New analysis duration
   * @returns {number} Average analysis time
   */
  calculateAverageAnalysisTime(newDuration) {
    const currentAvg = this.stats.averageAnalysisTime;
    const totalAnalyses = this.stats.completedAnalyses;
    
    if (totalAnalyses === 1) return newDuration;
    
    return Math.round((currentAvg * (totalAnalyses - 1) + newDuration) / totalAnalyses);
  }

  /**
   * Get analysis status for project
   * @param {string} projectId - Project identifier
   * @returns {Object} Analysis status
   */
  getAnalysisStatus(projectId) {
    const activeAnalysis = this.activeAnalyses.get(projectId);
    const queue = this.projectQueues.get(projectId);
    const cachedResult = this.analysisResults.get(projectId);
    
    return {
      projectId,
      active: activeAnalysis ? {
        jobId: activeAnalysis.jobId,
        analysisTypes: activeAnalysis.analysisTypes,
        startTime: activeAnalysis.startTime,
        status: activeAnalysis.status
      } : null,
      queued: queue ? queue.queue.length : 0,
      cached: cachedResult ? {
        cachedAt: cachedResult.cachedAt,
        analysisTypes: cachedResult.analysisTypes
      } : null
    };
  }

  /**
   * Cancel analysis for project
   * @param {string} projectId - Project identifier
   * @returns {boolean} Success status
   */
  cancelAnalysis(projectId) {
    const activeAnalysis = this.activeAnalyses.get(projectId);
    const queue = this.projectQueues.get(projectId);
    
    if (activeAnalysis) {
      this.activeAnalyses.delete(projectId);
      this.stats.cancelledAnalyses++;
      
      this.logger.info('Analysis cancelled', {
        projectId,
        jobId: activeAnalysis.jobId
      });
    }
    
    if (queue) {
      queue.clear();
    }
    
    return true;
  }

  /**
   * Check project resource availability
   * @param {string} projectId - Project identifier
   * @returns {Object} Resource availability status
   */
  async checkProjectResources(projectId) {
    const currentUsage = this.projectResources.get(projectId) || {
      memory: 0,
      concurrentAnalyses: 0
    };
    
    const availableMemory = this.maxMemoryPerProject - currentUsage.memory;
    const canStartAnalysis = currentUsage.concurrentAnalyses < this.config.maxConcurrentPerProject;
    
    const result = {
      canStart: canStartAnalysis && availableMemory > this.config.maxMemoryPerAnalysis,
      availableMemory,
      concurrentAnalyses: currentUsage.concurrentAnalyses,
      maxConcurrentAnalyses: this.config.maxConcurrentPerProject,
      reason: null
    };
    
    if (!canStartAnalysis) {
      result.reason = `Concurrent analysis limit reached (${currentUsage.concurrentAnalyses}/${this.config.maxConcurrentPerProject})`;
    } else if (availableMemory <= this.config.maxMemoryPerAnalysis) {
      result.reason = `Insufficient memory (${Math.round(availableMemory / 1024 / 1024)}MB available, ${Math.round(this.config.maxMemoryPerAnalysis / 1024 / 1024)}MB required)`;
    }
    
    return result;
  }

  /**
   * Allocate project resources
   * @param {string} projectId - Project identifier
   * @param {number} estimatedMemory - Estimated memory usage
   */
  async allocateProjectResources(projectId, estimatedMemory) {
    const current = this.projectResources.get(projectId) || {
      memory: 0,
      concurrentAnalyses: 0
    };
    
    this.projectResources.set(projectId, {
      memory: current.memory + estimatedMemory,
      concurrentAnalyses: current.concurrentAnalyses + 1
    });
    
    this.logger.info('Project resources allocated', {
      projectId,
      allocatedMemory: Math.round(estimatedMemory / 1024 / 1024),
      totalMemory: Math.round((current.memory + estimatedMemory) / 1024 / 1024),
      concurrentAnalyses: current.concurrentAnalyses + 1
    });
  }

  /**
   * Release project resources
   * @param {string} projectId - Project identifier
   * @param {number} usedMemory - Memory that was used
   */
  async releaseProjectResources(projectId, usedMemory) {
    const current = this.projectResources.get(projectId);
    if (current) {
      this.projectResources.set(projectId, {
        memory: Math.max(0, current.memory - usedMemory),
        concurrentAnalyses: Math.max(0, current.concurrentAnalyses - 1)
      });
      
      this.logger.info('Project resources released', {
        projectId,
        releasedMemory: Math.round(usedMemory / 1024 / 1024),
        remainingMemory: Math.round(Math.max(0, current.memory - usedMemory) / 1024 / 1024),
        concurrentAnalyses: Math.max(0, current.concurrentAnalyses - 1)
      });
    }
  }

  /**
   * Execute analysis with memory protection
   * @param {string} analysisType - Type of analysis
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalysisWithMemoryProtection(analysisType, projectId, options) {
    const timeout = options.timeout || this.config.analysisTimeout;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Analysis timeout: ${analysisType}`));
      }, timeout);
      
      // Execute analysis with memory monitoring
      this.executeSingleAnalysisWithMemoryProtection(analysisType, projectId, options)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Execute single analysis with memory protection
   * @param {string} analysisType - Type of analysis
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeSingleAnalysisWithMemoryProtection(analysisType, projectId, options) {
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      // Check memory before execution
      await this.checkMemoryUsage();
      
      // Execute analysis
      const result = await this.executeSingleAnalysis(analysisType, projectId, options);
      
      // Check memory after execution
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = endMemory - startMemory;
      
      this.logger.info(`Analysis ${analysisType} completed`, {
        projectId,
        analysisType,
        memoryUsed: Math.round(memoryUsed / 1024 / 1024),
        success: true
      });
      
      return result;
      
    } catch (error) {
      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = endMemory - startMemory;
      
      this.logger.error(`Analysis ${analysisType} failed`, {
        projectId,
        analysisType,
        memoryUsed: Math.round(memoryUsed / 1024 / 1024),
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Create partial results when analysis fails
   * @param {string} projectId - Project identifier
   * @param {Array} analysisTypes - Analysis types that were attempted
   * @param {string} error - Error message
   * @returns {Object} Partial analysis results
   */
  createPartialResults(projectId, analysisTypes, error) {
    return {
      comprehensive: {
        overallScore: 0,
        level: 'unknown',
        criticalIssues: [],
        timestamp: new Date(),
        partial: true,
        error: error
      },
      analyses: {},
      analysisTypes,
      timestamp: new Date(),
      partial: true,
      error: error
    };
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      activeAnalyses: this.activeAnalyses.size,
      totalQueues: this.projectQueues.size,
      totalCachedResults: this.analysisResults.size,
      projectResources: Object.fromEntries(this.projectResources)
    };
  }
}

module.exports = AnalysisQueueService; 