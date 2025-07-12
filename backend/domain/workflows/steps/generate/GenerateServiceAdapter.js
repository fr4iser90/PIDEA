/**
 * GenerateServiceAdapter - Adapter for existing generate services
 * 
 * This adapter provides a bridge between existing generate services and the new
 * unified workflow step system. It handles the translation of requests and responses
 * between the old and new systems, ensuring backward compatibility.
 */
const EventBus = require('../../../../infrastructure/messaging/EventBus');
const AnalysisRepository = require('../../../../domain/repositories/AnalysisRepository');
/**
 * Generate service adapter
 */
class GenerateServiceAdapter {
  /**
   * Create a new generate service adapter
   * @param {Object} options - Adapter options
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.analysisRepository = options.analysisRepository || new AnalysisRepository();
    this.logger = options.logger || console;
    this.options = {
      enableSupport: options.enableSupport !== false,
      enableEventPublishing: options.enableEventPublishing !== false,
      enableErrorHandling: options.enableErrorHandling !== false,
      ...options
    };
  }
  /**
   * Adapt generate script service
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Adapted result
   */
  async adaptScriptService(context, options = {}) {
    try {
      const projectPath = context.get('projectPath');
      const scriptType = options.scriptType || 'build';
      const GenerateScriptHandler = require('../../../../application/handlers/generate/GenerateScriptHandler');
      const command = this.createMockCommand({
        projectPath,
        scriptType,
        options
      });
      // Create handler instance
      const handler = new GenerateScriptHandler({
        eventBus: this.eventBus,
        analysisRepository: this.analysisRepository,
        logger: this.logger
      });
      const result = await handler.handle(command);
      // Adapt result to workflow format
      return this.adaptResult(result, 'script');
    } catch (error) {
      this.logger.error('GenerateServiceAdapter: Script service adaptation failed:', error);
      throw error;
    }
  }
  /**
   * Adapt generate scripts service
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Adapted result
   */
  async adaptScriptsService(context, options = {}) {
    try {
      const projectPath = context.get('projectPath');
      const scriptTypes = options.scriptTypes || ['build', 'deploy'];
      const GenerateScriptsHandler = require('../../../../application/handlers/generate/GenerateScriptsHandler');
      const command = this.createMockCommand({
        projectPath,
        scriptTypes,
        options
      });
      // Create handler instance
      const handler = new GenerateScriptsHandler({
        eventBus: this.eventBus,
        analysisRepository: this.analysisRepository,
        logger: this.logger
      });
      const result = await handler.handle(command);
      // Adapt result to workflow format
      return this.adaptResult(result, 'scripts');
    } catch (error) {
      this.logger.error('GenerateServiceAdapter: Scripts service adaptation failed:', error);
      throw error;
    }
  }
  /**
   * Adapt generate documentation service
   * @param {Object} context - Workflow context
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Adapted result
   */
  async adaptDocumentationService(context, options = {}) {
    try {
      const projectPath = context.get('projectPath');
      const docType = options.docType || 'comprehensive';
      const GenerateDocumentationHandler = require('../../../../application/handlers/generate/GenerateDocumentationHandler');
      const command = this.createMockCommand({
        projectPath,
        docType,
        options
      });
      // Create handler instance
      const handler = new GenerateDocumentationHandler({
        eventBus: this.eventBus,
        analysisRepository: this.analysisRepository,
        logger: this.logger
      });
      const result = await handler.handle(command);
      // Adapt result to workflow format
      return this.adaptResult(result, 'documentation');
    } catch (error) {
      this.logger.error('GenerateServiceAdapter: Documentation service adaptation failed:', error);
      throw error;
    }
  }
  /**
   * Create mock command object for  handlers
   * @param {Object} params - Command parameters
   * @returns {Object} Mock command object
   */
  createMockCommand(params) {
    const { projectPath, scriptType, scriptTypes, docType, options } = params;
    return {
      commandId: this.generateCommandId(),
      projectPath,
      scriptType,
      scriptTypes,
      docType,
      requestedBy: options.requestedBy || 'system',
      timestamp: new Date(),
      validateBusinessRules: () => ({ isValid: true, errors: [] }),
      getGenerateOptions: () => ({
        scriptType,
        scriptTypes,
        docType,
        ...options
      }),
      getOutputConfiguration: () => ({
        includeRawData: options.includeRawData || false,
        includeMetadata: options.includeMetadata || true
      }),
      getMetadata: () => ({
        commandId: this.generateCommandId(),
        type: 'generate',
        timestamp: new Date()
      })
    };
  }
  /**
   * Adapt result from  format to workflow format
   * @param {Object} Result -  handler result
   * @param {string} type - Generation type
   * @returns {Object} Adapted result
   */
  adaptResult(Result, type) {
    const adaptedResult = {
      success: Result.success || false,
      type,
      timestamp: new Date(),
      data: Result.output || {},
      metadata: {
        commandId: Result.commandId,
        originalResult: Result,
        adaptedAt: new Date()
      }
    };
    // Add type-specific adaptations
    switch (type) {
      case 'script':
        adaptedResult.scriptGenerated = Result.output?.summary?.scriptGenerated || false;
        adaptedResult.scriptPath = Result.output?.results?.script?.path;
        break;
      case 'scripts':
        adaptedResult.scriptsGenerated = Result.output?.summary?.totalScriptsGenerated || 0;
        adaptedResult.scriptTypes = Result.output?.summary?.scriptTypes || [];
        break;
      case 'documentation':
        adaptedResult.docsGenerated = Result.output?.summary?.totalDocsGenerated || 0;
        adaptedResult.docTypes = Result.output?.summary?.docTypes || [];
        break;
    }
    return adaptedResult;
  }
  /**
   * Generate unique command ID
   * @returns {string} Command ID
   */
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Check if service can be adapted
   * @param {string} serviceType - Service type
   * @returns {boolean} True if can be adapted
   */
  canAdapt(serviceType) {
    const supportedTypes = ['script', 'scripts', 'documentation'];
    return supportedTypes.includes(serviceType);
  }
  /**
   * Get supported service types
   * @returns {Array<string>} Supported service types
   */
  getSupportedTypes() {
    return ['script', 'scripts', 'documentation'];
  }
  /**
   * Publish adaptation event
   * @param {string} type - Adaptation type
   * @param {Object} data - Event data
   */
  async publishAdaptationEvent(type, data) {
    if (!this.options.enableEventPublishing) {
      return;
    }
    try {
      await this.eventBus.publish('generate.service.adapted', {
        type,
        data,
        timestamp: new Date(),
        adapter: 'GenerateServiceAdapter'
      });
    } catch (error) {
      this.logger.warn('Failed to publish adaptation event:', error.message);
    }
  }
  /**
   * Handle adaptation error
   * @param {Error} error - Error to handle
   * @param {string} type - Service type
   * @param {Object} context - Error context
   */
  handleError(error, type, context = {}) {
    if (!this.options.enableErrorHandling) {
      throw error;
    }
    this.logger.error(`GenerateServiceAdapter: ${type} adaptation error:`, {
      error: error.message,
      stack: error.stack,
      context
    });
    // Publish error event
    this.publishAdaptationEvent('error', {
      type,
      error: error.message,
      context
    });
    // Return error result instead of throwing
    return {
      success: false,
      type,
      error: error.message,
      timestamp: new Date(),
      data: null
    };
  }
  /**
   * Get adapter metadata
   * @returns {Object} Adapter metadata
   */
  getMetadata() {
    return {
      name: 'GenerateServiceAdapter',
      description: 'Adapter for existing generate services',
      version: '1.0.0',
      supportedTypes: this.getSupportedTypes(),
      options: this.options
    };
  }
  /**
   * Set adapter options
   * @param {Object} options - New options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }
  /**
   * Clone adapter
   * @returns {GenerateServiceAdapter} Cloned adapter
   */
  clone() {
    return new GenerateServiceAdapter({
      eventBus: this.eventBus,
      analysisRepository: this.analysisRepository,
      logger: this.logger,
      ...this.options
    });
  }
}
module.exports = GenerateServiceAdapter; 