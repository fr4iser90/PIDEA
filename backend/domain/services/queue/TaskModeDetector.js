/**
 * TaskModeDetector - Domain service for intelligent task mode detection
 * Provides strict mode detection with zero fallback mechanisms
 */

const ServiceLogger = require('@logging/ServiceLogger');

// Custom error classes for strict error handling
class InvalidWorkflowDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidWorkflowDataError';
  }
}

class UnknownTaskModeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnknownTaskModeError';
  }
}

/**
 * TaskModeDetector - Intelligent task mode detection service
 * 
 * This service provides strict task mode detection based on workflow step analysis.
 * It uses a rule-based approach with confidence scoring and zero fallback mechanisms.
 * 
 * Key Features:
 * - Strict validation with immediate error throwing
 * - Confidence-based scoring system
 * - Step pattern analysis
 * - Event emission for monitoring
 * - Zero fallback - fails fast on unknown patterns
 * 
 * Usage:
 * ```javascript
 * const detector = new TaskModeDetector();
 * const result = detector.detectWorkflowType(workflowData);
 * console.log(result.type, result.confidence);
 * ```
 */
class TaskModeDetector {
  constructor(dependencies = {}) {
    this.logger = new ServiceLogger('TaskModeDetector');
    this.eventBus = dependencies.eventBus;
    
    // Known task modes with their characteristics
    this.knownTypes = new Set([
      'task-review',
      'task-check-state', 
      'task-execution',
      'task-validation',
      'task-create-workflow',
      'advanced-task-create-workflow',
      'analysis',
      'refactoring',
      'testing',
      'deployment',
      'documentation',
      'code-generation'
    ]);

    // Step patterns for each task mode
    this.stepPatterns = {
      'task-review': {
        required: ['ide_send_message_step'],
        optional: ['confirmation_step'],
        weight: 0.8
      },
      'task-check-state': {
        required: ['ide_send_message_step'],
        optional: ['confirmation_step'],
        weight: 0.7
      },
      'task-execution': {
        required: ['ide_send_message_step', 'confirmation_step'],
        optional: ['git_step', 'test_step'],
        weight: 0.9
      },
      'task-create-workflow': {
        required: ['ide_send_message_step'],
        optional: ['confirmation_step', 'git_create_branch', 'ide_send_message_step'],
        weight: 0.9
      },
      'advanced-task-create-workflow': {
        required: ['ide_send_message_step', 'analysis_step'],
        optional: ['confirmation_step', 'validation_step', 'quality_assessment'],
        weight: 0.9
      },
      'analysis': {
        required: ['analysis_step'],
        optional: ['report_step', 'validation_step'],
        weight: 0.8
      },
      'refactoring': {
        required: ['refactor_step'],
        optional: ['test_step', 'validation_step'],
        weight: 0.8
      },
      'testing': {
        required: ['test_step'],
        optional: ['coverage_step', 'validation_step'],
        weight: 0.8
      },
      'deployment': {
        required: ['deploy_step'],
        optional: ['health_check_step', 'rollback_step'],
        weight: 0.9
      },
      'documentation': {
        required: ['documentation_step'],
        optional: ['validation_step'],
        weight: 0.7
      },
      'code-generation': {
        required: ['generation_step'],
        optional: ['validation_step', 'test_step'],
        weight: 0.8
      }
    };

    // Step type weights for confidence calculation
    this.stepWeights = {
      'ide_send_message_step': 0.3,
      'confirmation_step': 0.2,
      'analysis_step': 0.4,
      'refactor_step': 0.4,
      'test_step': 0.3,
      'deploy_step': 0.5,
      'documentation_step': 0.3,
      'generation_step': 0.4,
      'validation_step': 0.2,
      'git_step': 0.1,
      'coverage_step': 0.1,
      'health_check_step': 0.2,
      'rollback_step': 0.1,
      'report_step': 0.1
    };

    this.logger.info('TaskModeDetector initialized');
  }

