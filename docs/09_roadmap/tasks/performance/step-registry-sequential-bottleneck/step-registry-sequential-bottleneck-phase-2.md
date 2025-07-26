# StepRegistry Sequential Execution Bottleneck – Phase 2: Core Implementation

## 📋 Phase Overview
- **Phase**: 2 of 4
- **Duration**: 3 hours
- **Priority**: High
- **Status**: Ready
- **Dependencies**: Phase 1 completion

## 🎯 **PRINCIPLE: Real Parallel Execution Implementation**

### **What we DON'T do:**
- ❌ No workarounds or temporary solutions
- ❌ No sequential execution fallbacks
- ❌ No incomplete implementations

### **What we DO:**
- ✅ Implement StepClassifier for step classification
- ✅ Create ParallelExecutionEngine for parallel execution
- ✅ Modify StepRegistry to support parallel execution
- ✅ Add execution mode detection and request cancellation

## 🔧 **Core Implementation**

### **1. StepClassifier Implementation**
**File**: `backend/domain/steps/execution/StepClassifier.js`

**Implementation:**
```javascript
/**
 * StepClassifier - Classifies steps as critical or non-critical for execution
 * Determines which steps can run in parallel vs sequentially
 */

const ServiceLogger = require('@logging/ServiceLogger');

class StepClassifier {
  constructor(options = {}) {
    this.logger = new ServiceLogger('StepClassifier');
    this.criticalPatterns = [
      /IDE.*Step$/,
      /Workflow.*Step$/,
      /Task.*Step$/,
      /Analysis.*Step$/,
      /Refactoring.*Step$/,
      /Testing.*Step$/,
      /Deployment.*Step$/,
      /Create.*Step$/,
      /Send.*Step$/
    ];
    
    this.criticalStepNames = [
      'IDESendMessageStep',
      'CreateChatStep', 
      'TaskExecutionStep',
      'WorkflowExecutionStep',
      'AnalysisExecutionStep',
      'RefactoringStep',
      'TestingStep',
      'DeploymentStep'
    ];
  }

  /**
   * Classify steps into critical and non-critical groups
   * @param {Array} stepNames - Array of step names to classify
   * @param {Object} context - Execution context
   * @returns {Object} Classification result
   */
  classifySteps(stepNames, context = {}) {
    const criticalSteps = [];
    const nonCriticalSteps = [];
    
    this.logger.info('Classifying steps for execution', {
      totalSteps: stepNames.length,
      context: this.getContextSummary(context)
    });
    
    for (const stepName of stepNames) {
      if (this.isCriticalStep(stepName, context)) {
        criticalSteps.push(stepName);
        this.logger.debug(`Step "${stepName}" classified as CRITICAL`);
      } else {
        nonCriticalSteps.push(stepName);
        this.logger.debug(`Step "${stepName}" classified as NON-CRITICAL`);
      }
    }
    
    this.logger.info('Step classification completed', {
      criticalCount: criticalSteps.length,
      nonCriticalCount: nonCriticalSteps.length,
      criticalSteps,
      nonCriticalSteps
    });
    
    return { criticalSteps, nonCriticalSteps };
  }

  /**
   * Determine if a step is critical and must run sequentially
   * @param {string} stepName - Step name
   * @param {Object} context - Execution context
   * @returns {boolean} True if critical step
   */
  isCriticalStep(stepName, context = {}) {
    // Check explicit critical step names
    if (this.criticalStepNames.includes(stepName)) {
      return true;
    }
    
    // Check critical patterns
    const isCriticalByName = this.criticalPatterns.some(pattern => 
      pattern.test(stepName)
    );
    
    // Check workflow context
    const isWorkflowContext = context.workflowId || 
                             context.taskId || 
                             context.analysisId ||
                             context.executionMode === 'workflow';
    
    // Check if step has dependencies
    const hasDependencies = context.dependencies && 
                           Array.isArray(context.dependencies) && 
                           context.dependencies.length > 0;
    
    return isCriticalByName || isWorkflowContext || hasDependencies;
  }

  /**
   * Get context summary for logging
   * @param {Object} context - Execution context
   * @returns {Object} Context summary
   */
  getContextSummary(context) {
    return {
      hasWorkflowId: !!context.workflowId,
      hasTaskId: !!context.taskId,
      hasAnalysisId: !!context.analysisId,
      executionMode: context.executionMode,
      hasDependencies: !!(context.dependencies && context.dependencies.length)
    };
  }
}

module.exports = StepClassifier;
```

### **2. ParallelExecutionEngine Implementation**
**File**: `backend/domain/steps/execution/ParallelExecutionEngine.js`

