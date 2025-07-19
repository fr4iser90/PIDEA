/**
 * AutoFinish Step - Completion Orchestrator
 * Orchestrates all completion-related steps for automated task processing
 * Used in workflow, not as user-facing button
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('auto_finish_step');

// Step configuration
const config = {
  name: 'AutoFinishStep',
  type: 'completion',
  description: 'Orchestrates automated task completion with AI confirmation and fallback detection',
  category: 'completion',
  version: '1.0.0',
  dependencies: ['todo_parsing', 'confirmation', 'fallback_detection', 'task_sequencing', 'completion_detection', 'quality_assessment'],
  settings: {
    timeout: 300000, // 5 minutes
    maxConfirmationAttempts: 3,
    confirmationTimeout: 10000,
    fallbackDetectionEnabled: true,
    autoContinueThreshold: 0.8
  },
  validation: {
    requiredInputs: ['todoInput'],
    supportedTypes: ['task_creation', 'task_execution', 'refactoring', 'testing', 'documentation']
  }
};

class AutoFinishStep {
  constructor() {
    this.logger = logger;
  }

  /**
   * Execute auto-finish workflow
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Auto-finish results
   */
  async execute(context) {
    try {
      this.logger.info('Starting auto-finish workflow orchestration');
      
      const { todoInput, projectPath, options = {} } = context;
      
      if (!todoInput) {
        throw new Error('TODO input required for auto-finish workflow');
      }

      const result = {
        timestamp: new Date(),
        projectPath,
        sessionId: `auto-finish-${Date.now()}`,
        tasks: [],
        completedTasks: [],
        failedTasks: [],
        summary: '',
        metadata: {
          totalTasks: 0,
          completedCount: 0,
          failedCount: 0,
          pausedCount: 0
        }
      };

      // Get step registry from application
      const application = global.application;
      if (!application) {
        throw new Error('Application not available');
      }

      const { stepRegistry } = application;
      if (!stepRegistry) {
        throw new Error('Step registry not available');
      }

      this.logger.info(`📋 Starting auto-finish workflow for: ${projectPath}`);

      // Step 1: Parse TODO input into tasks
      this.logger.info('Step 1: Parsing TODO input');
      const parsingContext = {
        todoInput,
        projectPath,
        options: { ...options, step: 'parsing' }
      };
      
      const parsingResult = await stepRegistry.executeStep('TodoParsingStep', parsingContext);
      
      if (!parsingResult.success || !parsingResult.tasks) {
        throw new Error(`TODO parsing failed: ${parsingResult.error}`);
      }

      result.tasks = parsingResult.tasks;
      result.metadata.totalTasks = parsingResult.tasks.length;

      this.logger.info(`✅ Parsed ${result.tasks.length} tasks from TODO input`);

      // Step 2: Sequence tasks based on dependencies
      this.logger.info('Step 2: Sequencing tasks');
      const sequencingContext = {
        tasks: result.tasks,
        projectPath,
        options: { ...options, step: 'sequencing' }
      };
      
      const sequencingResult = await stepRegistry.executeStep('TaskSequencingStep', sequencingContext);
      
      if (!sequencingResult.success) {
        throw new Error(`Task sequencing failed: ${sequencingResult.error}`);
      }

      const sequencedTasks = sequencingResult.sequencedTasks || result.tasks;
      this.logger.info(`✅ Sequenced ${sequencedTasks.length} tasks`);

      // Step 3: Process each task with confirmation and completion detection
      this.logger.info('Step 3: Processing tasks sequentially');
      
      for (let i = 0; i < sequencedTasks.length; i++) {
        const task = sequencedTasks[i];
        const taskIndex = i + 1;
        
        this.logger.info(`Processing task ${taskIndex}/${sequencedTasks.length}: ${task.description}`);
        
        try {
          // Step 3a: Quality assessment of task
          const qualityContext = {
            task,
            projectPath,
            options: { ...options, step: 'quality_assessment' }
          };
          
          const qualityResult = await stepRegistry.executeStep('QualityAssessmentStep', qualityContext);
          
          if (!qualityResult.success) {
            this.logger.warn(`Quality assessment failed for task ${task.id}: ${qualityResult.error}`);
          }

          // Step 3b: Process task with confirmation
          const confirmationContext = {
            task,
            projectPath,
            qualityAssessment: qualityResult,
            options: { 
              ...options, 
              step: 'confirmation',
              maxAttempts: config.settings.maxConfirmationAttempts,
              timeout: config.settings.confirmationTimeout
            }
          };
          
          const confirmationResult = await stepRegistry.executeStep('ConfirmationStep', confirmationContext);
          
          if (!confirmationResult.success) {
            throw new Error(`Task confirmation failed: ${confirmationResult.error}`);
          }

          // Step 3c: Fallback detection if needed
          if (config.settings.fallbackDetectionEnabled && !confirmationResult.confirmed) {
            const fallbackContext = {
              task,
              confirmationResult,
              projectPath,
              options: { ...options, step: 'fallback_detection' }
            };
            
            const fallbackResult = await stepRegistry.executeStep('FallbackDetectionStep', fallbackContext);
            
            if (fallbackResult.requiresUserInput) {
              this.logger.info(`Task ${task.id} requires user input, pausing workflow`);
              
              result.failedTasks.push({
                task,
                status: 'paused',
                reason: 'user_input_required',
                fallbackResult
              });
              
              result.metadata.pausedCount++;
              continue;
            }
          }

          // Step 3d: Completion detection
          const completionContext = {
            task,
            confirmationResult,
            projectPath,
            options: { ...options, step: 'completion_detection' }
          };
          
          const completionResult = await stepRegistry.executeStep('CompletionDetectionStep', completionContext);
          
          if (completionResult.isComplete) {
            result.completedTasks.push({
              task,
              result: confirmationResult,
              completionResult,
              qualityAssessment: qualityResult
            });
            
            result.metadata.completedCount++;
            this.logger.info(`✅ Task ${task.id} completed successfully`);
          } else {
            result.failedTasks.push({
              task,
              status: 'incomplete',
              reason: 'completion_not_detected',
              completionResult
            });
            
            result.metadata.failedCount++;
            this.logger.warn(`⚠️ Task ${task.id} not completed`);
          }

        } catch (error) {
          this.logger.error(`❌ Task ${task.id} failed: ${error.message}`);
          
          result.failedTasks.push({
            task,
            status: 'failed',
            error: error.message
          });
          
          result.metadata.failedCount++;
          
          if (options.stopOnError) {
            throw error;
          }
        }
      }

      // Generate summary
      result.summary = this._generateSummary(result.metadata);

      this.logger.info(`Auto-finish workflow completed: ${result.metadata.completedCount}/${result.metadata.totalTasks} tasks completed`);
      
      return result;
    } catch (error) {
      this.logger.error('Auto-finish workflow failed:', error);
      throw error;
    }
  }

  /**
   * Generate summary from metadata
   */
  _generateSummary(metadata) {
    const { totalTasks, completedCount, failedCount, pausedCount } = metadata;
    
    if (completedCount === totalTasks) {
      return `All ${totalTasks} tasks completed successfully.`;
    } else if (completedCount > 0) {
      return `${completedCount}/${totalTasks} tasks completed. ${failedCount} failed, ${pausedCount} paused.`;
    } else if (pausedCount > 0) {
      return `${pausedCount} tasks paused for user input. ${failedCount} failed.`;
    } else {
      return `${failedCount}/${totalTasks} tasks failed.`;
    }
  }
}

// Create instance for execution
const stepInstance = new AutoFinishStep();

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => await stepInstance.execute(context)
}; 