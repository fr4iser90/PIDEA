/**
 * VibeCoderServiceAdapter - Adapter for existing VibeCoder services
 * Bridges existing modular VibeCoder services with the unified workflow step system
 */
const BaseWorkflowStep = require('../BaseWorkflowStep');

/**
 * VibeCoder service adapter for workflow steps
 */
class VibeCoderServiceAdapter {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
    this.commandBus = dependencies.commandBus;
    
    // Initialize existing VibeCoder services
    this.initializeServices(dependencies);
  }

  /**
   * Initialize existing VibeCoder services
   * @param {Object} dependencies - Service dependencies
   */
  initializeServices(dependencies) {
    try {
      // Import existing VibeCoder services
      const {
        AnalysisService,
        SecurityService,
        RecommendationService,
        MetricsService,
        ExecutionService,
        ValidationService,
        ReportService,
        OutputService
      } = require('../../../../application/handlers/vibecoder/services');

      // Initialize services with dependencies
      this.analysisService = new AnalysisService({
        logger: this.logger,
        projectAnalyzer: dependencies.projectAnalyzer,
        codeQualityAnalyzer: dependencies.codeQualityAnalyzer,
        architectureAnalyzer: dependencies.architectureAnalyzer,
        dependencyAnalyzer: dependencies.dependencyAnalyzer,
        securityAnalyzer: dependencies.securityAnalyzer,
        performanceAnalyzer: dependencies.performanceAnalyzer
      });

      this.securityService = new SecurityService({ 
        logger: this.logger 
      });

      this.recommendationService = new RecommendationService({ 
        logger: this.logger 
      });

      this.metricsService = new MetricsService({ 
        logger: this.logger 
      });

      this.executionService = new ExecutionService({ 
        logger: this.logger,
        commandBus: this.commandBus
      });

      this.validationService = new ValidationService({ 
        logger: this.logger 
      });

      this.reportService = new ReportService({ 
        logger: this.logger 
      });

      this.outputService = new OutputService({ 
        logger: this.logger 
      });

      this.logger.info('VibeCoderServiceAdapter: All services initialized successfully');

    } catch (error) {
      this.logger.error('VibeCoderServiceAdapter: Failed to initialize services', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to initialize VibeCoder services: ${error.message}`);
    }
  }

  /**
   * Get analysis service
   * @returns {AnalysisService} Analysis service instance
   */
  getAnalysisService() {
    return this.analysisService;
  }

  /**
   * Get security service
   * @returns {SecurityService} Security service instance
   */
  getSecurityService() {
    return this.securityService;
  }

  /**
   * Get recommendation service
   * @returns {RecommendationService} Recommendation service instance
   */
  getRecommendationService() {
    return this.recommendationService;
  }

  /**
   * Get metrics service
   * @returns {MetricsService} Metrics service instance
   */
  getMetricsService() {
    return this.metricsService;
  }

  /**
   * Get execution service
   * @returns {ExecutionService} Execution service instance
   */
  getExecutionService() {
    return this.executionService;
  }

  /**
   * Get validation service
   * @returns {ValidationService} Validation service instance
   */
  getValidationService() {
    return this.validationService;
  }

  /**
   * Get report service
   * @returns {ReportService} Report service instance
   */
  getReportService() {
    return this.reportService;
  }

  /**
   * Get output service
   * @returns {OutputService} Output service instance
   */
  getOutputService() {
    return this.outputService;
  }

  /**
   * Get all services
   * @returns {Object} All service instances
   */
  getAllServices() {
    return {
      analysisService: this.analysisService,
      securityService: this.securityService,
      recommendationService: this.recommendationService,
      metricsService: this.metricsService,
      executionService: this.executionService,
      validationService: this.validationService,
      reportService: this.reportService,
      outputService: this.outputService
    };
  }

  /**
   * Validate service availability
   * @returns {Object} Validation result
   */
  validateServices() {
    const services = this.getAllServices();
    const missingServices = [];
    const availableServices = [];

    for (const [name, service] of Object.entries(services)) {
      if (service) {
        availableServices.push(name);
      } else {
        missingServices.push(name);
      }
    }

    return {
      isValid: missingServices.length === 0,
      availableServices,
      missingServices,
      totalServices: Object.keys(services).length
    };
  }

  /**
   * Create workflow context with services
   * @param {Object} baseContext - Base workflow context
   * @returns {Object} Enhanced context with VibeCoder services
   */
  createWorkflowContext(baseContext) {
    const services = this.getAllServices();
    
    return {
      ...baseContext,
      ...services,
      vibecoderAdapter: this,
      logger: this.logger,
      eventBus: this.eventBus,
      commandBus: this.commandBus
    };
  }

  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata
   */
  getMetadata() {
    const validation = this.validateServices();
    
    return {
      type: 'VibeCoderServiceAdapter',
      version: '1.0.0',
      services: validation.availableServices,
      missingServices: validation.missingServices,
      isValid: validation.isValid,
      totalServices: validation.totalServices
    };
  }
}

module.exports = VibeCoderServiceAdapter; 