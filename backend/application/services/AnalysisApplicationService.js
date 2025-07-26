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

      const recommendations = await this.analysisOutputService.getAnalysisRecommendations(projectPath);
      
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
      const stepResult = await this.executeAnalysisStep('SecurityAnalysisStep', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'security', stepResult.result, {
          stepName: 'SecurityAnalysisStep',
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
      const stepResult = await this.executeAnalysisStep('PerformanceAnalysisStep', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'performance', stepResult.result, {
          stepName: 'PerformanceAnalysisStep',
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
   * Execute dependency analysis and save result
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeDependencyAnalysis(projectId, options = {}) {
    try {
      this.logger.info(`📦 Executing dependency analysis for project: ${projectId}`);
      
      // Get project path
      const projectPath = await this.getProjectPath(projectId);
      
      // Execute analysis step
      const stepResult = await this.executeAnalysisStep('DependencyAnalysisStep', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'dependencies', stepResult.result, {
          stepName: 'DependencyAnalysisStep',
          executionContext: options
        });
      }
      
      return stepResult;
      
    } catch (error) {
      this.logger.error(`❌ Dependency analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute architecture analysis and save result
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
      const stepResult = await this.executeAnalysisStep('ArchitectureAnalysisStep', {
        projectPath,
        projectId,
        ...options
      });
      
      // Save result to database if successful
      if (stepResult.success && stepResult.result) {
        await this.saveAnalysisResult(projectId, 'architecture', stepResult.result, {
          stepName: 'ArchitectureAnalysisStep',
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
   * Execute analysis step via StepRegistry
   * @param {string} stepName - Step name
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Step result
   */
  async executeAnalysisStep(stepName, context) {
    try {
      // Get StepRegistry from global dependency injection
      const stepRegistry = this.getStepRegistry();
      if (!stepRegistry) {
        throw new Error('StepRegistry not available');
      }
      
      // Execute step
      const result = await stepRegistry.executeStep(stepName, context);
      
      this.logger.info(`✅ Step ${stepName} executed successfully`);
      return result;
      
    } catch (error) {
      this.logger.error(`❌ Step ${stepName} execution failed: ${error.message}`);
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
}

module.exports = AnalysisApplicationService; 