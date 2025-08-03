const ServiceLogger = require('@logging/ServiceLogger');
const AnalysisStepRepository = require('../../repositories/AnalysisStepRepository');

/**
 * IndividualAnalysisService - Manages individual analysis steps with progress tracking
 * Integrates with existing analysis services and provides step-by-step execution
 */
class IndividualAnalysisService {
  constructor(
    codeQualityService,
    securityService,
    performanceService,
    architectureService,
    analysisStepRepository,
    eventBus = null
  ) {
    this.codeQualityService = codeQualityService;
    this.securityService = securityService;
    this.performanceService = performanceService;
    this.architectureService = architectureService;
    this.analysisStepRepository = analysisStepRepository;
    this.eventBus = eventBus;
    this.logger = new ServiceLogger('IndividualAnalysisService');
    
    // Analysis type configurations
    this.analysisConfigs = {
      'code-quality': {
        service: this.codeQualityService,
        method: 'analyzeCodeQuality',
        timeout: 2 * 60 * 1000, // 2 minutes
        progressSteps: [
          { progress: 10, description: 'Initializing code quality analysis' },
          { progress: 30, description: 'Scanning source files' },
          { progress: 60, description: 'Analyzing code patterns' },
          { progress: 80, description: 'Generating quality metrics' },
          { progress: 100, description: 'Code quality analysis completed' }
        ]
      },
      'security': {
        service: this.securityService,
        method: 'analyzeSecurity',
        timeout: 3 * 60 * 1000, // 3 minutes
        progressSteps: [
          { progress: 10, description: 'Initializing security analysis' },
          { progress: 25, description: 'Scanning dependencies' },
          { progress: 50, description: 'Analyzing code vulnerabilities' },
          { progress: 75, description: 'Checking security patterns' },
          { progress: 100, description: 'Security analysis completed' }
        ]
      },
      'performance': {
        service: this.performanceService,
        method: 'analyzePerformance',
        timeout: 4 * 60 * 1000, // 4 minutes
        progressSteps: [
          { progress: 10, description: 'Initializing performance analysis' },
          { progress: 30, description: 'Analyzing code complexity' },
          { progress: 50, description: 'Measuring performance metrics' },
          { progress: 75, description: 'Identifying bottlenecks' },
          { progress: 100, description: 'Performance analysis completed' }
        ]
      },
      'architecture': {
        service: this.architectureService,
        method: 'analyzeArchitecture',
        timeout: 5 * 60 * 1000, // 5 minutes
        progressSteps: [
          { progress: 10, description: 'Initializing architecture analysis' },
          { progress: 30, description: 'Mapping project structure' },
          { progress: 50, description: 'Analyzing dependencies' },
          { progress: 75, description: 'Evaluating architectural patterns' },
          { progress: 100, description: 'Architecture analysis completed' }
        ]
      },
      'techstack': {
        service: this.getTechStackAnalyzer(),
        method: 'analyzeTechStack',
        timeout: 3 * 60 * 1000, // 3 minutes
        progressSteps: [
          { progress: 10, description: 'Initializing tech stack analysis' },
          { progress: 30, description: 'Scanning package files' },
          { progress: 60, description: 'Analyzing dependencies' },
          { progress: 80, description: 'Detecting frameworks and tools' },
          { progress: 100, description: 'Tech stack analysis completed' }
        ]
      },
      'recommendations': {
        service: this.getRecommendationsService(),
        method: 'generateRecommendations',
        timeout: 2 * 60 * 1000, // 2 minutes
        progressSteps: [
          { progress: 10, description: 'Initializing recommendations analysis' },
          { progress: 40, description: 'Analyzing project structure' },
          { progress: 70, description: 'Generating recommendations' },
          { progress: 100, description: 'Recommendations analysis completed' }
        ]
      }
    };
  }

