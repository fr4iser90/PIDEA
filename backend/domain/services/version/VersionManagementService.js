/**
 * VersionManagementService - Core version management service
 * Orchestrates version bumping, tracking, and management
 */

const Logger = require('@logging/Logger');
const SemanticVersioningService = require('./SemanticVersioningService');
const logger = new Logger('VersionManagementService');

class VersionManagementService {
  constructor(dependencies = {}) {
    this.semanticVersioning = dependencies.semanticVersioning || new SemanticVersioningService();
    this.versionRepository = dependencies.versionRepository;
    this.gitService = dependencies.gitService;
    this.fileSystemService = dependencies.fileSystemService;
    this.logger = dependencies.logger || logger;
    
    // Configuration
    this.config = {
      packageFiles: dependencies.packageFiles || [
        'package.json',
        'backend/package.json',
        'frontend/package.json'
      ],
      createGitTags: dependencies.createGitTags !== false,
      autoCommit: dependencies.autoCommit !== false,
      commitMessageTemplate: dependencies.commitMessageTemplate || 'chore: bump version to {version}',
      tagTemplate: dependencies.tagTemplate || 'v{version}',
      ...dependencies.config
    };
  }

  /**
   * Get current version from package files
   * @param {string} projectPath - Project path
   * @returns {Promise<string>} Current version
   */
  async getCurrentVersion(projectPath) {
    try {
      for (const packageFile of this.config.packageFiles) {
        const filePath = `${projectPath}/${packageFile}`;
        
        try {
          const packageJson = await this.fileSystemService.readJsonFile(filePath);
          if (packageJson && packageJson.version) {
            const normalizedVersion = this.semanticVersioning.normalizeVersion(packageJson.version);
            this.logger.info(`Found current version: ${normalizedVersion} in ${packageFile}`);
            return normalizedVersion;
          }
        } catch (error) {
          this.logger.debug(`Package file not found or invalid: ${filePath}`);
        }
      }
      
      this.logger.warn('No valid version found in package files, using 0.0.0');
      return '0.0.0';
      
    } catch (error) {
      this.logger.error('Error getting current version', { error: error.message });
      return '0.0.0';
    }
  }

