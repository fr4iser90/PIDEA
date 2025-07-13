/**
 * GitService - Git operations with proper error handling
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('@infrastructure/logging/Logger');

class GitService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
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
     * Initialize Git repository
     * @param {string} repoPath - Repository path
     * @param {Object} options - Init options
     * @returns {Promise<Object>} Init result
     */
    async initRepository(repoPath, options = {}) {
        const { bare = false, initialBranch = 'main' } = options;

        try {
            this.logger.info('GitService: Initializing repository', { repoPath });
            
            const args = ['init'];
            if (bare) args.push('--bare');
            if (initialBranch) args.push('-b', initialBranch);

            const result = execSync(`git ${args.join(' ')}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.repository.init', {
                    repoPath,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
        } catch (error) {
            this.logger.error('GitService: Failed to initialize repository', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to initialize Git repository: ${error.message}`);
        }
    }

    /**
     * Clone repository
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
            this.logger.info('GitService: Cloning repository', { url, targetPath });
            
            const args = ['clone', url, targetPath];
            if (branch) args.push('-b', branch);
            if (depth) args.push('--depth', depth.toString());
            if (singleBranch) args.push('--single-branch');
            if (recursive) args.push('--recursive');

            const result = execSync(`git ${args.join(' ')}`, {
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.repository.clone', {
                    url,
                    targetPath,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Get current branch
     * @param {string} repoPath - Repository path
     * @returns {Promise<string>} Current branch name
     */
    async getCurrentBranch(repoPath) {
        try {
            const result = execSync('git branch --show-current', {
                cwd: repoPath,
                encoding: 'utf8'
            });
            const branch = result.trim();
            this.logger.info(`[GitService] Aktueller Branch für ${repoPath}: "${branch}"`);
            return branch;
        } catch (error) {
            this.logger.error('GitService: Failed to get current branch', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get current branch: ${error.message}`);
        }
    }

    /**
     * Get all real origin branches (as on GitHub, no HEAD, no duplicates, no remotes/)
     * @param {string} repoPath - Repository path
     * @returns {Promise<Array>} Branch list
     */
    async getBranches(repoPath, options = {}) {
        try {
            const command = 'git branch -r';
            const result = execSync(command, {
                cwd: repoPath,
                encoding: 'utf8'
            });
            return result
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('origin/')) // nur origin-Branches
                .filter(line => !line.includes('HEAD ->')) // kein HEAD
                .map(line => line.replace(/^origin\//, ''))
                .filter(branch => branch && branch.length > 0)
                .filter((branch, idx, arr) => arr.indexOf(branch) === idx); // unique
        } catch (error) {
            this.logger.error('GitService: Failed to get branches', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get branches: ${error.message}`);
        }
    }

    /**
     * Create new branch
     * @param {string} repoPath - Repository path
     * @param {string} branchName - Branch name
     * @param {Object} options - Branch options
     * @returns {Promise<Object>} Branch creation result
     */
    async createBranch(repoPath, branchName, options = {}) {
        const { checkout = true, startPoint = null } = options;

        try {
            this.logger.info('GitService: Creating branch', { repoPath, branchName });
            
            const args = ['checkout', '-b', branchName];
            if (startPoint) args.push(startPoint);

            const result = execSync(`git ${args.join(' ')}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.branch.create', {
                    repoPath,
                    branchName,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Checkout branch
     * @param {string} repoPath - Repository path
     * @param {string} branchName - Branch name
     * @returns {Promise<Object>} Checkout result
     */
    async checkoutBranch(repoPath, branchName) {
        try {
            this.logger.info('GitService: Checking out branch', { repoPath, branchName });
            
            const result = execSync(`git checkout ${branchName}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.branch.checkout', {
                    repoPath,
                    branchName,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Get commit history
     * @param {string} repoPath - Repository path
     * @param {Object} options - History options
     * @returns {Promise<Array>} Commit history
     */
    async getCommitHistory(repoPath, options = {}) {
        const { 
            limit = 10, 
            since = null, 
            until = null, 
            author = null,
            format = 'pretty=format:"%H|%an|%ae|%ad|%s"' 
        } = options;

        try {
            let command = `git log --${format}`;
            if (limit) command += ` -${limit}`;
            if (since) command += ` --since="${since}"`;
            if (until) command += ` --until="${until}"`;
            if (author) command += ` --author="${author}"`;

            const result = execSync(command, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            return result
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [hash, author, email, date, message] = line.split('|');
                    return { hash, author, email, date, message };
                });
        } catch (error) {
            this.logger.error('GitService: Failed to get commit history', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get commit history: ${error.message}`);
        }
    }

    /**
     * Get last commit
     * @param {string} repoPath - Repository path
     * @returns {Promise<Object>} Last commit info
     */
    async getLastCommit(repoPath) {
        try {
            const hash = execSync('git rev-parse HEAD', {
                cwd: repoPath,
                encoding: 'utf8'
            }).trim();
            
            const message = execSync('git log -1 --pretty=format:%s', {
                cwd: repoPath,
                encoding: 'utf8'
            }).trim();
            
            const author = execSync('git log -1 --pretty=format:%an', {
                cwd: repoPath,
                encoding: 'utf8'
            }).trim();
            
            const date = execSync('git log -1 --pretty=format:%cd', {
                cwd: repoPath,
                encoding: 'utf8'
            }).trim();

            return { hash, message, author, date };
        } catch (error) {
            this.logger.error('GitService: Failed to get last commit', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get last commit: ${error.message}`);
        }
    }

    /**
     * Add files to staging
     * @param {string} repoPath - Repository path
     * @param {Array<string>} files - Files to add
     * @returns {Promise<Object>} Add result
     */
    async addFiles(repoPath, files = []) {
        try {
            this.logger.info('GitService: Adding files', { repoPath, files });
            
            const args = ['add'];
            if (files.length === 0) {
                args.push('.');
            } else {
                args.push(...files);
            }

            const result = execSync(`git ${args.join(' ')}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.files.add', {
                    repoPath,
                    files,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Commit changes
     * @param {string} repoPath - Repository path
     * @param {string} message - Commit message
     * @param {Object} options - Commit options
     * @returns {Promise<Object>} Commit result
     */
    async commitChanges(repoPath, message, options = {}) {
        const { author = null, allowEmpty = false } = options;

        try {
            this.logger.info('GitService: Committing changes', { repoPath, message });
            
            const args = ['commit', '-m', message];
            if (author) args.push('--author', author);
            if (allowEmpty) args.push('--allow-empty');

            const result = execSync(`git ${args.join(' ')}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.commit', {
                    repoPath,
                    message,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Push changes
     * @param {string} repoPath - Repository path
     * @param {Object} options - Push options
     * @returns {Promise<Object>} Push result
     */
    async pushChanges(repoPath, options = {}) {
        const { 
            remote = 'origin', 
            branch = null, 
            setUpstream = false,
            force = false 
        } = options;

        try {
            this.logger.info('GitService: Pushing changes', { repoPath, remote });
            
            const args = ['push'];
            if (force) args.push('--force');
            if (setUpstream) args.push('--set-upstream');
            args.push(remote);
            if (branch) args.push(branch);

            const result = execSync(`git ${args.join(' ')}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.push', {
                    repoPath,
                    remote,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Pull changes
     * @param {string} repoPath - Repository path
     * @param {Object} options - Pull options
     * @returns {Promise<Object>} Pull result
     */
    async pullChanges(repoPath, options = {}) {
        const { remote = 'origin', branch = null, rebase = false } = options;

        try {
            this.logger.info('GitService: Pulling changes', { repoPath, remote });
            
            const args = ['pull'];
            if (rebase) args.push('--rebase');
            args.push(remote);
            if (branch) args.push(branch);

            const result = execSync(`git ${args.join(' ')}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.pull', {
                    repoPath,
                    remote,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Get status
     * @param {string} repoPath - Repository path
     * @returns {Promise<Object>} Repository status
     */
    async getStatus(repoPath) {
        try {
            const result = execSync('git status --porcelain', {
                cwd: repoPath,
                encoding: 'utf8'
            });

            const lines = result.split('\n').filter(line => line.trim());
            const status = {
                modified: [],
                added: [],
                deleted: [],
                untracked: [],
                staged: [],
                unstaged: []
            };

            for (const line of lines) {
                const code = line.substring(0, 2);
                const file = line.substring(3);

                if (code === 'M ') status.modified.push(file);
                else if (code === 'A ') status.added.push(file);
                else if (code === 'D ') status.deleted.push(file);
                else if (code === '??') status.untracked.push(file);
                else if (code === 'M ') status.staged.push(file);
                else if (code === ' M') status.unstaged.push(file);
            }

            return status;
        } catch (error) {
            this.logger.error('GitService: Failed to get status', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get status: ${error.message}`);
        }
    }

    /**
     * Get remote URL
     * @param {string} repoPath - Repository path
     * @param {string} remote - Remote name
     * @returns {Promise<string>} Remote URL
     */
    async getRemoteUrl(repoPath, remote = 'origin') {
        try {
            const result = execSync(`git remote get-url ${remote}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });
            return result.trim();
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
     * Add remote
     * @param {string} repoPath - Repository path
     * @param {string} name - Remote name
     * @param {string} url - Remote URL
     * @returns {Promise<Object>} Add remote result
     */
    async addRemote(repoPath, name, url) {
        try {
            this.logger.info('GitService: Adding remote', { repoPath, name, url });
            
            const result = execSync(`git remote add ${name} ${url}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.remote.add', {
                    repoPath,
                    name,
                    url,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Get diff
     * @param {string} repoPath - Repository path
     * @param {Object} options - Diff options
     * @returns {Promise<string>} Diff output
     */
    async getDiff(repoPath, options = {}) {
        const { 
            staged = false, 
            file = null, 
            commit1 = null, 
            commit2 = null 
        } = options;

        try {
            let command = 'git diff';
            if (staged) command += ' --staged';
            if (commit1 && commit2) command += ` ${commit1}..${commit2}`;
            else if (commit1) command += ` ${commit1}`;
            if (file) command += ` -- ${file}`;

            const result = execSync(command, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            return result;
        } catch (error) {
            this.logger.error('GitService: Failed to get diff', {
                repoPath,
                error: error.message
            });
            throw new Error(`Failed to get diff: ${error.message}`);
        }
    }

    /**
     * Reset repository
     * @param {string} repoPath - Repository path
     * @param {string} mode - Reset mode (soft, mixed, hard)
     * @param {string} commit - Commit to reset to
     * @returns {Promise<Object>} Reset result
     */
    async resetRepository(repoPath, mode = 'mixed', commit = 'HEAD') {
        try {
            this.logger.info('GitService: Resetting repository', { repoPath, mode, commit });
            
            const result = execSync(`git reset --${mode} ${commit}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.reset', {
                    repoPath,
                    mode,
                    commit,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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
     * Merge branch
     * @param {string} repoPath - Repository path
     * @param {string} branchName - Branch to merge
     * @param {Object} options - Merge options
     * @returns {Promise<Object>} Merge result
     */
    async mergeBranch(repoPath, branchName, options = {}) {
        const { strategy = 'recursive', noFF = false } = options;

        try {
            this.logger.info('GitService: Merging branch', { repoPath, branchName });
            
            const args = ['merge'];
            if (noFF) args.push('--no-ff');
            args.push(branchName);

            const result = execSync(`git ${args.join(' ')}`, {
                cwd: repoPath,
                encoding: 'utf8'
            });

            if (this.eventBus) {
                this.eventBus.publish('git.branch.merge', {
                    repoPath,
                    branchName,
                    timestamp: new Date()
                });
            }

            return { success: true, output: result };
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