/**
 * Git Workflow Module - Enhanced Git Integration
 * Exports all git workflow components for unified workflow automation
 */

// Core components
const GitWorkflowManager = require('./GitWorkflowManager');
const GitWorkflowContext = require('./GitWorkflowContext');
const GitWorkflowResult = require('./GitWorkflowResult');
const GitWorkflowValidator = require('./GitWorkflowValidator');
const GitWorkflowMetrics = require('./GitWorkflowMetrics');
const GitWorkflowAudit = require('./GitWorkflowAudit');

// Strategy components
const BranchStrategy = require('./BranchStrategy');
const MergeStrategy = require('./MergeStrategy');

// Service components
const PullRequestManager = require('./PullRequestManager');
const AutoReviewService = require('./AutoReviewService');

// Branch strategies
const FeatureBranchStrategy = require('./strategies/FeatureBranchStrategy');
const HotfixBranchStrategy = require('./strategies/HotfixBranchStrategy');
const ReleaseBranchStrategy = require('./strategies/ReleaseBranchStrategy');

// Exceptions
const GitWorkflowException = require('./exceptions/GitWorkflowException');

// Factory function for creating a complete git workflow system
function createGitWorkflowSystem(dependencies = {}) {
  const {
    gitService,
    analysisService,
    testService,
    securityService,
    performanceService,
    logger,
    eventBus,
    config = {}
  } = dependencies;

  // Create shared dependencies
  const sharedDeps = {
    gitService,
    logger,
    eventBus,
    ...config
  };

  // Create components
  const branchStrategy = new BranchStrategy(sharedDeps);
  const mergeStrategy = new MergeStrategy(sharedDeps);
  const pullRequestManager = new PullRequestManager({
    ...sharedDeps,
    ...config.pullRequest
  });
  const autoReviewService = new AutoReviewService({
    ...sharedDeps,
    analysisService,
    testService,
    securityService,
    performanceService,
    ...config.review
  });
  const validator = new GitWorkflowValidator();
  const metrics = new GitWorkflowMetrics(sharedDeps);
  const audit = new GitWorkflowAudit(sharedDeps);

  // Create main workflow manager
  const workflowManager = new GitWorkflowManager({
    gitService,
    branchStrategy,
    mergeStrategy,
    pullRequestManager,
    autoReviewService,
    validator,
    metrics,
    audit,
    logger,
    eventBus
  });

  return {
    workflowManager,
    branchStrategy,
    mergeStrategy,
    pullRequestManager,
    autoReviewService,
    validator,
    metrics,
    audit,
    context: GitWorkflowContext,
    result: GitWorkflowResult,
    exception: GitWorkflowException
  };
}

// Export all components
module.exports = {
  // Main components
  GitWorkflowManager,
  GitWorkflowContext,
  GitWorkflowResult,
  GitWorkflowValidator,
  GitWorkflowMetrics,
  GitWorkflowAudit,
  
  // Strategy components
  BranchStrategy,
  MergeStrategy,
  
  // Service components
  PullRequestManager,
  AutoReviewService,
  
  // Branch strategies
  FeatureBranchStrategy,
  HotfixBranchStrategy,
  ReleaseBranchStrategy,
  
  // Exceptions
  GitWorkflowException,
  
  // Factory function
  createGitWorkflowSystem,
  
  // Version info
  version: '2.0.0',
  description: 'Enhanced Git Integration for Unified Workflow Automation'
}; 