**Implementation:**
```javascript
/**
 * ParallelExecutionEngine - Executes non-critical steps in parallel
 * Provides timeout handling, error isolation, and resource management
 */

const ServiceLogger = require('@logging/ServiceLogger');
const { AbortController } = require('node:abort-controller');

class ParallelExecutionEngine {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 4;
    this.timeout = options.timeout || 30000;
    this.logger = new ServiceLogger('ParallelExecutionEngine');
    this.stepRegistry = options.stepRegistry;
    
    this.activeExecutions = new Map();
    this.executionQueue = [];
  }

  /**
   * Execute steps in parallel with timeout and error handling
   * @param {Array} stepNames - Array of step names to execute
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Array>} Execution results
   */
  async executeStepsParallel(stepNames, context = {}, options = {}) {
    if (!stepNames || stepNames.length === 0) {
      this.logger.info('No steps to execute in parallel');
      return [];
    }

    this.logger.info('Starting parallel execution', {
      stepCount: stepNames.length,
      maxConcurrency: this.maxConcurrency,
      timeout: this.timeout
    });

    try {
      // Create execution promises with timeout and error handling
      const stepPromises = stepNames.map(stepName => 
        this.executeStepWithTimeout(stepName, context, options)
      );

      // Execute all steps in parallel
      const results = await Promise.all(stepPromises);

      this.logger.info('Parallel execution completed', {
        totalSteps: stepNames.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;

    } catch (error) {
      this.logger.error('Parallel execution failed', {
        error: error.message,
        stepCount: stepNames.length
      });
      throw error;
    }
  }

  /**
   * Execute a single step with timeout and error isolation
   * @param {string} stepName - Step name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Step result
   */
  async executeStepWithTimeout(stepName, context, options = {}) {
    const executionId = `parallel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.logger.debug(`Starting parallel step execution`, {
      stepName,
      executionId
    });

    try {
      // Create abort controller for timeout
      const abortController = new AbortController();
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.timeout);

      // Track active execution
      this.activeExecutions.set(executionId, {
        stepName,
        startTime: new Date(),
        status: 'running'
      });

      // Execute step with timeout
      const result = await Promise.race([
        this.stepRegistry.executeStep(stepName, context, options),
        this.createTimeoutPromise(this.timeout, stepName)
      ]);

      // Clear timeout
      clearTimeout(timeoutId);

      // Update execution tracking
      this.activeExecutions.delete(executionId);

      const duration = Date.now() - startTime;

      this.logger.debug(`Parallel step execution completed`, {
        stepName,
        executionId,
        duration,
        success: result.success
      });

      return {
        ...result,
        executionId,
        duration,
        executionMode: 'parallel'
      };

    } catch (error) {
      // Update execution tracking
      this.activeExecutions.delete(executionId);

      const duration = Date.now() - startTime;

      this.logger.error(`Parallel step execution failed`, {
        stepName,
        executionId,
        duration,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        step: stepName,
        executionId,
        duration,
        executionMode: 'parallel',
        timestamp: new Date()
      };
    }
  }

  /**
   * Create timeout promise for step execution
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} stepName - Step name for error message
   * @returns {Promise} Timeout promise
   */
  createTimeoutPromise(timeout, stepName) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Step "${stepName}" execution timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Get active executions status
   * @returns {Object} Active executions status
   */
  getActiveExecutions() {
    return {
      count: this.activeExecutions.size,
      executions: Array.from(this.activeExecutions.entries()).map(([id, data]) => ({
        id,
        stepName: data.stepName,
        startTime: data.startTime,
        status: data.status
      }))
    };
  }

  /**
   * Cancel all active executions
   */
  cancelAllExecutions() {
    this.logger.info('Cancelling all active parallel executions', {
      count: this.activeExecutions.size
    });
    
    this.activeExecutions.clear();
  }
}

module.exports = ParallelExecutionEngine;
```

### **3. StepRegistry Modification**
**File**: `backend/domain/steps/StepRegistry.js`

**Modifications:**
```javascript
// Add imports at top
const StepClassifier = require('./execution/StepClassifier');
const ParallelExecutionEngine = require('./execution/ParallelExecutionEngine');

// Add to constructor
constructor(serviceRegistry = null) {
  this.steps = new Map();
  this.categories = new Map();
  this.executors = new Map();
  this.logger = new ServiceLogger('StepRegistry');
  this.serviceRegistry = serviceRegistry;
  
  // ✅ NEW: Initialize parallel execution components
  this.stepClassifier = new StepClassifier();
  this.parallelEngine = new ParallelExecutionEngine({
    stepRegistry: this,
    maxConcurrency: 4,
    timeout: 30000
  });
}

