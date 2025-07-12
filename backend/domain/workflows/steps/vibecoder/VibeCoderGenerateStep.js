/**
 * VibeCoderGenerateStep - VibeCoder generation workflow step
 * Migrates VibeCoderGenerateHandler functionality to unified workflow step system
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');

/**
 * VibeCoder generation workflow step
 */
class VibeCoderGenerateStep extends BaseWorkflowStep {
  constructor(options = {}) {
    super('VibeCoderGenerateStep', 'Performs VibeCoder generation operations', 'vibecoder-generation');
    
    this.options = {
      enableInitialAnalysis: options.enableInitialAnalysis !== false,
      enableGenerationStrategy: options.enableGenerationStrategy !== false,
      enableGenerationOperations: options.enableGenerationOperations !== false,
      enableResultValidation: options.enableResultValidation !== false,
      enableReportGeneration: options.enableReportGeneration !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableEventHandling: options.enableEventHandling !== false,
      enableValidation: options.enableValidation !== false,
      enableLogging: options.enableLogging !== false,
      timeout: options.timeout || 120000, // 120 seconds
      maxConcurrentGenerations: options.maxConcurrentGenerations || 3,
      ...options
    };

    this.handlerId = this.generateHandlerId();
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `vibecoder-generate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute VibeCoder generation step
   * @param {IWorkflowContext} context - Workflow context
   * @returns {Promise<Object>} Generation result
   */
  async executeStep(context) {
    const startTime = Date.now();
    const logger = context.get('logger') || console;
    const projectPath = context.get('projectPath');
    const requestedBy = context.get('requestedBy') || 'system';
    const generateOptions = context.get('generateOptions') || {};
    
    if (!projectPath) {
      throw new Error('Project path not found in context');
    }

    try {
      logger.info('VibeCoderGenerateStep: Starting generation orchestration', {
        handlerId: this.handlerId,
        projectPath,
        requestedBy,
        generateOptions,
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

      // Step 2: Determine generation strategy
      const generationStrategy = await this.determineGenerationStrategy(executionService, initialAnalysis, generateOptions, context);

      // Step 3: Execute generation operations
      const generationResults = await this.executeGenerationOperations(executionService, projectPath, generationStrategy, context);

      // Step 4: Validate generation results
      const validationResults = await this.validateGenerationResults(validationService, projectPath, generationResults, context);

      // Step 5: Generate comprehensive report
      const report = await this.generateGenerationReport(reportService, projectPath, generationResults, validationResults, context);

      // Step 6: Generate output
      const output = await this.generateOutput(outputService, {
        projectPath,
        initialAnalysis,
        generationStrategy,
        generationResults,
        validationResults,
        report,
        generateOptions
      }, context);

      const duration = Date.now() - startTime;

      logger.info('VibeCoderGenerateStep: Generation completed successfully', {
        handlerId: this.handlerId,
        projectPath,
        duration,
        generationCount: generationResults?.length || 0,
        validationPassed: validationResults?.isValid || false
      });

      return {
        success: true,
        stepName: this._name,
        result: {
          initialAnalysis,
          generationStrategy,
          generationResults,
          validationResults,
          report,
          output
        },
        duration,
        metadata: {
          handlerId: this.handlerId,
          projectPath,
          requestedBy,
          generateOptions,
          timestamp: new Date(),
          options: this.options
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('VibeCoderGenerateStep: Generation failed', {
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
          generateOptions,
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
    
    logger.info('VibeCoderGenerateStep: Performing initial analysis', {
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
        techStack: analysis.techStack || {},
        metrics: analysis.metrics || {}
      };
    } catch (error) {
      logger.error('VibeCoderGenerateStep: Initial analysis failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Determine generation strategy
   * @param {Object} executionService - Execution service
   * @param {Object} initialAnalysis - Initial analysis results
   * @param {Object} generateOptions - Generation options
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Generation strategy
   */
  async determineGenerationStrategy(executionService, initialAnalysis, generateOptions, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderGenerateStep: Determining generation strategy', {
      handlerId: this.handlerId
    });

    try {
      const strategy = await executionService.determineGenerationStrategy({
        analysis: initialAnalysis,
        options: generateOptions,
        context
      });
      
      return {
        type: strategy.type || 'comprehensive',
        phases: strategy.phases || [],
        priorities: strategy.priorities || [],
        constraints: strategy.constraints || {},
        estimatedDuration: strategy.estimatedDuration || 0,
        resourceRequirements: strategy.resourceRequirements || {}
      };
    } catch (error) {
      logger.error('VibeCoderGenerateStep: Strategy determination failed', {
        handlerId: this.handlerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute generation operations
   * @param {Object} executionService - Execution service
   * @param {string} projectPath - Project path
   * @param {Object} generationStrategy - Generation strategy
   * @param {Object} context - Workflow context
   * @returns {Promise<Array>} Generation results
   */
  async executeGenerationOperations(executionService, projectPath, generationStrategy, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderGenerateStep: Executing generation operations', {
      handlerId: this.handlerId,
      projectPath,
      strategyType: generationStrategy.type
    });

    try {
      const results = await executionService.executeGenerationOperations({
        projectPath,
        strategy: generationStrategy,
        context
      });
      
      return results.map(result => ({
        operation: result.operation,
        type: result.type,
        success: result.success,
        result: result.result,
        duration: result.duration,
        metadata: result.metadata
      }));
    } catch (error) {
      logger.error('VibeCoderGenerateStep: Generation operations failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate generation results
   * @param {Object} validationService - Validation service
   * @param {string} projectPath - Project path
   * @param {Array} generationResults - Generation results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Validation results
   */
  async validateGenerationResults(validationService, projectPath, generationResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderGenerateStep: Validating generation results', {
      handlerId: this.handlerId,
      projectPath,
      resultCount: generationResults?.length || 0
    });

    try {
      const validation = await validationService.validateGenerationResults({
        projectPath,
        results: generationResults,
        context
      });
      
      return {
        isValid: validation.isValid || false,
        errors: validation.errors || [],
        warnings: validation.warnings || [],
        score: validation.score || 0,
        recommendations: validation.recommendations || []
      };
    } catch (error) {
      logger.error('VibeCoderGenerateStep: Result validation failed', {
        handlerId: this.handlerId,
        projectPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate generation report
   * @param {Object} reportService - Report service
   * @param {string} projectPath - Project path
   * @param {Array} generationResults - Generation results
   * @param {Object} validationResults - Validation results
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Generation report
   */
  async generateGenerationReport(reportService, projectPath, generationResults, validationResults, context) {
    const logger = context.get('logger') || console;
    
    logger.info('VibeCoderGenerateStep: Generating generation report', {
      handlerId: this.handlerId,
      projectPath
    });

    try {
      const report = await reportService.generateGenerationReport({
        projectPath,
        results: generationResults,
        validation: validationResults,
        context
      });
      
      return {
        summary: report.summary || {},
        details: report.details || {},
        metrics: report.metrics || {},
        recommendations: report.recommendations || [],
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('VibeCoderGenerateStep: Report generation failed', {
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
    
    logger.info('VibeCoderGenerateStep: Generating output', {
      handlerId: this.handlerId,
      projectPath: data.projectPath
    });

    try {
      const output = await outputService.generateGenerationOutput({
        ...data,
        context
      });
      
      return {
        files: output.files || [],
        reports: output.reports || [],
        metadata: output.metadata || {},
        summary: output.summary || {}
      };
    } catch (error) {
      logger.error('VibeCoderGenerateStep: Output generation failed', {
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
      type: 'VibeCoderGenerateStep',
      version: '1.0.0',
      supportedOperations: ['generation_orchestration', 'strategy_determination', 'result_validation'],
      capabilities: ['generation', 'code-generation', 'feature-generation'],
      options: this.options
    };
  }
}

module.exports = VibeCoderGenerateStep; 