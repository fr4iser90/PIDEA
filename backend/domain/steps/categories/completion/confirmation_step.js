/**
 * Confirmation Step
 * Handles task confirmation and validation
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const AITextDetector = require('@services/chat/AITextDetector');
const logger = new Logger('confirmation_step');

// Step configuration
const config = {
  name: 'ConfirmationStep',
  type: 'completion',
  category: 'completion',
  description: 'Handle task confirmation and validation',
  version: '1.0.0',
  dependencies: ['TaskRepository', 'TerminalService'],
  settings: {
    includeAutoConfirmation: true,
    includeQualityCheck: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'taskId']
  }
};

class ConfirmationStep {
  constructor() {
    this.name = 'ConfirmationStep';
    this.description = 'Handle task confirmation and validation';
    this.category = 'completion';
    this.version = '1.0.0';
  }

  static getConfig() {
    return config;
  }

  async execute(context) {
    try {
      logger.info('Starting ConfirmationStep execution');
      
      // Get services from context (fallback to application context)
      const browserManager = context.browserManager || context.getService?.('browserManager') || global.application?.browserManager;
      const idePortManager = context.idePortManager || context.getService?.('idePortManager') || global.application?.idePortManager;
      
      if (!browserManager) {
        logger.warn('BrowserManager not available, using fallback confirmation');
        return {
          success: true,
          message: 'Confirmation skipped - BrowserManager not available',
          data: { confirmed: true, reason: 'service_unavailable' }
        };
      }

      const { taskId, maxAttempts = 3, timeout = null, autoContinueThreshold = 0.8, onlyIfResponseReceived = false } = context;
      
      // Use centralized timeout configuration
      const TimeoutConfig = require('@config/timeout-config');
      const actualTimeout = timeout ? TimeoutConfig.getTimeout('WORKFLOW', timeout) : TimeoutConfig.getTimeout('WORKFLOW', 'CONFIRMATION');

      logger.info(`Starting AI confirmation process for task: ${taskId || 'unknown'}`);

      // Check if we should only proceed if AI response was received
      if (onlyIfResponseReceived) {
        const previousStepResult = context.previousStepResult || context.getService?.('stepRegistry')?.getLastStepResult?.();
        if (!previousStepResult?.data?.aiResponse) {
          logger.info('Skipping confirmation - no AI response received from previous step');
          return {
            success: true,
            message: 'Confirmation skipped - no AI response',
            data: { confirmed: true, reason: 'no_ai_response' }
          };
        }
      }

      // Switch to active port first (like IDESendMessageStep)
      if (idePortManager) {
        const activePort = idePortManager.getActivePort();
        if (activePort) {
          await browserManager.switchToPort(activePort);
        }
      }

      // Initialize AITextDetector for proper response waiting with IDE-specific selectors
      const ideType = await browserManager.detectIDEType(browserManager.getCurrentPort());
      const ideSelectors = await browserManager.getIDESelectors(ideType);
      const aiTextDetector = new AITextDetector(ideSelectors);
      const page = await browserManager.getPage();
      
      if (!page) {
        throw new Error('No browser page available for AI response detection');
      }

      let attempts = 0;
      const maxAttemptsValue = maxAttempts || 3;
      
      while (attempts < maxAttemptsValue) {
        attempts++;
        logger.info(`AI confirmation attempt ${attempts}/${maxAttemptsValue}`);
        
        try {
          // Send confirmation question to IDE (like IDESendMessageStep)
          const confirmationQuestion = this.getConfirmationQuestion(attempts);
          const result = await browserManager.typeMessage(confirmationQuestion, true);
          
          if (!result) {
            throw new Error('Failed to send confirmation question to IDE');
          }
          
          // Wait a bit for the AI to process the confirmation question
          logger.info('⏳ Waiting for AI to process confirmation question...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simple wait for AI processing
          
          // Try to get the latest AI response
          let aiResponse = '';
          try {
            aiResponse = await aiTextDetector.extractLatestAIResponse(page);
            logger.info(`📝 Extracted AI response (${aiResponse.length} chars)`);
          } catch (error) {
            logger.warn('Could not extract AI response, continuing with next attempt');
            continue;
          }
          
          // Analyze the AI response for completion confirmation
          const confirmationScore = this.analyzeConfirmationResponse(aiResponse);
          
              logger.info(`AI confirmation result:`, {
              question: confirmationQuestion,
              response: aiResponse.substring(0, 100) + '...',
              score: confirmationScore,
              threshold: autoContinueThreshold
            });
          
          if (confirmationScore >= autoContinueThreshold) {
            logger.info(`✅ Task confirmed by AI with confidence: ${confirmationScore.toFixed(2)}`);
            return {
              success: true,
              message: 'Task confirmed by AI',
              data: {
                confirmed: true,
                confidence: confirmationScore,
                question: confirmationQuestion,
                response: aiResponse,
                attempts: attempts
              }
            };
          }
          
          logger.info(`⚠️ AI response ambiguous (confidence: ${confirmationScore.toFixed(2)}), retrying...`);
          
        } catch (error) {
          logger.error(`AI confirmation attempt ${attempts} failed:`, error.message);
        }
        
        // Wait before next attempt
        if (attempts < maxAttemptsValue) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      logger.warn(`❌ AI confirmation failed after ${maxAttemptsValue} attempts`);
      return {
        success: false,
        message: 'AI confirmation failed',
        data: {
          confirmed: false,
          attempts: maxAttemptsValue
        }
      };

    } catch (error) {
      logger.error('Error in ConfirmationStep:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  analyzeConfirmationResponse(response) {
    if (!response || typeof response !== 'string') {
      return 0;
    }
    
    const lowerResponse = response.toLowerCase();
    
    // Check for completion status patterns
    const completionPatterns = [
      /completed/i,
      /finished/i,
      /done/i,
      /ready/i,
      /successful/i,
      /\[passed\]/i
    ];
    
    // Check for partial completion patterns
    const partialPatterns = [
      /partially completed/i,
      /almost done/i,
      /mostly complete/i,
      /in progress/i
    ];
    
    // Check for need human patterns
    const needHumanPatterns = [
      /need human/i,
      /requires human/i,
      /user input/i,
      /manual intervention/i,
      /\[failed\]/i
    ];
    
    // Calculate confidence score
    let score = 0;
    
    // Check for explicit completion
    if (completionPatterns.some(pattern => pattern.test(lowerResponse))) {
      score += 0.8;
    }
    
    // Check for partial completion
    if (partialPatterns.some(pattern => pattern.test(lowerResponse))) {
      score += 0.4;
    }
    
    // Check for need human
    if (needHumanPatterns.some(pattern => pattern.test(lowerResponse))) {
      score += 0.2;
    }
    
    // Check for test results
    const testMatch = lowerResponse.match(/\[(passed|failed)\]\s*(\d+)%/i);
    if (testMatch) {
      const testStatus = testMatch[1];
      const testPercentage = parseInt(testMatch[2]);
      
      if (testStatus === 'passed' && testPercentage >= 80) {
        score += 0.3;
      } else if (testStatus === 'failed') {
        score -= 0.2;
      }
    }
    
    // Check for response length and quality
    if (response.length > 50) {
      score += 0.1;
    }
    
    // Normalize score to 0-1 range
    return Math.min(Math.max(score, 0), 1);
  }

  getConfirmationQuestion(attempt) {
    const questions = [
      'Check your status against the task and respond with your status: completed/partially completed/need human. Also include test results: [PASSED] or [FAILED] with percentage.',
      'Have you completed the task? Please respond with: completed/partially completed/need human. Also include test results: [PASSED] or [FAILED] with percentage.',
      'Task status check: Are you finished? Respond with: completed/partially completed/need human. Also include test results: [PASSED] or [FAILED] with percentage.'
    ];
    
    return questions[attempt % questions.length];
  }

  validateContext(context) {
    if (!context.projectId) {
      throw new Error('Project ID is required');
    }
  }
}

// Create instance for execution
const stepInstance = new ConfirmationStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
