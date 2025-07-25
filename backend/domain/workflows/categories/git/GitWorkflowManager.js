/**
 * GitWorkflowManager - Main git workflow manager for enhanced git integration
 * Orchestrates all git workflow operations including branch creation, workflow execution,
 * pull request management, code review, and merging
 */
const GitWorkflowContext = require('./GitWorkflowContext');
const GitWorkflowResult = require('./GitWorkflowResult');
const GitWorkflowException = require('./exceptions/GitWorkflowException');
const BranchStrategy = require('./BranchStrategy');
const MergeStrategy = require('./MergeStrategy');
const GitWorkflowValidator = require('./GitWorkflowValidator');
const GitWorkflowMetrics = require('./GitWorkflowMetrics');
const GitWorkflowAudit = require('./GitWorkflowAudit');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class GitWorkflowManager {
  constructor(dependencies = {}) {
    this.gitService = dependencies.gitService;
    this.branchStrategy = dependencies.branchStrategy || new BranchStrategy(dependencies);
    this.mergeStrategy = dependencies.mergeStrategy || new MergeStrategy(dependencies);
    this.pullRequestManager = dependencies.pullRequestManager;
    this.autoReviewService = dependencies.autoReviewService;
    this.validator = dependencies.validator || new GitWorkflowValidator();
    this.metrics = dependencies.metrics || new GitWorkflowMetrics(dependencies);
    this.audit = dependencies.audit || new GitWorkflowAudit(dependencies);
    this.logger = dependencies.logger || console;
    this.eventBus = dependencies.eventBus;
  }

  /**
   * Execute git workflow
   * @param {Object} task - Task to execute
   * @param {Object} context - Base context
   * @returns {Promise<GitWorkflowResult>} Workflow result
   */
  async executeWorkflow(task, context = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('GitWorkflowManager: Starting git workflow', {
        taskId: task.id,
        taskType: task.type?.value,
        projectPath: context.projectPath
      });

      // Create git workflow context
      const gitContext = new GitWorkflowContext(task, context);
      
      // Validate git workflow
      const validationResult = await this.validator.validate(task, gitContext);
      if (!validationResult.isValid) {
        throw GitWorkflowException.validationFailed('Git workflow validation failed', validationResult, {
          taskId: task.id,
          projectPath: context.projectPath
        });
      }

      // Step 1: Create branch
      const branchResult = await this.createBranch(task, gitContext);
      
      // Step 2: Execute workflow steps
      const workflowResult = await this.executeWorkflowSteps(task, gitContext);
      
      // Step 3: Create pull request (if enabled)
      const prResult = await this.createPullRequest(task, gitContext, workflowResult);
      
      // Step 4: Perform auto review (if enabled)
      const reviewResult = await this.performAutoReview(task, gitContext, prResult);
      
      // Step 5: Merge changes (if enabled)
      const mergeResult = await this.mergeChanges(task, gitContext, reviewResult);

      const duration = Date.now() - startTime;
      
      // Create result
      const result = new GitWorkflowResult({
        success: true,
        taskId: task.id,
        sessionId: context.sessionId,
        duration,
        branchResult,
        workflowResult,
        pullRequestResult: prResult,
        reviewResult,
        mergeResult,
        context: gitContext.getSummary()
      });

      // Record metrics
      await this.metrics.recordWorkflowExecution(task, duration, {
        branchResult,
        workflowResult,
        prResult,
        reviewResult,
        mergeResult
      });

      // Audit workflow
      await this.audit.auditWorkflow(task, result, {
        userId: context.userId,
        sessionId: context.sessionId
      });

      // Emit success event
      if (this.eventBus) {
        this.eventBus.publish('git.workflow.completed', {
          taskId: task.id,
          result: result.getSummary(),
          timestamp: new Date()
        });
      }

      this.logger.info('GitWorkflowManager: Git workflow completed successfully', {
        taskId: task.id,
        duration,
        phases: result.completedPhases
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('GitWorkflowManager: Git workflow failed', {
        taskId: task.id,
        error: error.message,
        duration
      });

      // Record failure metrics
      await this.metrics.recordWorkflowFailure(task, duration, error);

      // Audit failure
      await this.audit.auditWorkflowFailure(task, error, {
        userId: context.userId,
        sessionId: context.sessionId
      });

      // Emit failure event
      if (this.eventBus) {
        this.eventBus.publish('git.workflow.failed', {
          taskId: task.id,
          error: error.message,
          timestamp: new Date()
        });
      }

      return new GitWorkflowResult({
        success: false,
        taskId: task.id,
        sessionId: context.sessionId,
        error: error.message,
        errorCode: error.errorCode,
        duration
      });
    }
  }

  /**
   * Create branch for workflow
   * @param {Object} task - Task to execute
   * @param {GitWorkflowContext} context - Git workflow context
   * @returns {Promise<Object>} Branch creation result
   */
  async createBranch(task, context) {
    try {
      const strategy = this.branchStrategy.getStrategy(task.type?.value);
      const branchName = strategy.generateBranchName(task, context);
      
      this.logger.info('GitWorkflowManager: Creating branch', {
        taskId: task.id,
        branchName,
        strategy: strategy.constructor.name
      });

      // Validate branch name
      const validation = strategy.validateBranchName(branchName);
      if (!validation.isValid) {
        throw GitWorkflowException.branchCreationFailed(branchName, validation.errors.join(', '), {
          taskId: task.id,
          projectPath: context.get('projectPath')
        });
      }

      // Create branch using git service
      const result = await this.gitService.createBranch(
        context.get('projectPath'),
        branchName,
        {
          startPoint: context.get('baseBranch') || 'pidea-agent',
          checkout: true
        }
      );

      // Update context with branch information
      context.setBranchInfo(branchName, context.get('baseBranch') || 'pidea-agent', {
        strategy: strategy.constructor.name,
        configuration: strategy.getConfiguration()
      });

      const branchResult = {
        success: true,
        branchName,
        baseBranch: context.get('baseBranch') || 'pidea-agent',
        strategy: strategy.constructor.name,
        duration: Date.now() - context.timestamps.get('created').getTime(),
        timestamp: new Date(),
        metadata: {
          validation,
          configuration: strategy.getConfiguration()
        }
      };

      // Record branch creation metrics
      await this.metrics.recordBranchCreation(task, branchResult);

      return branchResult;

    } catch (error) {
      this.logger.error('GitWorkflowManager: Branch creation failed', {
        taskId: task.id,
        error: error.message
      });

      throw GitWorkflowException.branchCreationFailed(
        'unknown',
        error.message,
        {
          taskId: task.id,
          projectPath: context.get('projectPath'),
          originalError: error
        }
      );
    }
  }

  /**
   * Execute workflow steps
   * @param {Object} task - Task to execute
   * @param {GitWorkflowContext} context - Git workflow context
   * @returns {Promise<Object>} Workflow execution result
   */
  async executeWorkflowSteps(task, context) {
    try {
      this.logger.info('GitWorkflowManager: Executing workflow steps', {
        taskId: task.id,
        branchName: context.get('branchName')
      });

      // Get workflow from context or use default
      const workflow = context.get('workflow');
      if (!workflow) {
        this.logger.warn('GitWorkflowManager: No workflow found in context, using default execution');
        
        // Default workflow execution
        return await this.executeDefaultWorkflow(task, context);
      }

      // Execute custom workflow
      const result = await workflow.execute(context);
      
      const workflowResult = {
        success: result.success !== false,
        type: workflow.constructor.name,
        steps: result.steps || [],
        duration: Date.now() - context.timestamps.get('created').getTime(),
        timestamp: new Date(),
        metadata: result.metadata || {}
      };

      // Record workflow execution metrics
      await this.metrics.recordWorkflowStepExecution(task, workflowResult);

      return workflowResult;

    } catch (error) {
      this.logger.error('GitWorkflowManager: Workflow execution failed', {
        taskId: task.id,
        error: error.message
      });

      throw GitWorkflowException.workflowExecutionFailed('workflow_execution', error.message, {
        taskId: task.id,
        projectPath: context.get('projectPath')
      });
    }
  }

  /**
   * Execute default workflow when no custom workflow is provided
   * @param {Object} task - Task to execute
   * @param {GitWorkflowContext} context - Git workflow context
   * @returns {Promise<Object>} Default workflow result
   */
  async executeDefaultWorkflow(task, context) {
    const steps = [];
    const startTime = Date.now();

    try {
      // Step 1: Checkout branch
      await this.gitService.checkoutBranch(context.get('projectPath'), context.get('branchName'));
      steps.push({
        name: 'checkout_branch',
        success: true,
        duration: Date.now() - startTime
      });

      // Step 2: Add changes (if any)
      try {
        await this.gitService.addFiles(context.get('projectPath'));
        steps.push({
          name: 'add_files',
          success: true,
          duration: Date.now() - startTime
        });
      } catch (error) {
        // No files to add, continue
        steps.push({
          name: 'add_files',
          success: true,
          skipped: true,
          duration: Date.now() - startTime
        });
      }

      // Step 3: Commit changes (if any)
      try {
        const commitMessage = this.generateCommitMessage(task, context);
        await this.gitService.commitChanges(context.get('projectPath'), commitMessage);
        steps.push({
          name: 'commit_changes',
          success: true,
          duration: Date.now() - startTime
        });
      } catch (error) {
        // No changes to commit, continue
        steps.push({
          name: 'commit_changes',
          success: true,
          skipped: true,
          duration: Date.now() - startTime
        });
      }

      return {
        success: true,
        type: 'default_workflow',
        steps,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        metadata: {
          taskType: task.type?.value,
          branchName: context.get('branchName')
        }
      };

    } catch (error) {
      return {
        success: false,
        type: 'default_workflow',
        steps,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        error: error.message,
        metadata: {
          taskType: task.type?.value,
          branchName: context.get('branchName')
        }
      };
    }
  }

  /**
   * Create pull request
   * @param {Object} task - Task to execute
   * @param {GitWorkflowContext} context - Git workflow context
   * @param {Object} workflowResult - Workflow execution result
   * @returns {Promise<Object>} Pull request result
   */
  async createPullRequest(task, context, workflowResult) {
    const automationLevel = context.get('automationLevel') || 'semi_auto';
    
    // Skip PR creation for full auto mode
    if (automationLevel === 'full_auto') {
      this.logger.info('GitWorkflowManager: Skipping PR creation for full auto mode', {
        taskId: task.id
      });
      return { 
        success: true,
        skipped: true, 
        reason: 'full_auto_mode',
        timestamp: new Date()
      };
    }

    // Skip if no pull request manager
    if (!this.pullRequestManager) {
      this.logger.warn('GitWorkflowManager: No pull request manager available, skipping PR creation');
      return { 
        success: true,
        skipped: true, 
        reason: 'no_pull_request_manager',
        timestamp: new Date()
      };
    }

    try {
      this.logger.info('GitWorkflowManager: Creating pull request', {
        taskId: task.id,
        branchName: context.get('branchName')
      });

      const prData = {
        title: this.generatePRTitle(task),
        description: this.generatePRDescription(task, workflowResult),
        sourceBranch: context.get('branchName'),
        targetBranch: context.get('baseBranch') || 'main',
        labels: this.generatePRLabels(task),
        reviewers: context.get('reviewers') || []
      };

      const result = await this.pullRequestManager.createPullRequest(
        context.get('projectPath'),
        prData
      );

      // Update context with PR information
      context.setPullRequestInfo(
        result.id,
        prData.title,
        result.url,
        {
          labels: prData.labels,
          reviewers: prData.reviewers
        }
      );

      const prResult = {
        success: true,
        pullRequestId: result.id,
        pullRequestUrl: result.url,
        title: prData.title,
        sourceBranch: prData.sourceBranch,
        targetBranch: prData.targetBranch,
        labels: prData.labels,
        reviewers: prData.reviewers,
        duration: Date.now() - context.timestamps.get('created').getTime(),
        timestamp: new Date()
      };

      // Record PR creation metrics
      await this.metrics.recordPullRequestCreation(task, prResult);

      return prResult;

    } catch (error) {
      this.logger.error('GitWorkflowManager: Pull request creation failed', {
        taskId: task.id,
        error: error.message
      });

      throw GitWorkflowException.pullRequestCreationFailed(
        task.title || 'Unknown',
        error.message,
        {
          taskId: task.id,
          projectPath: context.get('projectPath')
        }
      );
    }
  }

  /**
   * Perform auto review
   * @param {Object} task - Task to execute
   * @param {GitWorkflowContext} context - Git workflow context
   * @param {Object} prResult - Pull request result
   * @returns {Promise<Object>} Review result
   */
  async performAutoReview(task, context, prResult) {
    const automationLevel = context.get('automationLevel') || 'semi_auto';
    
    // Skip auto review for manual mode or if PR was skipped
    if (automationLevel === 'manual' || prResult.skipped) {
      this.logger.info('GitWorkflowManager: Skipping auto review', {
        taskId: task.id,
        reason: automationLevel === 'manual' ? 'manual_mode' : 'pr_skipped'
      });
      return { 
        success: true,
        skipped: true, 
        reason: automationLevel === 'manual' ? 'manual_mode' : 'pr_skipped',
        timestamp: new Date()
      };
    }

    // Skip if no auto review service
    if (!this.autoReviewService) {
      this.logger.warn('GitWorkflowManager: No auto review service available, skipping review');
      return { 
        success: true,
        skipped: true, 
        reason: 'no_auto_review_service',
        timestamp: new Date()
      };
    }

    try {
      this.logger.info('GitWorkflowManager: Performing auto review', {
        taskId: task.id,
        prId: prResult.pullRequestId
      });

      const result = await this.autoReviewService.reviewPullRequest(
        context.get('projectPath'),
        prResult.pullRequestId,
        {
          taskType: task.type?.value,
          automationLevel,
          reviewDepth: this.getReviewDepth(automationLevel)
        }
      );

      // Update context with review information
      context.setReviewInfo(
        result.reviewId || 'auto-review',
        result.status || 'completed',
        {
          score: result.score,
          recommendations: result.recommendations
        }
      );

      const reviewResult = {
        success: result.success !== false,
        reviewId: result.reviewId || 'auto-review',
        status: result.status || 'completed',
        score: result.score || 0,
        recommendations: result.recommendations || [],
        duration: Date.now() - context.timestamps.get('created').getTime(),
        timestamp: new Date(),
        metadata: {
          reviewDepth: this.getReviewDepth(automationLevel),
          automationLevel
        }
      };

      // Record review metrics
      await this.metrics.recordReviewCompletion(task, reviewResult);

      return reviewResult;

    } catch (error) {
      this.logger.error('GitWorkflowManager: Auto review failed', {
        taskId: task.id,
        error: error.message
      });

      return {
        success: false,
        reviewId: 'auto-review',
        status: 'failed',
        error: error.message,
        duration: Date.now() - context.timestamps.get('created').getTime(),
        timestamp: new Date()
      };
    }
  }

  /**
   * Merge changes
   * @param {Object} task - Task to execute
   * @param {GitWorkflowContext} context - Git workflow context
   * @param {Object} reviewResult - Review result
   * @returns {Promise<Object>} Merge result
   */
  async mergeChanges(task, context, reviewResult) {
    const automationLevel = context.get('automationLevel') || 'semi_auto';
    
    // Skip merge for manual mode
    if (automationLevel === 'manual') {
      this.logger.info('GitWorkflowManager: Skipping merge for manual mode', {
        taskId: task.id
      });
      return { 
        success: true,
        skipped: true, 
        reason: 'manual_mode',
        timestamp: new Date()
      };
    }

    try {
      this.logger.info('GitWorkflowManager: Merging changes', {
        taskId: task.id,
        automationLevel,
        branchName: context.get('branchName')
      });

      const mergeConfig = this.mergeStrategy.getMergeConfiguration(task, context);
      
      // Check if merge can be automated
      if (!this.mergeStrategy.canAutomateMerge(mergeConfig, context)) {
        this.logger.info('GitWorkflowManager: Merge cannot be automated, manual intervention required', {
          taskId: task.id,
          reason: 'merge_automation_blocked'
        });
        return { 
          success: true,
          skipped: true, 
          reason: 'merge_automation_blocked',
          timestamp: new Date()
        };
      }

      const mergeCommand = this.mergeStrategy.generateMergeCommand(
        mergeConfig,
        context.get('branchName'),
        context.get('baseBranch') || 'main'
      );

      const result = await this.gitService.mergeBranch(
        context.get('projectPath'),
        context.get('branchName'),
        mergeCommand.options
      );

      // Update context with merge information
      context.setMergeInfo(
        context.get('branchName'),
        context.get('baseBranch') || 'main',
        mergeConfig.method,
        {
          mergeCommit: result.mergeCommit,
          strategy: mergeConfig.method
        }
      );

      const mergeResult = {
        success: true,
        sourceBranch: context.get('branchName'),
        targetBranch: context.get('baseBranch') || 'main',
        mergeStrategy: mergeConfig.method,
        mergeCommit: result.mergeCommit,
        duration: Date.now() - context.timestamps.get('created').getTime(),
        timestamp: new Date(),
        metadata: {
          automationLevel,
          mergeConfig
        }
      };

      // Record merge metrics
      await this.metrics.recordMergeCompletion(task, mergeResult);

      return mergeResult;

    } catch (error) {
      this.logger.error('GitWorkflowManager: Merge failed', {
        taskId: task.id,
        error: error.message
      });

      throw GitWorkflowException.mergeFailed(
        context.get('branchName'),
        context.get('baseBranch') || 'main',
        error.message,
        {
          taskId: task.id,
          projectPath: context.get('projectPath')
        }
      );
    }
  }

  /**
   * Generate commit message
   * @param {Object} task - Task to execute
   * @param {GitWorkflowContext} context - Git workflow context
   * @returns {string} Commit message
   */
  generateCommitMessage(task, context) {
    const taskType = task.type?.value || 'task';
    const title = task.title || task.description || 'Workflow execution';
    const taskId = task.id;
    
    return `${taskType}: ${title}

Task ID: ${taskId}
Automated by GitWorkflowManager

${task.description || ''}`;
  }

  /**
   * Generate PR title
   * @param {Object} task - Task to execute
   * @returns {string} PR title
   */
  generatePRTitle(task) {
    const taskType = task.type?.value || 'task';
    const title = task.title || task.description || 'Workflow changes';
    
    return `[${taskType.toUpperCase()}] ${title}`;
  }

  /**
   * Generate PR description
   * @param {Object} task - Task to execute
   * @param {Object} workflowResult - Workflow execution result
   * @returns {string} PR description
   */
  generatePRDescription(task, workflowResult) {
    const description = [
      `## Task: ${task.title || task.description}`,
      `**Type:** ${task.type?.value || 'task'}`,
      `**Task ID:** ${task.id}`,
      '',
      '## Changes Made',
      workflowResult.success ? '✅ Workflow executed successfully' : '❌ Workflow execution failed',
      '',
      '## Execution Details',
      `- Duration: ${workflowResult.duration}ms`,
      `- Steps: ${workflowResult.steps?.length || 0}`,
      `- Type: ${workflowResult.type}`,
      '',
      '## Review Checklist',
      '- [ ] Code changes are appropriate',
      '- [ ] Tests pass',
      '- [ ] Documentation updated',
      '- [ ] No breaking changes',
      '',
      '## Automated Workflow',
      'This pull request was created automatically by the GitWorkflowManager.'
    ].join('\n');

    return description;
  }

  /**
   * Generate PR labels
   * @param {Object} task - Task to execute
   * @returns {Array<string>} PR labels
   */
  generatePRLabels(task) {
    const labels = [
      `type-${task.type?.value || 'task'}`,
      'automated'
    ];

    if (task.priority) {
      labels.push(`priority-${task.priority}`);
    }

    if (task.tags && Array.isArray(task.tags)) {
      labels.push(...task.tags.map(tag => `tag-${tag}`));
    }

    return labels;
  }

  /**
   * Get review depth based on automation level
   * @param {string} automationLevel - Automation level
   * @returns {string} Review depth
   */
  getReviewDepth(automationLevel) {
    const depths = {
      'manual': 'none',
      'assisted': 'basic',
      'semi_auto': 'standard',
      'full_auto': 'comprehensive',
      'adaptive': 'standard'
    };
    return depths[automationLevel] || 'standard';
  }

  /**
   * Get workflow manager configuration
   * @returns {Object} Configuration
   */
  getConfiguration() {
    return {
      hasGitService: !!this.gitService,
      hasPullRequestManager: !!this.pullRequestManager,
      hasAutoReviewService: !!this.autoReviewService,
      hasEventBus: !!this.eventBus,
      strategies: {
        branch: this.branchStrategy.getConfiguration(),
        merge: this.mergeStrategy.getConfiguration()
      }
    };
  }
}

module.exports = GitWorkflowManager; 