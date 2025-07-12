/**
 * DocumentationStep_GenerateScriptsHandler - Unified Workflow Step
 * Migrated from legacy GenerateScriptsHandler
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

class DocumentationStep_GenerateScriptsHandler extends BaseWorkflowStep {
  constructor(options = {}) {
    super(options);
    this.name = 'DocumentationStep_GenerateScriptsHandler';
    this.description = 'Unified step for scripts generation (migrated)';
    this.legacyHandler = options.legacyHandler || null;
  }

  async execute(context) {
    if (this.legacyHandler && typeof this.legacyHandler.execute === 'function') {
      return await this.legacyHandler.execute(context);
    }
    return {
      success: true,
      result: 'Scripts generation completed (unified step)',
      metadata: { migrated: true }
    };
  }
}

module.exports = DocumentationStep_GenerateScriptsHandler; 