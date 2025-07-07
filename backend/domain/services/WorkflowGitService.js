/**
 * WorkflowGitService - Domain Service for Workflow-specific Git Operations
 * Implements DDD patterns for different workflow types and branch strategies
 */
const GitService = require('../../infrastructure/external/GitService');
const TaskType = require('../value-objects/TaskType');

class WorkflowGitService {
    constructor(dependencies = {}) {
        this.gitService = dependencies.gitService || new GitService(dependencies);
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Create workflow-specific branch based on task type
     * @param {string} projectPath - Project path
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Branch creation result
     */
    async createWorkflowBranch(projectPath, task, options = {}) {
        try {
            const branchStrategy = this.determineBranchStrategy(task.type, options);
            const branchName = this.generateBranchName(task, branchStrategy);
            
            this.logger.info('WorkflowGitService: Creating workflow branch', {
                projectPath,
                taskId: task.id,
                taskType: task.type?.value,
                branchStrategy: branchStrategy.type,
                branchName
            });

            // Create and checkout branch
            await this.gitService.createBranch(projectPath, branchName, {
                startPoint: branchStrategy.startPoint || 'main'
            });

            // Apply branch-specific configurations
            await this.applyBranchConfiguration(projectPath, branchName, branchStrategy);

            const result = {
                branchName,
                strategy: branchStrategy,
                status: 'created',
                message: `Created ${branchStrategy.type} branch: ${branchName}`,
                metadata: {
                    taskId: task.id,
                    taskType: task.type?.value,
                    workflowType: branchStrategy.type,
                    timestamp: new Date()
                }
            };

            // Emit workflow branch created event
            if (this.eventBus) {
                this.eventBus.publish('workflow.branch.created', {
                    projectPath,
                    taskId: task.id,
                    branchName,
                    strategy: branchStrategy,
                    timestamp: new Date()
                });
            }

            return result;

        } catch (error) {
            this.logger.error('WorkflowGitService: Failed to create workflow branch', {
                projectPath,
                taskId: task.id,
                error: error.message
            });
            throw new Error(`Workflow branch creation failed: ${error.message}`);
        }
    }

    /**
     * Determine branch strategy based on task type
     * @param {TaskType} taskType - Task type
     * @param {Object} options - Workflow options
     * @returns {Object} Branch strategy
     */
    determineBranchStrategy(taskType, options = {}) {
        const strategies = {
            // Refactoring Workflows
            [TaskType.REFACTORING.value]: {
                type: 'refactor',
                prefix: 'refactor',
                startPoint: 'main',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'develop'
            },
            [TaskType.CODE_REVIEW.value]: {
                type: 'review',
                prefix: 'review',
                startPoint: 'main',
                protection: 'high',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main'
            },

            // Feature Implementation Workflows
            [TaskType.FEATURE.value]: {
                type: 'feature',
                prefix: 'feature',
                startPoint: 'develop',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'develop'
            },
            [TaskType.ENHANCEMENT.value]: {
                type: 'enhancement',
                prefix: 'enhance',
                startPoint: 'develop',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'develop'
            },

            // Bug Fix Workflows
            [TaskType.BUG_FIX.value]: {
                type: 'bugfix',
                prefix: 'fix',
                startPoint: 'main',
                protection: 'high',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main'
            },
            [TaskType.HOTFIX.value]: {
                type: 'hotfix',
                prefix: 'hotfix',
                startPoint: 'main',
                protection: 'critical',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main'
            },

            // Analysis Workflows
            [TaskType.ANALYSIS.value]: {
                type: 'analysis',
                prefix: 'analyze',
                startPoint: 'main',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'main'
            },
            [TaskType.OPTIMIZATION.value]: {
                type: 'optimization',
                prefix: 'optimize',
                startPoint: 'develop',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'develop'
            },

            // Testing Workflows
            [TaskType.TESTING.value]: {
                type: 'testing',
                prefix: 'test',
                startPoint: 'develop',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'develop'
            },

            // Documentation Workflows
            [TaskType.DOCUMENTATION.value]: {
                type: 'documentation',
                prefix: 'docs',
                startPoint: 'main',
                protection: 'low',
                autoMerge: false,
                requiresReview: false,
                mergeTarget: 'main'
            },

            // Debug Workflows
            [TaskType.DEBUG.value]: {
                type: 'debug',
                prefix: 'debug',
                startPoint: 'main',
                protection: 'low',
                autoMerge: false,
                requiresReview: false,
                mergeTarget: 'main'
            },

            // Default strategy
            default: {
                type: 'task',
                prefix: 'task',
                startPoint: 'main',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main'
            }
        };

        return strategies[taskType?.value] || strategies.default;
    }

    /**
     * Generate branch name based on task and strategy
     * @param {Object} task - Task object
     * @param {Object} strategy - Branch strategy
     * @returns {string} Branch name
     */
    generateBranchName(task, strategy) {
        const timestamp = Date.now();
        const taskId = task.id || 'unknown';
        const taskTitle = task.title || task.description || 'task';
        
        // Clean task title for branch name
        const cleanTitle = taskTitle
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);

        return `${strategy.prefix}/${cleanTitle}-${taskId}-${timestamp}`;
    }

