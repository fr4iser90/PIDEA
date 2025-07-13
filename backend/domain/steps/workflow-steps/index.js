/**
 * Workflow Steps - Module exports
 * Includes all base steps and workflow components
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

// Note: Handlers are located in application layer
// All handlers are properly located in backend/application/handlers/

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
  
  // Note: Handlers are located in application layer
  // All handlers are properly located in backend/application/handlers/
  
  // New workflow steps
  IdeaToExecutionWorkflow,
  
  // Registry
  StepRegistry
}; 