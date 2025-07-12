/**
 * VibeCoderAnalyzeStep - VibeCoder analysis workflow step
 * Migrates VibeCoderAnalyzeHandler functionality to unified workflow step system
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');

/**
 * VibeCoder analysis workflow step
 */
class VibeCoderAnalyzeStep extends BaseWorkflowStep {
  constructor(options = {}) {
    super('VibeCoderAnalyzeStep', 'Performs VibeCoder comprehensive analysis', 'vibecoder-analysis');
    
    this.options = {
      enableSubCommandOrchestration: options.enableSubCommandOrchestration !== false,
      enableResultConsolidation: options.enableResultConsolidation !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableEventHandling: options.enableEventHandling !== false,
      enableValidation: options.enableValidation !== false,
      enableLogging: options.enableLogging !== false,
      timeout: options.timeout || 120000, // 120 seconds
      maxConcurrentSubCommands: options.maxConcurrentSubCommands || 5,
      ...options
    };

    this.handlerId = this.generateHandlerId();
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `vibecoder-analyze-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute VibeCoder analysis step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Analysis result
   */
  async executeStep(context) {
    const startTime = Date.now();
    const logger = context.get('logger') || console;
    const projectPath = context.get('projectPath');
    const requestedBy = context.get('requestedBy') || 'system';
    const analysisTypes = context.get('analysisTypes') || ['comprehensive'];
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    try {
      logger.info('VibeCoderAnalyzeStep: Starting comprehensive analysis', {
        handlerId: this.handlerId,
        projectPath,
        requestedBy,
        analysisTypes,
        options: this.options
      });

      // Get VibeCoder services from context
      const vibecoderAdapter = context.get('vibecoderAdapter');
      if (!vibecoderAdapter) {
        throw new Error('VibeCoder service adapter not found in context');
      }

      const analysisService = vibecoderAdapter.getAnalysisService();
      const securityService = vibecoderAdapter.getSecurityService();
      const recommendationService = vibecoderAdapter.getRecommendationService();
      const metricsService = vibecoderAdapter.getMetricsService();

      // Validate services
      if (!analysisService || !securityService || !recommendationService || !metricsService) {
        throw new Error('Required VibeCoder services not available');
      }

      // Step 1: Perform comprehensive project analysis
      const analysisResults = await this.performComprehensiveAnalysis(analysisService, projectPath, context);

      // Step 2: Perform security analysis
      const securityResults = await this.performSecurityAnalysis(securityService, projectPath, context);

      // Step 3: Generate recommendations
      const recommendations = await this.generateRecommendations(recommendationService, analysisResults, securityResults, context);

      // Step 4: Calculate metrics
      const metrics = await this.calculateMetrics(metricsService, analysisResults, securityResults, context);

      // Step 5: Consolidate results
      const consolidatedResult = await this.consolidateResults(analysisResults, securityResults, recommendations, metrics, context);

      const duration = Date.now() - startTime;

      logger.info('VibeCoderAnalyzeStep: Analysis completed successfully', {
        handlerId: this.handlerId,
        projectPath,
        duration,
        analysisTypes: consolidatedResult.analysisTypes,
        securityScore: consolidatedResult.security?.score,
        recommendationsCount: consolidatedResult.recommendations?.length || 0
      });

      return {
        success: true,
        stepName: this._name,
        result: consolidatedResult,
        duration,
        metadata: {
          handlerId: this.handlerId,
          projectPath,
          requestedBy,
          analysisTypes,
          timestamp: new Date(),
          options: this.options
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('VibeCoderAnalyzeStep: Analysis failed', {
        handlerId: this.handlerId,
        projectPath,
        duration,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        stepName: this._name,
        error: error.message,
        duration,
        metadata: {
          handlerId: this.handlerId,
          projectPath,
          requestedBy,
          analysisTypes,
          timestamp: new Date(),
          options: this.options
        }
      };
    }
  }

  /**
   * Perform comprehensive project analysis
   * @param {Object} analysisService - Analysis service
   * @param {string} projectPath - Project path
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Analysis results
   */
  async performComprehensiveAnalysis(analysisService, projectPath, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderAnalyzeStep: Performing comprehensive analysis', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const analysis = await analysisService.performComprehensiveAnalysis(projectPath);
      
      return {
        projectStructure: analysis.projectStructure || {},
        codeQuality: analysis.codeQuality || {},
        architecture: analysis.architecture || {},
        dependencies: analysis.dependencies || {},
        performance: analysis.performance || {},
        security: analysis.security || {},
        maintainability: analysis.maintainability || {},
        techStack: analysis.techStack || {},
        metrics: analysis.metrics || {}
      };
    } catch (error) {
      logger.error('VibeCoderAnalyzeStep: Comprehensive analysis failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform security analysis
   * @param {Object} securityService - Security service
   * @param {string} projectPath - Project path
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Security results
   */
  async performSecurityAnalysis(securityService, projectPath, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderAnalyzeStep: Performing security analysis', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      // Use existing packages from analysis if available
      const existingPackages = context.get('existingPackages') || null;
      const security = await securityService.analyzeSecurity(projectPath, existingPackages);
      
      return {
        vulnerabilities: security.vulnerabilities || [],
        codeIssues: security.codeIssues || [],
        configuration: security.configuration || {},
        dependencies: security.dependencies || {},
        secrets: security.secrets || {},
        recommendations: security.recommendations || [],
        score: security.score || 0,
        riskLevel: security.riskLevel || 'unknown'
      };
    } catch (error) {
      logger.error('VibeCoderAnalyzeStep: Security analysis failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate recommendations
   * @param {Object} recommendationService - Recommendation service
   * @param {Object} analysisResults - Analysis results
   * @param {Object} securityResults - Security results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Recommendations
   */
  async generateRecommendations(recommendationService, analysisResults, securityResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderAnalyzeStep: Generating recommendations', {
      handlerId: this.handlerId
    });

    try {
      const recommendations = await recommendationService.generateRecommendations({
        analysis: analysisResults,
        security: securityResults,
        context
      });
      
      return {
        analyze: recommendations.analyze || [],
        refactor: recommendations.refactor || [],
        generate: recommendations.generate || [],
        security: recommendations.security || [],
        performance: recommendations.performance || [],
        maintainability: recommendations.maintainability || []
      };
    } catch (error) {
      logger.error('VibeCoderAnalyzeStep: Recommendation generation failed', {
        handlerId: this.handlerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate metrics
   * @param {Object} metricsService - Metrics service
   * @param {Object} analysisResults - Analysis results
   * @param {Object} securityResults - Security results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Metrics
   */
  async calculateMetrics(metricsService, analysisResults, securityResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderAnalyzeStep: Calculating metrics', {
      handlerId: this.handlerId
    });

    try {
      const metrics = await metricsService.calculateMetrics({
        analysis: analysisResults,
        security: securityResults,
        context
      });
      
      return {
        overall: metrics.overall || 0,
        codeQuality: metrics.codeQuality || 0,
        architecture: metrics.architecture || 0,
        security: metrics.security || 0,
        performance: metrics.performance || 0,
        maintainability: metrics.maintainability || 0,
        complexity: metrics.complexity || 0,
        testCoverage: metrics.testCoverage || 0
      };
    } catch (error) {
      logger.error('VibeCoderAnalyzeStep: Metrics calculation failed', {
        handlerId: this.handlerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Consolidate all results
   * @param {Object} analysisResults - Analysis results
   * @param {Object} securityResults - Security results
   * @param {Object} recommendations - Recommendations
   * @param {Object} metrics - Metrics
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Consolidated results
   */
  async consolidateResults(analysisResults, securityResults, recommendations, metrics, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderAnalyzeStep: Consolidating results', {
      handlerId: this.handlerId
    });

    try {
      const consolidatedResult = {
        // Analysis results
        projectStructure: analysisResults.projectStructure,
        codeQuality: analysisResults.codeQuality,
        architecture: analysisResults.architecture,
        dependencies: analysisResults.dependencies,
        performance: analysisResults.performance,
        maintainability: analysisResults.maintainability,
        techStack: analysisResults.techStack,
        
        // Security results
        security: {
          ...securityResults,
          vulnerabilities: securityResults.vulnerabilities || [],
          codeIssues: securityResults.codeIssues || [],
          configuration: securityResults.configuration || {},
          dependencies: securityResults.dependencies || {},
          secrets: securityResults.secrets || {},
          recommendations: securityResults.recommendations || []
        },
        
        // Recommendations
        recommendations: {
          analyze: recommendations.analyze || [],
          refactor: recommendations.refactor || [],
          generate: recommendations.generate || [],
          security: recommendations.security || [],
          performance: recommendations.performance || [],
          maintainability: recommendations.maintainability || []
        },
        
        // Metrics
        metrics: {
          overall: metrics.overall,
          codeQuality: metrics.codeQuality,
          architecture: metrics.architecture,
          security: metrics.security,
          performance: metrics.performance,
          maintainability: metrics.maintainability,
          complexity: metrics.complexity,
          testCoverage: metrics.testCoverage
        },
        
        // Metadata
        metadata: {
          analysisTypes: context.get('analysisTypes') || ['comprehensive'],
          timestamp: new Date(),
          handlerId: this.handlerId,
          version: '1.0.0'
        }
      };

      return consolidatedResult;
    } catch (error) {
      logger.error('VibeCoderAnalyzeStep: Result consolidation failed', {
        handlerId: this.handlerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get step configuration
   * @returns {Object} Step configuration
   */
  getConfiguration() {
    return {
      name: this._name,
      description: this._description,
      type: this._type,
      options: this.options,
      handlerId: this.handlerId,
      metadata: this._metadata
    };
  }

  /**
   * Get step metadata
   * @returns {Object} Step metadata
   */
  getMetadata() {
    return {
      handlerId: this.handlerId,
      type: 'VibeCoderAnalyzeStep',
      version: '1.0.0',
      supportedOperations: ['comprehensive_analysis', 'sub_command_orchestration', 'result_consolidation'],
      capabilities: ['analysis', 'comprehensive-analysis', 'project-analysis'],
      options: this.options
    };
  }
}

module.exports = VibeCoderAnalyzeStep; 