const Logger = require('@logging/Logger');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const logger = new Logger('CDPGitDetector');

/**
 * CDP-Based Git Detector
 * 
 * Extracts Git repository information using Chrome DevTools Protocol (CDP)
 * instead of terminal-based commands. Provides faster and more reliable Git detection.
 * 
 * @class CDPGitDetector
 */
class CDPGitDetector {
  constructor(cdpConnectionManager, options = {}) {
    this.cdpManager = cdpConnectionManager;
    this.options = {
      cacheTimeout: options.cacheTimeout || 300000, // 5 minutes
      commandTimeout: options.commandTimeout || 5000, // 5 seconds for Git commands
      enableCDPExtraction: options.enableCDPExtraction !== false, // Default true
      enableLocalExtraction: options.enableLocalExtraction !== false, // Default true
      ...options
    };

    // Git detection state
    this.gitCache = new Map(); // workspacePath -> {gitInfo, timestamp, ttl}
    this.extractionHistory = new Map(); // workspacePath -> extraction history
    this.isInitialized = false;

    logger.info('CDPGitDetector initialized', {
      cacheTimeout: this.options.cacheTimeout,
      commandTimeout: this.options.commandTimeout,
      enableCDPExtraction: this.options.enableCDPExtraction,
      enableLocalExtraction: this.options.enableLocalExtraction
    });
  }

  /**
   * Initialize the Git detector
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      logger.debug('CDPGitDetector already initialized');
      return;
    }

    try {
      logger.info('Initializing CDPGitDetector...');
      
      // Initialize CDP connection manager
      await this.cdpManager.initialize();
      
      this.isInitialized = true;
      logger.info('CDPGitDetector initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize CDPGitDetector:', error.message);
      throw error;
    }
  }

  /**
   * Extract Git information from IDE via CDP
   * @param {Object} connection - CDP connection object
   * @returns {Promise<Object|null>} Git information or null
   */
  async extractGitInfoFromCDP(connection) {
    try {
      const { page } = connection;
      
      logger.debug('Extracting Git information from IDE via CDP');
      
      const gitInfo = await page.evaluate(() => {
        const info = {
          isGitRepo: false,
          gitRoot: null,
          currentBranch: null,
          remotes: {},
          status: null,
          lastCommit: null,
          extractionMethod: 'cdp'
        };

        // Method 1: Try VS Code Git extension API
        if (window.vscode && window.vscode.extensions) {
          try {
            const gitExtension = window.vscode.extensions.getExtension('vscode.git');
            if (gitExtension && gitExtension.exports) {
              const git = gitExtension.exports.getAPI(1);
              if (git && git.repositories && git.repositories.length > 0) {
                const repo = git.repositories[0];
                
                info.isGitRepo = true;
                info.gitRoot = repo.rootUri?.fsPath;
                
                if (repo.state) {
                  info.currentBranch = repo.state.head?.name;
                  
                  if (repo.state.remotes) {
                    info.remotes = {};
                    for (const remote of repo.state.remotes) {
                      info.remotes[remote.name] = remote.fetchUrl;
                    }
                  }
                  
                  // Get status information
                  if (repo.state.workingTreeChanges) {
                    info.status = {
                      modified: repo.state.workingTreeChanges.length,
                      staged: repo.state.indexChanges?.length || 0
                    };
                  }
                }
                
                logger.debug('Git info extracted via VS Code API');
                return info;
              }
            }
          } catch (vscodeError) {
            logger.debug('VS Code Git API not available:', vscodeError.message);
          }
        }

        // Method 2: Look for Git-related DOM elements
        const gitElements = document.querySelectorAll('[data-git], .git-status, .scm-viewlet, .git-branch');
        for (const element of gitElements) {
          const gitData = element.getAttribute('data-git') || 
                         element.getAttribute('title') || 
                         element.textContent;
          
          if (gitData && gitData.includes('git')) {
            info.isGitRepo = true;
            info.extractionMethod = 'dom_element';
            
            // Try to extract branch name
            const branchMatch = gitData.match(/branch[:\s]+([^\s]+)/i);
            if (branchMatch) {
              info.currentBranch = branchMatch[1];
            }
            
            logger.debug('Git info extracted via DOM elements');
            return info;
          }
        }

        // Method 3: Check Git status bar
        const gitStatusBar = document.querySelector('.statusbar-item[title*="git"], .git-status, [data-testid*="git"]');
        if (gitStatusBar) {
          const title = gitStatusBar.getAttribute('title') || gitStatusBar.textContent;
          if (title && title.toLowerCase().includes('git')) {
            info.isGitRepo = true;
            info.extractionMethod = 'status_bar';
            
            // Try to extract branch from status bar
            const branchMatch = title.match(/(?:branch|on)\s+([^\s]+)/i);
            if (branchMatch) {
              info.currentBranch = branchMatch[1];
            }
            
            logger.debug('Git info extracted via status bar');
            return info;
          }
        }

        return info;
      });

      logger.debug('CDP Git extraction completed:', {
        isGitRepo: gitInfo.isGitRepo,
        currentBranch: gitInfo.currentBranch,
        extractionMethod: gitInfo.extractionMethod
      });

      return gitInfo;

    } catch (error) {
      logger.error('Failed to extract Git info from CDP:', error.message);
      return null;
    }
  }