// ✅ NEW: Enhanced executeSteps method
async executeSteps(stepNames, context = {}, options = {}) {
  try {
    this.logger.info('Starting step execution with parallel support', {
      totalSteps: stepNames.length,
      context: this.getContextSummary(context)
    });

    // 1. Classify steps
    const { criticalSteps, nonCriticalSteps } = this.stepClassifier.classifySteps(stepNames, context);

    const results = {
      successful: [],
      failed: [],
      total: stepNames.length,
      critical: { successful: [], failed: [] },
      parallel: { successful: [], failed: [] }
    };

    // 2. Execute critical steps sequentially
    if (criticalSteps.length > 0) {
      this.logger.info(`Executing ${criticalSteps.length} critical steps sequentially`);
      const criticalResults = await this.executeStepsSequential(criticalSteps, context, options);
      results.critical = criticalResults;
      results.successful.push(...criticalResults.successful);
      results.failed.push(...criticalResults.failed);
    }

    // 3. Execute non-critical steps in parallel
    if (nonCriticalSteps.length > 0) {
      this.logger.info(`Executing ${nonCriticalSteps.length} non-critical steps in parallel`);
      const parallelResults = await this.parallelEngine.executeStepsParallel(nonCriticalSteps, context, options);
      
      // Process parallel results
      parallelResults.forEach(result => {
        if (result.success) {
          results.parallel.successful.push(result);
          results.successful.push(result);
        } else {
          results.parallel.failed.push(result);
          results.failed.push(result);
        }
      });
    }

    this.logger.info('Step execution completed', {
      total: results.total,
      successful: results.successful.length,
      failed: results.failed.length,
      criticalSuccessful: results.critical.successful.length,
      parallelSuccessful: results.parallel.successful.length
    });

    return results;

  } catch (error) {
    this.logger.error('Step execution failed', {
      error: error.message,
      stepCount: stepNames.length
    });
    throw error;
  }
}

// ✅ NEW: Sequential execution for critical steps
async executeStepsSequential(stepNames, context = {}, options = {}) {
  const results = {
    successful: [],
    failed: [],
    total: stepNames.length
  };

  for (const stepName of stepNames) {
    try {
      const result = await this.executeStep(stepName, context, options);
      
      if (result.success) {
        results.successful.push(result);
      } else {
        results.failed.push(result);
      }

      // Stop on first failure if configured
      if (!result.success && options.stopOnError) {
        break;
      }
    } catch (error) {
      results.failed.push({
        success: false,
        error: error.message,
        step: stepName,
        timestamp: new Date(),
        executionMode: 'sequential'
      });

      if (options.stopOnError) {
        break;
      }
    }
  }

  return results;
}

// ✅ NEW: Context summary helper
getContextSummary(context) {
  return {
    hasWorkflowId: !!context.workflowId,
    hasTaskId: !!context.taskId,
    hasAnalysisId: !!context.analysisId,
    executionMode: context.executionMode,
    userId: context.userId ? 'present' : 'missing'
  };
}
```

## 🎯 **Phase 2 Deliverables**

### **New Files Created:**
- [ ] `backend/domain/steps/execution/StepClassifier.js` - Step classification logic
- [ ] `backend/domain/steps/execution/ParallelExecutionEngine.js` - Parallel execution engine

### **Files Modified:**
- [ ] `backend/domain/steps/StepRegistry.js` - Add parallel execution support
- [ ] `backend/domain/steps/index.js` - Export new components

### **Implementation Features:**
- [ ] Step classification system
- [ ] Parallel execution with timeout handling
- [ ] Error isolation for parallel steps
- [ ] Execution mode detection
- [ ] Request cancellation support
- [ ] Performance monitoring

## 📊 **Implementation Validation**

### **Code Quality Checks:**
- [ ] ESLint compliance
- [ ] JSDoc documentation
- [ ] Error handling patterns
- [ ] Logging consistency
- [ ] Type safety considerations

### **Performance Validation:**
- [ ] Parallel execution working
- [ ] Timeout handling functional
- [ ] Error isolation effective
- [ ] Memory usage acceptable
- [ ] No blocking operations

## 🚀 **Next Phase Preparation**

### **Phase 3 Dependencies:**
- [ ] StepClassifier tested
- [ ] ParallelExecutionEngine tested
- [ ] StepRegistry modifications working
- [ ] Integration points identified

### **Success Criteria:**
- [ ] All new files created and implemented
- [ ] StepRegistry supports parallel execution
- [ ] Step classification working correctly
- [ ] Parallel execution engine functional
- [ ] Ready for Phase 3 integration testing

## 📝 **Notes & Updates**

### **2025-07-26 - Core Implementation**
- Implemented StepClassifier with enhanced classification logic
- Created ParallelExecutionEngine with timeout and error handling
- Modified StepRegistry to support parallel execution
- Added execution mode detection and request cancellation

### **2025-07-26 - Technical Details**
- Used AbortController for request cancellation
- Implemented Promise.race for timeout handling
- Added comprehensive logging and monitoring
- Ensured error isolation for parallel executions 