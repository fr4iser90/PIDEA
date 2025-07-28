/**
 * WorkflowTypes - Central constants for all workflow types
 * Single source of truth for workflow type definitions
 */

const WorkflowTypes = {
  // Core workflow types
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

  // Special workflow types
  TASK: 'task',
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
      this.GENERIC
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

  // Get workflow type from workflow name
  getTypeFromName(workflowName) {
    if (!workflowName) return this.GENERIC;
    
    const name = workflowName.toLowerCase();
    
    if (name.includes('comprehensive') || name.includes('analysis')) {
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

module.exports = WorkflowTypes; 