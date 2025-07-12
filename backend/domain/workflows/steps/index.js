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

// Migrated legacy handlers as unified steps
const AnalysisStep_AnalyzeArchitectureHandler = require('./AnalysisStep_AnalyzeArchitectureHandler');
const AnalysisStep_AnalyzeCodeQualityHandler = require('./AnalysisStep_AnalyzeCodeQualityHandler');
const AnalysisStep_AnalyzeTechStackHandler = require('./AnalysisStep_AnalyzeTechStackHandler');
const AnalysisStep_AnalyzeRepoStructureHandler = require('./AnalysisStep_AnalyzeRepoStructureHandler');
const AnalysisStep_AnalyzeDependenciesHandler = require('./AnalysisStep_AnalyzeDependenciesHandler');

const DocumentationStep_GenerateScriptHandler = require('./DocumentationStep_GenerateScriptHandler');
const DocumentationStep_GenerateScriptsHandler = require('./DocumentationStep_GenerateScriptsHandler');

const TestingStep_AutoTestFixHandler = require('./TestingStep_AutoTestFixHandler');
const TestingStep_TestCorrectionHandler = require('./TestingStep_TestCorrectionHandler');

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
  
  // Migrated legacy handlers
  AnalysisStep_AnalyzeArchitectureHandler,
  AnalysisStep_AnalyzeCodeQualityHandler,
  AnalysisStep_AnalyzeTechStackHandler,
  AnalysisStep_AnalyzeRepoStructureHandler,
  AnalysisStep_AnalyzeDependenciesHandler,
  
  DocumentationStep_GenerateScriptHandler,
  DocumentationStep_GenerateScriptsHandler,
  
  TestingStep_AutoTestFixHandler,
  TestingStep_TestCorrectionHandler,
  
  // New workflow steps
  IdeaToExecutionWorkflow,
  
  // Registry
  StepRegistry
}; 