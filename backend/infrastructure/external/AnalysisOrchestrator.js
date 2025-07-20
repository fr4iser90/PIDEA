/**
 * AnalysisOrchestrator - Infrastructure Layer: Unified Analysis Orchestration
 * Provides centralized orchestration for all analysis operations
 * 
 * Phase 1: Stub implementation for system startup fix
 * Phase 2: Full implementation with step delegation
 */

const ServiceLogger = require('@logging/ServiceLogger');

class AnalysisOrchestrator {
  constructor(dependencies = {}) {
    this.validateDependencies(dependencies);
    
    this.stepRegistry = dependencies.stepRegistry || { getStep: () => null };
    this.eventBus = dependencies.eventBus || { emit: () => {} };
    this.logger = dependencies.logger || new ServiceLogger('AnalysisOrchestrator');
    this.analysisRepository = dependencies.analysisRepository || { save: () => Promise.resolve() };
    
    // Analysis status tracking
    this.activeAnalyses = new Map();
    this.analysisCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    this.logger.info('✅ AnalysisOrchestrator initialized (Phase 2 - Step delegation)');
  }

  /**
   * Validate required dependencies
   * @param {Object} dependencies - Dependencies object
   */
  validateDependencies(dependencies) {
    if (!dependencies) {
      throw new Error('AnalysisOrchestrator requires dependencies object');
    }
  }

  /**
   * Execute single analysis type
   * @param {string} analysisType - Type of analysis to execute
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalysis(analysisType, projectPath, options = {}) {
    try {
      this.logger.info(`Starting ${analysisType} analysis for project: ${projectPath}`);
      
      // Generate unique analysis ID
      const analysisId = this.generateAnalysisId(analysisType, projectPath);
      
      // Update status
      this.activeAnalyses.set(analysisId, {
        status: 'running',
        startTime: new Date(),
        type: analysisType,
        projectPath,
        options
      });

      // Emit analysis started event
      this.eventBus.emit('analysis:started', {
        analysisId,
        analysisType,
        projectPath,
        options
      });

      // Execute analysis using step delegation
      const result = await this.executeStepAnalysis(analysisType, projectPath, options);
      
      // Update status
      this.activeAnalyses.set(analysisId, {
        ...this.activeAnalyses.get(analysisId),
        status: 'completed',
        endTime: new Date(),
        result
      });

      // Cache result
      this.cacheResult(analysisId, result);

      // Emit analysis completed event
      this.eventBus.emit('analysis:completed', {
        analysisId,
        analysisType,
        projectPath,
        result
      });

      this.logger.info(`✅ ${analysisType} analysis completed for project: ${projectPath}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ ${analysisType} analysis failed for project ${projectPath}:`, error.message);
      
      // Update status
      if (this.activeAnalyses.has(analysisId)) {
        this.activeAnalyses.set(analysisId, {
          ...this.activeAnalyses.get(analysisId),
          status: 'failed',
          endTime: new Date(),
          error: error.message
        });
      }

      // Emit analysis failed event
      this.eventBus.emit('analysis:failed', {
        analysisId,
        analysisType,
        projectPath,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Execute multiple analyses in parallel
   * @param {Array<string>} analyses - Array of analysis types
   * @param {string} projectPath - Path to the project
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Combined analysis results
   */
  async executeMultipleAnalyses(analyses, projectPath, options = {}) {
    try {
      this.logger.info(`Starting multiple analyses for project: ${projectPath}`, { analyses });
      
      const analysisId = this.generateAnalysisId('multiple', projectPath);
      
      // Update status
      this.activeAnalyses.set(analysisId, {
        status: 'running',
        startTime: new Date(),
        type: 'multiple',
        analyses,
        projectPath,
        options
      });

      // Execute analyses in parallel
      const analysisPromises = analyses.map(analysisType => 
        this.executeAnalysis(analysisType, projectPath, options)
      );

      const results = await Promise.allSettled(analysisPromises);
      
      // Aggregate results
      const aggregatedResult = this.aggregateResults(results, analyses);
      
      // Update status
      this.activeAnalyses.set(analysisId, {
        ...this.activeAnalyses.get(analysisId),
        status: 'completed',
        endTime: new Date(),
        result: aggregatedResult
      });

      // Cache result
      this.cacheResult(analysisId, aggregatedResult);

      this.logger.info(`✅ Multiple analyses completed for project: ${projectPath}`);
      return aggregatedResult;

    } catch (error) {
      this.logger.error(`❌ Multiple analyses failed for project ${projectPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Get analysis status
   * @param {string} analysisId - Analysis identifier
   * @returns {Object|null} Analysis status
   */
  getAnalysisStatus(analysisId) {
    return this.activeAnalyses.get(analysisId) || null;
  }

  /**
   * Retry failed analysis
   * @param {string} analysisId - Analysis identifier
   * @returns {Promise<Object>} Retry result
   */
  async retryAnalysis(analysisId) {
    const analysis = this.activeAnalyses.get(analysisId);
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`);
    }

    if (analysis.status !== 'failed') {
      throw new Error(`Analysis ${analysisId} is not in failed state`);
    }

    this.logger.info(`Retrying analysis: ${analysisId}`);
    
    // Remove from active analyses
    this.activeAnalyses.delete(analysisId);
    
    // Retry the analysis
    if (analysis.type === 'multiple') {
      return await this.executeMultipleAnalyses(analysis.analyses, analysis.projectPath, analysis.options);
    } else {
      return await this.executeAnalysis(analysis.type, analysis.projectPath, analysis.options);
    }
  }

