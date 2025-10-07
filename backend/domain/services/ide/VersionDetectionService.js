/**
 * VersionDetectionService - Core version detection and comparison logic
 * Provides automatic IDE version detection with CDP integration and validation
 */

const Logger = require('@logging/Logger');
const logger = new Logger('VersionDetectionService');

class VersionDetectionService {
  constructor(dependencies = {}) {
    this.versionDetector = dependencies.versionDetector;
    this.logger = dependencies.logger || logger;
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour cache
    this.knownVersions = new Map(); // ideType -> Set of known versions
    this.initializeKnownVersions();
  }

  /**
   * Initialize known versions from IDETypes
   */
  initializeKnownVersions() {
    try {
      const IDETypes = require('./IDETypes');
      const ideTypes = ['cursor', 'vscode', 'windsurf'];
      
      ideTypes.forEach(ideType => {
        const metadata = IDETypes.getMetadata(ideType);
        if (metadata && metadata.availableVersions) {
          const versions = new Set(metadata.availableVersions);
          this.knownVersions.set(ideType, versions);
          this.logger.info(`Initialized known versions for ${ideType}: ${Array.from(versions).join(', ')}`);
        }
      });
    } catch (error) {
      this.logger.error('Error initializing known versions:', error.message);
    }
  }

  /**
   * Detect IDE version with automatic comparison
   * @param {number} port - IDE port
   * @param {string} ideType - IDE type (cursor, vscode, windsurf)
   * @returns {Promise<Object>} Version detection result
   */
  async detectVersion(port, ideType) {
    try {
      // Check cache first
      const cacheKey = `${ideType}:${port}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.logger.debug(`Using cached version for ${ideType} on port ${port}: ${cached.version}`);
        return cached.result;
      }

      // Detect current version
      const currentVersion = await this.versionDetector.detectVersion(port);
      if (!currentVersion) {
        throw new Error(`Failed to detect version for ${ideType} on port ${port}`);
      }

      // Get known versions for this IDE type
      const knownVersions = this.knownVersions.get(ideType) || new Set();
      
      // Compare with known versions
      const isNewVersion = !knownVersions.has(currentVersion);
      const isKnownVersion = knownVersions.has(currentVersion);
      
      // Find compatible version (latest known version that might work)
      const compatibleVersion = this.findCompatibleVersion(ideType, currentVersion);
      
      const result = {
        currentVersion,
        isNewVersion,
        isKnownVersion,
        compatibleVersion,
        knownVersions: Array.from(knownVersions),
        timestamp: new Date().toISOString(),
        port,
        ideType
      };

      // Cache the result
      this.cache.set(cacheKey, {
        version: currentVersion,
        result,
        timestamp: Date.now()
      });

      const selectorVersion = compatibleVersion || currentVersion;
      this.logger.info(`Version detection completed for ${ideType}: ${currentVersion} (selector: ${selectorVersion})`);
      return result;

    } catch (error) {
      this.logger.error(`Version detection failed for ${ideType} on port ${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate version format and compatibility
   * @param {string} version - Version string
   * @param {string} ideType - IDE type
   * @returns {Promise<Object>} Validation result
   */
  async validateVersion(version, ideType) {
    try {
      if (!version || typeof version !== 'string') {
        return {
          isValid: false,
          error: 'Invalid version format',
          version,
          ideType
        };
      }

      // Basic version format validation (semantic versioning)
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!versionRegex.test(version)) {
        return {
          isValid: false,
          error: 'Version does not match semantic versioning format',
          version,
          ideType
        };
      }

      // Check if version is known
      const knownVersions = this.knownVersions.get(ideType) || new Set();
      const isKnown = knownVersions.has(version);

      return {
        isValid: true,
        isKnown,
        version,
        ideType,
        knownVersions: Array.from(knownVersions)
      };

    } catch (error) {
      this.logger.error(`Version validation failed for ${version} (${ideType}):`, error.message);
      return {
        isValid: false,
        error: error.message,
        version,
        ideType
      };
    }
  }

  /**
   * Compare two versions
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {Object} Comparison result
   */
  async compareVersions(version1, version2) {
    try {
      if (!version1 || !version2) {
        throw new Error('Both versions must be provided');
      }

      const v1Parts = version1.split('.').map(Number);
      const v2Parts = version2.split('.').map(Number);

      if (v1Parts.length !== 3 || v2Parts.length !== 3) {
        throw new Error('Versions must be in format x.y.z');
      }

      // Compare major, minor, patch
      for (let i = 0; i < 3; i++) {
        if (v1Parts[i] > v2Parts[i]) {
          return {
            result: 'greater',
            version1,
            version2,
            difference: v1Parts[i] - v2Parts[i],
            position: i === 0 ? 'major' : i === 1 ? 'minor' : 'patch'
          };
        } else if (v1Parts[i] < v2Parts[i]) {
          return {
            result: 'less',
            version1,
            version2,
            difference: v2Parts[i] - v1Parts[i],
            position: i === 0 ? 'major' : i === 1 ? 'minor' : 'patch'
          };
        }
      }

      return {
        result: 'equal',
        version1,
        version2,
        difference: 0
      };

    } catch (error) {
      this.logger.error(`Version comparison failed for ${version1} vs ${version2}:`, error.message);
      throw error;
    }
  }

  /**
   * Find compatible version for new version
   * @param {string} ideType - IDE type
   * @param {string} currentVersion - Current version
   * @returns {string|null} Compatible version
   */
  findCompatibleVersion(ideType, currentVersion) {
    try {
      const knownVersions = this.knownVersions.get(ideType) || new Set();
      if (knownVersions.size === 0) {
        return null;
      }

      // If current version is known, use it
      if (knownVersions.has(currentVersion)) {
        return currentVersion;
      }

      // Convert to array and sort by version (ascending order)
      const sortedVersions = Array.from(knownVersions).sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
          if (aParts[i] !== bParts[i]) {
            return aParts[i] - bParts[i]; // Ascending order
          }
        }
        return 0;
      });

      // Find the highest known version that is <= current version
      const currentParts = currentVersion.split('.').map(Number);
      let compatibleVersion = null;

      for (let i = sortedVersions.length - 1; i >= 0; i--) {
        const versionParts = sortedVersions[i].split('.').map(Number);
        
        // Check if this version is <= current version
        let isCompatible = true;
        for (let j = 0; j < 3; j++) {
          if (versionParts[j] > currentParts[j]) {
            isCompatible = false;
            break;
          }
        }
        
        if (isCompatible) {
          compatibleVersion = sortedVersions[i];
          break;
        }
      }

      // If no compatible version found, use the oldest known version
      return compatibleVersion || sortedVersions[0] || null;

    } catch (error) {
      this.logger.error(`Error finding compatible version for ${ideType} ${currentVersion}:`, error.message);
      return null;
    }
  }

  /**
   * Add new version to known versions
   * @param {string} ideType - IDE type
   * @param {string} version - Version to add
   */
  addKnownVersion(ideType, version) {
    try {
      if (!this.knownVersions.has(ideType)) {
        this.knownVersions.set(ideType, new Set());
      }
      
      this.knownVersions.get(ideType).add(version);
      this.logger.info(`Added known version for ${ideType}: ${version}`);
      
      // Clear cache for this IDE type
      this.clearCacheForIDE(ideType);
      
    } catch (error) {
      this.logger.error(`Error adding known version for ${ideType} ${version}:`, error.message);
    }
  }

  /**
   * Get known versions for IDE type
   * @param {string} ideType - IDE type
   * @returns {Array<string>} Known versions
   */
  getKnownVersions(ideType) {
    const versions = this.knownVersions.get(ideType) || new Set();
    return Array.from(versions).sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < 3; i++) {
        if (aParts[i] !== bParts[i]) {
          return bParts[i] - aParts[i]; // Descending order
        }
      }
      return 0;
    });
  }

  /**
   * Clear cache for specific IDE type
   * @param {string} ideType - IDE type
   */
  clearCacheForIDE(ideType) {
    const keysToDelete = [];
    for (const [key] of this.cache) {
      if (key.startsWith(`${ideType}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.logger.info(`Cleared cache for ${ideType} (${keysToDelete.length} entries)`);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('Version detection cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      entries: Array.from(this.cache.keys()).map(key => {
        const entry = this.cache.get(key);
        return {
          key,
          version: entry.version,
          timestamp: entry.timestamp,
          age: Date.now() - entry.timestamp
        };
      })
    };
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      cache: this.getCacheStats(),
      knownVersions: Object.fromEntries(
        Array.from(this.knownVersions.entries()).map(([ideType, versions]) => [
          ideType,
          Array.from(versions)
        ])
      )
    };
  }
}

module.exports = VersionDetectionService;
