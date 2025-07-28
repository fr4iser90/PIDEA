/**
 * WorkflowTypeDetector - Domain service for intelligent workflow type detection
 * Provides strict type detection with zero fallback mechanisms
 */

const ServiceLogger = require('@logging/ServiceLogger');

// Custom error classes for strict error handling
class InvalidWorkflowDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidWorkflowDataError';
    this.code = 'InvalidWorkflowDataError';
  }
}

class InvalidStepError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidStepError';
    this.code = 'InvalidStepError';
  }
}

class UnknownWorkflowTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnknownWorkflowTypeError';
    this.code = 'UnknownWorkflowTypeError';
  }
}

class WorkflowTypeDetector {
  constructor(dependencies = {}) {
    this.logger = new ServiceLogger('WorkflowTypeDetector');
    this.eventBus = dependencies.eventBus;
    
    // Use central WorkflowTypes constants
    const WorkflowTypes = require('@domain/constants/WorkflowTypes');
    this.knownTypes = WorkflowTypes.getKnownTypesSet();

    // Step action patterns for type detection
    this.stepPatterns = {
      refactoring: [
        'refactor_code', 'extract_method', 'extract_class', 'rename_variable',
        'move_method', 'split_class', 'merge_classes', 'optimize_imports',
        'restructure_code', 'apply_pattern', 'cleanup_code'
      ],
      testing: [
        'run_tests', 'write_test', 'unit_test', 'integration_test', 'e2e_test',
        'test_coverage', 'mocking', 'test_setup', 'test_teardown', 'assert_test',
        'performance_test', 'security_test'
      ],
      analysis: [
        'analyze_code', 'code_review', 'architecture_analysis', 'performance_analysis',
        'security_scan', 'dependency_analysis', 'complexity_analysis', 'quality_check',
        'static_analysis', 'dynamic_analysis', 'profiling'
      ],
      feature: [
        'implement_feature', 'add_functionality', 'create_component', 'add_api_endpoint',
        'create_page', 'add_validation', 'implement_ui', 'add_configuration',
        'create_service', 'add_integration'
      ],
      bugfix: [
        'fix_bug', 'debug_issue', 'resolve_error', 'patch_code', 'fix_crash',
        'resolve_conflict', 'fix_typo', 'correct_logic', 'fix_performance',
        'resolve_dependency'
      ],
      documentation: [
        'write_docs', 'update_readme', 'create_api_docs', 'write_comments',
        'document_code', 'create_guide', 'update_changelog', 'write_tutorial',
        'create_diagram', 'document_architecture'
      ],
      manual: [
        'manual_task', 'user_action', 'manual_review', 'manual_testing',
        'manual_deployment', 'manual_configuration', 'manual_verification'
      ],
      optimization: [
        'optimize_performance', 'reduce_memory', 'improve_speed', 'optimize_query',
        'cache_optimization', 'bundle_optimization', 'image_optimization',
        'database_optimization', 'algorithm_optimization'
      ],
      security: [
        'security_audit', 'vulnerability_scan', 'penetration_test', 'security_fix',
        'encrypt_data', 'secure_authentication', 'authorization_check',
        'input_validation', 'sql_injection_prevention'
      ]
    };

    this.logger.info('WorkflowTypeDetector initialized');
  }

