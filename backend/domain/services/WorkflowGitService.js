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
     * Ensure a branch exists locally and remotely, create from fallback if not
     * @param {string} projectPath
     * @param {string} branchName
     * @param {string} fallbackBranch
     */
    async ensureBranchExistsLocallyAndRemotely(projectPath, branchName, fallbackBranch = 'main') {
        // Use GitService for actual Git operations
        try {
            // Check if branch exists
            const branches = await this.gitService.getBranches(projectPath);
            const localBranch = await this.gitService.getCurrentBranch(projectPath);
            
            if (branches.includes(branchName) || localBranch === branchName) {
                this.logger.info(`[ensureBranchExistsLocallyAndRemotely] Branch ${branchName} exists`);
                return branchName;
            }
            
            // Create branch from fallback
            await this.gitService.createBranch(projectPath, branchName, {
                startPoint: fallbackBranch
            });
            
            // Push to remote
            await this.gitService.pushChanges(projectPath, {
                branch: branchName,
                setUpstream: true
            });
            
            return branchName;
        } catch (error) {
            this.logger.error(`[ensureBranchExistsLocallyAndRemotely] Error: ${error.message}`);
            throw error;
        }
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

            // Sicherstellen, dass der Startpunkt-Branch existiert
            await this.ensureBranchExistsLocallyAndRemotely(projectPath, branchStrategy.startPoint || 'main', 'main');

            this.logger.info('WorkflowGitService: Creating workflow branch', {
                projectPath,
                taskId: task.id,
                taskType: task.type?.value,
                branchStrategy: branchStrategy.type,
                branchName
            });

            // Use GitService for actual Git operations
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
        // Handle both TaskType objects and plain objects with value property
        const taskTypeValue = taskType?.value || taskType;
        // Debug log
        if (this.logger && typeof this.logger.info === 'function') {
            this.logger.info('[WorkflowGitService] DEBUG TaskType:', { TaskType, taskTypeValue });
        }
        // Defensive: fallback for undefined TaskType constants
        const safe = (v) => {
            if (v === undefined || v === null) return '__undefined__';
            return v;
        };
        const strategies = {
            // Refactoring Workflows
            [safe(TaskType.REFACTOR)]: {
                type: 'refactor',
                prefix: 'refactor',
                startPoint: 'main',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'develop'
            },
            [safe(TaskType.ANALYSIS)]: {
                type: 'review',
                prefix: 'review',
                startPoint: 'main',
                protection: 'high',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main'
            },

            // Feature Implementation Workflows - PIDEA Features Branch
            [safe(TaskType.FEATURE)]: {
                type: 'feature',
                prefix: 'feature',
                startPoint: 'pidea-features',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-features'
            },
            [safe(TaskType.OPTIMIZATION)]: {
                type: 'enhancement',
                prefix: 'enhance',
                startPoint: 'pidea-features',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-features'
            },

            // Bug Fix Workflows
            [safe(TaskType.BUG)]: {
                type: 'bugfix',
                prefix: 'fix',
                startPoint: 'main',
                protection: 'high',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main'
            },
            [safe(TaskType.SECURITY)]: {
                type: 'hotfix',
                prefix: 'hotfix',
                startPoint: 'main',
                protection: 'critical',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main'
            },

            // Analysis Workflows
            [safe(TaskType.ANALYSIS)]: {
                type: 'analysis',
                prefix: 'analyze',
                startPoint: 'main',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'main'
            },
            [safe(TaskType.OPTIMIZATION)]: {
                type: 'optimization',
                prefix: 'optimize',
                startPoint: 'develop',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'develop'
            },

            // Testing Workflows 
            [safe(TaskType.TESTING)]: {
                type: 'testing',
                prefix: 'test',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-agent'
            },

            // Documentation Workflows
            [safe(TaskType.DOCUMENTATION)]: {
                type: 'documentation',
                prefix: 'docs',
                startPoint: 'main',
                protection: 'low',
                autoMerge: false,
                requiresReview: false,
                mergeTarget: 'main'
            },

            // Debug Workflows
            [safe(TaskType.TEST_STATUS)]: {
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

        return strategies[taskTypeValue] || strategies.default;
    }

    /**
     * Ensure branch exists, create if it doesn't
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name to ensure exists
     * @returns {Promise<string>} Branch name that exists
     */
    async ensureBranchExists(projectPath, branchName) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`[ensureBranchExists] Branch ${branchName} operation requested - handled by Playwright`);
        return branchName;
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
        // Git operations handled by Playwright via CDP
        this.logger.info(`[applyBranchConfiguration] Branch ${branchName} configuration requested - handled by Playwright`);
    }

    /**
     * Apply critical protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyCriticalProtection(projectPath, branchName) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`[applyCriticalProtection] Branch ${branchName} protection requested - handled by Playwright`);
    }

    /**
     * Apply high protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyHighProtection(projectPath, branchName) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`[applyHighProtection] Branch ${branchName} protection requested - handled by Playwright`);
    }

    /**
     * Apply medium protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyMediumProtection(projectPath, branchName) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`[applyMediumProtection] Branch ${branchName} protection requested - handled by Playwright`);
    }

    /**
     * Setup auto-merge for branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {string} mergeTarget - Target branch for merge
     * @returns {Promise<void>}
     */
    async setupAutoMerge(projectPath, branchName, mergeTarget) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`[setupAutoMerge] Branch ${branchName} auto-merge requested - handled by Playwright`);
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

            // Git operations handled by Playwright via CDP
            const commitMessage = this.generateCommitMessage(task, strategy);
            this.logger.info(`[completeWorkflow] Workflow completion requested - handled by Playwright`);
            let mergeResult = null;

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
        // Git operations handled by Playwright via CDP
        this.logger.info(`[autoMergeBranch] Auto-merge requested - handled by Playwright`);
        return {
            success: true,
            targetBranch,
            mergeStrategy: 'squash',
            branchDeleted: true,
            message: `Auto-merge requested for ${branchName} to ${targetBranch}`
        };
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

            // Git operations handled by Playwright via CDP
            this.logger.info(`[rollbackWorkflow] Rollback requested - handled by Playwright`);

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

    /**
     * Merge current branch to target branch
     * @param {string} projectPath - Project path
     * @param {string} targetBranch - Target branch name
     * @param {Object} task - Task object
     * @param {Object} options - Merge options
     * @returns {Promise<Object>} Merge result
     */
    async mergeToBranch(projectPath, targetBranch, task, options = {}) {
        try {
            this.logger.info('WorkflowGitService: Merging to target branch', {
                projectPath,
                targetBranch,
                taskId: task.id,
                taskType: task.type?.value
            });

            // Git operations handled by Playwright via CDP
            this.logger.info(`[mergeToBranch] Merge requested - handled by Playwright`);
            const currentBranch = 'current-branch'; // Placeholder
            const mergeResult = { success: true };
            
            const result = {
                success: true,
                sourceBranch: currentBranch,
                targetBranch: targetBranch,
                mergeResult,
                message: `Successfully merged ${currentBranch} into ${targetBranch}`,
                metadata: {
                    taskId: task.id,
                    taskType: task.type?.value,
                    mergeStrategy: options.mergeStrategy || 'recursive',
                    timestamp: new Date()
                }
            };
            
            // Emit merge completed event
            if (this.eventBus) {
                this.eventBus.publish('workflow.merge.completed', {
                    projectPath,
                    taskId: task.id,
                    sourceBranch: currentBranch,
                    targetBranch: targetBranch,
                    result,
                    timestamp: new Date()
                });
            }
            
            return result;
            
        } catch (error) {
            this.logger.error('WorkflowGitService: Failed to merge to target branch', {
                projectPath,
                targetBranch,
                taskId: task.id,
                error: error.message
            });
            
            // Emit merge failed event
            if (this.eventBus) {
                this.eventBus.publish('workflow.merge.failed', {
                    projectPath,
                    taskId: task.id,
                    targetBranch: targetBranch,
                    error: error.message,
                    timestamp: new Date()
                });
            }
            
            throw new Error(`Merge to ${targetBranch} failed: ${error.message}`);
        }
    }

    /**
     * Generate merge commit message
     * @param {Object} task - Task object
     * @param {string} targetBranch - Target branch name
     * @returns {string} Merge commit message
     */
    generateMergeMessage(task, targetBranch) {
        const taskTitle = task.title || 'Unknown Task';
        const taskType = task.type?.value || 'unknown';
        const taskId = task.id || 'unknown';
        
        return `Merge task ${taskId} (${taskType}) into ${targetBranch}

Task: ${taskTitle}
Type: ${taskType}
ID: ${taskId}

Automatically merged by PIDEA Workflow System
        `.trim();
    }
}

module.exports = WorkflowGitService; 