/**
 * Unified Workflow Steps - Module exports
 * Includes all base steps and migrated legacy handlers
 */

// Base workflow steps
const BaseWorkflowStep = require('./BaseWorkflowStep');
const AnalysisStep = require('./AnalysisStep');
const RefactoringStep = require('./RefactoringStep');
const TestingStep = require('./TestingStep');
const DocumentationStep = require('./DocumentationStep');
const ValidationStep = require('./ValidationStep');
const DeploymentStep = require('./DeploymentStep');
const SecurityStep = require('./SecurityStep');
const OptimizationStep = require('./OptimizationStep');

// Note: Legacy handlers have been moved to application layer
// All handlers are now properly located in backend/application/handlers/

// New workflow steps
const IdeaToExecutionWorkflow = require('./IdeaToExecutionWorkflow');

// Step registry
const StepRegistry = require('./StepRegistry');

module.exports = {
  // Base steps
  BaseWorkflowStep,
  AnalysisStep,
  RefactoringStep,
  TestingStep,
  DocumentationStep,
  ValidationStep,
  DeploymentStep,
  SecurityStep,
  OptimizationStep,
  
  // Note: Legacy handlers have been moved to application layer
  // All handlers are now properly located in backend/application/handlers/
  
  // New workflow steps
  IdeaToExecutionWorkflow,
  
  // Registry
  StepRegistry
}; 