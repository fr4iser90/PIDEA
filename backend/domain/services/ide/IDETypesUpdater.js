/**
 * IDETypesUpdater - Handles automatic IDETypes.js updates with new versions and selectors
 * NO FALLBACKS - Only real data from actual IDE detection
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('IDETypesUpdater');
const JSONSelectorManager = require('./JSONSelectorManager');

class IDETypesUpdater {
  constructor(options = {}) {
    this.ideTypesPath = options.ideTypesPath || path.join(__dirname, 'IDETypes.js');
    this.backupPath = options.backupPath || path.join(__dirname, 'IDETypes.js.backup');
    this.jsonSelectorManager = new JSONSelectorManager(options);
    this.logger = options.logger || logger;
  }

  /**
   * Update selectors for new version (now uses JSON files)
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @param {string} version - IDE version
   * @param {Object} selectors - Selectors to add
   * @returns {Promise<Object>} Update result
   */
  async updateVersion(ideType, version, selectors) {
    try {
      this.logger.info(`Updating selectors for ${ideType} version ${version}`);

      // Validate input
      if (!ideType || !version || !selectors) {
        throw new Error('Invalid input: ideType, version, and selectors are required');
      }

      // Use JSONSelectorManager to save selectors
      const result = await this.jsonSelectorManager.saveSelectors(ideType, version, selectors);

      this.logger.info(`Successfully updated selectors for ${ideType} version ${version}`);
      
      return {
        success: true,
        message: `Selectors updated for ${ideType} version ${version}`,
        version,
        selectorsCount: result.selectorsCount,
        path: result.path
      };

    } catch (error) {
      this.logger.error(`Failed to update selectors for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Add version to IDETypes.js content
   * @param {string} content - Current file content
   * @param {string} ideType - IDE type
   * @param {string} version - Version to add
   * @param {Object} selectors - Selectors for the version
   * @returns {string} Updated content
   */
  async addVersionToIDETypes(content, ideType, version, selectors) {
    try {
      // Find the IDE metadata section
      const ideMetadataRegex = new RegExp(`\\[IDETypes\\.${ideType.toUpperCase()}\\]:\\s*{([^}]+)}`, 's');
      const match = content.match(ideMetadataRegex);
      
      if (!match) {
        throw new Error(`IDE type ${ideType} not found in IDETypes.js`);
      }

      // Find the versions section within the IDE metadata
      const versionsRegex = /versions:\s*{([^}]+)}/s;
      const versionsMatch = match[1].match(versionsRegex);
      
      if (!versionsMatch) {
        throw new Error(`Versions section not found for IDE type ${ideType}`);
      }

      // Format selectors for insertion
      const formattedSelectors = this.formatSelectorsForIDETypes(selectors);
      
      // Create new version entry
      const newVersionEntry = `        '${version}': ${formattedSelectors},`;

      // Check if version already exists
      if (versionsMatch[1].includes(`'${version}':`)) {
        this.logger.warn(`Version ${version} already exists for ${ideType}, updating...`);
        // Replace existing version
        const existingVersionRegex = new RegExp(`'${version}':\\s*{[^}]+}`, 's');
        const updatedVersions = versionsMatch[1].replace(existingVersionRegex, formattedSelectors);
        const updatedContent = content.replace(versionsRegex, `versions: {${updatedVersions}}`);
        return updatedContent;
      } else {
        // Add new version
        const updatedVersions = versionsMatch[1] + '\n' + newVersionEntry;
        const updatedContent = content.replace(versionsRegex, `versions: {${updatedVersions}}`);
        return updatedContent;
      }

    } catch (error) {
      this.logger.error('Error adding version to IDETypes.js:', error.message);
      throw error;
    }
  }

  /**
   * Format selectors for IDETypes.js insertion
   * @param {Object} selectors - Selectors to format
   * @returns {string} Formatted selectors string
   */
  formatSelectorsForIDETypes(selectors) {
    try {
      const formatted = {
        chatSelectors: selectors.chat || {},
        editorSelectors: selectors.editor || {},
        explorerSelectors: selectors.explorer || {},
        terminalSelectors: selectors.terminal || {},
        searchSelectors: selectors.search || {},
        gitSelectors: selectors.git || {},
        commandSelectors: selectors.commands || {},
        panelSelectors: selectors.panels || {},
        otherSelectors: selectors.other || {},
        metadata: {
          version: 'auto-detected',
          collectedAt: new Date().toISOString(),
          totalSelectors: Object.values(selectors).reduce((sum, cat) => sum + Object.keys(cat).length, 0)
        }
      };

      // Convert to properly formatted string
      return JSON.stringify(formatted, null, 12).replace(/"/g, "'");
    } catch (error) {
      this.logger.error('Error formatting selectors:', error.message);
      throw error;
    }
  }

  /**
   * Create backup of current IDETypes.js
   * @param {string} content - Current file content
   * @returns {Promise<void>}
   */
  async createBackup(content) {
    try {
      await fs.writeFile(this.backupPath, content, 'utf8');
      this.logger.info(`Created backup of IDETypes.js at ${this.backupPath}`);
    } catch (error) {
      this.logger.error('Failed to create backup:', error.message);
      throw error;
    }
  }

  /**
   * Restore IDETypes.js from backup
   * @returns {Promise<void>}
   */
  async restoreFromBackup() {
    try {
      const backupContent = await fs.readFile(this.backupPath, 'utf8');
      await fs.writeFile(this.ideTypesPath, backupContent, 'utf8');
      this.logger.info('Restored IDETypes.js from backup');
    } catch (error) {
      this.logger.error('Failed to restore from backup:', error.message);
      throw error;
    }
  }

  /**
   * Get current versions for IDE type
   * @param {string} ideType - IDE type
   * @returns {Promise<Array<string>>} Available versions
   */
  async getCurrentVersions(ideType) {
    try {
      const content = await fs.readFile(this.ideTypesPath, 'utf8');
      
      // Find the IDE metadata section
      const ideMetadataRegex = new RegExp(`\\[IDETypes\\.${ideType.toUpperCase()}\\]:\\s*{([^}]+)}`, 's');
      const match = content.match(ideMetadataRegex);
      
      if (!match) {
        return [];
      }

      // Extract version keys
      const versionMatches = match[1].match(/'([^']+)':/g);
      if (!versionMatches) {
        return [];
      }

      return versionMatches.map(match => match.replace(/[':]/g, ''));
    } catch (error) {
      this.logger.error(`Error getting current versions for ${ideType}:`, error.message);
      return [];
    }
  }

  /**
   * Validate IDETypes.js syntax
   * @returns {Promise<boolean>} True if valid
   */
  async validateSyntax() {
    try {
      const content = await fs.readFile(this.ideTypesPath, 'utf8');
      
      // Try to require the file to check syntax
      // This is a basic check - in production you might want more sophisticated validation
      const tempPath = this.ideTypesPath + '.temp';
      await fs.writeFile(tempPath, content, 'utf8');
      
      try {
        delete require.cache[require.resolve(this.ideTypesPath)];
        require(tempPath);
        await fs.unlink(tempPath);
        return true;
      } catch (syntaxError) {
        await fs.unlink(tempPath);
        throw syntaxError;
      }
    } catch (error) {
      this.logger.error('IDETypes.js syntax validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get updater statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ideTypesPath: this.ideTypesPath,
      backupPath: this.backupPath,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = IDETypesUpdater;