  /**
   * Detect workflow type from workflow data
   * @param {Object} workflowData - Workflow data to analyze
   * @returns {Object} Detection result with type and confidence
   */
  detectWorkflowType(workflowData) {
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
      const detectedType = this.determineTypeFromSteps(stepAnalysis);
      const confidence = this.calculateConfidence(stepAnalysis, detectedType);

      // Strict validation - throw error if type not recognized
      if (!this.knownTypes.has(detectedType)) {
        throw new UnknownWorkflowTypeError(`Unknown workflow type detected: ${detectedType}`);
      }

      const result = {
        type: detectedType,
        confidence: confidence,
        analysis: {
          stepCount: workflowData.steps.length,
          stepTypes: stepAnalysis.map(s => s.type),
          analysisMethod: 'strict_detection',
          timestamp: new Date().toISOString()
        }
      };

      this.logger.info('Workflow type detected', { 
        workflowId: workflowData.id,
        type: detectedType,
        confidence: confidence 
      });

      // Emit detection event
      if (this.eventBus) {
        this.eventBus.emit('workflow:type:detected', {
          workflowId: workflowData.id,
          type: detectedType,
          confidence: confidence,
          analysis: result.analysis
        });
      }

      return result;

    } catch (error) {
      this.logger.error('Failed to detect workflow type', { 
        workflowId: workflowData?.id,
        error: error.message 
      });

      // Emit error event
      if (this.eventBus) {
        this.eventBus.emit('workflow:type:detection:error', {
          workflowId: workflowData?.id,
          error: error.message,
          code: error.code
        });
      }

      throw error;
    }
  }

  /**
   * Analyze individual steps in the workflow
   * @param {Array} steps - Workflow steps
   * @returns {Array} Step analysis results
   */
  analyzeSteps(steps) {
    return steps.map((step, index) => {
      try {
        // Validate step - throw error if invalid
        if (!step || !step.action) {
          throw new InvalidStepError(`Step ${index + 1} must have an action property`);
        }

        const stepType = this.classifyStepAction(step.action);
        const stepMetadata = this.extractStepMetadata(step);

        return {
          index: index,
          action: step.action,
          type: stepType,
          metadata: stepMetadata,
          confidence: this.calculateStepConfidence(step.action, stepType)
        };

      } catch (error) {
        this.logger.error('Failed to analyze step', { 
          stepIndex: index,
          step: step,
          error: error.message 
        });
        throw error;
      }
    });
  }

  /**
   * Classify step action into workflow type
   * @param {string} action - Step action
   * @returns {string} Workflow type
   */
  classifyStepAction(action) {
    if (!action || typeof action !== 'string') {
      throw new InvalidStepError('Step action must be a non-empty string');
    }

    const normalizedAction = action.toLowerCase().trim();

    // Check each type's patterns
    for (const [type, patterns] of Object.entries(this.stepPatterns)) {
      if (patterns.some(pattern => normalizedAction.includes(pattern))) {
        return type;
      }
    }

    // If no specific pattern matches, analyze action keywords
    const actionKeywords = this.analyzeActionKeywords(normalizedAction);
    
    if (actionKeywords.length > 0) {
      return actionKeywords[0]; // Return the most likely type
    }

    // If still no match, throw error for unknown type
    throw new UnknownWorkflowTypeError(`Cannot determine workflow type for action: ${action}`);
  }

  /**
   * Analyze action keywords to determine type
   * @param {string} action - Normalized action string
   * @returns {Array} Ordered list of likely types
   */
  analyzeActionKeywords(action) {
    const keywordScores = {
      refactoring: 0,
      testing: 0,
      analysis: 0,
      feature: 0,
      bugfix: 0,
      documentation: 0,
      manual: 0,
      optimization: 0,
      security: 0
    };

    // Refactoring keywords
    if (action.includes('refactor') || action.includes('extract') || action.includes('rename') || 
        action.includes('move') || action.includes('split') || action.includes('merge')) {
      keywordScores.refactoring += 3;
    }

    // Testing keywords
    if (action.includes('test') || action.includes('mock') || action.includes('assert') || 
        action.includes('coverage') || action.includes('spec')) {
      keywordScores.testing += 3;
    }

    // Analysis keywords
    if (action.includes('analyze') || action.includes('review') || action.includes('scan') || 
        action.includes('check') || action.includes('audit')) {
      keywordScores.analysis += 3;
    }

    // Feature keywords
    if (action.includes('implement') || action.includes('add') || action.includes('create') || 
        action.includes('build') || action.includes('develop')) {
      keywordScores.feature += 2;
    }

    // Bugfix keywords
    if (action.includes('fix') || action.includes('debug') || action.includes('resolve') || 
        action.includes('patch') || action.includes('correct')) {
      keywordScores.bugfix += 3;
    }

    // Documentation keywords
    if (action.includes('doc') || action.includes('write') || action.includes('comment') || 
        action.includes('guide') || action.includes('tutorial')) {
      keywordScores.documentation += 3;
    }

    // Manual keywords
    if (action.includes('manual') || action.includes('user') || action.includes('human')) {
      keywordScores.manual += 3;
    }

    // Optimization keywords
    if (action.includes('optimize') || action.includes('improve') || action.includes('enhance') || 
        action.includes('performance') || action.includes('speed')) {
      keywordScores.optimization += 2;
    }

    // Security keywords
    if (action.includes('security') || action.includes('secure') || action.includes('encrypt') || 
        action.includes('vulnerability') || action.includes('auth')) {
      keywordScores.security += 3;
    }

    // Return types ordered by score
    return Object.entries(keywordScores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => b - a)
      .map(([type, _]) => type);
  }

  /**
   * Determine workflow type from step analysis
   * @param {Array} stepAnalysis - Step analysis results
   * @returns {string} Determined workflow type
   */
  determineTypeFromSteps(stepAnalysis) {
    if (!stepAnalysis || stepAnalysis.length === 0) {
      throw new InvalidWorkflowDataError('Step analysis is required');
    }

    // Count types
    const typeCounts = {};
    stepAnalysis.forEach(step => {
      typeCounts[step.type] = (typeCounts[step.type] || 0) + 1;
    });

    // Find the most common type
    let dominantType = null;
    let maxCount = 0;

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    if (!dominantType) {
      throw new UnknownWorkflowTypeError('Cannot determine dominant workflow type from steps');
    }

    return dominantType;
  }

  /**
   * Calculate confidence score for type detection
   * @param {Array} stepAnalysis - Step analysis results
   * @param {string} detectedType - Detected workflow type
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(stepAnalysis, detectedType) {
    if (!stepAnalysis || stepAnalysis.length === 0) {
      return 0;
    }

    // Count steps of the detected type
    const typeSteps = stepAnalysis.filter(step => step.type === detectedType);
    const typeRatio = typeSteps.length / stepAnalysis.length;

    // Calculate average confidence of type steps
    const avgConfidence = typeSteps.reduce((sum, step) => sum + step.confidence, 0) / typeSteps.length;

    // Combine ratio and confidence
    const confidence = (typeRatio * 0.7) + (avgConfidence * 0.3);

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate confidence for individual step
   * @param {string} action - Step action
   * @param {string} type - Detected type
   * @returns {number} Confidence score (0-1)
   */
  calculateStepConfidence(action, type) {
    const patterns = this.stepPatterns[type] || [];
    
    // Check if action matches any pattern exactly
    const normalizedAction = action.toLowerCase().trim();
    const exactMatch = patterns.some(pattern => normalizedAction === pattern);
    
    if (exactMatch) {
      return 1.0;
    }

    // Check for partial matches
    const partialMatches = patterns.filter(pattern => normalizedAction.includes(pattern));
    if (partialMatches.length > 0) {
      return 0.8;
    }

    // Check keyword analysis
    const keywords = this.analyzeActionKeywords(normalizedAction);
    if (keywords.includes(type)) {
      return 0.6;
    }

    return 0.3; // Low confidence for unclear matches
  }

  /**
   * Extract metadata from step
   * @param {Object} step - Workflow step
   * @returns {Object} Step metadata
   */
  extractStepMetadata(step) {
    const metadata = {
      hasParameters: !!step.parameters,
      hasDescription: !!step.description,
      hasTimeout: !!step.timeout,
      hasRetries: !!step.retries
    };

    if (step.parameters) {
      metadata.parameterCount = Object.keys(step.parameters).length;
      metadata.parameterKeys = Object.keys(step.parameters);
    }

    return metadata;
  }

  /**
   * Get list of all known workflow types
   * @returns {Array} List of known types
   */
  getKnownTypes() {
    return Array.from(this.knownTypes);
  }

  /**
   * Validate if a type is known
   * @param {string} type - Workflow type to validate
   * @returns {boolean} True if type is known
   */
  isValidType(type) {
    return this.knownTypes.has(type);
  }

  /**
   * Get step patterns for a specific type
   * @param {string} type - Workflow type
   * @returns {Array} Step patterns for the type
   */
  getStepPatterns(type) {
    if (!this.knownTypes.has(type)) {
      throw new UnknownWorkflowTypeError(`Unknown workflow type: ${type}`);
    }

    return this.stepPatterns[type] || [];
  }
}

module.exports = WorkflowTypeDetector; 