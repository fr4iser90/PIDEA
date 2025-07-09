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
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        try {
            // List all local branches
            const { stdout: localStdout } = await execAsync('git branch', { cwd: projectPath });
            const localBranches = localStdout.split('\n').map(b => b.trim().replace('* ', ''));
            // List all remote branches
            const { stdout: remoteStdout } = await execAsync('git branch -r', { cwd: projectPath });
            const remoteBranches = remoteStdout.split('\n').map(b => b.trim().replace('origin/', ''));

            const localExists = localBranches.includes(branchName);
            const remoteExists = remoteBranches.includes(branchName);

            if (localExists) {
                this.logger.info(`[ensureBranchExistsLocallyAndRemotely] Branch ${branchName} exists locally.`);
                return;
            }
            if (remoteExists) {
                this.logger.info(`[ensureBranchExistsLocallyAndRemotely] Branch ${branchName} exists remotely, checking out locally.`);
                await execAsync(`git checkout -b ${branchName} origin/${branchName}`, { cwd: projectPath });
                return;
            }
            // Branch existiert weder lokal noch remote: von fallback erstellen
            this.logger.info(`[ensureBranchExistsLocallyAndRemotely] Branch ${branchName} existiert nicht, erstelle von ${fallbackBranch}.`);
            await execAsync(`git checkout -b ${branchName} ${fallbackBranch}`, { cwd: projectPath });
            await execAsync(`git push -u origin ${branchName}`, { cwd: projectPath });
        } catch (error) {
            this.logger.error(`[ensureBranchExistsLocallyAndRemotely] Fehler beim Erstellen von ${branchName}: ${error.message}`);
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

            // Testing Workflows - PIDEA Agent Branch
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
        try {
            // Check if branch exists
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);

            // List all branches
            const { stdout } = await execAsync('git branch -a', { cwd: projectPath });
            const branches = stdout.split('\n').map(b => b.trim().replace('* ', '').replace('remotes/origin/', ''));

            // Check if branch exists locally
            const localBranchExists = branches.includes(branchName);
            
            // Check if branch exists remotely
            const remoteBranchExists = branches.includes(`origin/${branchName}`);

            if (localBranchExists) {
                this.logger.info(`WorkflowGitService: Branch ${branchName} already exists locally`);
                return branchName;
            }

            if (remoteBranchExists) {
                this.logger.info(`WorkflowGitService: Branch ${branchName} exists remotely, creating local tracking branch`);
                
                // Create local tracking branch from remote
                await execAsync(`git checkout -b ${branchName} origin/${branchName}`, { cwd: projectPath });
                
                this.logger.info(`WorkflowGitService: Successfully created local tracking branch ${branchName}`);
                return branchName;
            }

            // Branch doesn't exist locally or remotely - create it from main
            this.logger.info(`WorkflowGitService: Creating PIDEA branch ${branchName} from main`);
            
            // Create new branch from main
            await execAsync(`git checkout -b ${branchName} main`, { cwd: projectPath });
            
            // Push to remote
            await execAsync(`git push -u origin ${branchName}`, { cwd: projectPath });
            
            this.logger.info(`WorkflowGitService: Successfully created and pushed branch ${branchName}`);
            return branchName;

        } catch (error) {
            this.logger.warn(`WorkflowGitService: Failed to create branch ${branchName}, falling back to main: ${error.message}`);
            return 'main'; // Fallback to main if anything goes wrong
        }
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

            // Get current branch name
            const currentBranch = await this.gitService.getCurrentBranch(projectPath);
            
            // Ensure target branch exists
            await this.ensureBranchExists(projectPath, targetBranch);
            
            // Switch to target branch
            await this.gitService.checkout(projectPath, targetBranch);
            
            // Merge current branch into target branch
            const mergeResult = await this.gitService.merge(projectPath, currentBranch, {
                strategy: options.mergeStrategy || 'recursive',
                message: this.generateMergeMessage(task, targetBranch),
                allowFastForward: options.allowFastForward !== false
            });
            
            // Push changes to remote
            await this.gitService.push(projectPath, targetBranch);
            
            // Switch back to original branch
            await this.gitService.checkout(projectPath, currentBranch);
            
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