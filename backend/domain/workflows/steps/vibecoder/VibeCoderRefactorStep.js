/**
 * VibeCoderRefactorStep - VibeCoder refactoring workflow step
 * Migrates VibeCoderRefactorHandler functionality to unified workflow step system
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');

/**
 * VibeCoder refactoring workflow step
 */
class VibeCoderRefactorStep extends BaseWorkflowStep {
  constructor(options = {}) {
    super('VibeCoderRefactorStep', 'Performs VibeCoder refactoring operations', 'vibecoder-refactoring');
    
    this.options = {
      enableInitialAnalysis: options.enableInitialAnalysis !== false,
      enableRefactorStrategy: options.enableRefactorStrategy !== false,
      enableRefactorOperations: options.enableRefactorOperations !== false,
      enableResultValidation: options.enableResultValidation !== false,
      enableReportGeneration: options.enableReportGeneration !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableEventHandling: options.enableEventHandling !== false,
      enableValidation: options.enableValidation !== false,
      enableLogging: options.enableLogging !== false,
      timeout: options.timeout || 120000, // 120 seconds
      maxConcurrentRefactors: options.maxConcurrentRefactors || 3,
      ...options
    };

    this.handlerId = this.generateHandlerId();
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `vibecoder-refactor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute VibeCoder refactoring step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Refactoring result
   */
  async executeStep(context) {
    const startTime = Date.now();
    const logger = context.get('logger') || console;
    const projectPath = context.get('projectPath');
    const requestedBy = context.get('requestedBy') || 'system';
    const refactorOptions = context.get('refactorOptions') || {};
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    try {
      logger.info('VibeCoderRefactorStep: Starting refactoring orchestration', {
        handlerId: this.handlerId,
        projectPath,
        requestedBy,
        refactorOptions,
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

      // Step 1: Initial project analysis
      const initialAnalysis = await this.performInitialAnalysis(analysisService, projectPath, context);

      // Step 2: Determine refactoring strategy
      const refactorStrategy = await this.determineRefactorStrategy(executionService, initialAnalysis, refactorOptions, context);

      // Step 3: Execute refactoring operations
      const refactorResults = await this.executeRefactorOperations(executionService, projectPath, refactorStrategy, context);

      // Step 4: Validate refactoring results
      const validationResults = await this.validateRefactoringResults(validationService, projectPath, refactorResults, context);

      // Step 5: Generate refactoring report
      const report = await this.generateRefactoringReport(reportService, projectPath, refactorResults, validationResults, context);

      // Step 6: Generate output
      const output = await this.generateOutput(outputService, {
        projectPath,
        initialAnalysis,
        refactorStrategy,
        refactorResults,
        validationResults,
        report,
        refactorOptions
      }, context);

      const duration = Date.now() - startTime;

      logger.info('VibeCoderRefactorStep: Refactoring completed successfully', {
        handlerId: this.handlerId,
        projectPath,
        duration,
        refactorCount: refactorResults?.length || 0,
        validationPassed: validationResults?.isValid || false
      });

      return {
        success: true,
        stepName: this._name,
        result: {
          initialAnalysis,
          refactorStrategy,
          refactorResults,
          validationResults,
          report,
          output
        },
        duration,
        metadata: {
          handlerId: this.handlerId,
          projectPath,
          requestedBy,
          refactorOptions,
          timestamp: new Date(),
          options: this.options
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('VibeCoderRefactorStep: Refactoring failed', {
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
          refactorOptions,
          timestamp: new Date(),
          options: this.options
        }
      };
    }
  }

  /**
   * Perform initial project analysis
   * @param {Object} analysisService - Analysis service
   * @param {string} projectPath - Project path
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Initial analysis results
   */
  async performInitialAnalysis(analysisService, projectPath, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderRefactorStep: Performing initial analysis', {
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
        maintainability: analysis.maintainability || {},
        metrics: analysis.metrics || {}
      };
    } catch (error) {
      logger.error('VibeCoderRefactorStep: Initial analysis failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Determine refactoring strategy
   * @param {Object} executionService - Execution service
   * @param {Object} initialAnalysis - Initial analysis results
   * @param {Object} refactorOptions - Refactoring options
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Refactoring strategy
   */
  async determineRefactorStrategy(executionService, initialAnalysis, refactorOptions, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderRefactorStep: Determining refactoring strategy', {
      handlerId: this.handlerId
    });

    try {
      const strategy = await executionService.determineRefactorStrategy({
        analysis: initialAnalysis,
        options: refactorOptions,
        context
      });
      
      return {
        type: strategy.type || 'comprehensive',
        phases: strategy.phases || [],
        priorities: strategy.priorities || [],
        constraints: strategy.constraints || {},
        estimatedDuration: strategy.estimatedDuration || 0,
        resourceRequirements: strategy.resourceRequirements || {},
        refactoringTargets: strategy.refactoringTargets || []
      };
    } catch (error) {
      logger.error('VibeCoderRefactorStep: Strategy determination failed', {
        handlerId: this.handlerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute refactoring operations
   * @param {Object} executionService - Execution service
   * @param {string} projectPath - Project path
   * @param {Object} refactorStrategy - Refactoring strategy
   * @param {Object} context - Workflow context
   * @returns {Promise<Array>} Refactoring results
   */
  async executeRefactorOperations(executionService, projectPath, refactorStrategy, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderRefactorStep: Executing refactoring operations', {
      handlerId: this.handlerId,
      projectPath,
      strategyType: refactorStrategy.type
    });

    try {
      const results = await executionService.executeRefactorOperations({
        projectPath,
        strategy: refactorStrategy,
        context
      });
      
      return results.map(result => ({
        operation: result.operation,
        type: result.type,
        target: result.target,
        success: result.success,
        result: result.result,
        duration: result.duration,
        metadata: result.metadata,
        changes: result.changes || []
      }));
    } catch (error) {
      logger.error('VibeCoderRefactorStep: Refactoring operations failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate refactoring results
   * @param {Object} validationService - Validation service
   * @param {string} projectPath - Project path
   * @param {Array} refactorResults - Refactoring results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Validation results
   */
  async validateRefactoringResults(validationService, projectPath, refactorResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderRefactorStep: Validating refactoring results', {
      handlerId: this.handlerId,
      projectPath,
      resultCount: refactorResults?.length || 0
    });

    try {
      const validation = await validationService.validateRefactoringResults({
        projectPath,
        results: refactorResults,
        context
      });
      
      return {
        isValid: validation.isValid || false,
        errors: validation.errors || [],
        warnings: validation.warnings || [],
        score: validation.score || 0,
        recommendations: validation.recommendations || [],
        qualityImprovement: validation.qualityImprovement || 0
      };
    } catch (error) {
      logger.error('VibeCoderRefactorStep: Result validation failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate refactoring report
   * @param {Object} reportService - Report service
   * @param {string} projectPath - Project path
   * @param {Array} refactorResults - Refactoring results
   * @param {Object} validationResults - Validation results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Refactoring report
   */
  async generateRefactoringReport(reportService, projectPath, refactorResults, validationResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderRefactorStep: Generating refactoring report', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const report = await reportService.generateRefactoringReport({
        projectPath,
        results: refactorResults,
        validation: validationResults,
        context
      });
      
      return {
        summary: report.summary || {},
        details: report.details || {},
        metrics: report.metrics || {},
        recommendations: report.recommendations || [],
        changes: report.changes || [],
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('VibeCoderRefactorStep: Report generation failed', {
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
    
    logger.info('VibeCoderRefactorStep: Generating output', {
      handlerId: this.handlerId,
      projectPath: data.projectPath
    });

    try {
      const output = await outputService.generateRefactoringOutput({
        ...data,
        context
      });
      
      return {
        files: output.files || [],
        reports: output.reports || [],
        metadata: output.metadata || {},
        summary: output.summary || {},
        changes: output.changes || []
      };
    } catch (error) {
      logger.error('VibeCoderRefactorStep: Output generation failed', {
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
      type: 'VibeCoderRefactorStep',
      version: '1.0.0',
      supportedOperations: ['refactoring_orchestration', 'strategy_determination', 'result_validation'],
      capabilities: ['refactoring', 'code-refactoring', 'optimization'],
      options: this.options
    };
  }
}

module.exports = VibeCoderRefactorStep; 