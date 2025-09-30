/**
 * JSONSelectorManager - Loads selectors from JSON files instead of IDETypes.js
 * NO FALLBACKS - Only real data from JSON files
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('JSONSelectorManager');

class JSONSelectorManager {
  constructor(options = {}) {
    this.selectorsPath = options.selectorsPath || path.join(__dirname, '../../../selectors');
    this.logger = options.logger || logger;
  }

  /**
   * Get selectors for specific IDE type and version
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @param {string} version - IDE version
   * @returns {Promise<Object>} Selectors object
   */
  async getSelectors(ideType, version) {
    if (!ideType || !version) {
      throw new Error(`IDE type and version are required. Got: ideType=${ideType}, version=${version}`);
    }

    try {
      const selectorPath = path.join(this.selectorsPath, ideType, `${version}.json`);
      
      // Check if file exists
      try {
        await fs.access(selectorPath);
      } catch (error) {
        const availableVersions = await this.getAvailableVersions(ideType);
        throw new Error(`Version ${version} not found for IDE type ${ideType}. Available versions: ${availableVersions.join(', ')}`);
      }

      // Read and parse JSON file
      const content = await fs.readFile(selectorPath, 'utf8');
      const selectorsData = JSON.parse(content);

      // Extract selectors from the structure (chatSelectors, etc.)
      const selectors = selectorsData.chatSelectors || selectorsData;

      this.logger.info(`Loaded selectors for ${ideType} version ${version} from ${selectorPath}`);
      return selectors;

    } catch (error) {
      this.logger.error(`Error loading selectors for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Get available versions for IDE type
   * @param {string} ideType - IDE type
   * @returns {Promise<Array<string>>} Available versions
   */
  async getAvailableVersions(ideType) {
    try {
      const idePath = path.join(this.selectorsPath, ideType);
      
      // Check if directory exists
      try {
        await fs.access(idePath);
      } catch (error) {
        return [];
      }

      // Read directory and filter JSON files
      const files = await fs.readdir(idePath);
      const versions = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
        .sort((a, b) => {
          // Simple version comparison (basic semantic versioning)
          const aParts = a.split('.').map(Number);
          const bParts = b.split('.').map(Number);
          
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            if (aPart !== bPart) {
              return bPart - aPart; // Descending order (newest first)
            }
          }
          return 0;
        });

      return versions;

    } catch (error) {
      this.logger.error(`Error getting available versions for ${ideType}:`, error.message);
      return [];
    }
  }

  /**
   * Save selectors for specific IDE type and version
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @param {Object} selectors - Selectors to save
   * @returns {Promise<Object>} Save result
   */
  async saveSelectors(ideType, version, selectors) {
    if (!ideType || !version || !selectors) {
      throw new Error('IDE type, version, and selectors are required');
    }

    try {
      // Ensure directory exists
      const idePath = path.join(this.selectorsPath, ideType);
      await fs.mkdir(idePath, { recursive: true });

      // Create file path
      const selectorPath = path.join(idePath, `${version}.json`);

      // Add metadata
      const selectorsWithMetadata = {
        ...selectors,
        metadata: {
          version: version,
          ideType: ideType,
          savedAt: new Date().toISOString(),
          totalSelectors: this.countSelectors(selectors)
        }
      };

      // Write JSON file
      await fs.writeFile(selectorPath, JSON.stringify(selectorsWithMetadata, null, 2), 'utf8');

      this.logger.info(`Saved selectors for ${ideType} version ${version} to ${selectorPath}`);
      
      return {
        success: true,
        message: `Selectors saved for ${ideType} version ${version}`,
        path: selectorPath,
        selectorsCount: this.countSelectors(selectors)
      };

    } catch (error) {
      this.logger.error(`Error saving selectors for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete selectors for specific IDE type and version
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @returns {Promise<Object>} Delete result
   */
  async deleteSelectors(ideType, version) {
    if (!ideType || !version) {
      throw new Error('IDE type and version are required');
    }

    try {
      const selectorPath = path.join(this.selectorsPath, ideType, `${version}.json`);
      
      // Check if file exists
      try {
        await fs.access(selectorPath);
      } catch (error) {
        throw new Error(`Version ${version} not found for IDE type ${ideType}`);
      }

      // Delete file
      await fs.unlink(selectorPath);

      this.logger.info(`Deleted selectors for ${ideType} version ${version} from ${selectorPath}`);
      
      return {
        success: true,
        message: `Selectors deleted for ${ideType} version ${version}`,
        path: selectorPath
      };

    } catch (error) {
      this.logger.error(`Error deleting selectors for ${ideType} version ${version}:`, error.message);
      throw error;
    }
  }

  /**
   * Count total selectors in an object
   * @param {Object} selectors - Selectors object
   * @returns {number} Total count
   */
  countSelectors(selectors) {
    let count = 0;
    for (const category in selectors) {
      if (typeof selectors[category] === 'object' && selectors[category] !== null) {
        count += Object.keys(selectors[category]).length;
      }
    }
    return count;
  }

  /**
   * Get all IDE types with available versions
   * @returns {Promise<Object>} IDE types and their versions
   */
  async getAllIDETypes() {
    try {
      const ideTypes = {};
      
      // Read selectors directory
      const files = await fs.readdir(this.selectorsPath);
      const directories = files.filter(file => {
        const filePath = path.join(this.selectorsPath, file);
        return fs.stat(filePath).then(stat => stat.isDirectory()).catch(() => false);
      });

      for (const dir of directories) {
        const versions = await this.getAvailableVersions(dir);
        if (versions.length > 0) {
          ideTypes[dir] = versions;
        }
      }

      return ideTypes;

    } catch (error) {
      this.logger.error('Error getting all IDE types:', error.message);
      return {};
    }
  }

  /**
   * Validate selector file syntax
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @returns {Promise<boolean>} True if valid
   */
  async validateSelectors(ideType, version) {
    try {
      const selectors = await this.getSelectors(ideType, version);
      
      // Basic validation - check if it has required structure
      if (!selectors || typeof selectors !== 'object') {
        return false;
      }

      // Check for at least one selector category
      const hasSelectors = Object.values(selectors).some(category => 
        typeof category === 'object' && category !== null && Object.keys(category).length > 0
      );

      return hasSelectors;

    } catch (error) {
      this.logger.error(`Error validating selectors for ${ideType} version ${version}:`, error.message);
      return false;
    }
  }

  /**
   * Get manager statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    try {
      const allTypes = await this.getAllIDETypes();
      const totalVersions = Object.values(allTypes).reduce((sum, versions) => sum + versions.length, 0);
      
      return {
        selectorsPath: this.selectorsPath,
        totalIDETypes: Object.keys(allTypes).length,
        totalVersions: totalVersions,
        ideTypes: allTypes,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error getting stats:', error.message);
      return {
        selectorsPath: this.selectorsPath,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = JSONSelectorManager;
