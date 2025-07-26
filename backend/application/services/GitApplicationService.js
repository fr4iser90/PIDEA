const GitService = require('@external/GitService');
const Logger = require('@logging/Logger');

class GitApplicationService {
    constructor(dependencies = {}) {
        this.gitService = dependencies.gitService;
        this.logger = dependencies.logger;
        
        // Request deduplication to prevent duplicate Git operations
        this.pendingRequests = new Map(); // key -> Promise
        this.requestTimeout = 5000; // 5 seconds timeout
    }

    async getStatus(projectId, projectPath, userId) {
        try {
            this.logger.info('GitApplicationService: Getting Git status', { projectId, userId });

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
            this.logger.info('GitApplicationService: Getting branches', { userId });
            
            // ✅ FIX: Only get branches, don't duplicate currentBranch call
            const branches = await this.gitService.getBranches(projectPath);
            
            return {
                success: true,
                data: {
                    branches
                }
            };
        } catch (error) {
            this.logger.error('Error getting branches:', error);
            throw error;
        }
    }

    // ✅ NEW: Combined method to get all Git info in one call
    async getGitInfo(projectPath, userId) {
        const requestKey = `git_info_${projectPath}`;
        
        // Check for pending request to prevent duplicates
        if (this.pendingRequests.has(requestKey)) {
            this.logger.info(`Duplicate Git info request detected for ${projectPath}, waiting for existing request`);
            try {
                return await Promise.race([
                    this.pendingRequests.get(requestKey),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
                    )
                ]);
            } catch (error) {
                this.logger.warn(`Pending Git info request failed for ${projectPath}:`, error.message);
                this.pendingRequests.delete(requestKey);
                throw error;
            }
        }

        // Create new request
        const requestPromise = this._executeGitInfoRequest(projectPath, userId);
        this.pendingRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(requestKey);
        }
    }

    async _executeGitInfoRequest(projectPath, userId) {
        try {
            this.logger.info('GitApplicationService: Getting comprehensive Git info', { userId });
            
            const isGitRepo = await this.gitService.isGitRepository(projectPath);
            if (!isGitRepo) {
                throw new Error('Not a Git repository');
            }

            // Execute all Git operations in parallel to minimize time
            const [status, branches, currentBranch] = await Promise.all([
                this.gitService.getStatus(projectPath),
                this.gitService.getBranches(projectPath),
                this.gitService.getCurrentBranch(projectPath)
            ]);

            return {
                success: true,
                data: {
                    status,
                    branches,
                    currentBranch
                }
            };
        } catch (error) {
            this.logger.error('Error getting Git info:', error);
            throw error;
        }
    }

    // ✅ NEW: Deduplicated method for getting current branch
    async getCurrentBranch(projectPath, userId) {
        const requestKey = `current_branch_${projectPath}`;
        
        if (this.pendingRequests.has(requestKey)) {
            this.logger.info(`Duplicate current branch request detected for ${projectPath}, waiting for existing request`);
            try {
                return await Promise.race([
                    this.pendingRequests.get(requestKey),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
                    )
                ]);
            } catch (error) {
                this.logger.warn(`Pending current branch request failed for ${projectPath}:`, error.message);
                this.pendingRequests.delete(requestKey);
                throw error;
            }
        }

        const requestPromise = this._executeCurrentBranchRequest(projectPath, userId);
        this.pendingRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(requestKey);
        }
    }

    async _executeCurrentBranchRequest(projectPath, userId) {
        try {
            this.logger.info('GitApplicationService: Getting current branch', { userId });
            
            const isGitRepo = await this.gitService.isGitRepository(projectPath);
            if (!isGitRepo) {
                throw new Error('Not a Git repository');
            }

            const currentBranch = await this.gitService.getCurrentBranch(projectPath);

            return {
                success: true,
                data: {
                    currentBranch
                }
            };
        } catch (error) {
            this.logger.error('Error getting current branch:', error);
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