  /**
   * Execute a single analysis step
   * @param {string} projectId - Project ID
   * @param {string} analysisType - Analysis type
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalysisStep(projectId, analysisType, options = {}) {
    const config = this.analysisConfigs[analysisType];
    if (!config) {
      throw new Error(`Unsupported analysis type: ${analysisType}`);
    }

    let step = null;
    try {
      // Create analysis step
      step = await this.analysisStepRepository.createStep(projectId, analysisType, {
        timeout: config.timeout,
        ...options
      });

      this.logger.info(`Starting ${analysisType} analysis for project: ${projectId}`);

      // Start the step
      step = await this.analysisStepRepository.startStep(step.id);

      // Execute analysis with progress tracking
      const result = await this.executeAnalysisWithProgress(
        step.id,
        config,
        options
      );

      // Complete the step
      step = await this.analysisStepRepository.completeStep(step.id, this._sanitizeForJSON(result), {
        fileCount: result.fileCount || null,
        lineCount: result.lineCount || null,
        memoryUsage: result.memoryUsage || null
      });

      this.logger.info(`Completed ${analysisType} analysis for project: ${projectId}`);

      return {
        success: true,
        stepId: step.id,
        result: result,
        step: step.toSummary()
      };

    } catch (error) {
      this.logger.error(`Failed to execute ${analysisType} analysis:`, error);

      if (step) {
        await this.analysisStepRepository.failStep(step.id, {
          message: error.message,
          type: error.name,
          stack: error.stack
        });
      }

      throw error;
    }
  }

  /**
   * Execute analysis with progress tracking
   * @param {string} stepId - Step ID
   * @param {Object} config - Analysis configuration
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async executeAnalysisWithProgress(stepId, config, options) {
    const { service, method, progressSteps } = config;
    
    // Progress tracking interval
    let currentProgressIndex = 0;
    const progressInterval = setInterval(async () => {
      if (currentProgressIndex < progressSteps.length) {
        const progressStep = progressSteps[currentProgressIndex];
        await this.analysisStepRepository.updateProgress(
          stepId,
          progressStep.progress,
          { currentStep: progressStep.description }
        );
        currentProgressIndex++;
      }
    }, 1000); // Update progress every second

    try {
      // Execute the analysis
      const result = await service[method](options.projectPath || '', options);
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      // Update to 100% completion
      await this.analysisStepRepository.updateProgress(stepId, 100, {
        currentStep: 'Analysis completed successfully'
      });

      return result;

    } catch (error) {
      // Clear progress interval
      clearInterval(progressInterval);
      throw error;
    }
  }

  /**
   * Execute multiple analysis steps sequentially
   * @param {string} projectId - Project ID
   * @param {Array} analysisTypes - Array of analysis types
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Results for all steps
   */
  async executeAnalysisSteps(projectId, analysisTypes, options = {}) {
    const results = {};
    const steps = [];

    for (const analysisType of analysisTypes) {
      try {
        this.logger.info(`Executing ${analysisType} analysis for project: ${projectId}`);
        
        const result = await this.executeAnalysisStep(projectId, analysisType, options);
        results[analysisType] = result;
        steps.push(result.step);

      } catch (error) {
        this.logger.error(`Failed to execute ${analysisType} analysis:`, error);
        results[analysisType] = {
          success: false,
          error: error.message,
          step: null
        };
      }
    }

    return {
      success: true,
      results,
      steps,
      completedAt: new Date()
    };
  }

  /**
   * Get analysis step by ID
   * @param {string} stepId - Step ID
   * @returns {Promise<Object>} Step information
   */
  async getStep(stepId) {
    const step = await this.analysisStepRepository.findById(stepId);
    if (!step) {
      throw new Error(`Analysis step not found: ${stepId}`);
    }
    return step.toSummary();
  }

  /**
   * Get all steps for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of step summaries
   */
  async getProjectSteps(projectId, options = {}) {
    const steps = await this.analysisStepRepository.findByProjectId(projectId, options);
    return steps.map(step => step.toSummary());
  }

  /**
   * Get active steps for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of active step summaries
   */
  async getActiveSteps(projectId) {
    const steps = await this.analysisStepRepository.findActiveSteps(projectId);
    return steps.map(step => step.toSummary());
  }

