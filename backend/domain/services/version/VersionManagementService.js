/**
 * VersionManagementService - Core version management service
 * Orchestrates version bumping, tracking, and management
 */

const Logger = require('@logging/Logger');
const SemanticVersioningService = require('./SemanticVersioningService');
const AIVersionAnalysisService = require('./AIVersionAnalysisService');
const HybridVersionDetector = require('./HybridVersionDetector');
const logger = new Logger('VersionManagementService');

class VersionManagementService {
  constructor(dependencies = {}) {
    this.semanticVersioning = dependencies.semanticVersioning || new SemanticVersioningService();
    this.versionRepository = dependencies.versionRepository;
    this.gitService = dependencies.gitService;
    this.fileSystemService = dependencies.fileSystemService;
    this.logger = logger; // Always use our own logger with correct name
    
    // AI integration services - MUST come from DI container!
    this.aiAnalysisService = dependencies.aiAnalysisService;
    this.hybridDetector = dependencies.hybridDetector;
    
    // Cache system for version data
    this.versionCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    
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
      // Check cache first
      const cacheKey = `version:${projectPath}`;
      const cached = this.versionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.logger.info(`📦 Using cached version for ${projectPath}: ${cached.data.version}`);
        return cached.data;
      }

      this.logger.info(`Looking for version in project path: ${projectPath}`);
      
      // Try different package file locations
      const packageFilePaths = [
        `${projectPath}/package.json`,           // Root package.json
        `${projectPath}/backend/package.json`,   // Backend package.json
        `${projectPath}/frontend/package.json`,  // Frontend package.json
        `${projectPath}/../package.json`,        // Parent directory package.json
        `${projectPath}/../../package.json`      // Grandparent directory package.json
      ];
      
      for (const filePath of packageFilePaths) {
        try {
          this.logger.debug(`Checking package file: ${filePath}`);
          
          // Check if fileSystemService is available
          if (!this.fileSystemService) {
            this.logger.error('❌ fileSystemService is not available!');
            continue;
          }
          
          if (!this.fileSystemService.readJsonFile) {
            this.logger.error('❌ fileSystemService.readJsonFile method is not available!');
            continue;
          }
          
          const packageJson = await this.fileSystemService.readJsonFile(filePath);
          
          if (packageJson && packageJson.version) {
            const normalizedVersion = this.semanticVersioning.normalizeVersion(packageJson.version);
            this.logger.info(`✅ Found current version: ${normalizedVersion} in ${filePath}`);
            
            try {
              // Return additional metadata
              const versionData = {
                version: normalizedVersion,
                packageFile: filePath,
                packageFiles: packageFilePaths.length, // Total number of package files checked
                packageJson: packageJson,
                isValid: this.semanticVersioning.isValidVersion(normalizedVersion),
                isStable: this.semanticVersioning.isStable(normalizedVersion),
                isPrerelease: this.semanticVersioning.isPrerelease(normalizedVersion),
                lastUpdated: new Date().toISOString(),
                gitTag: await this.getGitTag(projectPath, normalizedVersion) // Check for Git tag
              };

              this.logger.info(`📦 Version data created successfully, returning...`);

              // Cache the result
              this.versionCache.set(cacheKey, {
                data: versionData,
                timestamp: Date.now()
              });

              this.logger.info(`📦 Version data cached successfully, returning...`);

              return versionData;
            } catch (error) {
              this.logger.error(`❌ Error creating version data: ${error.message}`);
              this.logger.error(`❌ Error stack: ${error.stack}`);
              // Continue to next file if there's an error
            }
          }
        } catch (error) {
          this.logger.debug(`Package file not found or invalid: ${filePath} - ${error.message}`);
        }
      }
      
      this.logger.warn('⚠️ No valid version found in package files, using 0.0.0');
      const fallbackData = {
        version: '0.0.0',
        packageFile: null,
        packageJson: null,
        isValid: false,
        isStable: false,
        isPrerelease: false,
        lastUpdated: new Date().toISOString()
      };

      // Cache the fallback result too
      this.versionCache.set(cacheKey, {
        data: fallbackData,
        timestamp: Date.now()
      });

