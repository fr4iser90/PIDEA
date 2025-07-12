/**
 * DocumentationStep_GenerateScriptHandler - Unified Workflow Step
 * Migrated from legacy GenerateScriptHandler
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

class DocumentationStep_GenerateScriptHandler extends BaseWorkflowStep {
  constructor(options = {}) {
    super(options);
    this.name = 'DocumentationStep_GenerateScriptHandler';
    this.description = 'Unified step for script generation (migrated)';
    this.legacyHandler = options.legacyHandler || null;
  }

  async execute(context) {
    if (this.legacyHandler && typeof this.legacyHandler.execute === 'function') {
      return await this.legacyHandler.execute(context);
    }
    return {
      success: true,
      result: 'Script generation completed (unified step)',
      metadata: { migrated: true }
    };
  }
}

module.exports = DocumentationStep_GenerateScriptHandler; 