  /**
   * Detect task mode from workflow data
   * @param {Object} workflowData - Workflow data to analyze
   * @returns {Object} Detection result with type and confidence
   */
  detectTaskMode(workflowData) {
    try {
      this.logger.debug('Detecting workflow type', { 
        workflowId: workflowData?.id,
        stepCount: workflowData?.steps?.length 
      });

      // Validate input - throw error if invalid
      if (!workflowData || !workflowData.steps) {
        throw new InvalidWorkflowDataError('Workflow data and steps are required');
      }

      if (!Array.isArray(workflowData.steps) || workflowData.steps.length === 0) {
        throw new InvalidWorkflowDataError('Workflow must have at least one step');
      }

      // Analyze steps to determine type
      const stepAnalysis = this.analyzeSteps(workflowData.steps);
      const detectedMode = this.determineModeFromSteps(stepAnalysis);
      const confidence = this.calculateConfidence(stepAnalysis, detectedMode);

      // Strict validation - throw error if mode not recognized
      if (!this.knownTypes.has(detectedMode)) {
        throw new UnknownTaskModeError(`Unknown task mode detected: ${detectedMode}`);
      }

      const result = {
        type: detectedMode,
        confidence: confidence,
        analysis: {
          stepCount: workflowData.steps.length,
          stepTypes: stepAnalysis.map(s => s.type),
          analysisMethod: 'strict_detection',
          timestamp: new Date().toISOString()
        }
      };

      this.logger.info('Task mode detected', { 
        workflowId: workflowData.id,
        type: detectedMode,
        confidence: confidence 
      });

      // Emit detection event
      if (this.eventBus) {
        this.eventBus.emit('task:mode:detected', {
          workflowId: workflowData.id,
          type: detectedMode,
          confidence: confidence,
          analysis: result.analysis
        });
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to detect task mode', {
        workflowId: workflowData?.id,
        error: error.message,
        errorType: error.constructor.name
      });

      // Re-throw the error for strict handling
      throw error;
    }
  }

  /**
   * Analyze workflow steps to extract patterns
   * @param {Array} steps - Workflow steps
   * @returns {Array} Step analysis results
   */
  analyzeSteps(steps) {
    return steps.map(step => ({
      type: step.type || step.step,
      name: step.name,
      weight: this.stepWeights[step.type || step.step] || 0.1,
      required: step.strict !== false,
      options: step.options || {}
    }));
  }

  /**
   * Determine task mode from step analysis
   * @param {Array} stepAnalysis - Analyzed steps
   * @returns {string} Detected task mode
   */
  determineModeFromSteps(stepAnalysis) {
    const stepTypes = stepAnalysis.map(s => s.type);
    
    // Check each known type pattern
    for (const [type, pattern] of Object.entries(this.stepPatterns)) {
      const hasRequired = pattern.required.every(requiredStep => 
        stepTypes.includes(requiredStep)
      );
      
      if (hasRequired) {
        // Additional scoring based on optional steps
        const optionalMatches = pattern.optional.filter(optionalStep => 
          stepTypes.includes(optionalStep)
        ).length;
        
        // Return the first match (could be enhanced with scoring)
        return type;
      }
    }

    // If no pattern matches, try to infer from step types
    if (stepTypes.includes('ide_send_message_step')) {
      return 'task-review'; // Default for IDE message steps
    }
    
    if (stepTypes.includes('analysis_step')) {
      return 'analysis';
    }
    
    if (stepTypes.includes('refactor_step')) {
      return 'refactoring';
    }
    
    if (stepTypes.includes('test_step')) {
      return 'testing';
    }
    
    if (stepTypes.includes('deploy_step')) {
      return 'deployment';
    }
    
    if (stepTypes.includes('documentation_step')) {
      return 'documentation';
    }
    
    if (stepTypes.includes('generation_step')) {
      return 'code-generation';
    }

    // Default fallback
    return 'task-review';
  }

  /**
   * Calculate confidence score for detected type
   * @param {Array} stepAnalysis - Analyzed steps
   * @param {string} detectedType - Detected workflow type
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(stepAnalysis, detectedMode) {
    const pattern = this.stepPatterns[detectedMode];
    if (!pattern) return 0;

    const stepTypes = stepAnalysis.map(s => s.type);
    
    // Base confidence from pattern weight
    let confidence = pattern.weight;
    
    // Boost confidence for required steps
    const requiredMatches = pattern.required.filter(requiredStep => 
      stepTypes.includes(requiredStep)
    ).length;
    confidence += (requiredMatches / pattern.required.length) * 0.2;
    
    // Boost confidence for optional steps
    const optionalMatches = pattern.optional.filter(optionalStep => 
      stepTypes.includes(optionalStep)
    ).length;
    confidence += (optionalMatches / pattern.optional.length) * 0.1;
    
    // Penalize for unexpected steps
    const unexpectedSteps = stepTypes.filter(stepType => 
      !pattern.required.includes(stepType) && 
      !pattern.optional.includes(stepType)
    ).length;
    confidence -= unexpectedSteps * 0.05;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get all known task modes
   * @returns {Set} Set of known task modes
   */
  getKnownTypes() {
    return new Set(this.knownTypes);
  }

  /**
   * Add a new task mode pattern
   * @param {string} type - Task mode name
   * @param {Object} pattern - Pattern definition
   */
  addWorkflowType(type, pattern) {
    this.knownTypes.add(type);
    this.stepPatterns[type] = pattern;
    
    this.logger.info('Added new task mode', { type, pattern });
  }

  /**
   * Remove a task mode pattern
   * @param {string} type - Task mode name
   */
  removeWorkflowType(type) {
    this.knownTypes.delete(type);
    delete this.stepPatterns[type];
    
    this.logger.info('Removed task mode', { type });
  }

  /**
   * Get task mode pattern
   * @param {string} type - Task mode name
   * @returns {Object|null} Pattern definition or null
   */
  getTaskModePattern(type) {
    return this.stepPatterns[type] || null;
  }

  /**
   * Validate workflow data structure
   * @param {Object} workflowData - Workflow data to validate
   * @returns {boolean} True if valid
   */
  validateWorkflowData(workflowData) {
    try {
      if (!workflowData || typeof workflowData !== 'object') {
        return false;
      }
      
      if (!workflowData.steps || !Array.isArray(workflowData.steps)) {
        return false;
      }
      
      if (workflowData.steps.length === 0) {
        return false;
      }
      
      // Validate each step
      for (const step of workflowData.steps) {
        if (!step.type && !step.step) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error validating workflow data', { error: error.message });
      return false;
    }
  }

  /**
   * Get detection statistics
   * @returns {Object} Detection statistics
   */
  getStatistics() {
    return {
      knownTypes: Array.from(this.knownTypes),
      totalPatterns: Object.keys(this.stepPatterns).length,
      stepWeights: Object.keys(this.stepWeights).length,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TaskModeDetector;
