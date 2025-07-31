/**
 * AnalysisApplicationService - Application layer service for analysis operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate analysis use cases
 * ✅ Handle analysis data retrieval and caching
 * ✅ Manage analysis status and metrics
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services and Infrastructure repositories through interfaces
 * ✅ Handles DTOs and use case orchestration
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const ETagService = require('@domain/services/shared/ETagService');

class AnalysisApplicationService {
  constructor({
    analysisOutputService,
    analysisRepository,
    projectRepository,
    logger
  }) {
    // Domain services
    this.analysisOutputService = analysisOutputService;
    
    // Infrastructure repositories (accessed through domain interfaces)
    this.analysisRepository = analysisRepository;
    this.projectRepository = projectRepository;
    
    // Application services
    this.logger = logger || new ServiceLogger('AnalysisApplicationService');
    this.etagService = new ETagService();
    
    // ✅ Memory-Management settings
    this.maxMemoryUsage = 512; // MB - Increased for large codebases
    this.memoryThreshold = 0.8; // 80% of max memory
    this.enableGarbageCollection = true;
    this.enableCancellation = false;
    this.enableFallback = true;
    this.maxRetries = 2;
    
    // Memory tracking
    this.currentMemoryUsage = 0;
    this.memoryHistory = [];
    this.analysisStartTime = null;
  }

  /**
   * Get project path from database
   * @param {string} projectId - Project identifier
   * @returns {Promise<string>} Project workspace path
   */
  async getProjectPath(projectId) {
    this.logger.info(`Getting project path for projectId: ${projectId}`);
    
    if (this.projectRepository) {
      try {
        this.logger.info(`ProjectRepository available, searching for project...`);
        const project = await this.projectRepository.findById(projectId);
        this.logger.info(`Project found:`, { 
          found: !!project, 
          hasWorkspacePath: !!(project && project.workspacePath),
          workspacePath: project?.workspacePath 
        });
        
        if (project && project.workspacePath) {
          this.logger.info(`Using workspace path: ${project.workspacePath}`);
          return project.workspacePath;
        }
      } catch (error) {
        this.logger.error(`Failed to get project path for ${projectId}:`, error);
      }
    } else {
      this.logger.warn(`ProjectRepository not available!`);
    }

  }

  /**
   * Get analysis data with caching and optimization
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} Analysis result
   */
  async getAnalysisData(params) {
    const { projectId, types, useCache = true, memoryLimit } = params;
    
    try {
      this.logger.info(`🔍 Getting analysis data for project: ${projectId}`);
      
      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      
      // Check cache if enabled
      if (useCache) {
        const cachedResult = await this.analysisRepository.getCachedAnalysis(projectId, types);
        if (cachedResult) {
          // // // this.logger.info('✅ Returning cached analysis result');
          return cachedResult;
        }
      }
      
      // Get latest analysis from database
      const analysis = await this.analysisRepository.getLatestAnalysis(projectId, types);
      
      if (analysis) {
        // Cache result
        if (useCache) {
          await this.analysisRepository.cacheAnalysis(projectId, types, analysis);
        }
        
        return analysis;
      }
      
      // No analysis found
      return {
        projectId,
        types: types || ['code-quality', 'security', 'performance', 'architecture'],
        status: 'not-found',
        message: 'No analysis data available for this project',
        timestamp: new Date().toISOString()
      };
      

      
    } catch (error) {
      this.logger.error('❌ Analysis failed:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Get analysis status and metrics
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Analysis status
   */
  async getAnalysisStatus(projectId) {
    try {
      const latestAnalysis = await this.analysisRepository.getLatestAnalysis(projectId);
      
      return {
        queueStatus: {
          active: 0,
          pending: 0,
          completed: 1,
          failed: 0
        },
        analysis: latestAnalysis ? {
          id: latestAnalysis.id,
          status: latestAnalysis.status,
          progress: 100,
          completedAt: latestAnalysis.completedAt,
          executionTime: latestAnalysis.executionTime,
          memoryUsage: latestAnalysis.memoryUsage
        } : null
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis status:', error);
      throw new Error(`Failed to get analysis status: ${error.message}`);
    }
  }

  /**
   * Get analysis history for project
   * @param {string} projectId - Project identifier
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Analysis history
   */
  async getAnalysisHistory(projectId, options = {}) {
    try {
      const { limit = 10, offset = 0, types } = options;
      
      const history = await this.analysisRepository.getAnalysisHistory(projectId, {
        limit,
        offset,
        types
      });
      
      return history.map(analysis => ({
        id: analysis.id,
        type: analysis.type,
        status: analysis.status,
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt,
        duration: analysis.duration,
        summary: analysis.summary
      }));
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis history:', error);
      throw new Error(`Failed to get analysis history: ${error.message}`);
    }
  }

  /**
   * Get analysis issues and recommendations
   * @param {string} projectId - Project identifier
   * @param {string} analysisType - Type of analysis
   * @returns {Promise<Object>} Issues and recommendations
   */
  async getAnalysisIssues(projectId, analysisType = 'code-quality') {
    try {
      const latestAnalysis = await this.analysisRepository.getLatestAnalysis(projectId, [analysisType]);
      
      if (!latestAnalysis) {
        return {
          issues: [],
          recommendations: [],
          summary: null
        };
      }
      
      return {
        issues: latestAnalysis.issues || [],
        recommendations: latestAnalysis.recommendations || [],
        summary: latestAnalysis.summary,
        analysisId: latestAnalysis.id,
        completedAt: latestAnalysis.completedAt
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get analysis issues:', error);
      throw new Error(`Failed to get analysis issues: ${error.message}`);
    }
  }

  /**
   * Generate ETag for caching
   * @param {Object} data - Data to generate ETag for
   * @returns {string} ETag value
   */
  generateETag(data) {
    return this.etagService.generate(data);
  }

  /**
   * Validate ETag for conditional requests
   * @param {string} etag - ETag from request
   * @param {Object} data - Current data
   * @returns {boolean} Whether ETag matches
   */
  validateETag(etag, data) {
    return this.etagService.validate(etag, data);
  }

  /**
   * Get analysis metrics for a project
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Analysis metrics
   */
  async getAnalysisMetrics(projectId) {
    this.logger.info(`Getting analysis metrics for project: ${projectId}`);
    
    try {
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project: ${projectId}`);
      }

      const metrics = await this.analysisOutputService.getAnalysisMetrics(projectPath);
      
      return {
        projectId,
        metrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get analysis metrics for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get analysis from database
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Analysis data from database
   */
  async getAnalysisFromDatabase(projectId) {
    this.logger.info(`Getting analysis from database for project: ${projectId}`);
    
    try {
      const analysis = await this.analysisRepository.findByProjectId(projectId);
      
      return {
        projectId,
        analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get analysis from database for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get analysis file
   * @param {string} projectId - Project identifier
   * @param {string} filename - File name
   * @returns {Promise<Object>} Analysis file content
   */
  async getAnalysisFile(projectId, filename) {
    this.logger.info(`Getting analysis file for project: ${projectId}, file: ${filename}`);
    
    try {
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project: ${projectId}`);
      }

      const file = await this.analysisOutputService.getAnalysisFile(projectPath, filename);
      
      return {
        projectId,
        filename,
        content: file,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get analysis file for ${projectId}/${filename}:`, error);
      throw error;
    }
  }

  /**
   * Get analysis tech stack
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Tech stack analysis
   */
  async getAnalysisTechStack(projectId) {
    this.logger.info(`Getting analysis tech stack for project: ${projectId}`);
    
    try {
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project: ${projectId}`);
      }

      const techStack = await this.analysisOutputService.getAnalysisTechStack(projectPath);
      
      return {
        projectId,
        techStack,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get analysis tech stack for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get analysis architecture
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Architecture analysis
   */
  async getAnalysisArchitecture(projectId) {
    this.logger.info(`Getting analysis architecture for project: ${projectId}`);
    
    try {
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project: ${projectId}`);
      }

      const architecture = await this.analysisOutputService.getAnalysisArchitecture(projectPath);
      
      return {
        projectId,
        architecture,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get analysis architecture for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get analysis recommendations
   * @param {string} projectId - Project identifier
   * @returns {Promise<Object>} Analysis recommendations
   */
  async getAnalysisRecommendations(projectId) {
    this.logger.info(`Getting analysis recommendations for project: ${projectId}`);
    
    try {
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project: ${projectId}`);
      }

      const recommendations = await this.analysisOutputService.getAnalysisRecommendations(projectId);
      
      return {
        projectId,
        recommendations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get analysis recommendations for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get analysis charts
   * @param {string} projectId - Project identifier
   * @param {string} type - Chart type
   * @returns {Promise<Object>} Analysis charts
   */
  async getAnalysisCharts(projectId, type) {
    this.logger.info(`Getting analysis charts for project: ${projectId}, type: ${type}`);
    
    try {
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project: ${projectId}`);
      }

      const charts = await this.analysisOutputService.getAnalysisCharts(projectPath, type);
      
      return {
        projectId,
        chartType: type,
        charts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Failed to get analysis charts for ${projectId}/${type}:`, error);
      throw error;
    }
  }

  /**
   * Execute code quality analysis and save result
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeCodeQualityAnalysis(projectId, options = {}) {
    try {
      this.logger.info(`🔍 Executing code quality analysis for project: ${projectId}`);
      
      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      
      // Execute analysis step
      const stepResult = await this.executeAnalysisStep('CodeQualityAnalysisStep', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'code-quality', stepResult.result, {
          stepName: 'CodeQualityAnalysisStep',
          executionContext: options
        });
      }
      
      return stepResult;
      
    } catch (error) {
      this.logger.error(`❌ Code quality analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute security analysis and save result
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeSecurityAnalysis(projectId, options = {}) {
    try {
      this.logger.info(`🔒 Executing security analysis for project: ${projectId}`);
      
      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      
      // Execute analysis step
      const stepResult = await this.executeAnalysisStep('SecurityAnalysisOrchestrator', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'security', stepResult.result, {
          stepName: 'SecurityAnalysisOrchestrator',
          executionContext: options
        });
      }
      
      return stepResult;
      
    } catch (error) {
      this.logger.error(`❌ Security analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute performance analysis and save result
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executePerformanceAnalysis(projectId, options = {}) {
    try {
      this.logger.info(`⚡ Executing performance analysis for project: ${projectId}`);
      
      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      
      // Execute analysis step
      const stepResult = await this.executeAnalysisStep('PerformanceAnalysisOrchestrator', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'performance', stepResult.result, {
          stepName: 'PerformanceAnalysisOrchestrator',
          executionContext: options
        });
      }
      
      return stepResult;
      
    } catch (error) {
      this.logger.error(`❌ Performance analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute manifest analysis and save result
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeManifestAnalysis(projectId, options = {}) {
    try {
      this.logger.info(`📋 Executing manifest analysis for project: ${projectId}`);
      
      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      
      // Execute analysis step
      const stepResult = await this.executeAnalysisStep('ManifestAnalysisStep', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'manifest', stepResult.result, {
          stepName: 'ManifestAnalysisStep',
          executionContext: options
        });
      }
      
      return stepResult;
      
    } catch (error) {
      this.logger.error(`❌ Manifest analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute dependency analysis for a project
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeDependencyAnalysis(projectId, options = {}) {
    try {
      this.logger.info(`🔍 Executing dependency analysis for project: ${projectId}`);
      
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project: ${projectId}`);
      }

      const context = {
        projectId,
        projectPath,
        analysisType: 'dependencies',
        options: {
          includeOutdated: true,
          includeVulnerabilities: true,
          includeUnused: true,
          includeLicense: true,
          ...options
        }
      };

      const result = await this.executeAnalysisStep('DependencyAnalysisOrchestrator', context);
      
      // Save result to database
      await this.saveAnalysisResult(projectId, 'dependencies', result, {
        executionTime: Date.now(),
        options: context.options
      });

      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to execute dependency analysis for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Execute tech stack analysis for a project
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeTechStackAnalysis(projectId, options = {}) {
    try {
      this.logger.info(`🔍 Executing tech stack analysis for project: ${projectId}`);
      
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project: ${projectId}`);
      }

      const context = {
        projectId,
        projectPath,
        analysisType: 'tech-stack',
        options: {
          includeFrameworks: true,
          includeLibraries: true,
          includeTools: true,
          includeVersions: true,
          ...options
        }
      };

      const result = await this.executeAnalysisStep('TechStackAnalysisOrchestrator', context);
      
      // Save result to database
      await this.saveAnalysisResult(projectId, 'tech-stack', result, {
        executionTime: Date.now(),
        options: context.options
      });

      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to execute tech stack analysis for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Execute architecture analysis for a project
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeArchitectureAnalysis(projectId, options = {}) {
    try {
      this.logger.info(`🏗️ Executing architecture analysis for project: ${projectId}`);
      
      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      
      // Execute analysis step
      const stepResult = await this.executeAnalysisStep('ArchitectureAnalysisOrchestrator', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'architecture', stepResult.result, {
          stepName: 'ArchitectureAnalysisOrchestrator',
          executionContext: options
        });
      }
      
      return stepResult;
      
    } catch (error) {
      this.logger.error(`❌ Architecture analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute analysis step via StepRegistry with Memory-Management
   * @param {string} stepName - Step name
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Step result
   */
  async executeAnalysisStep(stepName, context) {
    try {
      // ✅ Memory-Check vor Step
      await this.checkMemoryUsage();
      
      // Get StepRegistry from global dependency injection
      const stepRegistry = this.getStepRegistry();
      if (!stepRegistry) {
        throw new Error('StepRegistry not available');
      }
      
      // ✅ Start analysis timer
      const startTime = Date.now();
      
      // Execute step
      const result = await stepRegistry.executeStep(stepName, context);
      
      // ✅ Calculate duration
      const duration = Date.now() - startTime;
      
      // ✅ Memory-Cleanup nach Step
      await this.cleanup();
      
      // ✅ Log memory stats
      const memoryStats = this.getMemoryStats();
      this.logger.info(`✅ Step ${stepName} executed successfully`, {
        memoryUsage: `${memoryStats.currentUsage}MB`,
        peakUsage: `${memoryStats.peakUsage}MB`,
        duration: `${duration}ms`
      });
      
      return result;
      
    } catch (error) {
      this.logger.error(`❌ Step ${stepName} execution failed: ${error.message}`);
      
      // ✅ Memory-Fallback bei Problemen
      if (error.name === 'MemoryError' || error.message.includes('memory')) {
        this.logger.warn('Memory error detected, returning partial results');
        return this.createPartialResults('memory-error');
      }
      
      throw error;
    }
  }

  /**
   * Save analysis result to database
   * @param {string} projectId - Project identifier
   * @param {string} analysisType - Analysis type
   * @param {Object} result - Analysis result
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Saved analysis
   */
  async saveAnalysisResult(projectId, analysisType, result, metadata = {}) {
    try {
      if (!this.analysisRepository) {
        this.logger.warn('Analysis repository not available, skipping database save');
        return null;
      }

      // Use the entire result object, but ensure it's clean (no circular references)
      const cleanResult = { ...result };
      
      // Remove any potential circular references or problematic properties
      delete cleanResult._internal;
      delete cleanResult.debug;
      delete cleanResult.context;
      
      // Create analysis entity
      const Analysis = require('@domain/entities/Analysis');
      const analysis = Analysis.create(projectId, analysisType, {
        result: cleanResult,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

      // Save to database
      await this.analysisRepository.save(analysis);
      
      this.logger.info(`💾 Analysis result saved to database: ${analysis.id}`);
      return analysis;
      
    } catch (error) {
      this.logger.error(`❌ Failed to save analysis result: ${error.message}`);
      // Don't throw error - analysis execution was successful, just saving failed
      return null;
    }
  }

  /**
   * Get StepRegistry from dependency injection
   * @returns {Object|null} StepRegistry or null
   */
  getStepRegistry() {
    try {
      // Try to get from global dependency injection
      if (global.dependencyContainer) {
        return global.dependencyContainer.get('stepRegistry');
      }
      
      // Try to get from application context
      if (global.application && global.application.stepRegistry) {
        return global.application.stepRegistry;
      }
      
      return null;
    } catch (error) {
      this.logger.warn('Could not get StepRegistry:', error.message);
      return null;
    }
  }

  // ✅ Memory-Management methods
  /**
   * Check current memory usage and trigger cleanup if needed
   */
  async checkMemoryUsage() {
    const usage = process.memoryUsage();
    const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
    const maxMemory = this.maxMemoryUsage;
    
    this.currentMemoryUsage = currentUsage;
    this.memoryHistory.push({
      timestamp: new Date(),
      usage: currentUsage,
      maxMemory
    });
    
    // Keep only last 100 memory readings
    if (this.memoryHistory.length > 100) {
      this.memoryHistory = this.memoryHistory.slice(-100);
    }
    
    // Check if memory usage is approaching the threshold
    if (currentUsage > maxMemory * this.memoryThreshold) {
      this.logger.warn(`Memory usage approaching limit: ${currentUsage}MB/${maxMemory}MB, triggering cleanup`);
      await this.forceGarbageCollection();
    }
    
    // Check if memory usage exceeds the limit
    if (currentUsage > maxMemory) {
      this.logger.error(`Memory usage exceeded limit: ${currentUsage}MB/${maxMemory}MB`);
      
      // If cancellation is enabled, cancel the analysis
      if (this.enableCancellation) {
        throw new Error('Memory limit exceeded');
      }
      
      // If fallback is enabled, return partial results
      if (this.enableFallback) {
        this.logger.warn('Memory limit exceeded, returning partial results');
        return this.createPartialResults('memory');
      }
      
      // Otherwise, throw memory error
      const error = new Error(`Memory usage exceeded limit: ${currentUsage}MB/${maxMemory}MB`);
      error.name = 'MemoryError';
      throw error;
    }
    
    // Log memory usage periodically
    this.logger.info(`Memory usage check: ${currentUsage}MB/${maxMemory}MB`);
  }

  /**
   * Force garbage collection
   */
  async forceGarbageCollection() {
    if (this.enableGarbageCollection && global.gc) {
      this.logger.info('Forcing garbage collection...');
      global.gc();
      
      // Wait a bit for GC to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const usage = process.memoryUsage();
      const newUsage = Math.round(usage.heapUsed / 1024 / 1024);
      this.logger.info(`Garbage collection completed. Memory: ${newUsage}MB`);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('Cleaning up analysis resources...');
    
    // Force garbage collection
    if (this.enableGarbageCollection && global.gc) {
      global.gc();
    }
    
    this.currentMemoryUsage = 0;
    this.analysisStartTime = null;
  }

  /**
   * Create partial results when memory limit is exceeded
   */
  createPartialResults(reason = 'unknown') {
    const usage = process.memoryUsage();
    const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
    
    return {
      success: false,
      error: `Analysis stopped due to ${reason}`,
      partial: true,
      memoryUsage: currentUsage,
      maxMemoryUsage: this.maxMemoryUsage,
      message: `Analysis was stopped due to ${reason}. Memory usage: ${currentUsage}MB/${this.maxMemoryUsage}MB`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    const usage = process.memoryUsage();
    const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
    
    return {
      currentUsage,
      maxMemoryUsage: this.maxMemoryUsage,
      memoryThreshold: this.memoryThreshold,
      memoryHistory: this.memoryHistory,
      peakUsage: this.memoryHistory.length > 0 ? Math.max(...this.memoryHistory.map(h => h.usage)) : currentUsage,
      averageUsage: this.memoryHistory.length > 0 ? 
        this.memoryHistory.reduce((sum, h) => sum + h.usage, 0) / this.memoryHistory.length : currentUsage
    };
  }
}

module.exports = AnalysisApplicationService; 