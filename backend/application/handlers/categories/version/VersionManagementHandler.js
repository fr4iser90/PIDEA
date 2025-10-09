/**
 * VersionManagementHandler - Application handler for version management operations
 * Handles version management commands using CQRS pattern
 */

const Logger = require('@logging/Logger');
const VersionManagementService = require('@domain/services/version/VersionManagementService');
const SemanticVersioningService = require('@domain/services/version/SemanticVersioningService');
const logger = new Logger('VersionManagementHandler');

class VersionManagementHandler {
  constructor(dependencies = {}) {
    // VersionManagementService MUST come from DI container - no direct instantiation!
    this.versionManagementService = dependencies.versionManagementService;
    
    this.semanticVersioning = dependencies.semanticVersioning || new SemanticVersioningService();
    this.logger = dependencies.logger || logger;
  }

  /**
   * Handle bump version command
   * @param {Object} command - Bump version command
   * @returns {Promise<Object>} Command result
   */
  async handleBumpVersion(command) {
    try {
      this.logger.info('Handling bump version command', {
        taskId: command.taskId,
        projectPath: command.projectPath,
        bumpType: command.bumpType
      });

      const result = await this.versionManagementService.bumpVersion(
        command.task,
        command.projectPath,
        command.bumpType,
        command.context
      );

      return {
        success: result.success,
        data: result.success ? {
          currentVersion: result.currentVersion,
          newVersion: result.newVersion,
          bumpType: result.bumpType,
          updatedFiles: result.updatedFiles,
          versionRecord: result.versionRecord
        } : null,
        error: result.error,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling bump version command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle get current version command
   * @param {Object} command - Get current version command
   * @returns {Promise<Object>} Command result
   */
  async handleGetCurrentVersion(command) {
    try {
      this.logger.info('Handling get current version command', {
        projectPath: command.projectPath
      });

      const versionData = await this.versionManagementService.getCurrentVersion(command.projectPath);

      return {
        success: true,
        data: {
          version: versionData.version,
          packageFile: versionData.packageFile,
          packageFiles: versionData.packageFiles,
          packageJson: versionData.packageJson,
          isValid: versionData.isValid,
          isStable: versionData.isStable,
          isPrerelease: versionData.isPrerelease,
          lastUpdated: versionData.lastUpdated,
          gitTag: versionData.gitTag
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling get current version command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle get version history command
   * @param {Object} command - Get version history command
   * @returns {Promise<Object>} Command result
   */
  async handleGetVersionHistory(command) {
    try {
      this.logger.info('Handling get version history command', {
        filters: command.filters
      });

      const history = await this.versionManagementService.getVersionHistory(command.filters);

      return {
        success: true,
        data: {
          history,
          totalCount: history.length,
          latestVersion: history.length > 0 ? history[0].version : null
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling get version history command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle validate version command
   * @param {Object} command - Validate version command
   * @returns {Promise<Object>} Command result
   */
  async handleValidateVersion(command) {
    try {
      this.logger.info('Handling validate version command', {
        version: command.version
      });

      const isValid = this.semanticVersioning.isValidVersion(command.version);
      const parsed = isValid ? this.semanticVersioning.parseVersion(command.version) : null;

      return {
        success: true,
        data: {
          version: command.version,
          isValid,
          parsed,
          isStable: isValid ? this.semanticVersioning.isStable(command.version) : false,
          isPrerelease: isValid ? this.semanticVersioning.isPrerelease(command.version) : false,
          coreVersion: isValid ? this.semanticVersioning.getCoreVersion(command.version) : null
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling validate version command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle compare versions command
   * @param {Object} command - Compare versions command
   * @returns {Promise<Object>} Command result
   */
  async handleCompareVersions(command) {
    try {
      this.logger.info('Handling compare versions command', {
        version1: command.version1,
        version2: command.version2
      });

      const comparison = this.semanticVersioning.compareVersions(command.version1, command.version2);
      
      let relationship;
      if (comparison < 0) {
        relationship = 'less than';
      } else if (comparison > 0) {
        relationship = 'greater than';
      } else {
        relationship = 'equal to';
      }

      return {
        success: true,
        data: {
          version1: command.version1,
          version2: command.version2,
          comparison,
          relationship,
          isValid1: this.semanticVersioning.isValidVersion(command.version1),
          isValid2: this.semanticVersioning.isValidVersion(command.version2)
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling compare versions command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle determine bump type command
   * @param {Object} command - Determine bump type command
   * @returns {Promise<Object>} Command result
   */
  async handleDetermineBumpType(command) {
    try {
      this.logger.info('Handling determine bump type command', {
        taskId: command.taskId,
        projectPath: command.projectPath
      });

      const bumpType = await this.versionManagementService.determineBumpType(
        command.task,
        command.projectPath,
        command.context
      );

      return {
        success: true,
        data: {
          bumpType,
          taskId: command.taskId,
          taskType: command.task?.type?.value || command.task?.type,
          priority: command.task?.priority?.value || command.task?.priority,
          category: command.task?.category
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling determine bump type command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle get latest version command
   * @param {Object} command - Get latest version command
   * @returns {Promise<Object>} Command result
   */
  async handleGetLatestVersion(command) {
    try {
      this.logger.info('Handling get latest version command');

      const latestVersion = await this.versionManagementService.getLatestVersion();

      return {
        success: true,
        data: {
          latestVersion,
          isValid: this.semanticVersioning.isValidVersion(latestVersion),
          isStable: this.semanticVersioning.isStable(latestVersion),
          isPrerelease: this.semanticVersioning.isPrerelease(latestVersion)
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling get latest version command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle update configuration command
   * @param {Object} command - Update configuration command
   * @returns {Promise<Object>} Command result
   */
  async handleUpdateConfiguration(command) {
    try {
      this.logger.info('Handling update configuration command', {
        configKeys: Object.keys(command.config)
      });

      this.versionManagementService.updateConfiguration(command.config);

      return {
        success: true,
        data: {
          updatedConfig: this.versionManagementService.getConfiguration(),
          updatedKeys: Object.keys(command.config)
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling update configuration command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle get AI analysis command with retry logic
   * @param {Object} command - Get AI analysis command
   * @returns {Promise<Object>} Command result
   */
  async handleGetAIAnalysis(command) {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Handling get AI analysis command (attempt ${attempt}/${maxRetries})`, {
          task: command.task?.substring(0, 100) + '...',
          projectPath: command.projectPath
        });

        const result = await this.versionManagementService.getAIAnalysis(
          command.task,
          command.projectPath,
          command.context
        );

        // Validate the result
        if (this.isValidAIResult(result)) {
          this.logger.info(`✅ AI analysis completed successfully on attempt ${attempt}`);
          return result;
        } else {
          this.logger.warn(`⚠️ Invalid AI result on attempt ${attempt}, retrying...`, {
            hasRecommendedType: !!result?.recommendedType,
            hasConfidence: typeof result?.confidence === 'number',
            hasFactors: Array.isArray(result?.factors)
          });
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }

      } catch (error) {
        this.logger.error(`Error handling get AI analysis command (attempt ${attempt}/${maxRetries})`, {
          error: error.message,
          command
        });

        if (attempt < maxRetries) {
          this.logger.info(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }
    }

    // All retries failed
    this.logger.error('All AI analysis attempts failed');
    return {
      success: false,
      error: 'AI analysis failed after all retry attempts',
      timestamp: new Date()
    };
  }

  /**
   * Validate AI analysis result
   * @param {Object} result - AI analysis result
   * @returns {boolean} True if result is valid
   */
  isValidAIResult(result) {
    if (!result) {
      this.logger.warn('❌ No result provided for validation');
      return false;
    }

    // Check if result has success field
    if (result.success === false) {
      this.logger.warn('❌ Result marked as unsuccessful');
      return false;
    }

    // The analysis data is in result.data (VersionManagementService structure)
    if (!result.data || !result.data.recommendedType) {
      this.logger.warn('❌ No analysis data found in result.data', {
        resultKeys: Object.keys(result),
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : null
      });
      return false;
    }
    
    const analysis = result.data;
    this.logger.info('🔍 Using result.data for validation', {
      analysisKeys: Object.keys(analysis),
      recommendedType: analysis.recommendedType,
      confidence: analysis.confidence,
      factors: analysis.factors,
      factorsType: typeof analysis.factors,
      factorsIsArray: Array.isArray(analysis.factors)
    });
    
    // Check for required fields
    if (!analysis.recommendedType || !['major', 'minor', 'patch'].includes(analysis.recommendedType)) {
      this.logger.warn('❌ Invalid or missing recommendedType', {
        recommendedType: analysis.recommendedType,
        validTypes: ['major', 'minor', 'patch']
      });
      return false;
    }

    if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
      this.logger.warn('❌ Invalid or missing confidence', {
        confidence: analysis.confidence,
        type: typeof analysis.confidence
      });
      return false;
    }

    // Check for required factors field
    if (!Array.isArray(analysis.factors) || analysis.factors.length === 0) {
      this.logger.warn('❌ Invalid or missing factors', {
        factors: analysis.factors,
        isArray: Array.isArray(analysis.factors),
        length: analysis.factors?.length
      });
      return false;
    }

    this.logger.info('✅ AI result validation passed', {
      recommendedType: analysis.recommendedType,
      confidence: analysis.confidence,
      factorsCount: analysis.factors.length
    });

    return true;
  }

  /**
   * Handle get configuration command
   * @param {Object} command - Get configuration command
   * @returns {Promise<Object>} Command result
   */
  async handleGetConfiguration(command) {
    try {
      this.logger.info('Handling get configuration command');

      const config = this.versionManagementService.getConfiguration();

      return {
        success: true,
        data: {
          configuration: config
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling get configuration command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle perform dry run command
   * @param {Object} command - Perform dry run command
   * @returns {Promise<Object>} Command result
   */
  async handlePerformDryRun(command) {
    try {
      this.logger.info('Handling perform dry run command', {
        taskId: command.taskId,
        projectPath: command.projectPath,
        bumpType: command.bumpType
      });

      const result = await this.versionManagementService.performDryRun(
        command.task,
        command.projectPath,
        command.bumpType,
        command.context
      );

      return {
        success: result.success,
        data: result.success ? {
          currentVersion: result.currentVersion,
          newVersion: result.newVersion,
          bumpType: result.bumpType,
          wouldUpdateFiles: result.wouldUpdateFiles,
          versionRecordPreview: result.versionRecordPreview,
          dryRun: true
        } : null,
        error: result.error,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Error handling perform dry run command', {
        error: error.message,
        command
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generic command handler
   * @param {Object} command - Command object
   * @returns {Promise<Object>} Command result
   */
  async handle(command) {
    try {
      const commandType = command.type || command.commandType;
      
      switch (commandType) {
        case 'bumpVersion':
          return await this.handleBumpVersion(command);
        case 'getCurrentVersion':
          return await this.handleGetCurrentVersion(command);
        case 'getVersionHistory':
          return await this.handleGetVersionHistory(command);
        case 'validateVersion':
          return await this.handleValidateVersion(command);
        case 'compareVersions':
          return await this.handleCompareVersions(command);
        case 'determineBumpType':
          return await this.handleDetermineBumpType(command);
        case 'getLatestVersion':
          return await this.handleGetLatestVersion(command);
        case 'updateConfiguration':
          return await this.handleUpdateConfiguration(command);
        case 'getConfiguration':
          return await this.handleGetConfiguration(command);
        case 'getAIAnalysis':
          return await this.handleGetAIAnalysis(command);
        case 'performDryRun':
          return await this.handlePerformDryRun(command);
        default:
          throw new Error(`Unknown command type: ${commandType}`);
      }

    } catch (error) {
      this.logger.error('Error handling command', {
        error: error.message,
        commandType: command.type || command.commandType
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = VersionManagementHandler;
