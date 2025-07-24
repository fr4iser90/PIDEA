const GitService = require('@external/GitService');
const Logger = require('@logging/Logger');

class GitApplicationService {
    constructor(dependencies = {}) {
        this.gitService = dependencies.gitService || new GitService(dependencies);
        this.logger = dependencies.logger || new Logger('GitApplicationService');
        this.eventBus = dependencies.eventBus;
    }

    async getStatus(projectId, projectPath, userId) {
        try {
            // // // this.logger.info('GitApplicationService: Getting Git status', { projectId, userId });

            // Check if it's a Git repository
            const isGitRepo = await this.gitService.isGitRepository(projectPath);
            if (!isGitRepo) {
                throw new Error('Not a Git repository');
            }

            // Get status first
            const status = await this.gitService.getStatus(projectPath);
            
            // Try to get current branch, but don't fail if it doesn't work
            let currentBranch = '';
            try {
                currentBranch = await this.gitService.getCurrentBranch(projectPath);
            } catch (branchError) {
                this.logger.warn('Failed to get current branch, using empty string:', branchError.message);
                currentBranch = '';
            }

            return {
                success: true,
                data: {
                    status,
                    currentBranch
                }
            };
        } catch (error) {
            this.logger.error('Error getting Git status:', error);
            throw error;
        }
    }

    async createBranch(projectPath, branchName, userId) {
        try {
            this.logger.info('GitApplicationService: Creating branch', { branchName, userId });
            
            const result = await this.gitService.createBranch(projectPath, branchName);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error creating branch:', error);
            throw error;
        }
    }

    async switchBranch(projectPath, branchName, userId) {
        try {
            this.logger.info('GitApplicationService: Switching branch', { branchName, userId });
            
            const result = await this.gitService.switchBranch(projectPath, branchName);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error switching branch:', error);
            throw error;
        }
    }

    async commit(projectPath, message, files, userId) {
        try {
            this.logger.info('GitApplicationService: Creating commit', { message, userId });
            
            const result = await this.gitService.commit(projectPath, message, files);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error creating commit:', error);
            throw error;
        }
    }

    async push(projectPath, remote, branch, userId) {
        try {
            this.logger.info('GitApplicationService: Pushing changes', { remote, branch, userId });
            
            const result = await this.gitService.push(projectPath, remote, branch);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error pushing changes:', error);
            throw error;
        }
    }

    async pull(projectPath, remote, branch, userId) {
        try {
            this.logger.info('GitApplicationService: Pulling changes', { remote, branch, userId });
            
            const result = await this.gitService.pull(projectPath, remote, branch);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error pulling changes:', error);
            throw error;
        }
    }

    async getBranches(projectPath, userId) {
        try {
            this.logger.info('GitApplicationService: Getting branches', { userId });
            
            // Get branches first
            const branches = await this.gitService.getBranches(projectPath);
            
            // Try to get current branch, but don't fail if it doesn't work
            let currentBranch = '';
            try {
                currentBranch = await this.gitService.getCurrentBranch(projectPath);
            } catch (branchError) {
                this.logger.warn('Failed to get current branch, using empty string:', branchError.message);
                currentBranch = '';
            }
            
            return {
                success: true,
                data: {
                    branches,
                    currentBranch
                }
            };
        } catch (error) {
            this.logger.error('Error getting branches:', error);
            throw error;
        }
    }

    async getCommitHistory(projectPath, limit, userId) {
        try {
            this.logger.info('GitApplicationService: Getting commit history', { limit, userId });
            
            const history = await this.gitService.getCommitHistory(projectPath, limit);
            return {
                success: true,
                data: history
            };
        } catch (error) {
            this.logger.error('Error getting commit history:', error);
            throw error;
        }
    }

    async addFiles(projectPath, files, userId) {
        try {
            this.logger.info('GitApplicationService: Adding files', { files, userId });
            
            const result = await this.gitService.addFiles(projectPath, files);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error adding files:', error);
            throw error;
        }
    }

    async resetFiles(projectPath, files, userId) {
        try {
            this.logger.info('GitApplicationService: Resetting files', { files, userId });
            
            const result = await this.gitService.resetFiles(projectPath, files);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error resetting files:', error);
            throw error;
        }
    }
}

module.exports = GitApplicationService; 