  /**
   * Extract Git information using local Git commands
   * @param {string} workspacePath - The workspace path
   * @returns {Promise<Object|null>} Git information or null
   */
  async extractGitInfoLocally(workspacePath) {
    try {
      if (!workspacePath || !fs.existsSync(workspacePath)) {
        return null;
      }

      const gitPath = path.join(workspacePath, '.git');
      if (!fs.existsSync(gitPath)) {
        logger.debug(`No Git repository found at: ${workspacePath}`);
        return { isGitRepo: false, extractionMethod: 'local' };
      }

      logger.debug(`Extracting Git info locally for: ${workspacePath}`);

      const gitInfo = {
        isGitRepo: true,
        gitRoot: workspacePath,
        gitPath: gitPath,
        extractionMethod: 'local'
      };

      // Get Git configuration
      try {
        const config = execSync('git config --list', { 
          cwd: workspacePath, 
          encoding: 'utf8',
          timeout: this.options.commandTimeout
        });
        
        const configLines = config.split('\n').filter(line => line.trim());
        gitInfo.config = {};
        
        for (const line of configLines) {
          const [key, value] = line.split('=');
          if (key && value) {
            gitInfo.config[key] = value;
          }
        }
      } catch (configError) {
        gitInfo.configError = configError.message;
      }

      // Get current branch
      try {
        const branch = execSync('git branch --show-current', { 
          cwd: workspacePath, 
          encoding: 'utf8',
          timeout: this.options.commandTimeout
        }).trim();
        gitInfo.currentBranch = branch;
      } catch (branchError) {
        gitInfo.branchError = branchError.message;
      }

      // Get remote information
      try {
        const remotes = execSync('git remote -v', { 
          cwd: workspacePath, 
          encoding: 'utf8',
          timeout: this.options.commandTimeout
        });
        
        const remoteLines = remotes.split('\n').filter(line => line.trim());
        gitInfo.remotes = {};
        
        for (const line of remoteLines) {
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const name = parts[0];
            const url = parts[1].split(' ')[0];
            gitInfo.remotes[name] = url;
          }
        }
      } catch (remoteError) {
        gitInfo.remoteError = remoteError.message;
      }

      // Get status
      try {
        const status = execSync('git status --porcelain', { 
          cwd: workspacePath, 
          encoding: 'utf8',
          timeout: this.options.commandTimeout
        });
        
        const statusLines = status.split('\n').filter(line => line.trim());
        gitInfo.status = {
          modified: statusLines.filter(line => line.startsWith('M')).length,
          added: statusLines.filter(line => line.startsWith('A')).length,
          deleted: statusLines.filter(line => line.startsWith('D')).length,
          untracked: statusLines.filter(line => line.startsWith('??')).length
        };
      } catch (statusError) {
        gitInfo.statusError = statusError.message;
      }

      // Get last commit
      try {
        const lastCommit = execSync('git log -1 --oneline', { 
          cwd: workspacePath, 
          encoding: 'utf8',
          timeout: this.options.commandTimeout
        }).trim();
        gitInfo.lastCommit = lastCommit;
      } catch (commitError) {
        gitInfo.commitError = commitError.message;
      }

      logger.debug(`Local Git extraction completed for: ${workspacePath}`);
      return gitInfo;

    } catch (error) {
      logger.error(`Error extracting Git info locally for ${workspacePath}:`, error.message);
      return { isGitRepo: false, error: error.message, extractionMethod: 'local' };
    }
  }

  /**
   * Get comprehensive Git information for a workspace
   * @param {string} workspacePath - The workspace path
   * @param {number} port - The IDE port (optional, for CDP extraction)
   * @returns {Promise<Object|null>} Comprehensive Git information
   */
  async getGitInformation(workspacePath, port = null) {
    const startTime = Date.now();
    
    try {
      logger.info(`Getting Git information for: ${workspacePath}`);
      
      // Check cache first
      const cachedResult = this.getCachedGitInfo(workspacePath);
      if (cachedResult) {
        logger.info(`Using cached Git information for: ${workspacePath}`);
        return cachedResult;
      }

      let gitInfo = null;

      // Try CDP extraction first if port is provided
      if (port && this.options.enableCDPExtraction) {
        try {
          const cdpResult = await this.cdpManager.executeWorkspaceDetection(
            port,
            async (connection) => {
              return await this.extractGitInfoFromCDP(connection);
            }
          );

          if (cdpResult && cdpResult.isGitRepo) {
            gitInfo = cdpResult;
            logger.debug(`Git info extracted via CDP for port ${port}`);
          }
        } catch (cdpError) {
          logger.debug(`CDP Git extraction failed for port ${port}:`, cdpError.message);
        }
      }

      // Fallback to local extraction if CDP failed or not available
      if (!gitInfo || !gitInfo.isGitRepo) {
        if (this.options.enableLocalExtraction) {
          gitInfo = await this.extractGitInfoLocally(workspacePath);
          logger.debug(`Git info extracted locally for: ${workspacePath}`);
        }
      }

      if (!gitInfo) {
        logger.warn(`No Git information found for: ${workspacePath}`);
        return null;
      }

      // Add metadata
      gitInfo.workspacePath = workspacePath;
      gitInfo.extractionTime = Date.now();
      gitInfo.extractionDuration = Date.now() - startTime;
      gitInfo.port = port;

      // Cache the result
      this.cacheGitInfo(workspacePath, gitInfo, this.options.cacheTimeout);

      // Record extraction history
      this.recordExtractionHistory(workspacePath, gitInfo);

      logger.info(`Git information retrieved for: ${workspacePath}:`, {
        isGitRepo: gitInfo.isGitRepo,
        currentBranch: gitInfo.currentBranch,
        extractionMethod: gitInfo.extractionMethod,
        extractionDuration: gitInfo.extractionDuration
      });

      return gitInfo;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to get Git information for ${workspacePath} after ${duration}ms:`, error.message);
      
      // Record failed extraction
      this.recordExtractionHistory(workspacePath, { error: error.message, extractionTime: Date.now() });
      
      return null;
    }
  }

  /**
   * Cache Git information
   * @param {string} workspacePath - The workspace path
   * @param {Object} gitInfo - Git information to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  cacheGitInfo(workspacePath, gitInfo, ttl = 300000) {
    const cacheEntry = {
      gitInfo,
      timestamp: Date.now(),
      ttl
    };

    this.gitCache.set(workspacePath, cacheEntry);
    logger.debug(`Cached Git information for: ${workspacePath} with TTL ${ttl}ms`);
  }

  /**
   * Get cached Git information
   * @param {string} workspacePath - The workspace path
   * @returns {Object|null} Cached Git information or null
   */
  getCachedGitInfo(workspacePath) {
    const cacheEntry = this.gitCache.get(workspacePath);

    if (!cacheEntry) {
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - cacheEntry.timestamp > cacheEntry.ttl) {
      this.gitCache.delete(workspacePath);
      return null;
    }

    logger.debug(`Using cached Git information for: ${workspacePath}`);
    return cacheEntry.gitInfo;
  }

  /**
   * Clear Git cache for a specific workspace
   * @param {string} workspacePath - The workspace path
   */
  clearGitCache(workspacePath) {
    this.gitCache.delete(workspacePath);
    logger.debug(`Cleared Git cache for: ${workspacePath}`);
  }

  /**
   * Clear all Git cache
   */
  clearAllGitCache() {
    this.gitCache.clear();
    logger.debug('Cleared all Git cache');
  }

  /**
   * Record extraction history for a workspace
   * @param {string} workspacePath - The workspace path
   * @param {Object} result - Extraction result
   */
  recordExtractionHistory(workspacePath, result) {
    if (!this.extractionHistory.has(workspacePath)) {
      this.extractionHistory.set(workspacePath, []);
    }

    const history = this.extractionHistory.get(workspacePath);
    history.push({
      ...result,
      timestamp: Date.now()
    });

    // Keep only last 10 extractions
    if (history.length > 10) {
      history.shift();
    }

    logger.debug(`Recorded extraction history for: ${workspacePath}`);
  }

  /**
   * Get extraction history for a workspace
   * @param {string} workspacePath - The workspace path
   * @returns {Array} Extraction history
   */
  getExtractionHistory(workspacePath) {
    return this.extractionHistory.get(workspacePath) || [];
  }

  /**
   * Clear extraction history for a workspace
   * @param {string} workspacePath - The workspace path
   */
  clearExtractionHistory(workspacePath) {
    this.extractionHistory.delete(workspacePath);
    logger.debug(`Cleared extraction history for: ${workspacePath}`);
  }

  /**
   * Clear all extraction history
   */
  clearAllExtractionHistory() {
    this.extractionHistory.clear();
    logger.debug('Cleared all extraction history');
  }

  /**
   * Get detector statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    const totalExtractions = Array.from(this.extractionHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    const successfulExtractions = Array.from(this.extractionHistory.values())
      .reduce((sum, history) => sum + history.filter(h => !h.error).length, 0);

    return {
      totalExtractions,
      successfulExtractions,
      successRate: totalExtractions > 0 ? (successfulExtractions / totalExtractions) * 100 : 0,
      workspacesWithHistory: this.extractionHistory.size,
      cacheSize: this.gitCache.size,
      options: this.options,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Cleanup and destroy the detector
   * @returns {Promise<void>}
   */
  async destroy() {
    logger.info('Destroying CDPGitDetector...');
    
    try {
      // Clear all cache and history
      this.clearAllGitCache();
      this.clearAllExtractionHistory();
      
      this.isInitialized = false;
      
      logger.info('CDPGitDetector destroyed successfully');
      
    } catch (error) {
      logger.error('Error destroying CDPGitDetector:', error.message);
      throw error;
    }
  }
}

module.exports = CDPGitDetector;
