/**
 * DocumentationGenerationWorkflow - Domain Layer: Documentation Generation Workflow
 * 
 * This workflow handles documentation generation tasks, orchestrating the
 * creation of various types of documentation (API docs, README files,
 * technical documentation, etc.).
 */
const IWorkflow = require('../../../interfaces/IWorkflow');
const { logger } = require('@infrastructure/logging/Logger');

class DocumentationGenerationWorkflow extends IWorkflow {
  /**
   * Create a new documentation generation workflow
   * @param {Object} dependencies - Workflow dependencies
   */
  constructor(dependencies = {}) {
    super();
    this.documentationService = dependencies.documentationService;
    this.templateService = dependencies.templateService;
    this.analysisService = dependencies.analysisService;
    this.validationService = dependencies.validationService;
    this.logger = dependencies.logger || console;
  }

  /**
   * Execute documentation generation workflow
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Workflow result
   */
  async execute(context) {
    try {
      this.logger.info('DocumentationGenerationWorkflow: Starting documentation generation', {
        docType: context.docType,
        targetPath: context.targetPath
      });

      // Validate input
      await this.validateInput(context);

      // Analyze project structure if needed
      const projectAnalysis = await this.analyzeProject(context);

      // Generate documentation content
      const docContent = await this.generateDocumentation(context, projectAnalysis);

      // Validate generated documentation
      await this.validateDocumentation(docContent, context);

      // Save documentation to target location
      const result = await this.saveDocumentation(docContent, context);

      this.logger.info('DocumentationGenerationWorkflow: Documentation generation completed', {
        docType: context.docType,
        targetPath: context.targetPath,
        success: true
      });

      return {
        success: true,
        data: {
          docContent,
          targetPath: context.targetPath,
          docType: context.docType,
          metadata: result.metadata
        },
        metadata: {
          workflowType: 'documentation_generation',
          executionTime: Date.now(),
          docSize: docContent.length
        }
      };

    } catch (error) {
      this.logger.error('DocumentationGenerationWorkflow: Documentation generation failed', {
        error: error.message,
        docType: context.docType,
        targetPath: context.targetPath
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          workflowType: 'documentation_generation',
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
    if (!context.docType) {
      throw new Error('Documentation type is required');
    }

    if (!context.targetPath) {
      throw new Error('Target path is required');
    }

    const validDocTypes = [
      'readme',
      'api',
      'technical',
      'user_guide',
      'developer_guide',
      'installation',
      'changelog',
      'contributing',
      'license',
      'architecture'
    ];

    if (!validDocTypes.includes(context.docType)) {
      throw new Error(`Invalid documentation type: ${context.docType}`);
    }
  }

  /**
   * Analyze project structure
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Project analysis
   */
  async analyzeProject(context) {
    const { projectPath, docType } = context;

    // Only analyze if project path is provided and documentation type requires it
    if (!projectPath || !this.requiresProjectAnalysis(docType)) {
      return null;
    }

    return await this.analysisService.analyzeProject(projectPath);
  }

  /**
   * Check if documentation type requires project analysis
   * @param {string} docType - Documentation type
   * @returns {boolean} True if analysis is required
   */
  requiresProjectAnalysis(docType) {
    const typesRequiringAnalysis = [
      'api',
      'technical',
      'architecture',
      'developer_guide'
    ];

    return typesRequiringAnalysis.includes(docType);
  }

  /**
   * Generate documentation content
   * @param {Object} context - Workflow context
   * @param {Object} projectAnalysis - Project analysis result
   * @returns {Promise<string>} Generated documentation content
   */
  async generateDocumentation(context, projectAnalysis) {
    const { docType, targetPath, options = {} } = context;

    // Get template for documentation type
    const template = await this.templateService.getDocumentationTemplate(docType);

    // Generate documentation content using template, options, and analysis
    const docContent = await this.documentationService.generateDocumentation({
      template,
      docType,
      targetPath,
      options,
      projectAnalysis
    });

    return docContent;
  }

  /**
   * Validate generated documentation
   * @param {string} docContent - Generated documentation content
   * @param {Object} context - Workflow context
   * @throws {Error} If validation fails
   */
  async validateDocumentation(docContent, context) {
    if (!docContent || docContent.trim().length === 0) {
      throw new Error('Generated documentation content is empty');
    }

    // Validate documentation structure and content
    await this.validationService.validateDocumentation(docContent, context.docType);
  }

  /**
   * Save documentation to target location
   * @param {string} docContent - Generated documentation content
   * @param {Object} context - Workflow context
   * @returns {Promise<Object>} Save result
   */
  async saveDocumentation(docContent, context) {
    const { targetPath, docType } = context;

    // Determine file extension based on documentation type
    const extension = this.getDocumentationExtension(docType);
    const fullPath = `${targetPath}.${extension}`;

    // Save documentation to file system
    const result = await this.documentationService.saveDocumentation(fullPath, docContent);

    return {
      path: fullPath,
      metadata: {
        size: docContent.length,
        extension,
        docType,
        savedAt: new Date()
      }
    };
  }

  /**
   * Get documentation file extension
   * @param {string} docType - Documentation type
   * @returns {string} File extension
   */
  getDocumentationExtension(docType) {
    const extensionMap = {
      readme: 'md',
      api: 'md',
      technical: 'md',
      user_guide: 'md',
      developer_guide: 'md',
      installation: 'md',
      changelog: 'md',
      contributing: 'md',
      license: 'txt',
      architecture: 'md'
    };

    return extensionMap[docType] || 'md';
  }

  /**
   * Get workflow metadata
   * @returns {Object} Workflow metadata
   */
  getMetadata() {
    return {
      name: 'Documentation Generation Workflow',
      description: 'Workflow for generating various types of documentation',
      version: '1.0.0',
      type: 'documentation_generation',
      supportedDocTypes: [
        'readme',
        'api',
        'technical',
        'user_guide',
        'developer_guide',
        'installation',
        'changelog',
        'contributing',
        'license',
        'architecture'
      ]
    };
  }

  /**
   * Get workflow dependencies
   * @returns {Array<string>} Required dependencies
   */
  getDependencies() {
    return ['documentationService', 'templateService', 'analysisService', 'validationService'];
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
    return 'documentation_generation';
  }
}

module.exports = DocumentationGenerationWorkflow; 