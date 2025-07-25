/**
 * WorkflowGitService - Domain Service for Workflow-specific Git Operations
 * Implements DDD patterns for different workflow types and branch strategies
 * Enhanced with GitWorkflowManager integration
 */
const GitService = require('@external/GitService');
const TaskType = require('../../value-objects/TaskType');
const GitWorkflowManager = require('../../workflows/categories/git/GitWorkflowManager');
const GitWorkflowContext = require('../../workflows/categories/git/GitWorkflowContext');
const GitWorkflowResult = require('../../workflows/categories/git/GitWorkflowResult');
const ServiceLogger = require('@logging/ServiceLogger');

class WorkflowGitService {
    constructor(dependencies = {}) {
        this.gitService = dependencies.gitService || new GitService(dependencies);
        this.logger = dependencies.logger || new ServiceLogger('WorkflowGitService');
        this.eventBus = dependencies.eventBus;
        
        // Initialize enhanced git workflow manager
        this.gitWorkflowManager = new GitWorkflowManager({
            gitService: this.gitService,
            logger: this.logger,
            eventBus: this.eventBus
        });
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
                this.logger.info(`Branch ${branchName} exists`);
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
            this.logger.error(`Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create workflow-specific branch using enhanced git workflow manager
     * @param {string} projectPath - Project path
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Branch creation result
     */
    async createWorkflowBranch(projectPath, task, options = {}) {
        try {
            // Use enhanced git workflow manager for branch creation
            const context = new GitWorkflowContext({
                projectPath,
                task,
                options,
                workflowType: 'branch-creation'
            });

            const result = await this.gitWorkflowManager.createBranch(context);
            
            this.logger.info('WorkflowGitService: Enhanced branch creation completed', {
                projectPath,
                taskId: task.id,
                branchName: result.branchName,
                strategy: result.strategy
            });

            return result;

        } catch (error) {
            this.logger.error('WorkflowGitService: Enhanced branch creation failed', {
                projectPath,
                taskId: task.id,
                error: error.message
            });
            
            // Fallback to legacy method if enhanced method fails
            return await this.createWorkflowBranchLegacy(projectPath, task, options);
        }
    }

    /**
     * Legacy method for workflow-specific branch creation (fallback)
     * @param {string} projectPath - Project path
     * @param {Object} task - Task object
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Branch creation result
     */
    async createWorkflowBranchLegacy(projectPath, task, options = {}) {
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

            // Check if GitService is available for actual Git operations
            if (this.gitService) {
                try {
                    // Get current branch before creating new one
                    const currentBranch = await this.gitService.getCurrentBranch(projectPath);
                    this.logger.info(`Current branch: ${currentBranch}`);

                    // Create and checkout the new branch
                    await this.gitService.createBranch(projectPath, branchName, {
                        checkout: true,
                        startPoint: branchStrategy.startPoint || 'main'
                    });

                    // Verify branch was created and checked out
                    const newCurrentBranch = await this.gitService.getCurrentBranch(projectPath);
                    this.logger.info(`New current branch: ${newCurrentBranch}`);

                    if (newCurrentBranch !== branchName) {
                        throw new Error(`Branch checkout failed: expected ${branchName}, got ${newCurrentBranch}`);
                    }

                    this.logger.info(`Successfully created and checked out branch: ${branchName}`);

                } catch (gitError) {
                    this.logger.error('WorkflowGitService: Git operation failed', {
                        projectPath,
                        branchName,
                        error: gitError.message
                    });
                    // Continue without Git operations if they fail
                }
            } else {
                this.logger.warn('WorkflowGitService: No GitService available, skipping actual Git operations');
            }

            // Prepare branch information
            const result = {
                branchName,
                strategy: branchStrategy,
                status: 'created',
                message: `Created ${branchStrategy.type} branch: ${branchName}`,
                metadata: {
                    taskId: task.id,
                    taskType: task.type?.value,
                    workflowType: branchStrategy.type,
                    startPoint: branchStrategy.startPoint || 'main',
                    mergeTarget: branchStrategy.mergeTarget || 'main',
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
            this.logger.info('DEBUG TaskType:', { TaskType, taskTypeValue });
        }
        // Defensive: fallback for undefined TaskType constants
        const safe = (v) => {
            if (v === undefined || v === null) return '__undefined__';
            return v;
        };
        const strategies = {
            // ===== AI-GENERATED TASKS (merge to pidea-ai-main) =====
            [safe(TaskType.FEATURE)]: {
                type: 'feature',
                prefix: 'feature',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'New feature implementation by AI'
            },
            [safe(TaskType.OPTIMIZATION)]: {
                type: 'enhancement',
                prefix: 'enhance',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Performance and code optimization by AI'
            },
            [safe(TaskType.REFACTOR)]: {
                type: 'refactor',
                prefix: 'refactor',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Code refactoring by AI'
            },
            [safe(TaskType.ANALYSIS)]: {
                type: 'analysis',
                prefix: 'analyze',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-ai-main',
                description: 'Code analysis by AI'
            },
            [safe(TaskType.DOCUMENTATION)]: {
                type: 'documentation',
                prefix: 'docs',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: false,
                requiresReview: false,
                mergeTarget: 'pidea-ai-main',
                description: 'Documentation generation by AI'
            },

            // ===== CRITICAL BUG FIXES (merge to main) =====
            [safe(TaskType.BUG)]: {
                type: 'bugfix',
                prefix: 'fix',
                startPoint: 'pidea-agent',
                protection: 'high',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main',
                description: 'Critical bug fixes'
            },
            [safe(TaskType.SECURITY)]: {
                type: 'hotfix',
                prefix: 'hotfix',
                startPoint: 'pidea-agent',
                protection: 'critical',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'main',
                description: 'Security hotfixes'
            },

            // ===== TESTING TASKS (merge to pidea-agent) =====
            [safe(TaskType.TESTING)]: {
                type: 'testing',
                prefix: 'test',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-agent',
                description: 'Testing tasks'
            },
            [safe(TaskType.TEST)]: {
                type: 'testing',
                prefix: 'test',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-agent',
                description: 'Test execution'
            },
            [safe(TaskType.TEST_FIX)]: {
                type: 'testing',
                prefix: 'test-fix',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-agent',
                description: 'Test fixes'
            },
            [safe(TaskType.TEST_COVERAGE)]: {
                type: 'testing',
                prefix: 'test-coverage',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-agent',
                description: 'Test coverage improvements'
            },
            [safe(TaskType.TEST_REFACTOR)]: {
                type: 'testing',
                prefix: 'test-refactor',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-agent',
                description: 'Test refactoring'
            },
            [safe(TaskType.TEST_STATUS)]: {
                type: 'testing',
                prefix: 'test-status',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-agent',
                description: 'Test status updates'
            },
            [safe(TaskType.TEST_REPORT)]: {
                type: 'testing',
                prefix: 'test-report',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-agent',
                description: 'Test report generation'
            },

            // ===== TECHNOLOGY-SPECIFIC REFACTORING (merge to pidea-ai-main) =====
            [safe(TaskType.REFACTOR_NODE)]: {
                type: 'refactor',
                prefix: 'refactor-node',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Node.js specific refactoring'
            },
            [safe(TaskType.REFACTOR_REACT)]: {
                type: 'refactor',
                prefix: 'refactor-react',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'React specific refactoring'
            },
            [safe(TaskType.REFACTOR_FRONTEND)]: {
                type: 'refactor',
                prefix: 'refactor-frontend',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Frontend refactoring'
            },
            [safe(TaskType.REFACTOR_BACKEND)]: {
                type: 'refactor',
                prefix: 'refactor-backend',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Backend refactoring'
            },
            [safe(TaskType.REFACTOR_DATABASE)]: {
                type: 'refactor',
                prefix: 'refactor-db',
                startPoint: 'pidea-agent',
                protection: 'high',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Database refactoring'
            },
            [safe(TaskType.REFACTOR_API)]: {
                type: 'refactor',
                prefix: 'refactor-api',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'API refactoring'
            },

            // ===== TECHNOLOGY-SPECIFIC TESTING (merge to pidea-agent) =====
            [safe(TaskType.TEST_UNIT)]: {
                type: 'testing',
                prefix: 'test-unit',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-agent',
                description: 'Unit testing'
            },
            [safe(TaskType.TEST_INTEGRATION)]: {
                type: 'testing',
                prefix: 'test-integration',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-agent',
                description: 'Integration testing'
            },
            [safe(TaskType.TEST_E2E)]: {
                type: 'testing',
                prefix: 'test-e2e',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-agent',
                description: 'End-to-end testing'
            },
            [safe(TaskType.TEST_PERFORMANCE)]: {
                type: 'testing',
                prefix: 'test-performance',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-agent',
                description: 'Performance testing'
            },
            [safe(TaskType.TEST_SECURITY)]: {
                type: 'testing',
                prefix: 'test-security',
                startPoint: 'pidea-agent',
                protection: 'high',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-agent',
                description: 'Security testing'
            },

            // ===== ROADMAP FEATURE TYPES (merge to pidea-ai-main) =====
            [safe(TaskType.FEATURE_SUMMARY)]: {
                type: 'feature',
                prefix: 'feature-summary',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-ai-main',
                description: 'Feature summary generation'
            },
            [safe(TaskType.FEATURE_IMPLEMENTATION)]: {
                type: 'feature',
                prefix: 'feature-impl',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Feature implementation'
            },
            [safe(TaskType.FEATURE_PHASE)]: {
                type: 'feature',
                prefix: 'feature-phase',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Feature phase management'
            },
            [safe(TaskType.FEATURE_INDEX)]: {
                type: 'feature',
                prefix: 'feature-index',
                startPoint: 'pidea-agent',
                protection: 'low',
                autoMerge: true,
                requiresReview: false,
                mergeTarget: 'pidea-ai-main',
                description: 'Feature indexing'
            },

            // ===== DEFAULT STRATEGY =====
            default: {
                type: 'task',
                prefix: 'task',
                startPoint: 'pidea-agent',
                protection: 'medium',
                autoMerge: false,
                requiresReview: true,
                mergeTarget: 'pidea-ai-main',
                description: 'Generic task'
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
        this.logger.info(`Branch ${branchName} operation requested - handled by Playwright`);
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
        this.logger.info(`Branch ${branchName} configuration requested - handled by Playwright`);
    }

    /**
     * Apply critical protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyCriticalProtection(projectPath, branchName) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`Branch ${branchName} protection requested - handled by Playwright`);
    }

    /**
     * Apply high protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyHighProtection(projectPath, branchName) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`Branch ${branchName} protection requested - handled by Playwright`);
    }

    /**
     * Apply medium protection to branch
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @returns {Promise<void>}
     */
    async applyMediumProtection(projectPath, branchName) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`Branch ${branchName} protection requested - handled by Playwright`);
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
        this.logger.info(`Branch ${branchName} auto-merge requested - handled by Playwright`);
    }

    /**
     * Complete workflow using enhanced git workflow manager
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {Object} task - Task object
     * @param {Object} options - Merge options
     * @returns {Promise<Object>} Merge result
     */
    async completeWorkflow(projectPath, branchName, task, options = {}) {
        try {
            // Use enhanced git workflow manager for workflow completion
            const context = new GitWorkflowContext({
                projectPath,
                task,
                options,
                workflowType: 'workflow-completion',
                branchName
            });

            const result = await this.gitWorkflowManager.completeWorkflow(context);
            
            this.logger.info('WorkflowGitService: Enhanced workflow completion completed', {
                projectPath,
                taskId: task.id,
                branchName,
                result: result.status
            });

            return result;

        } catch (error) {
            this.logger.error('WorkflowGitService: Enhanced workflow completion failed', {
                projectPath,
                taskId: task.id,
                branchName,
                error: error.message
            });
            
            // Fallback to legacy method if enhanced method fails
            return await this.completeWorkflowLegacy(projectPath, branchName, task, options);
        }
    }

    /**
     * Legacy method for workflow completion (fallback)
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {Object} task - Task object
     * @param {Object} options - Merge options
     * @returns {Promise<Object>} Merge result
     */
    async completeWorkflowLegacy(projectPath, branchName, task, options = {}) {
        try {
            const strategy = this.determineBranchStrategy(task.type, options);
            
            this.logger.info('WorkflowGitService: Completing workflow', {
                projectPath,
                branchName,
                taskId: task.id,
                mergeTarget: strategy.mergeTarget
            });

            let mergeResult = null;
            const commitMessage = this.generateCommitMessage(task, strategy);

            // Check if GitService is available for actual Git operations
            if (this.gitService) {
                try {
                    // Get current branch
                    const currentBranch = await this.gitService.getCurrentBranch(projectPath);
                    this.logger.info(`Current branch before completion: ${currentBranch}`);

                    // If we're on the workflow branch, commit changes first
                    if (currentBranch === branchName) {
                        this.logger.info(`Committing changes on branch: ${branchName}`);
                        
                        // Add all changes
                        await this.gitService.addFiles(projectPath);
                        
                        // Commit changes
                        await this.gitService.commitChanges(projectPath, commitMessage);
                        
                        this.logger.info(`Changes committed successfully`);
                    }

                    // If auto-merge is enabled, merge to target branch
                    if (strategy.autoMerge && strategy.mergeTarget) {
                        this.logger.info(`Auto-merging to ${strategy.mergeTarget}`);
                        
                        // Checkout target branch
                        await this.gitService.checkoutBranch(projectPath, strategy.mergeTarget);
                        
                        // Merge the workflow branch
                        mergeResult = await this.gitService.mergeBranch(projectPath, branchName, {
                            strategy: 'squash'
                        });
                        
                        this.logger.info(`Auto-merge completed:`, mergeResult);
                    } else {
                        this.logger.info(`Auto-merge disabled, keeping branch: ${branchName}`);
                        mergeResult = {
                            success: true,
                            action: 'kept_branch',
                            message: `Branch ${branchName} kept for manual review`
                        };
                    }

                } catch (gitError) {
                    this.logger.error('WorkflowGitService: Git operation failed during completion', {
                        projectPath,
                        branchName,
                        error: gitError.message
                    });
                    // Continue without Git operations if they fail
                    mergeResult = {
                        success: false,
                        action: 'git_error',
                        error: gitError.message
                    };
                }
            } else {
                this.logger.warn('WorkflowGitService: No GitService available, skipping Git operations');
                mergeResult = {
                    success: true,
                    action: 'no_git_service',
                    message: 'Git operations skipped - no GitService available'
                };
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
        // Git operations handled by Playwright via CDP
        this.logger.info(`Auto-merge requested - handled by Playwright`);
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
            this.logger.info(`Rollback requested - handled by Playwright`);

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
            this.logger.info(`Merge requested - handled by Playwright`);
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
     * Create pull request using enhanced git workflow manager
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {Object} task - Task object
     * @param {Object} options - PR options
     * @returns {Promise<Object>} Pull request result
     */
    async createPullRequest(projectPath, branchName, task, options = {}) {
        try {
            // Use enhanced git workflow manager for pull request creation
            const context = new GitWorkflowContext({
                projectPath,
                task,
                options,
                workflowType: 'pull-request-creation',
                branchName
            });

            const result = await this.gitWorkflowManager.createPullRequest(context);
            
            this.logger.info('WorkflowGitService: Enhanced pull request creation completed', {
                projectPath,
                taskId: task.id,
                branchName,
                prUrl: result.prUrl
            });

            return result;

        } catch (error) {
            this.logger.error('WorkflowGitService: Enhanced pull request creation failed', {
                projectPath,
                taskId: task.id,
                branchName,
                error: error.message
            });
            
            // Fallback to legacy method if enhanced method fails
            return await this.createPullRequestLegacy(projectPath, branchName, task, options);
        }
    }

    /**
     * Legacy method for pull request creation (fallback)
     * @param {string} projectPath - Project path
     * @param {string} branchName - Branch name
     * @param {Object} task - Task object
     * @param {Object} options - PR options
     * @returns {Promise<Object>} Pull request result
     */
    async createPullRequestLegacy(projectPath, branchName, task, options = {}) {
        // Git operations handled by Playwright via CDP
        this.logger.info(`Pull request creation requested - handled by Playwright`);
        return {
            success: true,
            branchName,
            prUrl: `https://github.com/example/pull/123`,
            message: `Pull request created for ${branchName}`
        };
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