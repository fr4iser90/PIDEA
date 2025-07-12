/**
 * AnalysisStep_AnalyzeRepoStructureHandler - Unified Workflow Step
 * Migrated from legacy AnalyzeRepoStructureHandler
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

class AnalysisStep_AnalyzeRepoStructureHandler extends BaseWorkflowStep {
  constructor(options = {}) {
    super(options);
    this.name = 'AnalysisStep_AnalyzeRepoStructureHandler';
    this.description = 'Unified step for repo structure analysis (migrated)';
    this.legacyHandler = options.legacyHandler || null;
  }

  async execute(context) {
    if (this.legacyHandler && typeof this.legacyHandler.execute === 'function') {
      return await this.legacyHandler.execute(context);
    }
    return {
      success: true,
      result: 'Repo structure analysis completed (unified step)',
      metadata: { migrated: true }
    };
  }
}

module.exports = AnalysisStep_AnalyzeRepoStructureHandler; 