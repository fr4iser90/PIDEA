/**
 * IDE Send Message Step
 * Sends message to any IDE (Cursor, VSCode, Windsurf)
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('ide_send_message');

// Step configuration
const config = {
  name: 'IDESendMessageStep',
  type: 'ide',
  category: 'ide',
  description: 'Send message to any IDE',
  version: '1.0.0',
  dependencies: ['browserManager'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId', 'message'],
    optional: ['workspacePath', 'ideType']
  }
};

class IDESendMessageStep {
  constructor() {
    this.name = 'IDESendMessageStep';
    this.description = 'Send message to any IDE';
    this.category = 'ide';
    this.dependencies = ['browserManager'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = IDESendMessageStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const { projectId, workspacePath, message, ideType, waitForResponse = false, timeout = null } = context;
      
      // Use centralized timeout configuration
      const TimeoutConfig = require('@config/timeout-config');
      const actualTimeout = timeout ? TimeoutConfig.getTimeout('IDE', timeout) : TimeoutConfig.getTimeout('IDE', 'SEND_MESSAGE');
      
      logger.info(`📤 Sending message to IDE for project ${projectId}${ideType ? ` (${ideType})` : ''}`);
      
      // Get services via dependency injection
      const browserManager = context.getService('browserManager');
      const chatSessionService = context.getService('chatSessionService');
      
      if (!browserManager) {
        throw new Error('BrowserManager not available in context');
      }
      if (!chatSessionService) {
        throw new Error('ChatSessionService not available in context');
      }
      
      // Switch to active port first
      const idePortManager = context.getService('idePortManager');
      if (idePortManager) {
        const activePort = idePortManager.getActivePort();
        if (activePort) {
          await browserManager.switchToPort(activePort);
        }
      }
      
      // Send message directly via BrowserManager (no infinite loop)
      const result = await browserManager.typeMessage(message, true);
      
      if (!result) {
        throw new Error('Failed to send message to IDE - BrowserManager returned false');
      }
      
      logger.info(`✅ Message sent to IDE`);
      
      // Wait for AI response if requested
      let aiResponse = null;
      if (waitForResponse) {
        logger.info(`⏳ Waiting for AI response (timeout: ${actualTimeout}ms)...`);
        
        try {
          // Initialize AITextDetector for proper response waiting
          const AITextDetector = require('@services/chat/AITextDetector');
          const ideType = await browserManager.detectIDEType(browserManager.getCurrentPort());
          const ideSelectors = await browserManager.getIDESelectors(ideType);
          const aiTextDetector = new AITextDetector(ideSelectors);
          const page = await browserManager.getPage();
          
          if (page) {
            const aiResponseResult = await aiTextDetector.waitForAIResponse(page, {
              timeout: actualTimeout,
              checkInterval: 'AI_RESPONSE_CHECK',
              requiredStableChecks: 3
            });
            
            if (aiResponseResult.success) {
              aiResponse = aiResponseResult.response;
              logger.info(`✅ AI response received (${aiResponse.length} chars)`);
            } else {
              logger.warn(`⚠️ AI response timeout or error`);
            }
          }
        } catch (error) {
          logger.error(`❌ Error waiting for AI response: ${error.message}`);
        }
      }
      
      return {
        success: true,
        message: 'Message sent to IDE',
        data: result,
        aiResponse: aiResponse,
        ideType: ideType || 'auto-detected'
      };
      
    } catch (error) {
      logger.error('❌ Failed to send message to IDE:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }



  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
    if (!context.message) {
      throw new Error('Message is required');
    }
  }
}

// Create instance for execution
const stepInstance = new IDESendMessageStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 