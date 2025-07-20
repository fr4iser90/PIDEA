/**
 * Enhanced IDE Send Message Step
 * Sends message to any IDE with intelligent features and confidence checks
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('ide_send_message_enhanced');

// Enhanced Step configuration with feature flags
const config = {
  name: 'IDESendMessageStepEnhanced',
  type: 'ide',
  category: 'ide',
  description: 'Send message to any IDE with intelligent features and confidence checks',
  version: '2.0.0',
  dependencies: ['cursorIDEService', 'vscodeIDEService', 'windsurfIDEService', 'chatSessionService', 'eventBus'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId', 'message'],
    optional: ['workspacePath', 'ideType', 'features', 'confidenceThreshold']
  },
  // Feature flags - can be controlled individually
  features: {
    confidenceCheck: true,        // Enable confidence scoring
    improvedResponse: true,       // Enable improved response generation
    contextAnalysis: true,        // Enable context analysis
    codeValidation: true,         // Enable code validation
    intentDetection: true,        // Enable intent detection
    suggestionGeneration: true,   // Enable suggestion generation
    performanceOptimization: true // Enable performance optimization
  },
  // Default confidence thresholds
  confidenceThresholds: {
    low: 0.3,
    medium: 0.6,
    high: 0.8
  }
};

class IDESendMessageStepEnhanced {
  constructor() {
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.dependencies = config.dependencies;
    this.features = config.features;
    this.confidenceThresholds = config.confidenceThresholds;
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const stepId = `ide_send_message_enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info('Starting enhanced IDE send message step', {
        stepId,
        projectId: context.projectId,
        ideType: context.ideType,
        features: context.features || this.features
      });

      // Validate context
      this.validateContext(context);
      
      // Get feature configuration (merge default with context)
      const features = this.getFeatureConfiguration(context);
      const confidenceThreshold = context.confidenceThreshold || this.confidenceThresholds.medium;
      
      // Validate required services
      const services = this.validateServices(context);
      
      const { projectId, workspacePath, message, ideType } = context;
      
      logger.info(`📤 Sending enhanced message to IDE for project ${projectId}${ideType ? ` (${ideType})` : ''}`, {
        stepId,
        features: Object.keys(features).filter(key => features[key])
      });

      // Publish sending event
      if (services.eventBus) {
        await services.eventBus.publish('ide.message.sending', {
          stepId,
          projectId,
          message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          ideType: ideType || 'auto-detected',
          features,
          timestamp: new Date()
        });
      }

      // Step 1: Context Analysis (if enabled)
      let contextData = null;
      if (features.contextAnalysis) {
        contextData = await this.performContextAnalysis(services, context);
        logger.info('Context analysis completed', { stepId, contextSize: contextData ? Object.keys(contextData).length : 0 });
      }

      // Step 2: Intent Detection (if enabled)
      let intentData = null;
      if (features.intentDetection) {
        intentData = await this.performIntentDetection(services, message, contextData);
        logger.info('Intent detection completed', { stepId, intent: intentData?.intent });
      }

      // Step 3: Code Validation (if enabled)
      let validationResult = null;
      if (features.codeValidation) {
        validationResult = await this.performCodeValidation(services, message, contextData);
        logger.info('Code validation completed', { stepId, isValid: validationResult?.isValid });
      }

      // Step 4: Confidence Check (if enabled)
      let confidenceScore = null;
      if (features.confidenceCheck) {
        confidenceScore = await this.performConfidenceCheck(services, message, contextData, intentData);
        logger.info('Confidence check completed', { stepId, confidence: confidenceScore });
        
        // Check if confidence is below threshold
        if (confidenceScore < confidenceThreshold) {
          logger.warn('Low confidence detected', { stepId, confidence: confidenceScore, threshold: confidenceThreshold });
        }
      }

      // Step 5: Improved Response Generation (if enabled)
      let enhancedMessage = message;
      if (features.improvedResponse) {
        enhancedMessage = await this.generateImprovedResponse(services, message, contextData, intentData, confidenceScore);
        logger.info('Improved response generated', { stepId, originalLength: message.length, enhancedLength: enhancedMessage.length });
      }

      // Step 6: Send Message to IDE
      const result = await this.sendMessageToIDE(services, enhancedMessage, context, features);

      // Step 7: Suggestion Generation (if enabled)
      let suggestions = null;
      if (features.suggestionGeneration) {
        suggestions = await this.generateSuggestions(services, message, result, contextData, intentData);
        logger.info('Suggestions generated', { stepId, suggestionCount: suggestions?.length || 0 });
      }

      // Step 8: Performance Optimization (if enabled)
      if (features.performanceOptimization) {
        await this.optimizePerformance(services, result, context);
        logger.info('Performance optimization completed', { stepId });
      }

      // Publish success event
      if (services.eventBus) {
        await services.eventBus.publish('ide.message.sent', {
          stepId,
          projectId,
          ideType: ideType || 'auto-detected',
          confidence: confidenceScore,
          features: Object.keys(features).filter(key => features[key]),
          timestamp: new Date()
        });
      }

      logger.info('Enhanced message sent to IDE successfully', {
        stepId,
        projectId,
        confidence: confidenceScore,
        featuresUsed: Object.keys(features).filter(key => features[key])
      });

      return {
        success: true,
        stepId,
        projectId,
        message: 'Enhanced message sent to IDE',
        data: {
          result,
          contextAnalysis: contextData,
          intentDetection: intentData,
          codeValidation: validationResult,
          confidenceScore,
          suggestions,
          features: Object.keys(features).filter(key => features[key])
        },
        ideType: ideType || 'auto-detected',
        confidence: confidenceScore,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to send enhanced message to IDE', {
        stepId,
        projectId: context.projectId,
        error: error.message
      });

      // Store original error message
      const originalError = error.message;

      // Publish failure event (don't let this affect the original error)
      const eventBus = context.getService('eventBus');
      if (eventBus) {
        eventBus.publish('ide.message.failed', {
          stepId,
          projectId: context.projectId,
          error: originalError,
          timestamp: new Date()
        }).catch(eventError => {
          logger.error('Failed to publish failure event:', eventError);
          // Don't let event bus errors override the original error
        });
      }

      return {
        success: false,
        error: originalError,
        stepId,
        projectId: context.projectId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get feature configuration (merge default with context)
   */
  getFeatureConfiguration(context) {
    const contextFeatures = context.features || {};
    return {
      ...this.features,
      ...contextFeatures
    };
  }

  /**
   * Validate required services
   */
  validateServices(context) {
    const services = {};

    // Required services
    services.ideService = context.getService('cursorIDEService');
    if (!services.ideService) {
      throw new Error('cursorIDEService not available in context');
    }

    services.chatService = context.getService('chatSessionService');
    if (!services.chatService) {
      throw new Error('chatSessionService not available in context');
    }

    // Optional services (for enhanced features) - don't fail if not available
    try {
      services.eventBus = context.getService('eventBus');
    } catch (error) {
      logger.warn('eventBus not available, continuing without event publishing');
    }

    try {
      services.analysisService = context.getService('analysisService');
    } catch (error) {
      logger.warn('analysisService not available, continuing without analysis features');
    }

    try {
      services.validationService = context.getService('validationService');
    } catch (error) {
      logger.warn('validationService not available, continuing without validation features');
    }

    return services;
  }

  /**
   * Perform context analysis
   */
  async performContextAnalysis(services, context) {
    try {
      if (services.analysisService) {
        return await services.analysisService.analyzeContext(context);
      }
      return null;
    } catch (error) {
      logger.warn('Context analysis failed:', error.message);
      return null;
    }
  }

  /**
   * Perform intent detection
   */
  async performIntentDetection(services, message, contextData) {
    try {
      if (services.chatService) {
        return await services.chatService.detectIntent(message, contextData);
      }
      return null;
    } catch (error) {
      logger.warn('Intent detection failed:', error.message);
      return null;
    }
  }

  /**
   * Perform code validation
   */
  async performCodeValidation(services, message, contextData) {
    try {
      if (services.validationService) {
        return await services.validationService.validateCode(message, contextData);
      }
      return null;
    } catch (error) {
      logger.warn('Code validation failed:', error.message);
      return null;
    }
  }

  /**
   * Perform confidence check
   */
  async performConfidenceCheck(services, message, contextData, intentData) {
    try {
      if (services.chatService) {
        return await services.chatService.calculateConfidence(message, contextData, intentData);
      }
      return 0.5; // Default confidence
    } catch (error) {
      logger.warn('Confidence check failed:', error.message);
      return 0.5; // Default confidence
    }
  }

  /**
   * Generate improved response
   */
  async generateImprovedResponse(services, message, contextData, intentData, confidenceScore) {
    try {
      if (services.chatService && services.chatService.improveResponse) {
        const improvedMessage = await services.chatService.improveResponse(message, contextData, intentData, confidenceScore);
        return improvedMessage || message; // Return original if improved message is null/undefined
      }
      return message; // Return original if service not available
    } catch (error) {
      logger.warn('Improved response generation failed:', error.message);
      return message; // Return original on error
    }
  }

  /**
   * Send message to IDE
   */
  async sendMessageToIDE(services, message, context, features) {
    const { projectId, workspacePath, ideType } = context;
    
    return await services.ideService.sendMessage(message, {
      projectId,
      workspacePath,
      ideType,
      features,
      timeout: config.settings.timeout
    });
  }

  /**
   * Generate suggestions
   */
  async generateSuggestions(services, message, result, contextData, intentData) {
    try {
      if (services.chatService) {
        return await services.chatService.generateSuggestions(message, result, contextData, intentData);
      }
      return null;
    } catch (error) {
      logger.warn('Suggestion generation failed:', error.message);
      return null;
    }
  }

  /**
   * Optimize performance
   */
  async optimizePerformance(services, result, context) {
    try {
      if (services.analysisService) {
        await services.analysisService.optimizePerformance(result, context);
      }
    } catch (error) {
      logger.warn('Performance optimization failed:', error.message);
    }
  }

  /**
   * Get IDE service
   */
  getIDEService(application, ideType = null) {
    // If specific IDE type requested, use that
    if (ideType) {
      switch (ideType.toLowerCase()) {
        case 'cursor':
          return application.cursorIDEService;
        case 'vscode':
          return application.vscodeIDEService;
        case 'windsurf':
          return application.windsurfIDEService;
        default:
          throw new Error(`Unknown IDE type: ${ideType}`);
      }
    }
    
    // Auto-detect IDE service (priority order)
    return application.cursorIDEService || 
           application.vscodeIDEService || 
           application.windsurfIDEService;
  }

  /**
   * Validate context
   */
  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
    if (!context.message) {
      throw new Error('Message is required');
    }
  }

  /**
   * Get step configuration
   */
  getConfig() {
    return config;
  }

  /**
   * Validate step parameters
   */
  validate(context) {
    const errors = [];
    const warnings = [];

    if (!context.projectId) {
      errors.push('Project ID is required');
    }

    if (!context.message) {
      errors.push('Message is required');
    }

    // Validate feature configuration
    if (context.features) {
      const validFeatures = Object.keys(this.features);
      const providedFeatures = Object.keys(context.features);
      
      for (const feature of providedFeatures) {
        if (!validFeatures.includes(feature)) {
          warnings.push(`Unknown feature: ${feature}`);
        }
      }
    }

    // Validate confidence threshold
    if (context.confidenceThreshold && (typeof context.confidenceThreshold !== 'number' || context.confidenceThreshold < 0 || context.confidenceThreshold > 1)) {
      errors.push('Confidence threshold must be a number between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new IDESendMessageStepEnhanced();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.IDESendMessageStepEnhanced = IDESendMessageStepEnhanced; 