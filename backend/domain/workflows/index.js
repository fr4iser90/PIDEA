/**
 * Unified Workflow Foundation - Core Interfaces & Context
 * 
 * This module provides the foundation for unified workflow management in PIDEA.
 * It includes core interfaces, context management, validation system, exception handling,
 * builder pattern components, and workflow steps.
 */

// Core Interfaces
const IWorkflow = require('./interfaces/IWorkflow');
const IWorkflowStep = require('./interfaces/IWorkflowStep');
const IWorkflowContext = require('./interfaces/IWorkflowContext');
const IWorkflowValidator = require('./interfaces/IWorkflowValidator');

// Context Management
const WorkflowContext = require('./context/WorkflowContext');
const WorkflowState = require('./context/WorkflowState');
const WorkflowMetadata = require('./context/WorkflowMetadata');

// Validation System
const WorkflowValidator = require('./validation/WorkflowValidator');
const ValidationResult = require('./validation/ValidationResult');
const ValidationRule = require('./validation/ValidationRule');

// Exception Handling
const WorkflowException = require('./exceptions/WorkflowException');
const ValidationException = require('./exceptions/ValidationException');
const ContextException = require('./exceptions/ContextException');

// Builder Pattern Components
const {
  WorkflowBuilder,
  WorkflowStepBuilder,
  ComposedWorkflow,
  WorkflowComposer,
  WorkflowTemplateRegistry
} = require('./builder');

// Workflow Steps
const {
  BaseWorkflowStep,
  AnalysisStep,
  RefactoringStep,
  TestingStep,
  DocumentationStep,
  ValidationStep,
  DeploymentStep,
  SecurityStep,
  OptimizationStep,
  StepRegistry
} = require('./steps');

// Module exports
module.exports = {
  // Core Interfaces
  IWorkflow,
  IWorkflowStep,
  IWorkflowContext,
  IWorkflowValidator,

  // Context Management
  WorkflowContext,
  WorkflowState,
  WorkflowMetadata,

  // Validation System
  WorkflowValidator,
  ValidationResult,
  ValidationRule,

  // Exception Handling
  WorkflowException,
  ValidationException,
  ContextException,

  // Builder Pattern Components
  WorkflowBuilder,
  WorkflowStepBuilder,
  ComposedWorkflow,
  WorkflowComposer,
  WorkflowTemplateRegistry,

  // Workflow Steps
  BaseWorkflowStep,
  AnalysisStep,
  RefactoringStep,
  TestingStep,
  DocumentationStep,
  ValidationStep,
  DeploymentStep,
  SecurityStep,
  OptimizationStep,
  StepRegistry,

  // Convenience exports
  interfaces: {
    IWorkflow,
    IWorkflowStep,
    IWorkflowContext,
    IWorkflowValidator
  },

  context: {
    WorkflowContext,
    WorkflowState,
    WorkflowMetadata
  },

  validation: {
    WorkflowValidator,
    ValidationResult,
    ValidationRule
  },

  exceptions: {
    WorkflowException,
    ValidationException,
    ContextException
  },

  builder: {
    WorkflowBuilder,
    WorkflowStepBuilder,
    ComposedWorkflow,
    WorkflowComposer,
    WorkflowTemplateRegistry
  },

  steps: {
    BaseWorkflowStep,
    AnalysisStep,
    RefactoringStep,
    TestingStep,
    DocumentationStep,
    ValidationStep,
    DeploymentStep,
    SecurityStep,
    OptimizationStep,
    StepRegistry
  }
}; 