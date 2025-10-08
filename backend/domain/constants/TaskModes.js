/**
 * TaskModes - Central constants for all task modes
 * Single source of truth for task mode definitions
 */

const taskModes = {
  // Core task modes
  REFACTORING: 'refactoring',
  TESTING: 'testing', 
  ANALYSIS: 'analysis',
  FEATURE: 'feature',
  BUGFIX: 'bugfix',
  DOCUMENTATION: 'documentation',
  MANUAL: 'manual',
  OPTIMIZATION: 'optimization',
  SECURITY: 'security',
  GENERIC: 'generic',

  // Special task modes
  TASK: 'task',
  TASK_REVIEW: 'task-review',
  TASK_CHECK_STATE: 'task-check-state',
  WORKFLOW_EXECUTION: 'workflow-execution',
  BRANCH_CREATION: 'branch-creation',
  WORKFLOW_COMPLETION: 'workflow-completion',
  PULL_REQUEST_CREATION: 'pull-request-creation',

  // Get all known types as array
  getAllTypes() {
    return [
      this.REFACTORING,
      this.TESTING,
      this.ANALYSIS,
      this.FEATURE,
      this.BUGFIX,
      this.DOCUMENTATION,
      this.MANUAL,
      this.OPTIMIZATION,
      this.SECURITY,
      this.GENERIC,
      this.TASK_REVIEW,
      this.TASK_CHECK_STATE
    ];
  },

  // Get all types as Set
  getKnownTypesSet() {
    return new Set(this.getAllTypes());
  },

  // Validate if type is known
  isValidType(type) {
    return this.getKnownTypesSet().has(type);
  },

  // Get task mode from workflow name
  getModeFromName(workflowName) {
    if (!workflowName) return this.GENERIC;
    
    const name = workflowName.toLowerCase();
    
    if (name.includes('task-review') || name.includes('task_review')) {
      return this.TASK_REVIEW;
    } else if (name.includes('task-check-state') || name.includes('check-state')) {
      return this.TASK_CHECK_STATE;
    } else if (name.includes('comprehensive') || name.includes('analysis')) {
      return this.ANALYSIS;
    } else if (name.includes('refactor')) {
      return this.REFACTORING;
    } else if (name.includes('test')) {
      return this.TESTING;
    } else if (name.includes('feature')) {
      return this.FEATURE;
    } else if (name.includes('bug')) {
      return this.BUGFIX;
    } else if (name.includes('security')) {
      return this.SECURITY;
    } else if (name.includes('performance') || name.includes('optimization')) {
      return this.OPTIMIZATION;
    } else if (name.includes('documentation') || name.includes('docs')) {
      return this.DOCUMENTATION;
    }
    
    return this.GENERIC;
  }
};

module.exports = taskModes;
