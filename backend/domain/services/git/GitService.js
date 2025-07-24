const StepRegistry = require('@application/commands/StepRegistry');
const Logger = require('@logging/Logger');
const logger = new Logger('GitService');

class GitService {
  constructor(stepRegistry) {
    this.stepRegistry = stepRegistry;
    
    // Add Git operation caching
    this.gitCache = new Map();
    this.cacheTTL = 30 * 1000; // 30 seconds for Git operations
    this.cacheCleanupInterval = 60 * 1000; // 1 minute
    
    // Start cache cleanup
    setInterval(() => this.cleanupCache(), this.cacheCleanupInterval);
  }

  // Add cache management methods
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.gitCache.entries()) {
      if (now > value.expiresAt) {
        this.gitCache.delete(key);
      }
    }
  }

  getCachedGitOperation(operation, params) {
    const key = `${operation}_${JSON.stringify(params)}`;
    const cached = this.gitCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug(`Using cached Git operation: ${operation}`);
      return cached.result;
    }
    return null;
  }

  setCachedGitOperation(operation, params, result) {
    const key = `${operation}_${JSON.stringify(params)}`;
    this.gitCache.set(key, {
      result,
      expiresAt: Date.now() + this.cacheTTL
    });
  }

  async getStatus(repoPath, porcelain = true) {
    const params = { repoPath, porcelain };
    
    // Check cache first
    const cached = this.getCachedGitOperation('getStatus', params);
    if (cached) {
      return cached;
    }

    logger.info('Getting git status using step', { repoPath, porcelain });
    
    const result = await this.stepRegistry.execute('GitGetStatusStep', {
      projectPath: repoPath,
      porcelain: porcelain
    });

    // Cache the result
    this.setCachedGitOperation('getStatus', params, result);
    
    return result;
  }

  async getCurrentBranch(repoPath) {
    const params = { repoPath };
    
    // Check cache first
    const cached = this.getCachedGitOperation('getCurrentBranch', params);
    if (cached) {
      return cached;
    }

    logger.info('Getting current branch using step', { repoPath });
    
    const result = await this.stepRegistry.execute('GitGetCurrentBranchStep', {
      projectPath: repoPath
    });

    // Cache the result
    this.setCachedGitOperation('getCurrentBranch', params, result);
    
    return result;
  }

  async getBranches(repoPath, includeRemote = true, includeLocal = true) {
    const params = { repoPath, includeRemote, includeLocal };
    
    // Check cache first
    const cached = this.getCachedGitOperation('getBranches', params);
    if (cached) {
      return cached;
    }

    logger.info('Getting branches using step', { repoPath, includeRemote, includeLocal });
    
    const result = await this.stepRegistry.execute('GitGetBranchesStep', {
      projectPath: repoPath,
      includeRemote: includeRemote,
      includeLocal: includeLocal
    });

    // Cache the result
    this.setCachedGitOperation('getBranches', params, result);
    
    return result;
  }
} 