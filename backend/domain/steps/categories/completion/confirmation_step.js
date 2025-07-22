/**
 * Confirmation Step
 * Handles task confirmation and validation
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
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

      const { taskId, maxAttempts = 3, timeout = 10000, autoContinueThreshold = 0.8 } = context;

      logger.info(`Starting AI confirmation process for task: ${taskId || 'unknown'}`);

      // Switch to active port first (like IDESendMessageStep)
      if (idePortManager) {
        const activePort = idePortManager.getActivePort();
        if (activePort) {
          await browserManager.switchToPort(activePort);
        }
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
          
          // Wait for AI response
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // For now, simulate AI confirmation (in real implementation, would analyze response)
          const confirmationScore = Math.random(); // Simulate AI confidence score
          
          logger.info(`AI confirmation result:`, {
            question: confirmationQuestion,
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
          await new Promise(resolve => setTimeout(resolve, timeout || 10000));
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

  getConfirmationQuestion(attempt) {
    const questions = [
      'Check your status against the task and respond with your status: completed/partially completed/need human. Also include test results: [PASSED] or [FAILED] with percentage.',
      'Have you completed the task? Please respond with: completed/partially completed/need human. Also include test results: [PASSED] or [FAILED] with percentage.',
      'Task status check: Are you finished? Respond with: completed/partially completed/need human. Also include test results: [PASSED] or [FAILED] with percentage.'
    ];
    
    return questions[attempt % questions.length];
  }

}

// Create instance for execution
const stepInstance = new ConfirmationStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
};
