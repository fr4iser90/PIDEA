const GitService = require('@external/GitService');
const Logger = require('@logging/Logger');

class GitApplicationService {
    constructor(dependencies = {}) {
        // ✅ FIX: Verwende NUR die injizierte gitService-Instanz, keine doppelte Erstellung
        this.gitService = dependencies.gitService;
        if (!this.gitService) {
            throw new Error('GitApplicationService requires gitService dependency');
        }
        this.logger = dependencies.logger || new Logger('GitApplicationService');
        this.eventBus = dependencies.eventBus;
    }

    async getStatus(projectId, projectPath, userId) {
        try {
            // Check if it's a Git repository
            const isGitRepo = await this.gitService.isGitRepository(projectPath);
            if (!isGitRepo) {
                throw new Error('Not a Git repository');
            }

            // ✅ FIX: Only ONE status call (no duplicate)
            const status = await this.gitService.getStatus(projectPath);
            
            // ✅ FIX: Only ONE current branch call (no duplicate)
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
            // ✅ FIX: Only ONE branches call (no duplicate)
            const branches = await this.gitService.getBranches(projectPath);
            
            // ✅ FIX: Reuse current branch from getStatus() instead of duplicate call
            // This will be handled by the calling method that already has currentBranch
            
            return {
                success: true,
                data: {
                    branches,
                    currentBranch: '' // Will be filled by calling method
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