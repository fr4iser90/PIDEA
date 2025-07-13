/**
 * GitController - Handles Git management operations
 */
const GitService = require('@external/GitService');
const { logger } = require('@infrastructure/logging/Logger');

class GitController {
    constructor(dependencies = {}) {
        this.gitService = dependencies.gitService || new GitService(dependencies);
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Get Git status
     * POST /api/projects/:projectId/git/status
     */
    async getStatus(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path is required'
                });
            }

            this.logger.info('GitController: Getting Git status', { projectId, projectPath, userId });

            // Check if it's a Git repository
            const isGitRepo = await this.gitService.isGitRepository(projectPath);
            if (!isGitRepo) {
                return res.status(400).json({
                    success: false,
                    error: 'Not a Git repository'
                });
            }

            // Get current branch
            const currentBranch = await this.gitService.getCurrentBranch(projectPath);
            
            // Get status
            const status = await this.gitService.getStatus(projectPath);

            // Get last commit info
            const lastCommit = await this.gitService.getLastCommit(projectPath);

            if (this.eventBus) {
                this.eventBus.publish('git.status.retrieved', {
                    projectId,
                    projectPath,
                    currentBranch,
                    status,
                    userId,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                data: {
                    status,
                    currentBranch,
                    lastCommit,
                    isGitRepository: true
                },
                message: 'Git status retrieved successfully'
            });

        } catch (error) {
            this.logger.error('GitController: Failed to get Git status', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get Git status',
                message: error.message
            });
        }
    }

    /**
     * Get branches
     * POST /api/projects/:projectId/git/branches
     */
    async getBranches(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path is required'
                });
            }

            this.logger.info('GitController: Getting branches', { projectId, projectPath, userId });

            const branches = await this.gitService.getBranches(projectPath, { all: true });
            const currentBranch = await this.gitService.getCurrentBranch(projectPath);

            res.json({
                success: true,
                data: {
                    branches,
                    currentBranch
                },
                message: 'Branches retrieved successfully'
            });

        } catch (error) {
            this.logger.error('GitController: Failed to get branches', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get branches',
                message: error.message
            });
        }
    }

    /**
     * Validate changes
     * POST /api/projects/:projectId/git/validate
     */
    async validate(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path is required'
                });
            }

            this.logger.info('GitController: Validating changes', { projectId, projectPath, userId });

            // Get status to check for changes
            const status = await this.gitService.getStatus(projectPath);
            const currentBranch = await this.gitService.getCurrentBranch(projectPath);

            // Perform validation checks
            const validation = {
                hasChanges: status.modified.length > 0 || status.added.length > 0 || status.deleted.length > 0,
                modifiedFiles: status.modified.length,
                addedFiles: status.added.length,
                deletedFiles: status.deleted.length,
                untrackedFiles: status.untracked.length,
                currentBranch,
                isValid: true,
                warnings: [],
                errors: []
            };

            // Check for potential issues
            if (validation.untrackedFiles > 10) {
                validation.warnings.push(`Many untracked files (${validation.untrackedFiles}). Consider adding to .gitignore`);
            }

            if (validation.modifiedFiles > 20) {
                validation.warnings.push(`Many modified files (${validation.modifiedFiles}). Consider committing in smaller chunks`);
            }

            if (currentBranch === 'main' && validation.hasChanges) {
                validation.warnings.push('You have uncommitted changes on main branch. Consider creating a feature branch');
            }

            if (this.eventBus) {
                this.eventBus.publish('git.validation.completed', {
                    projectPath,
                    validation,
                    userId,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                data: validation,
                message: 'Validation completed successfully'
            });

        } catch (error) {
            this.logger.error('GitController: Failed to validate changes', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to validate changes',
                message: error.message
            });
        }
    }

    /**
     * Compare branches
     * POST /api/projects/:projectId/git/compare
     */
    async compare(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath, sourceBranch, targetBranch = 'main' } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath || !sourceBranch) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path and source branch are required'
                });
            }

            this.logger.info('GitController: Comparing branches', { 
                projectId,
                projectPath, 
                sourceBranch, 
                targetBranch, 
                userId 
            });

            // Get diff between branches
            const diff = await this.gitService.getDiff(projectPath, {
                commit1: targetBranch,
                commit2: sourceBranch
            });

            // Get commit history for comparison
            const sourceHistory = await this.gitService.getCommitHistory(projectPath, {
                branch: sourceBranch,
                limit: 5
            });

            const targetHistory = await this.gitService.getCommitHistory(projectPath, {
                branch: targetBranch,
                limit: 5
            });

            if (this.eventBus) {
                this.eventBus.publish('git.comparison.completed', {
                    projectPath,
                    sourceBranch,
                    targetBranch,
                    diffLength: diff.length,
                    userId,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                data: {
                    diff,
                    sourceHistory,
                    targetHistory,
                    sourceBranch,
                    targetBranch
                },
                message: 'Branch comparison completed successfully'
            });

        } catch (error) {
            this.logger.error('GitController: Failed to compare branches', {
                projectPath: req.body.projectPath,
                sourceBranch: req.body.sourceBranch,
                targetBranch: req.body.targetBranch,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to compare branches',
                message: error.message
            });
        }
    }

    /**
     * Pull changes
     * POST /api/projects/:projectId/git/pull
     */
    async pull(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath, branch = 'main', remote = 'origin' } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path is required'
                });
            }

            this.logger.info('GitController: Pulling changes', { 
                projectId,
                projectPath, 
                branch, 
                remote, 
                userId 
            });

            // Check current branch
            const currentBranch = await this.gitService.getCurrentBranch(projectPath);
            
            // Switch to target branch if needed
            if (currentBranch !== branch) {
                await this.gitService.checkoutBranch(projectPath, branch);
            }

            // Pull changes
            const result = await this.gitService.pullChanges(projectPath, {
                remote,
                branch
            });

            if (this.eventBus) {
                this.eventBus.publish('git.pull.completed', {
                    projectPath,
                    branch,
                    remote,
                    result: result.success,
                    userId,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                data: {
                    output: result.output,
                    branch,
                    remote
                },
                message: 'Changes pulled successfully'
            });

        } catch (error) {
            this.logger.error('GitController: Failed to pull changes', {
                projectPath: req.body.projectPath,
                branch: req.body.branch,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to pull changes',
                message: error.message
            });
        }
    }

    /**
     * Checkout branch
     * POST /api/projects/:projectId/git/checkout
     */
    async checkout(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath, branch } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath || !branch) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path and branch are required'
                });
            }

            this.logger.info('GitController: Checking out branch', { 
                projectId,
                projectPath, 
                branch, 
                userId 
            });

            const result = await this.gitService.checkoutBranch(projectPath, branch);

            if (this.eventBus) {
                this.eventBus.publish('git.checkout.completed', {
                    projectPath,
                    branch,
                    userId,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                data: {
                    output: result.output,
                    branch
                },
                message: `Switched to branch: ${branch}`
            });

        } catch (error) {
            this.logger.error('GitController: Failed to checkout branch', {
                projectPath: req.body.projectPath,
                branch: req.body.branch,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to checkout branch',
                message: error.message
            });
        }
    }

    /**
     * Merge branches
     * POST /api/projects/:projectId/git/merge
     */
    async merge(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath, sourceBranch, targetBranch = 'main' } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath || !sourceBranch) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path and source branch are required'
                });
            }

            this.logger.info('GitController: Merging branches', { 
                projectId,
                projectPath, 
                sourceBranch, 
                targetBranch, 
                userId 
            });

            // Check current branch
            const currentBranch = await this.gitService.getCurrentBranch(projectPath);
            
            // Switch to target branch
            if (currentBranch !== targetBranch) {
                await this.gitService.checkoutBranch(projectPath, targetBranch);
            }

            // Pull latest changes
            await this.gitService.pullChanges(projectPath, { branch: targetBranch });

            // Merge source branch
            const result = await this.gitService.mergeBranch(projectPath, sourceBranch);

            if (this.eventBus) {
                this.eventBus.publish('git.merge.completed', {
                    projectPath,
                    sourceBranch,
                    targetBranch,
                    result: result.success,
                    userId,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                data: {
                    output: result.output,
                    sourceBranch,
                    targetBranch
                },
                message: `Successfully merged ${sourceBranch} into ${targetBranch}`
            });

        } catch (error) {
            this.logger.error('GitController: Failed to merge branches', {
                projectPath: req.body.projectPath,
                sourceBranch: req.body.sourceBranch,
                targetBranch: req.body.targetBranch,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to merge branches',
                message: error.message
            });
        }
    }

    /**
     * Create branch
     * POST /api/projects/:projectId/git/create-branch
     */
    async createBranch(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath, branchName, startPoint = 'main' } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath || !branchName) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path and branch name are required'
                });
            }

            this.logger.info('GitController: Creating branch', { 
                projectId,
                projectPath, 
                branchName, 
                startPoint, 
                userId 
            });

            const result = await this.gitService.createBranch(projectPath, branchName, {
                startPoint
            });

            if (this.eventBus) {
                this.eventBus.publish('git.branch.created', {
                    projectPath,
                    branchName,
                    startPoint,
                    userId,
                    timestamp: new Date()
                });
            }

            res.json({
                success: true,
                data: {
                    output: result.output,
                    branchName,
                    startPoint
                },
                message: `Branch '${branchName}' created successfully`
            });

        } catch (error) {
            this.logger.error('GitController: Failed to create branch', {
                projectPath: req.body.projectPath,
                branchName: req.body.branchName,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to create branch',
                message: error.message
            });
        }
    }

    /**
     * Get repository info
     * POST /api/projects/:projectId/git/info
     */
    async getRepositoryInfo(req, res) {
        try {
            const projectId = req.params.projectId;
            const { projectPath } = req.body;
            const userId = req.user?.id;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (!projectPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Project path is required'
                });
            }

            this.logger.info('GitController: Getting repository info', { projectId, projectPath, userId });

            const info = await this.gitService.getRepositoryInfo(projectPath);

            res.json({
                success: true,
                data: info,
                message: 'Repository info retrieved successfully'
            });

        } catch (error) {
            this.logger.error('GitController: Failed to get repository info', {
                projectPath: req.body.projectPath,
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get repository info',
                message: error.message
            });
        }
    }
}

module.exports = GitController; 