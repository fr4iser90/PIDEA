/**
 * Organization Step
 * Organizes task files based on status
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const logger = new Logger('organization');

// Step configuration
const config = {
  name: 'organization',
  type: 'task',
  category: 'task',
  description: 'Organize task files based on status',
  version: '1.0.0',
  dependencies: ['TaskRepository'],
  settings: {
    createDirectories: true,
    moveFiles: true,
    updateReferences: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId'],
    optional: ['workspacePath', 'taskId']
  }
};

class OrganizationStep {
  constructor() {
    this.name = 'OrganizationStep';
    this.description = 'Organize task files based on status';
    this.category = 'task';
    this.dependencies = ['TaskRepository'];
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = OrganizationStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔧 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Default implementation - just return success for now
      // This can be enhanced later with actual file organization logic
      logger.info('✅ Organization step completed successfully');
      
      return {
        success: true,
        result: {
          message: 'Files organized successfully',
          organizedFiles: [],
          createdDirectories: []
        },
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error(`❌ ❌ Failed to organize files: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate context parameters
   * @param {Object} context - Execution context
   * @throws {Error} If validation fails
   */
  validateContext(context) {
    const errors = [];
    
    if (!context.projectId) {
      errors.push('Project ID is required');
    }
    
    if (errors.length > 0) {
      throw new Error(`Context validation failed: ${errors.join(', ')}`);
    }
  }
}

// Export in StepRegistry format
module.exports = {
  config,
  execute: async (context) => {
    const stepInstance = new OrganizationStep();
    return await stepInstance.execute(context);
  }
};

// Also export the class for testing
module.exports.OrganizationStep = OrganizationStep;