  /**
   * Get latest completed step for a project and analysis type
   * @param {string} projectId - Project ID
   * @param {string} analysisType - Analysis type
   * @returns {Promise<Object|null>} Latest completed step or null
   */
  async getLatestCompletedStep(projectId, analysisType) {
    const step = await this.analysisStepRepository.findLatestCompleted(projectId, analysisType);
    return step ? step.toSummary() : null;
  }

  /**
   * Cancel an analysis step
   * @param {string} stepId - Step ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled step information
   */
  async cancelStep(stepId, reason = 'User cancelled') {
    const step = await this.analysisStepRepository.cancelStep(stepId, reason);
    return step.toSummary();
  }

  /**
   * Retry a failed analysis step
   * @param {string} stepId - Step ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Retry result
   */
  async retryStep(stepId, options = {}) {
    const step = await this.analysisStepRepository.findById(stepId);
    if (!step) {
      throw new Error(`Analysis step not found: ${stepId}`);
    }

    if (!step.canRetry()) {
      throw new Error(`Step cannot be retried: ${stepId}`);
    }

    // Retry the step
    step.retry();
    await this.analysisStepRepository.updateProgress(stepId, 0, {
      currentStep: 'Retrying analysis step'
    });

    // Execute the analysis again
    return this.executeAnalysisStep(step.projectId, step.analysisType, options);
  }

  /**
   * Get step statistics for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Step statistics
   */
  async getStepStats(projectId) {
    return await this.analysisStepRepository.getStepStats(projectId);
  }

  /**
   * Clean up old completed steps
   * @param {number} daysToKeep - Number of days to keep completed steps
   * @returns {Promise<number>} Number of deleted steps
   */
  async cleanupOldSteps(daysToKeep = 30) {
    return await this.analysisStepRepository.cleanupOldSteps(daysToKeep);
  }

  /**
   * Get supported analysis types
   * @returns {Array} Array of supported analysis types
   */
  getSupportedAnalysisTypes() {
    return Object.keys(this.analysisConfigs);
  }

  /**
   * Get analysis type configuration
   * @param {string} analysisType - Analysis type
   * @returns {Object|null} Analysis configuration or null
   */
  getAnalysisConfig(analysisType) {
    return this.analysisConfigs[analysisType] || null;
  }

  /**
   * Get tech stack analyzer from application context
   * @returns {Object} Tech stack analyzer service
   */
  getTechStackAnalyzer() {
    const application = global.application;
    if (!application || !application.techStackAnalyzer) {
      throw new Error('Tech stack analyzer not available');
    }
    return application.techStackAnalyzer;
  }

  /**
   * Get recommendations service from application context
   * @returns {Object} Recommendations service
   */
  getRecommendationsService() {
    const application = global.application;
    if (!application || !application.recommendationsService) {
      throw new Error('Recommendations service not available');
    }
    return application.recommendationsService;
  }

  /**
   * Sanitize object for JSON serialization by removing circular references
   * @param {any} obj - Object to sanitize
   * @returns {any} Sanitized object
   */
  _sanitizeForJSON(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj !== 'object') {
      return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this._sanitizeForJSON(item));
    }
    
    // Handle objects
    const sanitized = {};
    const seen = new WeakSet();
    
    const sanitize = (obj) => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      // Check for circular references
      if (seen.has(obj)) {
        return '[Circular Reference]';
      }
      
      // Skip Node.js internal objects that cause circular references
      if (obj.constructor && (
        obj.constructor.name === 'Timeout' ||
        obj.constructor.name === 'TimersList' ||
        obj.constructor.name === 'EventEmitter' ||
        obj.constructor.name === 'Stream' ||
        obj.constructor.name === 'Buffer'
      )) {
        return `[${obj.constructor.name}]`;
      }
      
      seen.add(obj);
      
      if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
      }
      
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        try {
          result[key] = sanitize(value);
        } catch (error) {
          result[key] = '[Error serializing]';
        }
      }
      
      return result;
    };
    
    return sanitize(obj);
  }
}

module.exports = IndividualAnalysisService; 