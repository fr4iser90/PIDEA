/**
 * ScriptGenerationWorkflow - Domain Layer: Script Generation Workflow
 * 
 * This workflow handles script generation tasks, orchestrating the
 * creation of various types of scripts (build scripts, deployment
 * scripts, utility scripts, etc.).
 */
const IWorkflow = require('../../../interfaces/IWorkflow');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ScriptGenerationWorkflow extends IWorkflow {
  /**
   * Create a new script generation workflow
   * @param {Object} dependencies - Workflow dependencies
   */
  constructor(dependencies = {}) {
    super();
    this.scriptService = dependencies.scriptService;
    this.templateService = dependencies.templateService;
    this.validationService = dependencies.validationService;
    this.logger = dependencies.logger || console;
  }

  /**
   * Execute script generation workflow
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Workflow result
   */
  async execute(context) {
    try {
      this.logger.info('ScriptGenerationWorkflow: Starting script generation', {
        scriptType: context.scriptType,
        targetPath: context.targetPath
      });

      // Validate input
      await this.validateInput(context);

      // Generate script content
      const scriptContent = await this.generateScript(context);

      // Validate generated script
      await this.validateScript(scriptContent, context);

      // Save script to target location
      const result = await this.saveScript(scriptContent, context);

      this.logger.info('ScriptGenerationWorkflow: Script generation completed', {
        scriptType: context.scriptType,
        targetPath: context.targetPath,
        success: true
      });

      return {
        success: true,
        data: {
          scriptContent,
          targetPath: context.targetPath,
          scriptType: context.scriptType,
          metadata: result.metadata
        },
        metadata: {
          workflowType: 'script_generation',
          executionTime: Date.now(),
          scriptSize: scriptContent.length
        }
      };

    } catch (error) {
      this.logger.error('ScriptGenerationWorkflow: Script generation failed', {
        error: error.message,
        scriptType: context.scriptType,
        targetPath: context.targetPath
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          workflowType: 'script_generation',
          executionTime: Date.now()
        }
      };
    }
  }

  /**
   * Validate workflow input
   * @param {Object} context - Workflow context
   * @throws {Error} If validation fails
   */
  async validateInput(context) {
    if (!context.scriptType) {
      throw new Error('Script type is required');
    }

    if (!context.targetPath) {
      throw new Error('Target path is required');
    }

    const validScriptTypes = [
      'build',
      'deploy',
      'test',
      'lint',
      'format',
      'clean',
      'setup',
      'migrate',
      'backup',
      'restore'
    ];

    if (!validScriptTypes.includes(context.scriptType)) {
      throw new Error(`Invalid script type: ${context.scriptType}`);
    }
  }

  /**
   * Generate script content
   * @param {Object} context - Workflow context
   * @returns {Promise<string>} Generated script content
   */
  async generateScript(context) {
    const { scriptType, targetPath, options = {} } = context;

    // Get template for script type
    const template = await this.templateService.getScriptTemplate(scriptType);

    // Generate script content using template and options
    const scriptContent = await this.scriptService.generateScript({
      template,
      scriptType,
      targetPath,
      options
    });

    return scriptContent;
  }

  /**
   * Validate generated script
   * @param {string} scriptContent - Generated script content
   * @param {Object} context - Workflow context
   * @throws {Error} If validation fails
   */
  async validateScript(scriptContent, context) {
    if (!scriptContent || scriptContent.trim().length === 0) {
      throw new Error('Generated script content is empty');
    }

    // Validate script syntax and structure
    await this.validationService.validateScript(scriptContent, context.scriptType);
  }

  /**
   * Save script to target location
   * @param {string} scriptContent - Generated script content
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Save result
   */
  async saveScript(scriptContent, context) {
    const { targetPath, scriptType } = context;

    // Determine file extension based on script type
    const extension = this.getScriptExtension(scriptType);
    const fullPath = `${targetPath}.${extension}`;

    // Save script to file system
    const result = await this.scriptService.saveScript(fullPath, scriptContent);

    return {
      path: fullPath,
      metadata: {
        size: scriptContent.length,
        extension,
        scriptType,
        savedAt: new Date()
      }
    };
  }

  /**
   * Get script file extension
   * @param {string} scriptType - Script type
   * @returns {string} File extension
   */
  getScriptExtension(scriptType) {
    const extensionMap = {
      build: 'sh',
      deploy: 'sh',
      test: 'sh',
      lint: 'sh',
      format: 'sh',
      clean: 'sh',
      setup: 'sh',
      migrate: 'sh',
      backup: 'sh',
      restore: 'sh'
    };

    return extensionMap[scriptType] || 'sh';
  }

  /**
   * Get workflow metadata
   * @returns {Object} Workflow metadata
   */
  getMetadata() {
    return {
      name: 'Script Generation Workflow',
      description: 'Workflow for generating various types of scripts',
      version: '1.0.0',
      type: 'script_generation',
      supportedScriptTypes: [
        'build',
        'deploy',
        'test',
        'lint',
        'format',
        'clean',
        'setup',
        'migrate',
        'backup',
        'restore'
      ]
    };
  }

  /**
   * Get workflow dependencies
   * @returns {Array<string>} Required dependencies
   */
  getDependencies() {
    return ['scriptService', 'templateService', 'validationService'];
  }

  /**
   * Get workflow version
   * @returns {string} Workflow version
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Get workflow type
   * @returns {string} Workflow type
   */
  getType() {
    return 'script_generation';
  }
}

module.exports = ScriptGenerationWorkflow; 