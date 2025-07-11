/**
 * Unified Workflow Foundation - Workflow Steps
 * 
 * This module provides all workflow step implementations and the step registry.
 * It includes base step classes, specific step implementations, and step management.
 */

// Base Step
const BaseWorkflowStep = require('./BaseWorkflowStep');

// Specific Step Implementations
const AnalysisStep = require('./AnalysisStep');
const RefactoringStep = require('./RefactoringStep');
const TestingStep = require('./TestingStep');
const DocumentationStep = require('./DocumentationStep');
const ValidationStep = require('./ValidationStep');
const DeploymentStep = require('./DeploymentStep');
const SecurityStep = require('./SecurityStep');
const OptimizationStep = require('./OptimizationStep');

// Step Registry
const StepRegistry = require('./StepRegistry');

// Module exports
module.exports = {
  // Base Step
  BaseWorkflowStep,

  // Specific Step Implementations
  AnalysisStep,
  RefactoringStep,
  TestingStep,
  DocumentationStep,
  ValidationStep,
  DeploymentStep,
  SecurityStep,
  OptimizationStep,

  // Step Registry
  StepRegistry,

  // Convenience exports
  steps: {
    AnalysisStep,
    RefactoringStep,
    TestingStep,
    DocumentationStep,
    ValidationStep,
    DeploymentStep,
    SecurityStep,
    OptimizationStep
  },

  // Global registry instance
  registry: StepRegistry
}; 