  /**
   * Get cached analysis result
   * @param {string} analysisId - Analysis identifier
   * @returns {Object|null} Cached result
   */
  getCachedResult(analysisId) {
    const cached = this.analysisCache.get(analysisId);
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.analysisCache.delete(analysisId);
      return null;
    }

    return cached.result;
  }

  /**
   * Clear analysis cache
   * @param {string} analysisId - Optional specific analysis ID
   */
  clearCache(analysisId = null) {
    if (analysisId) {
      this.analysisCache.delete(analysisId);
    } else {
      this.analysisCache.clear();
    }
    this.logger.info(`Cache cleared${analysisId ? ` for ${analysisId}` : ''}`);
  }

  /**
   * Get orchestrator statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const activeCount = Array.from(this.activeAnalyses.values()).filter(a => a.status === 'running').length;
    const completedCount = Array.from(this.activeAnalyses.values()).filter(a => a.status === 'completed').length;
    const failedCount = Array.from(this.activeAnalyses.values()).filter(a => a.status === 'failed').length;
    const cacheSize = this.analysisCache.size;

    return {
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
      cacheSize,
      total: this.activeAnalyses.size
    };
  }

  // Private helper methods

  /**
   * Generate unique analysis ID
   * @param {string} analysisType - Analysis type
   * @param {string} projectPath - Project path
   * @returns {string} Analysis ID
   */
  generateAnalysisId(analysisType, projectPath) {
    const timestamp = Date.now();
    const pathHash = require('crypto').createHash('md5').update(projectPath).digest('hex').substring(0, 8);
    return `${analysisType}_${pathHash}_${timestamp}`;
  }

  /**
   * Execute analysis using step delegation
   * @param {string} analysisType - Analysis type
   * @param {string} projectPath - Project path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeStepAnalysis(analysisType, projectPath, options) {
    try {
      // Map analysis types to step names
      const stepMapping = {
        'project': 'ProjectAnalysisStep',
        'code-quality': 'CodeQualityAnalysisStep',
        'security': 'SecurityAnalysisStep',
        'performance': 'PerformanceAnalysisStep',
        'architecture': 'ArchitectureAnalysisStep',
        'techstack': 'TechStackAnalysisStep',
        'dependency': 'DependencyAnalysisStep'
      };

      const stepName = stepMapping[analysisType];
      if (!stepName) {
        throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      // Get step from registry
      const step = this.stepRegistry.getStep(stepName);
      if (!step) {
        throw new Error(`Step not found: ${stepName}`);
      }

      // Prepare context for step execution
      const context = {
        projectPath,
        ...options,
        // Add orchestrator services to context
        analysisOrchestrator: this,
        eventBus: this.eventBus,
        logger: this.logger,
        analysisRepository: this.analysisRepository,
        // Add service resolution function
        getService: (serviceName) => {
          // This will be resolved by the step system
          return null;
        }
      };

      // Execute the step
      this.logger.info(`Executing step: ${stepName} for analysis: ${analysisType}`);
      const stepResult = await step.execute(context);

      if (!stepResult.success) {
        throw new Error(`Step execution failed: ${stepResult.error}`);
      }

      // Format result for consistency
      return {
        id: this.generateAnalysisId(analysisType, projectPath),
        type: analysisType,
        projectPath,
        timestamp: new Date(),
        status: 'completed',
        result: stepResult.result,
        metadata: {
          stepName,
          ...stepResult.metadata
        }
      };

    } catch (error) {
      this.logger.error(`Step analysis failed for ${analysisType}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute stub analysis (Phase 1 fallback)
   * @param {string} analysisType - Analysis type
   * @param {string} projectPath - Project path
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Stub result
   */
  async executeStubAnalysis(analysisType, projectPath, options) {
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const timestamp = new Date();
    
    // Return stub result based on analysis type
    switch (analysisType) {
      case 'project':
        return {
          id: this.generateAnalysisId(analysisType, projectPath),
          type: 'project',
          projectPath,
          timestamp,
          status: 'completed',
          result: {
            projectType: 'unknown',
            structure: { files: 0, directories: 0 },
            dependencies: { count: 0 },
            metadata: { stub: true }
          }
        };
        
      case 'code-quality':
        return {
          id: this.generateAnalysisId(analysisType, projectPath),
          type: 'code-quality',
          projectPath,
          timestamp,
          status: 'completed',
          result: {
            score: 0,
            issues: [],
            metrics: { complexity: 0, maintainability: 0 },
            metadata: { stub: true }
          }
        };
        
      case 'security':
        return {
          id: this.generateAnalysisId(analysisType, projectPath),
          type: 'security',
          projectPath,
          timestamp,
          status: 'completed',
          result: {
            riskLevel: 'unknown',
            vulnerabilities: [],
            recommendations: [],
            metadata: { stub: true }
          }
        };
        
      case 'performance':
        return {
          id: this.generateAnalysisId(analysisType, projectPath),
          type: 'performance',
          projectPath,
          timestamp,
          status: 'completed',
          result: {
            score: 0,
            metrics: { loadTime: 0, bundleSize: 0 },
            optimizations: [],
            metadata: { stub: true }
          }
        };
        
      case 'architecture':
        return {
          id: this.generateAnalysisId(analysisType, projectPath),
          type: 'architecture',
          projectPath,
          timestamp,
          status: 'completed',
          result: {
            patterns: [],
            layers: [],
            recommendations: [],
            metadata: { stub: true }
          }
        };
        
      case 'techstack':
        return {
          id: this.generateAnalysisId(analysisType, projectPath),
          type: 'techstack',
          projectPath,
          timestamp,
          status: 'completed',
          result: {
            technologies: [],
            frameworks: [],
            tools: [],
            metadata: { stub: true }
          }
        };
        
      default:
        return {
          id: this.generateAnalysisId(analysisType, projectPath),
          type: analysisType,
          projectPath,
          timestamp,
          status: 'completed',
          result: {
            message: `Stub analysis for ${analysisType}`,
            metadata: { stub: true }
          }
        };
    }
  }

  /**
   * Aggregate multiple analysis results
   * @param {Array} results - Promise results
   * @param {Array} analyses - Analysis types
   * @returns {Object} Aggregated result
   */
  aggregateResults(results, analyses) {
    const aggregated = {
      id: this.generateAnalysisId('multiple', 'aggregated'),
      type: 'multiple',
      timestamp: new Date(),
      status: 'completed',
      analyses: {},
      summary: {
        total: results.length,
        successful: 0,
        failed: 0
      }
    };

    results.forEach((result, index) => {
      const analysisType = analyses[index];
      
      if (result.status === 'fulfilled') {
        aggregated.analyses[analysisType] = result.value;
        aggregated.summary.successful++;
      } else {
        aggregated.analyses[analysisType] = {
          error: result.reason.message,
          status: 'failed'
        };
        aggregated.summary.failed++;
      }
    });

    return aggregated;
  }

  /**
   * Cache analysis result
   * @param {string} analysisId - Analysis ID
   * @param {Object} result - Analysis result
   */
  cacheResult(analysisId, result) {
    this.analysisCache.set(analysisId, {
      result,
      timestamp: Date.now()
    });
  }
}

module.exports = AnalysisOrchestrator;