    /**
     * Apply branch-specific configuration
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {Object} strategy - Branch strategy
     * @returns {Promise<void>}
     */
    async applyBranchConfiguration(projectPath, branchName, strategy) {
        try {
            // Apply protection levels
            if (strategy.protection === 'critical') {
                await this.applyCriticalProtection(projectPath, branchName);
            } else if (strategy.protection === 'high') {
                await this.applyHighProtection(projectPath, branchName);
            } else if (strategy.protection === 'medium') {
                await this.applyMediumProtection(projectPath, branchName);
            }

            // Set up auto-merge if enabled
            if (strategy.autoMerge) {
                await this.setupAutoMerge(projectPath, branchName, strategy.mergeTarget);
            }

            this.logger.info('WorkflowGitService: Applied branch configuration', {
                projectPath,
                branchName,
                protection: strategy.protection,
                autoMerge: strategy.autoMerge
            });

        } catch (error) {
            this.logger.warn('WorkflowGitService: Failed to apply branch configuration', {
                projectPath,
                branchName,
                error: error.message
            });
        }
    }

    /**
     * Apply critical protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyCriticalProtection(projectPath, branchName) {
        // Critical protection: No direct pushes, require PR reviews
        await this.gitService.setBranchProtection(projectPath, branchName, {
            requireReviews: true,
            requiredReviewers: 2,
            dismissStaleReviews: true,
            requireStatusChecks: true,
            requireUpToDate: true,
            allowForcePush: false,
            allowDeletions: false
        });
    }

    /**
     * Apply high protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyHighProtection(projectPath, branchName) {
        // High protection: Require PR reviews
        await this.gitService.setBranchProtection(projectPath, branchName, {
            requireReviews: true,
            requiredReviewers: 1,
            dismissStaleReviews: true,
            requireStatusChecks: true,
            allowForcePush: false,
            allowDeletions: false
        });
    }

    /**
     * Apply medium protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyMediumProtection(projectPath, branchName) {
        // Medium protection: Basic checks
        await this.gitService.setBranchProtection(projectPath, branchName, {
            requireReviews: false,
            requireStatusChecks: true,
            allowForcePush: false,
            allowDeletions: false
        });
    }

    /**
     * Setup auto-merge for branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {string} mergeTarget - Target branch for merge
     * @returns {Promise<void>}
     */
    async setupAutoMerge(projectPath, branchName, mergeTarget) {
        // Setup auto-merge configuration
        await this.gitService.setupAutoMerge(projectPath, branchName, {
            targetBranch: mergeTarget,
            mergeStrategy: 'squash',
            deleteBranchAfterMerge: true
        });
    }

