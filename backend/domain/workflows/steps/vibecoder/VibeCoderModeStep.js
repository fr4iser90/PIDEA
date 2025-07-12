/**
 * VibeCoderModeStep - VibeCoder mode workflow step
 * Migrates VibeCoderModeHandler functionality to unified workflow step system
 * This step orchestrates analyze, refactor, and generate phases in sequence
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');

/**
 * VibeCoder mode workflow step
 */
class VibeCoderModeStep extends BaseWorkflowStep {
  constructor(options = {}) {
    super('VibeCoderModeStep', 'Performs comprehensive VibeCoder mode orchestration', 'vibecoder-mode');
    
    this.options = {
      enableSubprojectDetection: options.enableSubprojectDetection !== false,
      enableAnalyzePhase: options.enableAnalyzePhase !== false,
      enableRefactorPhase: options.enableRefactorPhase !== false,
      enableGeneratePhase: options.enableGeneratePhase !== false,
      enableResultValidation: options.enableResultValidation !== false,
      enableReportGeneration: options.enableReportGeneration !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableEventHandling: options.enableEventHandling !== false,
      enableValidation: options.enableValidation !== false,
      enableLogging: options.enableLogging !== false,
      timeout: options.timeout || 120000, // 120 seconds
      maxConcurrentOperations: options.maxConcurrentOperations || 3,
      ...options
    };

    this.handlerId = this.generateHandlerId();
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `vibecoder-mode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute VibeCoder mode step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Mode orchestration result
   */
  async executeStep(context) {
    const startTime = Date.now();
    const logger = context.get('logger') || console;
    const projectPath = context.get('projectPath');
    const requestedBy = context.get('requestedBy') || 'system';
    const modeOptions = context.get('modeOptions') || {};
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    try {
      logger.info('VibeCoderModeStep: Starting mode orchestration', {
        handlerId: this.handlerId,
        projectPath,
        requestedBy,
        modeOptions,
        options: this.options
      });

      // Get VibeCoder services from context
      const vibecoderAdapter = context.get('vibecoderAdapter');
      if (!vibecoderAdapter) {
        throw new Error('VibeCoder service adapter not found in context');
      }

      const analysisService = vibecoderAdapter.getAnalysisService();
      const executionService = vibecoderAdapter.getExecutionService();
      const validationService = vibecoderAdapter.getValidationService();
      const reportService = vibecoderAdapter.getReportService();
      const outputService = vibecoderAdapter.getOutputService();

      // Validate services
      if (!analysisService || !executionService || !validationService || !reportService || !outputService) {
        throw new Error('Required VibeCoder services not available');
      }

      // Step 1: Detect subprojects
      const subprojects = await this.detectSubprojects(projectPath, context);

      // Step 2: Perform comprehensive analysis
      const analysisResults = await this.performComprehensiveAnalysis(analysisService, subprojects, context);

      // Step 3: Determine execution strategy
      const executionStrategy = await this.determineExecutionStrategy(executionService, analysisResults, modeOptions, context);

      // Step 4: Execute analyze phase
      const analyzeResults = await this.executeAnalyzePhase(executionService, projectPath, executionStrategy, context);

      // Step 5: Execute refactor phase (if enabled)
      let refactorResults = null;
      if (this.options.enableRefactorPhase && analyzeResults.recommendations?.refactor) {
        refactorResults = await this.executeRefactorPhase(executionService, projectPath, executionStrategy, analyzeResults, context);
      }

      // Step 6: Execute generate phase (if enabled)
      let generateResults = null;
      if (this.options.enableGeneratePhase && analyzeResults.recommendations?.generate) {
        generateResults = await this.executeGeneratePhase(executionService, projectPath, executionStrategy, analyzeResults, refactorResults, context);
      }

      // Step 7: Validate overall results
      const validationResults = await this.validateOverallResults(validationService, projectPath, {
        analyze: analyzeResults,
        refactor: refactorResults,
        generate: generateResults
      }, context);

      // Step 8: Generate comprehensive report
      const report = await this.generateComprehensiveReport(reportService, projectPath, {
        analyze: analyzeResults,
        refactor: refactorResults,
        generate: generateResults
      }, validationResults, context);

      // Step 9: Generate output
      const output = await this.generateOutput(outputService, {
        projectPath,
        subprojects,
        analysisResults,
        executionStrategy,
        analyzeResults,
        refactorResults,
        generateResults,
        validationResults,
        report,
        modeOptions
      }, context);

      const duration = Date.now() - startTime;

      logger.info('VibeCoderModeStep: Mode orchestration completed successfully', {
        handlerId: this.handlerId,
        projectPath,
        duration,
        subprojectCount: subprojects.length,
        analyzeSuccess: analyzeResults?.success || false,
        refactorSuccess: refactorResults?.success || false,
        generateSuccess: generateResults?.success || false
      });

      return {
        success: true,
        stepName: this._name,
        result: {
          subprojects,
          analysisResults,
          executionStrategy,
          analyzeResults,
          refactorResults,
          generateResults,
          validationResults,
          report,
          output
        },
        duration,
        metadata: {
          handlerId: this.handlerId,
          projectPath,
          requestedBy,
          modeOptions,
          timestamp: new Date(),
          options: this.options
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('VibeCoderModeStep: Mode orchestration failed', {
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
          modeOptions,
          timestamp: new Date(),
          options: this.options
        }
      };
    }
  }

  /**
   * Detect subprojects
   * @param {string} projectPath - Project path
   * @param {Object} context - Workflow context
   * @returns {Promise<Array>} Subprojects
   */
  async detectSubprojects(projectPath, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Detecting subprojects', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const subprojectDetector = context.get('subprojectDetector');
      if (!subprojectDetector) {
        logger.warn('VibeCoderModeStep: Subproject detector not available, using single project');
        return [{ path: projectPath, type: 'unknown', meta: {} }];
      }

      const subprojects = await subprojectDetector.detectSubprojects(projectPath);
      
      logger.info('VibeCoderModeStep: Subprojects detected', {
        handlerId: this.handlerId,
        projectPath,
        subprojectCount: subprojects.length
      });

      return subprojects;
    } catch (error) {
      logger.error('VibeCoderModeStep: Subproject detection failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform comprehensive analysis
   * @param {Object} analysisService - Analysis service
   * @param {Array} subprojects - Subprojects
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Analysis results
   */
  async performComprehensiveAnalysis(analysisService, subprojects, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Performing comprehensive analysis', {
      handlerId: this.handlerId,
      subprojectCount: subprojects.length
    });

    try {
      let results = {};
      let errors = [];

      if (subprojects.length > 1) {
        // Monorepo strategy: Analyze all subprojects
        await Promise.all(subprojects.map(async (sub) => {
          try {
            results[sub.path] = await analysisService.analyzeSubproject(sub);
          } catch (e) {
            errors.push({ path: sub.path, error: e.message });
          }
        }));
      } else if (subprojects.length === 1) {
        // Single repo strategy: Analyze single subproject
        try {
          results[subprojects[0].path] = await analysisService.analyzeSubproject(subprojects[0]);
        } catch (e) {
          errors.push({ path: subprojects[0].path, error: e.message });
        }
      } else {
        // Fallback: Analyze root
        try {
          results[subprojects[0]?.path || 'root'] = await analysisService.analyzeSubproject({ 
            path: subprojects[0]?.path || 'root', 
            type: 'unknown', 
            meta: {} 
          });
        } catch (e) {
          errors.push({ path: 'root', error: e.message });
        }
      }

      return { results, errors };
    } catch (error) {
      logger.error('VibeCoderModeStep: Comprehensive analysis failed', {
        handlerId: this.handlerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Determine execution strategy
   * @param {Object} executionService - Execution service
   * @param {Object} analysisResults - Analysis results
   * @param {Object} modeOptions - Mode options
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Execution strategy
   */
  async determineExecutionStrategy(executionService, analysisResults, modeOptions, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Determining execution strategy', {
      handlerId: this.handlerId
    });

    try {
      const strategy = await executionService.determineExecutionStrategy(analysisResults, modeOptions);
      
      return {
        type: strategy.type || 'comprehensive',
        phases: strategy.phases || [],
        priorities: strategy.priorities || [],
        constraints: strategy.constraints || {},
        estimatedDuration: strategy.estimatedDuration || 0,
        resourceRequirements: strategy.resourceRequirements || {}
      };
    } catch (error) {
      logger.error('VibeCoderModeStep: Strategy determination failed', {
        handlerId: this.handlerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute analyze phase
   * @param {Object} executionService - Execution service
   * @param {string} projectPath - Project path
   * @param {Object} executionStrategy - Execution strategy
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Analyze results
   */
  async executeAnalyzePhase(executionService, projectPath, executionStrategy, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Executing analyze phase', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const results = await executionService.executeAnalyzePhase(projectPath, executionStrategy);
      
      return {
        success: results.success || false,
        analysis: results.analysis || {},
        recommendations: results.recommendations || {},
        metrics: results.metrics || {},
        duration: results.duration || 0
      };
    } catch (error) {
      logger.error('VibeCoderModeStep: Analyze phase failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute refactor phase
   * @param {Object} executionService - Execution service
   * @param {string} projectPath - Project path
   * @param {Object} executionStrategy - Execution strategy
   * @param {Object} analyzeResults - Analyze results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Refactor results
   */
  async executeRefactorPhase(executionService, projectPath, executionStrategy, analyzeResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Executing refactor phase', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const results = await executionService.executeRefactorPhase(projectPath, executionStrategy, analyzeResults);
      
      return {
        success: results.success || false,
        refactoring: results.refactoring || {},
        changes: results.changes || [],
        metrics: results.metrics || {},
        duration: results.duration || 0
      };
    } catch (error) {
      logger.error('VibeCoderModeStep: Refactor phase failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute generate phase
   * @param {Object} executionService - Execution service
   * @param {string} projectPath - Project path
   * @param {Object} executionStrategy - Execution strategy
   * @param {Object} analyzeResults - Analyze results
   * @param {Object} refactorResults - Refactor results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Generate results
   */
  async executeGeneratePhase(executionService, projectPath, executionStrategy, analyzeResults, refactorResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Executing generate phase', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const results = await executionService.executeGeneratePhase(projectPath, executionStrategy, analyzeResults, refactorResults);
      
      return {
        success: results.success || false,
        generation: results.generation || {},
        files: results.files || [],
        metrics: results.metrics || {},
        duration: results.duration || 0
      };
    } catch (error) {
      logger.error('VibeCoderModeStep: Generate phase failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate overall results
   * @param {Object} validationService - Validation service
   * @param {string} projectPath - Project path
   * @param {Object} results - All phase results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Validation results
   */
  async validateOverallResults(validationService, projectPath, results, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Validating overall results', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const validation = await validationService.validateOverallResults(projectPath, results);
      
      return {
        isValid: validation.isValid || false,
        errors: validation.errors || [],
        warnings: validation.warnings || [],
        score: validation.score || 0,
        recommendations: validation.recommendations || []
      };
    } catch (error) {
      logger.error('VibeCoderModeStep: Overall validation failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive report
   * @param {Object} reportService - Report service
   * @param {string} projectPath - Project path
   * @param {Object} results - All phase results
   * @param {Object} validationResults - Validation results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Comprehensive report
   */
  async generateComprehensiveReport(reportService, projectPath, results, validationResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Generating comprehensive report', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const report = await reportService.generateComprehensiveReport(projectPath, results, validationResults);
      
      return {
        summary: report.summary || {},
        details: report.details || {},
        metrics: report.metrics || {},
        recommendations: report.recommendations || [],
        phases: report.phases || {},
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('VibeCoderModeStep: Report generation failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate output
   * @param {Object} outputService - Output service
   * @param {Object} data - Output data
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Generated output
   */
  async generateOutput(outputService, data, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderModeStep: Generating output', {
      handlerId: this.handlerId,
      projectPath: data.projectPath
    });

    try {
      const output = await outputService.generateModeOutput({
        ...data,
        context
      });
      
      return {
        files: output.files || [],
        reports: output.reports || [],
        metadata: output.metadata || {},
        summary: output.summary || {},
        phases: output.phases || {}
      };
    } catch (error) {
      logger.error('VibeCoderModeStep: Output generation failed', {
        handlerId: this.handlerId,
        projectPath: data.projectPath,
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
      type: 'VibeCoderModeStep',
      version: '1.0.0',
      supportedOperations: ['mode_orchestration', 'phase_execution', 'comprehensive_workflow'],
      capabilities: ['orchestration', 'workflow-management', 'comprehensive-workflow'],
      options: this.options
    };
  }
}

module.exports = VibeCoderModeStep; 