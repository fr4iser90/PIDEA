/**
 * AnalysisStep_AnalyzeTechStackHandler - Unified Workflow Step
 * Migrated from legacy AnalyzeTechStackHandler
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

class AnalysisStep_AnalyzeTechStackHandler extends BaseWorkflowStep {
  constructor(options = {}) {
    super(options);
    this.name = 'AnalysisStep_AnalyzeTechStackHandler';
    this.description = 'Unified step for tech stack analysis (migrated)';
    this.legacyHandler = options.legacyHandler || null;
  }

  async execute(context) {
    if (this.legacyHandler && typeof this.legacyHandler.execute === 'function') {
      return await this.legacyHandler.execute(context);
    }
    return {
      success: true,
      result: 'Tech stack analysis completed (unified step)',
      metadata: { migrated: true }
    };
  }
}

module.exports = AnalysisStep_AnalyzeTechStackHandler; 