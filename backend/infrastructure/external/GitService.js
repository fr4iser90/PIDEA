/**
 * GitService - Git operations orchestrator using Steps
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class GitService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.stepRegistry = dependencies.stepRegistry;
    }

    /**
     * Check if directory is a Git repository
     * @param {string} repoPath - Repository path
     * @returns {Promise<boolean>} True if Git repository
     */
    async isGitRepository(repoPath) {
        try {
            const gitPath = path.join(repoPath, '.git');
            await fs.access(gitPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Initialize Git repository using GIT_INIT_REPOSITORY step
     * @param {string} repoPath - Repository path
     * @param {Object} options - Init options
     * @returns {Promise<Object>} Init result
     */
    async initRepository(repoPath, options = {}) {
        const { bare = false, initialBranch = 'main' } = options;

        try {
            this.logger.info('GitService: Initializing repository using step', { repoPath, bare, initialBranch });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                bare,
                initialBranch
            };

            const result = await this.stepRegistry.executeStep('GitInitRepositoryStep', stepContext);
            
            if (result.success) {
                if (this.eventBus) {
                    this.eventBus.publish('git.repository.init', {
                        repoPath,
                        bare,
                        initialBranch,
                        timestamp: new Date()
                    });
                }
                return { success: true, output: result.result };
            } else {
                throw new Error(result.error || 'Failed to initialize repository');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to initialize repository', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to initialize Git repository: ${error.message}`);
        }
    }

    /**
     * Clone repository using GIT_CLONE_REPOSITORY step
     * @param {string} url - Repository URL
     * @param {string} targetPath - Target path
     * @param {Object} options - Clone options
     * @returns {Promise<Object>} Clone result
     */
    async cloneRepository(url, targetPath, options = {}) {
        const { 
            branch = null, 
            depth = null, 
            singleBranch = false,
            recursive = false 
        } = options;

        try {
            this.logger.info('GitService: Cloning repository using step', { url, targetPath, branch, depth, singleBranch, recursive });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                url,
                targetPath,
                branch,
                depth,
                singleBranch,
                recursive
            };

            const result = await this.stepRegistry.executeStep('GitCloneRepositoryStep', stepContext);
            
            if (result.success) {
                if (this.eventBus) {
                    this.eventBus.publish('git.repository.clone', {
                        url,
                        targetPath,
                        branch,
                        depth,
                        singleBranch,
                        recursive,
                        timestamp: new Date()
                    });
                }
                return { success: true, output: result.result };
            } else {
                throw new Error(result.error || 'Failed to clone repository');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to clone repository', {
                url,
                targetPath,
                error: error.message
            });
            throw new Error(`Failed to clone repository: ${error.message}`);
        }
    }

    /**
     * Get current branch using GIT_GET_CURRENT_BRANCH step
     * @param {string} repoPath - Repository path
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<string>} Current branch name
     */
    async getCurrentBranch(repoPath, userId, projectId) {
        try {
            // // this.logger.info('GitService: Getting current branch using step', { repoPath });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId
            };

            const result = await this.stepRegistry.executeStep('GitGetCurrentBranchStep', stepContext);
            
            if (result.success) {
                // Handle nested result structure from StepRegistry
                const currentBranch = result.result?.currentBranch || result.currentBranch;
                // this.logger.info(`Aktueller Branch für ${repoPath}: "${currentBranch}"`);
                return currentBranch;
            } else {
                throw new Error(result.error || 'Failed to get current branch');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to get current branch', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get current branch: ${error.message}`);
        }
    }

    /**
     * Get all branches using GIT_GET_BRANCHES step
     * @param {string} repoPath - Repository path
     * @param {Object} options - Branch options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Array>} Branch list
     */
    async getBranches(repoPath, options = {}, userId, projectId) {
        const { includeRemote = true, includeLocal = true } = options;
        
        try {
            this.logger.info('GitService: Getting branches using step', { repoPath, includeRemote, includeLocal });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                includeRemote,
                includeLocal
            };

            const result = await this.stepRegistry.executeStep('GitGetBranchesStep', stepContext);
            
            if (result.success) {
                this.logger.info('GitService: Step execution result', { result: result.result });
                
                // The step now returns the branches object directly in result.result
                const branches = result.result || { local: [], remote: [], all: [] };
                
                this.logger.info('GitService: Extracted branches', { branches });
                
                return branches;
            } else {
                throw new Error(result.error || 'Failed to get branches');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to get branches', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get branches: ${error.message}`);
        }
    }

    /**
     * Create new branch using GIT_CREATE_BRANCH step
     * @param {string} repoPath - Repository path
     * @param {string} branchName - Branch name
     * @param {Object} options - Branch options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Branch creation result
     */
    async createBranch(repoPath, branchName, options = {}, userId, projectId) {
        const { checkout = true, startPoint = null } = options;

        try {
            this.logger.info('GitService: Creating branch using step', { repoPath, branchName });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                branchName,
                userId: userId,
                projectId: projectId,
                checkout,
                fromBranch: startPoint
            };

            const result = await this.stepRegistry.executeStep('GitCreateBranchStep', stepContext);

            if (this.eventBus) {
                this.eventBus.publish('git.branch.create', {
                    repoPath,
                    branchName,
                    timestamp: new Date()
                });
            }

            return { success: result.success, output: result.result };
        } catch (error) {
            this.logger.error('GitService: Failed to create branch', {
                repoPath,
                branchName,
                error: error.message
            });
            throw new Error(`Failed to create branch: ${error.message}`);
        }
    }

    /**
     * Checkout branch using GIT_CHECKOUT_BRANCH step
     * @param {string} repoPath - Repository path
     * @param {string} branchName - Branch name
     * @param {Object} options - Checkout options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Checkout result
     */
    async checkoutBranch(repoPath, branchName, options = {}, userId, projectId) {
        const { createIfNotExists = false } = options;
        
        try {
            this.logger.info('GitService: Checking out branch using step', { repoPath, branchName, createIfNotExists });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                branchName,
                userId: userId,
                projectId: projectId,
                createIfNotExists
            };

            const result = await this.stepRegistry.executeStep('GitCheckoutBranchStep', stepContext);
            
            if (result.success) {
                if (this.eventBus) {
                    this.eventBus.publish('git.branch.checkout', {
                        repoPath,
                        branchName,
                        created: result.created,
                        timestamp: new Date()
                    });
                }
                return { success: true, output: result.result, created: result.created };
            } else {
                throw new Error(result.error || 'Failed to checkout branch');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to checkout branch', {
                repoPath,
                branchName,
                error: error.message
            });
            throw new Error(`Failed to checkout branch: ${error.message}`);
        }
    }

    /**
     * Get commit history using GIT_GET_COMMIT_HISTORY step
     * @param {string} repoPath - Repository path
     * @param {Object} options - History options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Array>} Commit history
     */
    async getCommitHistory(repoPath, options = {}, userId, projectId) {
        const { 
            limit = 10, 
            since = null, 
            until = null, 
            author = null,
            format = 'pretty=format:"%H|%an|%ae|%ad|%s"' 
        } = options;

        try {
            this.logger.info('GitService: Getting commit history using step', { repoPath, limit, since, until, author });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                limit,
                since,
                until,
                author,
                format
            };

            const result = await this.stepRegistry.executeStep('GitGetCommitHistoryStep', stepContext);
            
            if (result.success) {
                return result.commits;
            } else {
                throw new Error(result.error || 'Failed to get commit history');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to get commit history', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get commit history: ${error.message}`);
        }
    }

    /**
     * Get last commit using GIT_GET_LAST_COMMIT step
     * @param {string} repoPath - Repository path
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Last commit info
     */
    async getLastCommit(repoPath, userId, projectId) {
        try {
            this.logger.info('GitService: Getting last commit using step', { repoPath });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId
            };

            const result = await this.stepRegistry.executeStep('GitGetLastCommitStep', stepContext);
            
            if (result.success) {
                return result.lastCommit;
            } else {
                throw new Error(result.error || 'Failed to get last commit');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to get last commit', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get last commit: ${error.message}`);
        }
    }

    /**
     * Add files to staging using GIT_ADD_FILES step
     * @param {string} repoPath - Repository path
     * @param {Array<string>} files - Files to add
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Add result
     */
    async addFiles(repoPath, files = [], userId, projectId) {
        try {
            this.logger.info('GitService: Adding files using step', { repoPath, files });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                files: files.length === 0 ? '.' : files.join(' ')
            };

            const result = await this.stepRegistry.executeStep('GitAddFilesStep', stepContext);
            
            if (result.success) {
                if (this.eventBus) {
                    this.eventBus.publish('git.files.add', {
                        repoPath,
                        files,
                        timestamp: new Date()
                    });
                }
                return { success: true, output: result.result };
            } else {
                throw new Error(result.error || 'Failed to add files');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to add files', {
                repoPath,
                files,
                error: error.message
            });
            throw new Error(`Failed to add files: ${error.message}`);
        }
    }

    /**
     * Commit changes using GIT_COMMIT step
     * @param {string} repoPath - Repository path
     * @param {string} message - Commit message
     * @param {Object} options - Commit options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Commit result
     */
    async commitChanges(repoPath, message, options = {}, userId, projectId) {
        const { author = null, allowEmpty = false } = options;

        try {
            this.logger.info('GitService: Committing changes using step', { repoPath, message });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                message,
                userId: userId,
                projectId: projectId,
                author,
                files: '.'
            };

            const result = await this.stepRegistry.executeStep('GitCommitStep', stepContext);

            if (this.eventBus) {
                this.eventBus.publish('git.commit', {
                    repoPath,
                    message,
                    timestamp: new Date()
                });
            }

            return { success: result.success, output: result.result };
        } catch (error) {
            this.logger.error('GitService: Failed to commit changes', {
                repoPath,
                message,
                error: error.message
            });
            throw new Error(`Failed to commit changes: ${error.message}`);
        }
    }

    /**
     * Push changes using GIT_PUSH step
     * @param {string} repoPath - Repository path
     * @param {Object} options - Push options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Push result
     */
    async pushChanges(repoPath, options = {}, userId, projectId) {
        const { 
            remote = 'origin', 
            branch = null, 
            setUpstream = false,
            force = false 
        } = options;

        try {
            this.logger.info('GitService: Pushing changes using step', { repoPath, remote });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                branch,
                userId: userId,
                projectId: projectId,
                remote,
                setUpstream
            };

            const result = await this.stepRegistry.executeStep('GitPushStep', stepContext);

            if (this.eventBus) {
                this.eventBus.publish('git.push', {
                    repoPath,
                    remote,
                    timestamp: new Date()
                });
            }

            return { success: result.success, output: result.result };
        } catch (error) {
            this.logger.error('GitService: Failed to push changes', {
                repoPath,
                remote,
                error: error.message
            });
            throw new Error(`Failed to push changes: ${error.message}`);
        }
    }

    /**
     * Pull changes using GIT_PULL_CHANGES step
     * @param {string} repoPath - Repository path
     * @param {Object} options - Pull options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Pull result
     */
    async pullChanges(repoPath, options = {}, userId, projectId) {
        const { remote = 'origin', branch = null, rebase = false } = options;

        try {
            this.logger.info('GitService: Pulling changes using step', { repoPath, remote, branch, rebase });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                remote,
                branch,
                rebase
            };

            const result = await this.stepRegistry.executeStep('GitPullChangesStep', stepContext);
            
            if (result.success) {
                if (this.eventBus) {
                    this.eventBus.publish('git.pull', {
                        repoPath,
                        remote,
                        branch,
                        rebase,
                        timestamp: new Date()
                    });
                }
                return { success: true, output: result.result };
            } else {
                throw new Error(result.error || 'Failed to pull changes');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to pull changes', {
                repoPath,
                remote,
                error: error.message
            });
            throw new Error(`Failed to pull changes: ${error.message}`);
        }
    }

    /**
     * Get status using GIT_GET_STATUS step
     * @param {string} repoPath - Repository path
     * @param {Object} options - Status options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Repository status
     */
    async getStatus(repoPath, options = {}, userId, projectId) {
        const { porcelain = true } = options;
        
        try {
            // // this.logger.info('GitService: Getting status using step', { repoPath, porcelain });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                porcelain
            };

            const result = await this.stepRegistry.executeStep('GitGetStatusStep', stepContext);
            
            if (result.success) {
                // The StepRegistry wraps the step result in a 'result' property
                // So we need to access result.result.status
                return result.result?.status || result.status;
            } else {
                throw new Error(result.error || 'Failed to get status');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to get status', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get status: ${error.message}`);
        }
    }

    /**
     * Get remote URL using GIT_GET_REMOTE_URL step
     * @param {string} repoPath - Repository path
     * @param {string} remote - Remote name
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<string>} Remote URL
     */
    async getRemoteUrl(repoPath, remote = 'origin', userId, projectId) {
        try {
            this.logger.info('GitService: Getting remote URL using step', { repoPath, remote });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                remote
            };

            const result = await this.stepRegistry.executeStep('GitGetRemoteUrlStep', stepContext);
            
            if (result.success) {
                return result.remoteUrl;
            } else {
                throw new Error(result.error || 'Failed to get remote URL');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to get remote URL', {
                repoPath,
                remote,
                error: error.message
            });
            throw new Error(`Failed to get remote URL: ${error.message}`);
        }
    }

    /**
     * Add remote using GIT_ADD_REMOTE step
     * @param {string} repoPath - Repository path
     * @param {string} name - Remote name
     * @param {string} url - Remote URL
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Add remote result
     */
    async addRemote(repoPath, name, url, userId, projectId) {
        try {
            this.logger.info('GitService: Adding remote using step', { repoPath, name, url });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                name,
                url
            };

            const result = await this.stepRegistry.executeStep('GitAddRemoteStep', stepContext);
            
            if (result.success) {
                if (this.eventBus) {
                    this.eventBus.publish('git.remote.add', {
                        repoPath,
                        name,
                        url,
                        timestamp: new Date()
                    });
                }
                return { success: true, output: result.result };
            } else {
                throw new Error(result.error || 'Failed to add remote');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to add remote', {
                repoPath,
                name,
                url,
                error: error.message
            });
            throw new Error(`Failed to add remote: ${error.message}`);
        }
    }

    /**
     * Get diff using GIT_GET_DIFF step
     * @param {string} repoPath - Repository path
     * @param {Object} options - Diff options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<string>} Diff output
     */
    async getDiff(repoPath, options = {}, userId, projectId) {
        const { 
            staged = false, 
            file = null, 
            commit1 = null, 
            commit2 = null 
        } = options;

        try {
            this.logger.info('GitService: Getting diff using step', { repoPath, staged, file, commit1, commit2 });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                staged,
                file,
                commit1,
                commit2
            };

            const result = await this.stepRegistry.executeStep('GitGetDiffStep', stepContext);
            
            if (result.success) {
                return result.diff;
            } else {
                throw new Error(result.error || 'Failed to get diff');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to get diff', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get diff: ${error.message}`);
        }
    }

    /**
     * Reset repository using GIT_RESET step
     * @param {string} repoPath - Repository path
     * @param {string} mode - Reset mode (soft, mixed, hard)
     * @param {string} commit - Commit to reset to
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Reset result
     */
    async resetRepository(repoPath, mode = 'mixed', commit = 'HEAD', userId, projectId) {
        try {
            this.logger.info('GitService: Resetting repository using step', { repoPath, mode, commit });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                userId: userId,
                projectId: projectId,
                mode,
                commit
            };

            const result = await this.stepRegistry.executeStep('GitResetStep', stepContext);
            
            if (result.success) {
                if (this.eventBus) {
                    this.eventBus.publish('git.reset', {
                        repoPath,
                        mode,
                        commit,
                        timestamp: new Date()
                    });
                }
                return { success: true, output: result.result };
            } else {
                throw new Error(result.error || 'Failed to reset repository');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to reset repository', {
                repoPath,
                mode,
                commit,
                error: error.message
            });
            throw new Error(`Failed to reset repository: ${error.message}`);
        }
    }

    /**
     * Merge branch using GIT_MERGE_BRANCH step
     * @param {string} repoPath - Repository path
     * @param {string} branchName - Branch to merge
     * @param {Object} options - Merge options
     * @param {string} userId - User ID for step validation
     * @param {string} projectId - Project ID for step validation
     * @returns {Promise<Object>} Merge result
     */
    async mergeBranch(repoPath, branchName, options = {}, userId, projectId) {
        const { strategy = 'recursive', noFF = false } = options;

        try {
            this.logger.info('GitService: Merging branch using step', { repoPath, branchName, strategy, noFF });
            
            if (!this.stepRegistry) {
                throw new Error('StepRegistry not available for Git operations');
            }

            const stepContext = {
                projectPath: repoPath,
                branchName,
                userId: userId,
                projectId: projectId,
                strategy,
                noFF
            };

            const result = await this.stepRegistry.executeStep('GitMergeBranchStep', stepContext);
            
            if (result.success) {
                if (this.eventBus) {
                    this.eventBus.publish('git.branch.merge', {
                        repoPath,
                        branchName,
                        strategy,
                        noFF,
                        timestamp: new Date()
                    });
                }
                return { success: true, output: result.result };
            } else {
                throw new Error(result.error || 'Failed to merge branch');
            }
        } catch (error) {
            this.logger.error('GitService: Failed to merge branch', {
                repoPath,
                branchName,
                error: error.message
            });
            throw new Error(`Failed to merge branch: ${error.message}`);
        }
    }

    /**
     * Get repository info
     * @param {string} repoPath - Repository path
     * @returns {Promise<Object>} Repository information
     */
    async getRepositoryInfo(repoPath) {
        try {
            const isRepo = await this.isGitRepository(repoPath);
            if (!isRepo) {
                return { isGitRepository: false };
            }

            const currentBranch = await this.getCurrentBranch(repoPath);
            const lastCommit = await this.getLastCommit(repoPath);
            const remoteUrl = await this.getRemoteUrl(repoPath);
            const status = await this.getStatus(repoPath);

            return {
                isGitRepository: true,
                currentBranch,
                lastCommit,
                remoteUrl,
                status,
                repoPath
            };
        } catch (error) {
            this.logger.error('GitService: Failed to get repository info', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get repository info: ${error.message}`);
        }
    }
}

module.exports = GitService; 