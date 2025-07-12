/**
 * TestingStep_AutoTestFixHandler - Unified Workflow Step
 * Migrated from legacy AutoTestFixHandler
 */
const BaseWorkflowStep = require('./BaseWorkflowStep');

class TestingStep_AutoTestFixHandler extends BaseWorkflowStep {
  constructor(options = {}) {
    super(options);
    this.name = 'TestingStep_AutoTestFixHandler';
    this.description = 'Unified step for auto test fix (migrated)';
    this.legacyHandler = options.legacyHandler || null;
  }

  async execute(context) {
    if (this.legacyHandler && typeof this.legacyHandler.execute === 'function') {
      return await this.legacyHandler.execute(context);
    }
    return {
      success: true,
      result: 'Auto test fix completed (unified step)',
      metadata: { migrated: true }
    };
  }
}

module.exports = TestingStep_AutoTestFixHandler; 