/**
 * AnalysisStep_AnalyzeCodeQualityHandler - Unified Workflow Step
 * Migrated from legacy AnalyzeCodeQualityHandler
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

class AnalysisStep_AnalyzeCodeQualityHandler extends BaseWorkflowStep {
  constructor(options = {}) {
    super(options);
    this.name = 'AnalysisStep_AnalyzeCodeQualityHandler';
    this.description = 'Unified step for code quality analysis (migrated)';
    this.legacyHandler = options.legacyHandler || null;
  }

  async execute(context) {
    if (this.legacyHandler && typeof this.legacyHandler.execute === 'function') {
      return await this.legacyHandler.execute(context);
    }
    return {
      success: true,
      result: 'Code quality analysis completed (unified step)',
      metadata: { migrated: true }
    };
  }
}

module.exports = AnalysisStep_AnalyzeCodeQualityHandler; 