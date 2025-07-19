/**
 * Confirmation Step - AI Confirmation Loops
 * Handles AI response confirmation and user interaction loops
 * Used in workflow, not as user-facing button
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('confirmation_step');

// Step configuration
const config = {
  name: 'ConfirmationStep',
  type: 'completion',
  description: 'Handles AI response confirmation and user interaction loops',
  category: 'completion',
  version: '1.0.0',
  dependencies: ['quality_assessment'],
  settings: {
    timeout: 60000,
    maxConfirmationAttempts: 3,
    confirmationTimeout: 10000,
    autoContinueThreshold: 0.8,
    enableMultiLanguage: true
  },
  validation: {
    requiredInputs: ['task'],
    supportedLanguages: ['en', 'de', 'es', 'fr']
  }
};

class ConfirmationStep {
  constructor() {
    this.logger = logger;
    
    // Completion keywords in multiple languages
    this.completionKeywords = {
      'en': ['done', 'complete', 'finished', 'ready', 'completed', 'finished', 'ready', 'ok', 'yes'],
      'de': ['fertig', 'erledigt', 'abgeschlossen', 'bereit', 'ok', 'ja', 'vollständig'],
      'es': ['listo', 'completado', 'terminado', 'listo', 'ok', 'sí'],
      'fr': ['fini', 'terminé', 'completé', 'prêt', 'ok', 'oui']
    };
    
    // Task-specific completion keywords
    this.taskCompletionKeywords = {
      'development': ['implemented', 'created', 'added', 'built', 'developed'],
      'testing': ['test passes', 'test fixed', 'coverage improved', 'tests passing'],
      'refactoring': ['refactored', 'refactoring complete', 'code improved', 'restructured'],
      'documentation': ['documented', 'docs updated', 'readme updated', 'comments added']
    };
  }

  /**
   * Execute confirmation workflow
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Confirmation results
   */
  async execute(context) {
    try {
      this.logger.info('Starting confirmation workflow');
      
      const { task, projectPath, qualityAssessment, options = {} } = context;
      
      if (!task) {
        throw new Error('Task required for confirmation workflow');
      }

      const result = {
        timestamp: new Date(),
        projectPath,
        taskId: task.id,
        confirmed: false,
        attempts: 0,
        aiResponse: null,
        confirmationMethod: null,
        metadata: {
          qualityScore: 0,
          confidence: 0,
          requiresUserInput: false
        }
      };

      // Get application services
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const cursorIDE = application.cursorIDEService;
      if (!cursorIDE) {
        throw new Error('Cursor IDE service not available');
      }

      // Build task prompt
      const taskPrompt = this._buildTaskPrompt(task, qualityAssessment);
      
      // Send to IDE and get AI response
      this.logger.info(`Sending task ${task.id} to IDE for processing`);
      const aiResponse = await cursorIDE.sendMessage(taskPrompt);
      
      result.aiResponse = aiResponse;
      result.attempts = 1;

      // Assess response quality
      const qualityScore = this._assessResponseQuality(aiResponse, task, qualityAssessment);
      result.metadata.qualityScore = qualityScore;

      // Check if we can auto-confirm based on quality
      if (qualityScore >= config.settings.autoContinueThreshold) {
        this.logger.info(`Auto-confirming task ${task.id} based on high quality score (${qualityScore})`);
        result.confirmed = true;
        result.confirmationMethod = 'auto_quality';
        result.metadata.confidence = qualityScore;
        return result;
      }

      // Manual confirmation loop
      const maxAttempts = options.maxAttempts || config.settings.maxConfirmationAttempts;
      const timeout = options.timeout || config.settings.confirmationTimeout;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        this.logger.info(`Confirmation attempt ${attempt}/${maxAttempts} for task ${task.id}`);
        
        try {
          const confirmationResult = await this._askConfirmation(aiResponse, task, {
            timeout,
            attempt,
            qualityScore
          });

          if (confirmationResult.confirmed) {
            result.confirmed = true;
            result.confirmationMethod = 'manual_confirmation';
            result.metadata.confidence = confirmationResult.confidence;
            result.metadata.requiresUserInput = false;
            this.logger.info(`Task ${task.id} confirmed on attempt ${attempt}`);
            break;
          }

          // Check if user input is required
          if (confirmationResult.requiresUserInput) {
            result.metadata.requiresUserInput = true;
            this.logger.info(`Task ${task.id} requires user input`);
            break;
          }

          // If not confirmed and no user input required, continue to next attempt
          if (attempt < maxAttempts) {
            this.logger.info(`Task ${task.id} not confirmed, continuing to next attempt`);
            await this._wait(1000); // Brief pause between attempts
          }

        } catch (error) {
          this.logger.error(`Confirmation attempt ${attempt} failed: ${error.message}`);
          
          if (attempt === maxAttempts) {
            throw error;
          }
        }
      }

      result.attempts = maxAttempts;

      if (!result.confirmed && !result.metadata.requiresUserInput) {
        this.logger.warn(`Task ${task.id} was not confirmed after ${maxAttempts} attempts`);
      }

      return result;
    } catch (error) {
      this.logger.error('Confirmation workflow failed:', error);
      throw error;
    }
  }

  /**
   * Build task prompt for IDE
   */
  _buildTaskPrompt(task, qualityAssessment) {
    let prompt = `Please complete the following task:\n\n`;
    prompt += `**Task:** ${task.description}\n`;
    prompt += `**Type:** ${task.type}\n`;
    prompt += `**Priority:** ${task.priority}\n\n`;
    
    if (qualityAssessment) {
      prompt += `**Quality Requirements:**\n`;
      prompt += `- Ensure high code quality\n`;
      prompt += `- Follow best practices\n`;
      prompt += `- Include proper error handling\n`;
      prompt += `- Add appropriate comments\n\n`;
    }
    
    prompt += `Please provide a complete solution and indicate when you're done.`;
    
    return prompt;
  }

  /**
   * Assess response quality
   */
  _assessResponseQuality(aiResponse, task, qualityAssessment) {
    let score = 0.5; // Base score
    
    // Check for completion keywords
    const hasCompletionKeywords = this._hasCompletionKeywords(aiResponse, task.type);
    if (hasCompletionKeywords) {
      score += 0.2;
    }
    
    // Check for code blocks
    const hasCodeBlocks = aiResponse.includes('```');
    if (hasCodeBlocks) {
      score += 0.15;
    }
    
    // Check for error handling
    const hasErrorHandling = aiResponse.toLowerCase().includes('error') || 
                           aiResponse.toLowerCase().includes('try') ||
                           aiResponse.toLowerCase().includes('catch');
    if (hasErrorHandling) {
      score += 0.1;
    }
    
    // Check for comments
    const hasComments = aiResponse.includes('//') || aiResponse.includes('/*');
    if (hasComments) {
      score += 0.05;
    }
    
    // Check response length (not too short, not too long)
    const responseLength = aiResponse.length;
    if (responseLength > 100 && responseLength < 5000) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Check for completion keywords
   */
  _hasCompletionKeywords(aiResponse, taskType) {
    const lowerResponse = aiResponse.toLowerCase();
    
    // Check general completion keywords
    for (const [language, keywords] of Object.entries(this.completionKeywords)) {
      for (const keyword of keywords) {
        if (lowerResponse.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }
    
    // Check task-specific completion keywords
    const taskKeywords = this.taskCompletionKeywords[taskType] || [];
    for (const keyword of taskKeywords) {
      if (lowerResponse.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Ask for confirmation
   */
  async _askConfirmation(aiResponse, task, options) {
    const { timeout, attempt, qualityScore } = options;
    
    // Simulate confirmation logic (in real implementation, this would interact with IDE)
    // For now, we'll use a simple heuristic based on quality score and attempt number
    
    const confirmationThreshold = 0.6 - (attempt * 0.1); // Lower threshold for later attempts
    
    if (qualityScore >= confirmationThreshold) {
      return {
        confirmed: true,
        confidence: qualityScore,
        requiresUserInput: false
      };
    }
    
    // Simulate user input requirement for low quality responses
    if (qualityScore < 0.3 && attempt >= 2) {
      return {
        confirmed: false,
        confidence: qualityScore,
        requiresUserInput: true
      };
    }
    
    return {
      confirmed: false,
      confidence: qualityScore,
      requiresUserInput: false
    };
  }

  /**
   * Wait utility
   */
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create instance for execution
const stepInstance = new ConfirmationStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 