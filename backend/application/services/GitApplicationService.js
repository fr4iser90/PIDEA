const GitService = require('@external/GitService');
const Logger = require('@logging/Logger');
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');

class GitApplicationService {
    constructor(dependencies = {}) {
        this.gitService = dependencies.gitService;
        this.logger = dependencies.logger;
        
        // Request deduplication to prevent duplicate Git operations
        this.pendingRequests = new Map(); // key -> Promise
        this.requestTimeout = 5000; // 5 seconds timeout
    }

    // ✅ NEW: Direct Git operations using Commands and Handlers (bypass Steps)

    /**
     * Get Git status directly using Commands and Handlers (fast, no Steps)
     */
    async getStatusDirect(projectPath) {
        try {
            // Create Command and Handler directly
            const command = CommandRegistry.buildFromCategory('git', 'GitStatusCommand', {
                projectPath,
                porcelain: true
            });

            const handler = HandlerRegistry.buildFromCategory('git', 'GitStatusHandler', {
                terminalService: null, // Not needed for direct operations
                logger: this.logger
            });

            if (!command || !handler) {
                throw new Error('Failed to create Git command or handler');
            }

            const result = await handler.handle(command);
            
            if (result.success) {
                return result.status;
            } else {
                throw new Error(result.error || 'Failed to get Git status');
            }
        } catch (error) {
            this.logger.error('Direct Git status failed:', error);
            throw new Error(`Failed to get Git status: ${error.message}`);
        }
    }

    /**
     * Get current branch directly using Commands and Handlers (fast, no Steps)
     */
    async getCurrentBranchDirect(projectPath) {
        try {
            // Use git branch --show-current command
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            const { stdout } = await execAsync('git branch --show-current', { cwd: projectPath });
            return stdout.trim();
        } catch (error) {
            this.logger.error('Direct Git current branch failed:', error);
            throw new Error(`Failed to get current branch: ${error.message}`);
        }
    }

    /**
     * Get branches directly using Commands and Handlers (fast, no Steps)
     */
    async getBranchesDirect(projectPath) {
        try {
            // Create Command and Handler directly
            const command = CommandRegistry.buildFromCategory('git', 'GitBranchCommand', {
                projectPath,
                includeLocal: true,
                includeRemote: true
            });

            const handler = HandlerRegistry.buildFromCategory('git', 'GitBranchHandler', {
                terminalService: null, // Not needed for direct operations
                logger: this.logger
            });

            if (!command || !handler) {
                throw new Error('Failed to create Git command or handler');
            }

            const result = await handler.handle(command);
            
            if (result.success) {
                return result.branches;
            } else {
                throw new Error(result.error || 'Failed to get Git branches');
            }
        } catch (error) {
            this.logger.error('Direct Git branches failed:', error);
            throw new Error(`Failed to get branches: ${error.message}`);
        }
    }

    /**
     * Get comprehensive Git info directly using Commands and Handlers (fast, no Steps)
     */
    async getGitInfoDirect(projectPath) {
        try {
            const [status, currentBranch, branches] = await Promise.all([
                this.getStatusDirect(projectPath),
                this.getCurrentBranchDirect(projectPath),
                this.getBranchesDirect(projectPath)
            ]);
            
            return {
                status,
                currentBranch,
                branches
            };
        } catch (error) {
            this.logger.error('Direct Git info failed:', error);
            throw new Error(`Failed to get Git info: ${error.message}`);
        }
    }

    /**
     * Get last commit directly using Commands and Handlers (fast, no Steps)
     */
    async getLastCommitDirect(projectPath) {
        try {
            // Use git log -1 command
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            const { stdout } = await execAsync('git log -1 --oneline', { cwd: projectPath });
            return stdout.trim();
        } catch (error) {
            this.logger.error('Direct Git last commit failed:', error);
            throw new Error(`Failed to get last commit: ${error.message}`);
        }
    }

    // ✅ EXISTING: StepRegistry-based operations (for complex workflows)
    
    async getStatus(projectId, projectPath, userId) {
        try {
            this.logger.info('GitApplicationService: Getting Git status', { projectId, userId });

            // ✅ OPTIMIZATION: Direct check without gitService (no Steps)
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            try {
                await execAsync('git status', { cwd: projectPath });
            } catch (error) {
                throw new Error('Not a Git repository');
            }

            // ✅ OPTIMIZATION: Use direct Commands and Handlers for fast data fetching
            const status = await this.getStatusDirect(projectPath);
            const currentBranch = await this.getCurrentBranchDirect(projectPath);

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
            
            // ✅ OPTIMIZATION: Direct check without gitService (no Steps)
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            try {
                await execAsync('git status', { cwd: projectPath });
            } catch (error) {
                throw new Error('Not a Git repository');
            }

            // ✅ OPTIMIZATION: Use direct Commands and Handlers for fast data fetching
            const branches = await this.getBranchesDirect(projectPath);
            
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

    async getGitInfo(projectPath, userId) {
        try {
            this.logger.info('GitApplicationService: Getting Git info', { userId });
            
            // ✅ OPTIMIZATION: Direct check without gitService (no Steps)
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            try {
                await execAsync('git status', { cwd: projectPath });
            } catch (error) {
                throw new Error('Not a Git repository');
            }

            // ✅ OPTIMIZATION: Use direct Commands and Handlers for fast data fetching
            const gitInfo = await this.getGitInfoDirect(projectPath);
            
            return {
                success: true,
                data: gitInfo
            };
        } catch (error) {
            this.logger.error('Error getting Git info:', error);
            throw error;
        }
    }

    // ✅ NEW: Deduplicated method for getting current branch
    async getCurrentBranch(projectPath, userId) {
        try {
            this.logger.info('GitApplicationService: Getting current branch', { userId });
            
            // ✅ OPTIMIZATION: Direct check without gitService (no Steps)
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            try {
                await execAsync('git status', { cwd: projectPath });
            } catch (error) {
                throw new Error('Not a Git repository');
            }

            // ✅ OPTIMIZATION: Use direct Commands and Handlers for fast data fetching
            const currentBranch = await this.getCurrentBranchDirect(projectPath);
            
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