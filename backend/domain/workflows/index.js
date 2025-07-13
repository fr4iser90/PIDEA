/**
 * Workflow Foundation - Builder Pattern Components
 * 
 * This module provides the builder pattern implementation for workflow management.
 * It includes workflow builders, step builders, composers, and template registries.
 */

// Core Builder Components
const WorkflowBuilder = require('./WorkflowBuilder');
const WorkflowStepBuilder = require('./WorkflowStepBuilder');
const ComposedWorkflow = require('./ComposedWorkflow');

// Composition and Templates
const WorkflowComposer = require('./WorkflowComposer');
const WorkflowTemplateRegistry = require('./builder/WorkflowTemplateRegistry');

// Module exports
module.exports = {
  // Core Builder Components
  WorkflowBuilder,
  WorkflowStepBuilder,
  ComposedWorkflow,

  // Composition and Templates
  WorkflowComposer,
  WorkflowTemplateRegistry,

  // Convenience exports
  builder: {
    WorkflowBuilder,
    WorkflowStepBuilder,
    ComposedWorkflow
  },

  composer: {
    WorkflowComposer,
    WorkflowTemplateRegistry
  },

  // Global instances
  templateRegistry: WorkflowTemplateRegistry,
  composer: new WorkflowComposer()
}; 