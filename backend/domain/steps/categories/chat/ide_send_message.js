/**
 * IDE Send Message Step
 * Sends message to any IDE (Cursor, VSCode, Windsurf)
 * Wrapper for SendMessageHandler (which handles both business logic AND browser automation)
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const AITextDetector = require('@services/chat/AITextDetector');
const logger = new Logger('ide_send_message');

// Step configuration
const config = {
  name: 'IDESendMessageStep',
  type: 'ide',
  category: 'ide',
  description: 'Send message to any IDE',
  version: '1.0.0',
  dependencies: ['sendMessageHandler'],
  settings: {
    includeTimeout: true,
    includeRetry: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId', 'message'],
    optional: ['workspacePath', 'ideType', 'waitForResponse']
  }
};

class IDESendMessageStep {
  constructor() {
    this.name = 'IDESendMessageStep';
    this.description = 'Send message to any IDE';
    this.category = 'ide';
    this.dependencies = ['sendMessageHandler'];
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
      
      logger.info(`📤 Sending message to IDE for project ${projectId}${ideType ? ` (${ideType})` : ''}`);
      
      // ✅ BUSINESS LOGIC + BROWSER AUTOMATION über Handler
      const sendMessageHandler = context.getService('sendMessageHandler');
      if (!sendMessageHandler) {
        throw new Error('SendMessageHandler not available in context');
      }
      
      // Create command for business logic
      const SendMessageCommand = require('@categories/chat/SendMessageCommand');
      const command = new SendMessageCommand(message, context.sessionId);
      
      // Add required fields for handler
      command.message = message;
      command.requestedBy = context.requestedBy || context.userId || 'unknown';
      
      // Debug logging
      logger.info('🔍 [IDESendMessageStep] Context data:', {
        requestedBy: context.requestedBy,
        userId: context.userId,
        finalRequestedBy: command.requestedBy
      });
      
      // Ensure command has all required fields
      if (!command.requestedBy) {
        throw new Error('RequestedBy is required but not provided in context');
      }
      
      // Add additional options for IDE integration
      command.options = {
        ...command.options,
        projectId: projectId,
        workspacePath: workspacePath,
        ideType: ideType,
        waitForResponse: waitForResponse,
        timeout: timeout
      };
      
      // ✅ Handler macht BEIDES: Business Logic + Browser Automation
      logger.info('📝 Executing SendMessageHandler (Business Logic + Browser Automation)...');
      const result = await sendMessageHandler.handle(command);
      
      // ✅ AI RESPONSE WAITING (nur wenn gewünscht)
      let aiResponse = null;
      if (waitForResponse) {
        logger.info('⏳ Waiting for AI response...');
        
        // Get BrowserManager for AI response detection
        const browserManager = context.getService('browserManager');
        if (!browserManager) {
          logger.warn('BrowserManager not available, skipping AI response waiting');
        } else {
          try {
            const page = await browserManager.getPage();
            if (page) {
              // Initialize AITextDetector for AI response waiting
              const ideType = await browserManager.detectIDEType(browserManager.getCurrentPort());
              const ideSelectors = await browserManager.getIDESelectors(ideType);
              const aiTextDetector = new AITextDetector(ideSelectors);
              
              // Wait for AI response with timeout
              const actualTimeout = timeout || 300000; // 5 minutes default
              aiResponse = await aiTextDetector.waitForAIResponse(page, {
                timeout: actualTimeout,
                checkInterval: 2000, // Check every 2 seconds
                requiredStableChecks: 3
              });
              
              logger.info('✅ AI response received', {
                success: aiResponse.success,
                responseLength: aiResponse.response?.length || 0,
                confidence: aiResponse.completion?.confidence || 0,
                duration: aiResponse.duration || 0
              });
            }
          } catch (error) {
            logger.error('❌ AI response waiting failed:', error.message);
            aiResponse = {
              success: false,
              error: error.message,
              response: null
            };
          }
        }
      }
      
      logger.info(`✅ Message sent to IDE successfully via Handler`);
      
      return {
        success: true,
        message: 'Message sent to IDE via Handler',
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