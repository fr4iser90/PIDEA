/**
 * Analysis Steps - Module Exports
 * 
 * This module provides exports for all analysis workflow steps,
 * including the factory, registry, and individual step implementations.
 */

// Core Components
const AnalysisStepFactory = require('./AnalysisStepFactory');
const AnalysisStepRegistry = require('./AnalysisStepRegistry');

// Individual Analysis Steps
const ArchitectureAnalysisStep = require('./ArchitectureAnalysisStep');
const CodeQualityAnalysisStep = require('./CodeQualityAnalysisStep');
const TechStackAnalysisStep = require('./TechStackAnalysisStep');
const RepoStructureAnalysisStep = require('./RepoStructureAnalysisStep');
const DependenciesAnalysisStep = require('./DependenciesAnalysisStep');
const AdvancedAnalysisStep = require('./AdvancedAnalysisStep');

// Module exports
module.exports = {
  // Core Components
  AnalysisStepFactory,
  AnalysisStepRegistry,

  // Individual Analysis Steps
  ArchitectureAnalysisStep,
  CodeQualityAnalysisStep,
  TechStackAnalysisStep,
  RepoStructureAnalysisStep,
  DependenciesAnalysisStep,
  AdvancedAnalysisStep,

  // Convenience exports
  factory: AnalysisStepFactory,
  registry: AnalysisStepRegistry,

  // Step classes
  steps: {
    ArchitectureAnalysisStep,
    CodeQualityAnalysisStep,
    TechStackAnalysisStep,
    RepoStructureAnalysisStep,
    DependenciesAnalysisStep,
    AdvancedAnalysisStep
  },

  // Factory functions for easy instantiation
  createFactory: (options = {}) => {
    return new AnalysisStepFactory(options);
  },

  createRegistry: (options = {}) => {
    return new AnalysisStepRegistry(options);
  },

  // Step creation helpers
  createArchitectureStep: (options = {}) => {
    const factory = new AnalysisStepFactory();
    return factory.createArchitectureAnalysisStep(options);
  },

  createCodeQualityStep: (options = {}) => {
    const factory = new AnalysisStepFactory();
    return factory.createCodeQualityAnalysisStep(options);
  },

  createTechStackStep: (options = {}) => {
    const factory = new AnalysisStepFactory();
    return factory.createTechStackAnalysisStep(options);
  },

  createRepoStructureStep: (options = {}) => {
    const factory = new AnalysisStepFactory();
    return factory.createRepoStructureAnalysisStep(options);
  },

  createDependenciesStep: (options = {}) => {
    const factory = new AnalysisStepFactory();
    return factory.createDependenciesAnalysisStep(options);
  },

  createAdvancedStep: (options = {}) => {
    const factory = new AnalysisStepFactory();
    return factory.createAdvancedAnalysisStep(options);
  }
}; 