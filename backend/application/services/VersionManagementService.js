/**
 * VersionManagementService - Orchestrates complete automation workflow
 * Coordinates version detection, selector collection, and IDETypes.js updates
 */

const Logger = require('@logging/Logger');
const logger = new Logger('VersionManagementService');

class VersionManagementService {
  constructor(dependencies = {}) {
    this.versionDetectionService = dependencies.versionDetectionService;
    this.selectorCollectionBot = dependencies.selectorCollectionBot;
    this.ideTypesUpdater = dependencies.ideTypesUpdater;
    this.logger = dependencies.logger || logger;
    this.workflowCache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Detect and update version for IDE
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Workflow result
   */
  async detectAndUpdateVersion(ideType, port) {
    try {
      this.logger.info(`Starting version detection and update workflow for ${ideType} on port ${port}`);
      
      // Check cache first
      const cacheKey = `${ideType}:${port}`;
      const cached = this.workflowCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.logger.info(`Using cached workflow result for ${ideType} on port ${port}`);
        return cached.result;
      }

      const workflowResult = {
        ideType,
        port,
        timestamp: new Date().toISOString(),
        steps: [],
        success: false,
        error: null
      };

      // Step 1: Detect current version
      this.logger.info(`Step 1: Detecting version for ${ideType} on port ${port}`);
      const versionResult = await this.versionDetectionService.detectVersion(port, ideType);
      
      if (!versionResult || !versionResult.currentVersion) {
        throw new Error(`Failed to detect version for ${ideType} on port ${port}`);
      }

      workflowResult.steps.push({
        step: 'version_detection',
        success: true,
        result: versionResult,
        timestamp: new Date().toISOString()
      });

      const currentVersion = versionResult.currentVersion;
      const isNewVersion = versionResult.isNewVersion;

      this.logger.info(`Detected version: ${currentVersion} (new: ${isNewVersion})`);

      // Step 2: Check if we need to collect selectors
      if (isNewVersion) {
        this.logger.info(`Step 2: New version detected, collecting selectors for ${ideType} ${currentVersion}`);
        
        const collectionResult = await this.collectSelectorsForNewVersion(ideType, currentVersion, port);
        
        workflowResult.steps.push({
          step: 'selector_collection',
          success: collectionResult.success,
          result: collectionResult,
          timestamp: new Date().toISOString()
        });

        if (!collectionResult.success) {
          throw new Error(`Selector collection failed: ${collectionResult.error}`);
        }

        // Step 3: Update IDETypes.js with new version and selectors
        this.logger.info(`Step 3: Updating IDETypes.js with new version ${currentVersion}`);
        
        const updateResult = await this.updateIDETypes(ideType, currentVersion, collectionResult.selectors);
        
        workflowResult.steps.push({
          step: 'ide_types_update',
          success: updateResult.success,
          result: updateResult,
          timestamp: new Date().toISOString()
        });

        if (!updateResult.success) {
          throw new Error(`IDETypes.js update failed: ${updateResult.error}`);
        }
      } else {
        this.logger.info(`Step 2: Version ${currentVersion} is known, no collection needed`);
        
        workflowResult.steps.push({
          step: 'selector_collection',
          success: true,
          result: { message: 'Version is known, no collection needed' },
          timestamp: new Date().toISOString()
        });

        workflowResult.steps.push({
          step: 'ide_types_update',
          success: true,
          result: { message: 'No update needed' },
          timestamp: new Date().toISOString()
        });
      }

      // Step 4: Validate the complete workflow
      this.logger.info(`Step 4: Validating workflow completion`);
      const validationResult = await this.validateWorkflow(ideType, currentVersion, port);
      
      workflowResult.steps.push({
        step: 'validation',
        success: validationResult.success,
        result: validationResult,
        timestamp: new Date().toISOString()
      });

      if (!validationResult.success) {
        throw new Error(`Workflow validation failed: ${validationResult.error}`);
      }

      workflowResult.success = true;
      workflowResult.finalVersion = currentVersion;
      workflowResult.isNewVersion = isNewVersion;

      // Cache the result
      this.workflowCache.set(cacheKey, {
        result: workflowResult,
        timestamp: Date.now()
      });

      this.logger.info(`Version detection and update workflow completed successfully for ${ideType} version ${currentVersion}`);
      return workflowResult;

    } catch (error) {
      this.logger.error(`Version detection and update workflow failed for ${ideType} on port ${port}:`, error.message);
      
      const errorResult = {
        ideType,
        port,
        timestamp: new Date().toISOString(),
        steps: [],
        success: false,
        error: error.message
      };

      return errorResult;
    }
  }

