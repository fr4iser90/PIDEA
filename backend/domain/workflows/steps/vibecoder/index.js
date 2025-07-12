/**
 * VibeCoder Workflow Steps - Module Exports
 * 
 * This module provides exports for all VibeCoder workflow steps,
 * including the factory, registry, adapter, and individual step implementations.
 */

// Core Components
const VibeCoderStepFactory = require('./VibeCoderStepFactory');
const VibeCoderStepRegistry = require('./VibeCoderStepRegistry');
const VibeCoderServiceAdapter = require('./VibeCoderServiceAdapter');

// Individual VibeCoder Steps
const VibeCoderAnalyzeStep = require('./VibeCoderAnalyzeStep');
const VibeCoderGenerateStep = require('./VibeCoderGenerateStep');
const VibeCoderRefactorStep = require('./VibeCoderRefactorStep');
const VibeCoderModeStep = require('./VibeCoderModeStep');

// Module exports
module.exports = {
  // Core Components
  VibeCoderStepFactory,
  VibeCoderStepRegistry,
  VibeCoderServiceAdapter,

  // Individual VibeCoder Steps
  VibeCoderAnalyzeStep,
  VibeCoderGenerateStep,
  VibeCoderRefactorStep,
  VibeCoderModeStep,

  // Convenience exports
  factory: VibeCoderStepFactory,
  registry: VibeCoderStepRegistry,
  adapter: VibeCoderServiceAdapter,

  // Step classes
  steps: {
    VibeCoderAnalyzeStep,
    VibeCoderGenerateStep,
    VibeCoderRefactorStep,
    VibeCoderModeStep
  },

  // Factory functions for easy instantiation
  createFactory: (options = {}) => {
    return new VibeCoderStepFactory(options);
  },

  createRegistry: (options = {}) => {
    return new VibeCoderStepRegistry(options);
  },

  createAdapter: (dependencies = {}) => {
    return new VibeCoderServiceAdapter(dependencies);
  },

  // Step creation helpers
  createAnalyzeStep: (options = {}) => {
    const factory = new VibeCoderStepFactory();
    return factory.createVibeCoderAnalyzeStep(options);
  },

  createGenerateStep: (options = {}) => {
    const factory = new VibeCoderStepFactory();
    return factory.createVibeCoderGenerateStep(options);
  },

  createRefactorStep: (options = {}) => {
    const factory = new VibeCoderStepFactory();
    return factory.createVibeCoderRefactorStep(options);
  },

  createModeStep: (options = {}) => {
    const factory = new VibeCoderStepFactory();
    return factory.createVibeCoderModeStep(options);
  },

  // Workflow creation helpers
  createComprehensiveWorkflow: (options = {}) => {
    const factory = new VibeCoderStepFactory();
    return factory.createComprehensiveVibeCoderWorkflow(options);
  },

  createWorkflow: (workflowType, options = {}) => {
    const factory = new VibeCoderStepFactory();
    return factory.createVibeCoderWorkflow(workflowType, options);
  },

  // Registry helpers
  registerSteps: (registry, dependencies = {}) => {
    if (!registry) {
      registry = new VibeCoderStepRegistry();
    }
    
    registry.initialize(dependencies);
    return registry;
  },

  // Adapter helpers
  createServiceAdapter: (dependencies = {}) => {
    return new VibeCoderServiceAdapter(dependencies);
  },

  // Utility functions
  getStepMetadata: () => {
    return {
      version: '1.0.0',
      steps: [
        {
          name: 'VibeCoderAnalyzeStep',
          type: 'vibecoder-analysis',
          description: 'Performs VibeCoder comprehensive analysis',
          capabilities: ['analysis', 'comprehensive-analysis', 'project-analysis']
        },
        {
          name: 'VibeCoderGenerateStep',
          type: 'vibecoder-generation',
          description: 'Performs VibeCoder generation operations',
          capabilities: ['generation', 'code-generation', 'feature-generation']
        },
        {
          name: 'VibeCoderRefactorStep',
          type: 'vibecoder-refactoring',
          description: 'Performs VibeCoder refactoring operations',
          capabilities: ['refactoring', 'code-refactoring', 'optimization']
        },
        {
          name: 'VibeCoderModeStep',
          type: 'vibecoder-mode',
          description: 'Performs comprehensive VibeCoder mode orchestration',
          capabilities: ['orchestration', 'workflow-management', 'comprehensive-workflow']
        }
      ],
      components: [
        {
          name: 'VibeCoderStepFactory',
          description: 'Factory for creating VibeCoder workflow steps',
          type: 'factory'
        },
        {
          name: 'VibeCoderStepRegistry',
          description: 'Registry for managing VibeCoder workflow steps',
          type: 'registry'
        },
        {
          name: 'VibeCoderServiceAdapter',
          description: 'Adapter for existing VibeCoder services',
          type: 'adapter'
        }
      ]
    };
  }
}; 