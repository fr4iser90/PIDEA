/**
 * Timeout Resolver
 * Resolves string-based timeout references in workflow configurations
 */

const TimeoutConfig = require('@config/timeout-config');

class TimeoutResolver {
  /**
   * Resolve timeout value from string reference or direct value
   * @param {string|number} timeout - Timeout value or reference string
   * @returns {number} - Resolved timeout value in milliseconds
   */
  static resolve(timeout) {
    if (typeof timeout === 'number') {
      return timeout;
    }
    
    if (typeof timeout === 'string') {
      // Parse format: "TYPE.CATEGORY" or "TYPE"
      const parts = timeout.split('.');
      const type = parts[0];
      const category = parts[1] || 'DEFAULT';
      
      return TimeoutConfig.getTimeout(type, category);
    }
    
    // Default fallback
    return TimeoutConfig.getTimeout('AI_RESPONSE', 'DEFAULT');
  }

  /**
   * Resolve multiple timeout values in an options object
   * @param {object} options - Options object that may contain timeout values
   * @returns {object} - Options with resolved timeout values
   */
  static resolveOptions(options) {
    if (!options || typeof options !== 'object') {
      return options;
    }

    const resolved = { ...options };
    
    // Resolve timeout fields
    const timeoutFields = ['timeout', 'responseTimeout', 'waitTimeout', 'operationTimeout'];
    timeoutFields.forEach(field => {
      if (resolved[field]) {
        resolved[field] = this.resolve(resolved[field]);
      }
    });

    // Resolve interval fields
    const intervalFields = ['checkInterval', 'pollInterval', 'retryInterval'];
    intervalFields.forEach(field => {
      if (resolved[field]) {
        resolved[field] = this.resolve(resolved[field]);
      }
    });

    return resolved;
  }

  /**
   * Resolve workflow step options
   * @param {object} step - Workflow step configuration
   * @returns {object} - Step with resolved timeout values
   */
  static resolveWorkflowStep(step) {
    if (!step || !step.options) {
      return step;
    }

    return {
      ...step,
      options: this.resolveOptions(step.options)
    };
  }

  /**
   * Resolve entire workflow configuration
   * @param {object} workflow - Workflow configuration
   * @returns {object} - Workflow with resolved timeout values
   */
  static resolveWorkflow(workflow) {
    if (!workflow || !workflow.steps) {
      return workflow;
    }

    return {
      ...workflow,
      steps: workflow.steps.map(step => this.resolveWorkflowStep(step)),
      options: this.resolveOptions(workflow.options)
    };
  }
}

module.exports = TimeoutResolver; 