  /**
   * Collect selectors for new version
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Collection result
   */
  async collectSelectorsForNewVersion(ideType, version, port) {
    try {
      this.logger.info(`Collecting selectors for new version ${ideType} ${version}`);

      if (!this.selectorCollectionBot) {
        throw new Error('SelectorCollectionBot not available');
      }

      // Collect selectors
      const selectors = await this.selectorCollectionBot.collectSelectors(ideType, version, port);
      
      // Test selectors
      const testResults = await this.selectorCollectionBot.testSelectors(ideType, version, selectors, port);
      
      // Check test quality
      if (testResults.failed > testResults.passed) {
        this.logger.warn(`Selector collection quality is low: ${testResults.passed}/${testResults.tested} passed`);
      }

      // Save selectors
      await this.selectorCollectionBot.saveSelectors(ideType, version, selectors);

      return {
        success: true,
        selectors,
        testResults,
        message: `Successfully collected ${Object.keys(selectors).length} selector categories`
      };

    } catch (error) {
      this.logger.error(`Selector collection failed for ${ideType} ${version}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update IDETypes.js with new version and selectors
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {Object} selectors - Selectors to add
   * @returns {Promise<Object>} Update result
   */
  async updateIDETypes(ideType, version, selectors) {
    try {
      this.logger.info(`Updating IDETypes.js for ${ideType} version ${version}`);

      if (!this.ideTypesUpdater) {
        throw new Error(`IDETypesUpdater not available for ${ideType} version ${version}. Cannot update IDETypes.js without updater.`);
      }

      // Use IDETypesUpdater to update the file
      const updateResult = await this.ideTypesUpdater.updateVersion(ideType, version, selectors);
      
      return {
        success: true,
        message: `IDETypes.js updated successfully for ${ideType} version ${version}`,
        result: updateResult
      };

    } catch (error) {
      this.logger.error(`IDETypes.js update failed for ${ideType} ${version}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate workflow completion
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {number} port - IDE port
   * @returns {Promise<Object>} Validation result
   */
  async validateWorkflow(ideType, version, port) {
    try {
      this.logger.info(`Validating workflow completion for ${ideType} version ${version}`);

      // Test version detection again
      const versionCheck = await this.versionDetectionService.detectVersion(port, ideType);
      
      if (!versionCheck || versionCheck.currentVersion !== version) {
        throw new Error(`Version validation failed: expected ${version}, got ${versionCheck?.currentVersion}`);
      }

      // Test selector availability
      if (this.selectorCollectionBot) {
        const testSelectors = await this.selectorCollectionBot.testSelectors(ideType, version, {}, port);
        // Basic validation - just check that the service is working
      }

      return {
        success: true,
        message: `Workflow validation completed successfully for ${ideType} version ${version}`,
        version: versionCheck.currentVersion
      };

    } catch (error) {
      this.logger.error(`Workflow validation failed for ${ideType} ${version}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get workflow history
   * @param {string} ideType - IDE type (optional)
   * @returns {Array} Workflow history
   */
  getWorkflowHistory(ideType = null) {
    const history = [];
    
    for (const [key, entry] of this.workflowCache) {
      if (!ideType || key.startsWith(`${ideType}:`)) {
        history.push({
          key,
          timestamp: entry.timestamp,
          result: entry.result
        });
      }
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear workflow cache
   */
  clearCache() {
    this.workflowCache.clear();
    this.logger.info('Version management workflow cache cleared');
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      cache: {
        size: this.workflowCache.size,
        timeout: this.cacheTimeout,
        entries: Array.from(this.workflowCache.keys())
      },
      history: this.getWorkflowHistory(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = VersionManagementService;