    /**
     * Complete workflow and merge branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {Object} task - Task object
     * @param {Object} options - Merge options
     * @returns {Promise<Object>} Merge result
     */
    async completeWorkflow(projectPath, branchName, task, options = {}) {
        try {
            const strategy = this.determineBranchStrategy(task.type, options);
            
            this.logger.info('WorkflowGitService: Completing workflow', {
                projectPath,
                branchName,
                taskId: task.id,
                mergeTarget: strategy.mergeTarget
            });

            // Commit all changes
            const commitMessage = this.generateCommitMessage(task, strategy);
            await this.gitService.addFiles(projectPath);
            await this.gitService.commitChanges(projectPath, commitMessage);

            // Push branch
            await this.gitService.pushChanges(projectPath, {
                branch: branchName,
                setUpstream: true
            });

            // Merge to target branch if auto-merge is enabled
            let mergeResult = null;
            if (strategy.autoMerge) {
                mergeResult = await this.autoMergeBranch(projectPath, branchName, strategy.mergeTarget);
            }

            const result = {
                branchName,
                strategy: strategy,
                commitMessage,
                mergeResult,
                status: 'completed',
                message: `Workflow completed for branch: ${branchName}`,
                metadata: {
                    taskId: task.id,
                    taskType: task.type?.value,
                    workflowType: strategy.type,
                    autoMerged: strategy.autoMerge,
                    mergeTarget: strategy.mergeTarget,
                    timestamp: new Date()
                }
            };

            // Emit workflow completed event
            if (this.eventBus) {
                this.eventBus.publish('workflow.completed', {
                    projectPath,
                    taskId: task.id,
                    branchName,
                    strategy: strategy,
                    mergeResult,
                    timestamp: new Date()
                });
            }

            return result;

        } catch (error) {
            this.logger.error('WorkflowGitService: Failed to complete workflow', {
                projectPath,
                branchName,
                taskId: task.id,
                error: error.message
            });
            throw new Error(`Workflow completion failed: ${error.message}`);
        }
    }

    /**
     * Auto-merge branch to target
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {string} targetBranch - Target branch
     * @returns {Promise<Object>} Merge result
     */
    async autoMergeBranch(projectPath, branchName, targetBranch) {
        try {
            // Switch to target branch
            await this.gitService.checkoutBranch(projectPath, targetBranch);
            
            // Pull latest changes
            await this.gitService.pullChanges(projectPath, { branch: targetBranch });
            
            // Merge workflow branch
            const mergeResult = await this.gitService.mergeBranch(projectPath, branchName, {
                strategy: 'squash',
                noFF: false
            });

            // Push merged changes
            await this.gitService.pushChanges(projectPath, { branch: targetBranch });

            // Delete workflow branch
            await this.gitService.deleteBranch(projectPath, branchName);

            return {
                success: true,
                targetBranch,
                mergeStrategy: 'squash',
                branchDeleted: true,
                message: `Auto-merged ${branchName} to ${targetBranch}`
            };

        } catch (error) {
            this.logger.error('WorkflowGitService: Auto-merge failed', {
                projectPath,
                branchName,
                targetBranch,
                error: error.message
            });
            throw new Error(`Auto-merge failed: ${error.message}`);
        }
    }

    /**
     * Generate commit message based on task and strategy
     * @param {Object} task - Task object
     * @param {Object} strategy - Branch strategy
     * @returns {string} Commit message
     */
    generateCommitMessage(task, strategy) {
        const taskTitle = task.title || task.description || 'Task';
        const taskId = task.id || 'unknown';
        const workflowType = strategy.type;

        return `${workflowType}: ${taskTitle}\n\n- Task ID: ${taskId}\n- Workflow Type: ${workflowType}\n- Automated workflow execution\n- Timestamp: ${new Date().toISOString()}`;
    }

    /**
     * Rollback workflow branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {Object} task - Task object
     * @returns {Promise<Object>} Rollback result
     */
    async rollbackWorkflow(projectPath, branchName, task) {
        try {
            this.logger.info('WorkflowGitService: Rolling back workflow', {
                projectPath,
                branchName,
                taskId: task.id
            });

            // Reset to previous commit
            await this.gitService.resetToCommit(projectPath, 'HEAD~1');

            // Switch back to main branch
            await this.gitService.checkoutBranch(projectPath, 'main');

            // Delete the workflow branch
            await this.gitService.deleteBranch(projectPath, branchName);

            const result = {
                branchName,
                status: 'rolled_back',
                message: `Successfully rolled back workflow and deleted branch: ${branchName}`,
                metadata: {
                    taskId: task.id,
                    taskType: task.type?.value,
                    timestamp: new Date()
                }
            };

            // Emit workflow rollback event
            if (this.eventBus) {
                this.eventBus.publish('workflow.rolled_back', {
                    projectPath,
                    taskId: task.id,
                    branchName,
                    timestamp: new Date()
                });
            }

            return result;

        } catch (error) {
            this.logger.error('WorkflowGitService: Failed to rollback workflow', {
                projectPath,
                branchName,
                taskId: task.id,
                error: error.message
            });
            throw new Error(`Workflow rollback failed: ${error.message}`);
        }
    }
}

module.exports = WorkflowGitService; 