  /**
   * Bump version for task
   * @param {Object} task - Task object
   * @param {string} projectPath - Project path
   * @param {string} bumpType - Bump type (major, minor, patch)
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Bump result
   */
  async bumpVersion(task, projectPath, bumpType, context = {}) {
    try {
      this.logger.info('Starting version bump', {
        taskId: task.id,
        projectPath,
        bumpType
      });

      // Get current version
      const currentVersion = await this.getCurrentVersion(projectPath);
      
      // Determine bump type if not provided
      if (!bumpType) {
        bumpType = await this.determineBumpType(task, projectPath, context);
      }

      // Bump version
      const newVersion = this.semanticVersioning.bumpVersion(currentVersion, bumpType);
      
      // Update package files
      const updatedFiles = await this.updatePackageFiles(projectPath, newVersion);
      
      // Create version record
      const versionRecord = await this.createVersionRecord(task, currentVersion, newVersion, bumpType, context);
      
      // Commit changes if enabled
      let commitResult = null;
      if (this.config.autoCommit) {
        commitResult = await this.commitVersionChanges(projectPath, newVersion, task);
      }
      
      // Create git tag if enabled
      let tagResult = null;
      if (this.config.createGitTags) {
        tagResult = await this.createGitTag(projectPath, newVersion, task);
      }

      const result = {
        success: true,
        currentVersion,
        newVersion,
        bumpType,
        updatedFiles,
        versionRecord,
        commitResult,
        tagResult,
        timestamp: new Date()
      };

      this.logger.info('Version bump completed successfully', {
        taskId: task.id,
        currentVersion,
        newVersion,
        bumpType
      });

      return result;

    } catch (error) {
      this.logger.error('Version bump failed', {
        taskId: task.id,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Determine bump type based on task and changes
   * @param {Object} task - Task object
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<string>} Bump type
   */
  async determineBumpType(task, projectPath, context = {}) {
    try {
      // Analyze task type and priority
      const taskType = task.type?.value || task.type;
      const priority = task.priority?.value || task.priority;
      
      // Check for breaking changes in task description
      const hasBreakingChanges = this.detectBreakingChanges(task);
      
      if (hasBreakingChanges) {
        return 'major';
      }

      // Analyze git changes if available
      if (this.gitService && context.analyzeGitChanges !== false) {
        const changes = await this.analyzeGitChanges(projectPath, context);
        return this.semanticVersioning.determineBumpType(changes);
      }

      // Fallback to task type mapping
      const bumpTypeMapping = {
        'feature': 'minor',
        'bug': 'patch',
        'hotfix': 'patch',
        'refactor': 'minor',
        'optimization': 'minor',
        'analysis': 'patch',
        'documentation': 'patch',
        'test': 'patch',
        'chore': 'patch'
      };

      return bumpTypeMapping[taskType] || 'patch';

    } catch (error) {
      this.logger.warn('Error determining bump type, using patch', { error: error.message });
      return 'patch';
    }
  }

  /**
   * Detect breaking changes in task
   * @param {Object} task - Task object
   * @returns {boolean} True if breaking changes detected
   */
  detectBreakingChanges(task) {
    const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    
    const breakingChangeKeywords = [
      'breaking change',
      'breaking',
      'incompatible',
      'deprecate',
      'remove',
      'delete',
      'major change',
      'api change',
      'interface change'
    ];

    return breakingChangeKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Analyze git changes for impact
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Change analysis
   */
  async analyzeGitChanges(projectPath, context = {}) {
    try {
      if (!this.gitService) {
        return { bugFixes: 1 }; // Default to patch if no git service
      }

      const sinceCommit = context.sinceCommit || 'HEAD~1';
      const diff = await this.gitService.getDiff(projectPath, sinceCommit);
      
      const changes = {
        breakingChanges: 0,
        newFeatures: 0,
        bugFixes: 0,
        documentation: 0,
        refactoring: 0,
        performance: 0
      };

      // Analyze diff content
      if (diff && diff.files) {
        for (const file of diff.files) {
          const fileName = file.filename.toLowerCase();
          const additions = file.additions || 0;
          const deletions = file.deletions || 0;
          
          // Categorize changes based on file patterns
          if (fileName.includes('test') || fileName.includes('spec')) {
            changes.bugFixes += additions;
          } else if (fileName.includes('readme') || fileName.includes('doc')) {
            changes.documentation += additions;
          } else if (fileName.includes('package.json') || fileName.includes('config')) {
            changes.refactoring += 1;
          } else if (additions > 50 || deletions > 50) {
            changes.refactoring += 1;
          } else {
            changes.bugFixes += additions;
          }
        }
      }

      return changes;

    } catch (error) {
      this.logger.warn('Error analyzing git changes', { error: error.message });
      return { bugFixes: 1 };
    }
  }

  /**
   * Update package files with new version
   * @param {string} projectPath - Project path
   * @param {string} newVersion - New version
   * @returns {Promise<string[]>} Updated file paths
   */
  async updatePackageFiles(projectPath, newVersion) {
    const updatedFiles = [];

    for (const packageFile of this.config.packageFiles) {
      const filePath = `${projectPath}/${packageFile}`;
      
      try {
        const packageJson = await this.fileSystemService.readJsonFile(filePath);
        if (packageJson) {
          packageJson.version = newVersion;
          await this.fileSystemService.writeJsonFile(filePath, packageJson);
          updatedFiles.push(filePath);
          this.logger.info(`Updated version in ${packageFile} to ${newVersion}`);
        }
      } catch (error) {
        this.logger.debug(`Could not update ${packageFile}: ${error.message}`);
      }
    }

    return updatedFiles;
  }

  /**
   * Create version record in database
   * @param {Object} task - Task object
   * @param {string} currentVersion - Current version
   * @param {string} newVersion - New version
   * @param {string} bumpType - Bump type
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Version record
   */
  async createVersionRecord(task, currentVersion, newVersion, bumpType, context = {}) {
    if (!this.versionRepository) {
      this.logger.warn('No version repository available, skipping version record creation');
      return null;
    }

    try {
      const versionRecord = {
        id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        version: newVersion,
        previous_version: currentVersion,
        bump_type: bumpType,
        task_id: task.id,
        created_at: new Date().toISOString(),
        metadata: {
          taskType: task.type?.value || task.type,
          priority: task.priority?.value || task.priority,
          category: task.category,
          ...context
        },
        created_by: context.userId || 'system',
        git_commit_hash: context.commitHash,
        package_files: JSON.stringify(this.config.packageFiles)
      };

      const savedRecord = await this.versionRepository.create(versionRecord);
      this.logger.info('Created version record', { versionRecord: savedRecord.id });
      
      return savedRecord;

    } catch (error) {
      this.logger.error('Error creating version record', { error: error.message });
      return null;
    }
  }

  /**
   * Commit version changes
   * @param {string} projectPath - Project path
   * @param {string} newVersion - New version
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Commit result
   */
  async commitVersionChanges(projectPath, newVersion, task) {
    if (!this.gitService) {
      this.logger.warn('No git service available, skipping commit');
      return null;
    }

    try {
      const commitMessage = this.config.commitMessageTemplate.replace('{version}', newVersion);
      
      const commitResult = await this.gitService.commit(projectPath, {
        message: commitMessage,
        files: this.config.packageFiles,
        author: {
          name: 'PIDEA Version Management',
          email: 'version@pidea.dev'
        }
      });

      this.logger.info('Committed version changes', { 
        version: newVersion,
        commitHash: commitResult.hash 
      });

      return commitResult;

    } catch (error) {
      this.logger.error('Error committing version changes', { error: error.message });
      return null;
    }
  }

  /**
   * Create git tag for version
   * @param {string} projectPath - Project path
   * @param {string} newVersion - New version
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Tag result
   */
  async createGitTag(projectPath, newVersion, task) {
    if (!this.gitService) {
      this.logger.warn('No git service available, skipping tag creation');
      return null;
    }

    try {
      const tagName = this.config.tagTemplate.replace('{version}', newVersion);
      
      const tagResult = await this.gitService.createTag(projectPath, {
        name: tagName,
        message: `Version ${newVersion}

Task ID: ${task.id}
Type: ${task.type?.value || task.type}
Priority: ${task.priority?.value || task.priority}

${task.description || 'No description provided'}`,
        annotated: true
      });

      this.logger.info('Created git tag', { 
        version: newVersion,
        tagName: tagName 
      });

      return tagResult;

    } catch (error) {
      this.logger.error('Error creating git tag', { error: error.message });
      return null;
    }
  }

  /**
   * Get version history
   * @param {Object} filters - Filter options
   * @returns {Promise<Object[]>} Version history
   */
  async getVersionHistory(filters = {}) {
    if (!this.versionRepository) {
      this.logger.warn('No version repository available');
      return [];
    }

    try {
      return await this.versionRepository.find(filters);
    } catch (error) {
      this.logger.error('Error getting version history', { error: error.message });
      return [];
    }
  }

  /**
   * Get latest version
   * @returns {Promise<string>} Latest version
   */
  async getLatestVersion() {
    try {
      const history = await this.getVersionHistory({ limit: 1, orderBy: 'created_at DESC' });
      return history.length > 0 ? history[0].version : '0.0.0';
    } catch (error) {
      this.logger.error('Error getting latest version', { error: error.message });
      return '0.0.0';
    }
  }

  /**
   * Validate version format
   * @param {string} version - Version to validate
   * @returns {boolean} True if valid
   */
  validateVersion(version) {
    return this.semanticVersioning.isValidVersion(version);
  }

  /**
   * Compare versions
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {number} Comparison result
   */
  compareVersions(version1, version2) {
    return this.semanticVersioning.compareVersions(version1, version2);
  }

  /**
   * Get service configuration
   * @returns {Object} Configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Update service configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Updated version management configuration', { config: this.config });
  }
}

module.exports = VersionManagementService;