      return fallbackData;
      
    } catch (error) {
      this.logger.error('❌ Error getting current version', { error: error.message });
      return {
        version: '0.0.0',
        packageFile: null,
        packageJson: null,
        isValid: false
      };
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
    // Check if this is a dry run
    if (context.dryRun) {
      return this.performDryRun(task, projectPath, bumpType, context);
    }
    try {
      this.logger.info('Starting version bump', {
        taskId: task.id,
        projectPath,
        bumpType
      });

      // Get current version
      const currentVersionData = await this.getCurrentVersion(projectPath);
      const currentVersion = currentVersionData.version;
      
      // Determine bump type if not provided
      if (!bumpType) {
        bumpType = await this.determineBumpType(task, projectPath, context);
      }

      // Bump version
      const newVersion = this.semanticVersioning.bumpVersion(currentVersion.version, bumpType);
      
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
        currentVersion: currentVersion.version,
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
        currentVersion: currentVersion.version,
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
   * Determine bump type and calculate new version
   * @param {Object} task - Task object
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Object with recommendedType and newVersion
   */
  async determineBumpTypeAndVersion(task, projectPath, context = {}) {
    try {
      // Get current version first
      const currentVersion = await this.getCurrentVersion(projectPath);
      
      // Use direct AI analysis to avoid circular dependency
      if (context.useHybridDetection !== false) {
        const changelog = task.description || task.title || '';
        const hybridResult = await this.performDirectAIAnalysis(changelog, projectPath, context);
        
        this.logger.info('Hybrid detection result', {
          recommendedType: hybridResult.recommendedType,
          confidence: hybridResult.confidence,
          sources: hybridResult.sources
        });
        
        // Calculate new version based on current version and recommended type
        const newVersion = this.semanticVersioning.bumpVersion(currentVersion.version, hybridResult.recommendedType);
        
        const completeResult = {
          recommendedType: hybridResult.recommendedType,
          newVersion: newVersion,
          currentVersion: currentVersion,
          confidence: hybridResult.confidence,
          reasoning: hybridResult.reasoning,
          factors: hybridResult.factors,
          source: hybridResult.source || 'ai'
        };

        // Send event to frontend with complete result including newVersion
        try {
          const { getServiceContainer } = require('@infrastructure/dependency-injection/ServiceContainer');
          const container = getServiceContainer();
          const eventBus = container.resolve('eventBus');
          
          if (eventBus) {
            eventBus.publish('ai-version-analysis-completed', {
              projectPath,
              analysisResult: completeResult,
              timestamp: new Date()
            });
            this.logger.info('✅ Complete AI analysis event sent to frontend via WebSocket');
          }
        } catch (error) {
          this.logger.warn('Failed to send complete AI analysis event', { error: error.message });
        }

        return completeResult;
      }

      // Fallback to original rule-based detection
      const bumpType = await this.determineBumpTypeRuleBased(task, projectPath, context);
      const newVersion = this.semanticVersioning.bumpVersion(currentVersion, bumpType);
      
      return {
        recommendedType: bumpType,
        newVersion: newVersion,
        currentVersion: currentVersion,
        confidence: 0.5,
        reasoning: 'Rule-based detection',
        factors: ['Rule-based analysis'],
        source: 'rule-based'
      };

    } catch (error) {
      this.logger.warn('Error determining bump type, using patch', { error: error.message });
      const currentVersion = await this.getCurrentVersion(projectPath);
        const newVersion = this.semanticVersioning.bumpVersion(currentVersion.version, 'patch');
      
      return {
        recommendedType: 'patch',
        newVersion: newVersion,
        currentVersion: currentVersion,
        confidence: 0.3,
        reasoning: 'Fallback to patch due to error',
        factors: ['Error fallback'],
        source: 'fallback'
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
      const result = await this.determineBumpTypeAndVersion(task, projectPath, context);
      return result.recommendedType;
    } catch (error) {
      this.logger.warn('Error determining bump type, using patch', { error: error.message });
      return 'patch';
    }
  }

  /**
   * Determine bump type using rule-based approach (original method)
   * @param {Object} task - Task object
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<string>} Bump type
   */
  async determineBumpTypeRuleBased(task, projectPath, context = {}) {
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
      this.logger.warn('Error in rule-based bump type determination, using patch', { error: error.message });
      return 'patch';
    }
  }

  /**
   * Perform dry run version bump analysis
   * @param {Object} task - Task object
   * @param {string} projectPath - Project path
   * @param {string} bumpType - Bump type (major, minor, patch)
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Dry run result
   */
  async performDryRun(task, projectPath, bumpType, context = {}) {
    try {
      this.logger.info('Performing dry run version bump analysis', {
        taskId: task.id,
        projectPath,
        bumpType
      });

      // Get current version
      const currentVersionData = await this.getCurrentVersion(projectPath);
      const currentVersion = currentVersionData.version;
      
      // Determine bump type if not provided (with dry run context)
      if (!bumpType) {
        const dryRunContext = { ...context, dryRun: true };
        bumpType = await this.determineBumpType(task, projectPath, dryRunContext);
      }

      // Calculate new version without actually updating files
      const newVersion = this.semanticVersioning.bumpVersion(currentVersion.version, bumpType);
      
      // Analyze what would be changed (without actually changing)
      const wouldUpdateFiles = await this.analyzeFilesToUpdate(projectPath, newVersion);
      
      // Create version record preview
      const versionRecordPreview = {
        taskId: task.id,
        currentVersion,
        newVersion,
        bumpType,
        timestamp: new Date(),
        dryRun: true
      };

      const result = {
        success: true,
        dryRun: true,
        currentVersion: currentVersion.version,
        newVersion,
        bumpType,
        wouldUpdateFiles,
        versionRecordPreview,
        message: `Dry run: Would bump version from ${currentVersion.version} to ${newVersion} (${bumpType})`,
        timestamp: new Date()
      };

      this.logger.info('Dry run version bump analysis completed', {
        taskId: task.id,
        currentVersion: currentVersion.version,
        newVersion,
        bumpType
      });

      return result;

    } catch (error) {
      this.logger.error('Dry run version bump failed', {
        taskId: task.id,
        error: error.message
      });

      return {
        success: false,
        dryRun: true,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Analyze which files would be updated (without actually updating)
   * @param {string} projectPath - Project path
   * @param {string} newVersion - New version
   * @returns {Promise<Array>} Files that would be updated
   */
  async analyzeFilesToUpdate(projectPath, newVersion) {
    try {
      const filesToUpdate = [];
      
      for (const packageFile of this.config.packageFiles) {
        const filePath = path.join(projectPath, packageFile);
        try {
          await this.fileSystemService.access(filePath);
          filesToUpdate.push({
            path: packageFile,
            currentVersion: await this.getVersionFromFile(filePath),
            newVersion: newVersion,
            wouldUpdate: true
          });
        } catch (error) {
          // File doesn't exist, skip
        }
      }
      
      return filesToUpdate;
    } catch (error) {
      this.logger.warn('Failed to analyze files to update', { error: error.message });
      return [];
    }
  }

  /**
   * Get version from package file
   * @param {string} filePath - File path
   * @returns {Promise<string>} Current version
   */
  async getVersionFromFile(filePath) {
    try {
      const content = await this.fileSystemService.readFile(filePath, 'utf8');
      const packageData = JSON.parse(content);
      return packageData.version || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get AI-powered version analysis
   * @param {string} changelog - Task description
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} AI analysis result
   */
  async getAIAnalysis(changelog, projectPath, context = {}) {
    try {
      this.logger.info('Getting AI analysis for version bump', {
        changelog: changelog.substring(0, 100) + '...',
        projectPath
      });

      // Use the new method that calculates both bump type and new version
      const task = { description: changelog, title: changelog };
      const analysisResult = await this.determineBumpTypeAndVersion(task, projectPath, context);

      return {
        success: true,
        data: analysisResult,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('AI analysis failed', {
        error: error.message,
        changelog: changelog.substring(0, 100) + '...'
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Perform direct AI analysis without recursion
   * @param {string} changelog - Task description
   * @param {string} projectPath - Project path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} AI analysis result
   */
  async performDirectAIAnalysis(changelog, projectPath, context) {
    try {
      // Use AI analysis service directly to avoid recursion
      if (this.aiAnalysisService) {
        const aiResult = await this.aiAnalysisService.analyzeVersionBump(changelog, projectPath, context);
        // Get current version to calculate new version
        const currentVersionData = await this.getCurrentVersion(projectPath);
        const currentVersion = currentVersionData.version;
        const newVersion = this.semanticVersioning.bumpVersion(currentVersion, aiResult.recommendedType || 'patch');
        
        return {
          recommendedType: aiResult.recommendedType || 'patch',
          confidence: aiResult.confidence || 0.7,
          reasoning: aiResult.reasoning || 'AI analysis completed',
          factors: aiResult.factors || ['AI analysis completed'],
          newVersion: newVersion,
          currentVersion: currentVersion,
          autoDetected: true,
          sources: ['ai-analysis']
        };
      } else {
        // Fallback to rule-based analysis if AI service not available
        return this.getRuleBasedAnalysis(changelog);
      }
    } catch (error) {
      this.logger.warn('Direct AI analysis failed, using rule-based fallback', { error: error.message });
      return this.getRuleBasedAnalysis(changelog);
    }
  }

  /**
   * Get rule-based analysis as fallback
   * @param {string} changelog - Task description
   * @returns {Object} Rule-based analysis result
   */
  getRuleBasedAnalysis(changelog) {
    if (changelog && changelog.includes('fix') || changelog.includes('bug')) {
      return {
        recommendedType: 'patch',
        confidence: 0.8,
        reasoning: 'Bug fix detected in task description',
        autoDetected: true,
        sources: ['rule-based']
      };
    } else if (changelog && changelog.includes('feat') || changelog.includes('add')) {
      return {
        recommendedType: 'minor',
        confidence: 0.8,
        reasoning: 'New feature detected in task description',
        autoDetected: true,
        sources: ['rule-based']
      };
    } else if (changelog && changelog.includes('refactor')) {
      return {
        recommendedType: 'patch',
        confidence: 0.7,
        reasoning: 'Refactoring detected in task description',
        autoDetected: true,
        sources: ['rule-based']
      };
    } else {
      return {
        recommendedType: 'patch',
        confidence: 0.6,
        reasoning: 'Default patch recommendation for auto-detected changes',
        autoDetected: true,
        sources: ['rule-based']
      };
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
    const fs = require('fs');

    for (const packageFile of this.config.packageFiles) {
      const filePath = `${projectPath}/${packageFile}`;
      
      try {
        // Use direct fs methods instead of fileSystemService
        const content = fs.readFileSync(filePath, 'utf8');
        const packageJson = JSON.parse(content);
        
        if (packageJson && packageJson.version) {
          packageJson.version = newVersion;
          fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
          updatedFiles.push(filePath);
          this.logger.info(`✅ Updated version in ${packageFile} to ${newVersion}`);
        }
      } catch (error) {
        this.logger.error(`❌ Could not update ${packageFile}: ${error.message}`);
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
   * Get Git tag for version
   * @param {string} projectPath - Project path
   * @param {string} version - Version string
   * @returns {Promise<string|null>} Git tag or null if not found
   */
  async getGitTag(projectPath, version) {
    try {
      if (!this.gitService) {
        this.logger.debug('No git service available for tag checking');
        return null;
      }

      // Check for common tag formats
      const possibleTags = [
        `v${version}`,
        version,
        `release-${version}`,
        `version-${version}`
      ];

      for (const tag of possibleTags) {
        try {
          const result = await this.gitService.executeCommand(projectPath, `git tag -l "${tag}"`);
          if (result && result.trim() === tag) {
            this.logger.info(`✅ Found Git tag: ${tag}`);
            return tag;
          }
        } catch (error) {
          this.logger.debug(`Tag ${tag} not found: ${error.message}`);
        }
      }

      this.logger.debug(`No Git tag found for version ${version}`);
      return null;

    } catch (error) {
      this.logger.debug(`Error checking Git tags: ${error.message}`);
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
