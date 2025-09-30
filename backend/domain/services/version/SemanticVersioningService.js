/**
 * SemanticVersioningService - Semantic versioning implementation
 * Handles version parsing, comparison, and bumping according to SemVer specification
 */

const Logger = require('@logging/Logger');
const logger = new Logger('SemanticVersioningService');

class SemanticVersioningService {
  constructor() {
    this.logger = logger;
    this.versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  }

  /**
   * Parse version string into components
   * @param {string} version - Version string
   * @returns {Object|null} Parsed version or null if invalid
   */
  parseVersion(version) {
    if (!version || typeof version !== 'string') {
      return null;
    }

    const match = version.match(this.versionRegex);
    if (!match) {
      return null;
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || null,
      build: match[5] || null,
      version: version
    };
  }

  /**
   * Validate version string
   * @param {string} version - Version string
   * @returns {boolean} True if valid
   */
  isValidVersion(version) {
    return this.parseVersion(version) !== null;
  }

  /**
   * Compare two versions
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
   */
  compareVersions(version1, version2) {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);

    if (!v1 || !v2) {
      throw new Error('Invalid version strings provided');
    }

    // Compare major version
    if (v1.major !== v2.major) {
      return v1.major > v2.major ? 1 : -1;
    }

    // Compare minor version
    if (v1.minor !== v2.minor) {
      return v1.minor > v2.minor ? 1 : -1;
    }

    // Compare patch version
    if (v1.patch !== v2.patch) {
      return v1.patch > v2.patch ? 1 : -1;
    }

    // Compare prerelease
    if (v1.prerelease && v2.prerelease) {
      return this.comparePrerelease(v1.prerelease, v2.prerelease);
    } else if (v1.prerelease) {
      return -1; // prerelease is lower than release
    } else if (v2.prerelease) {
      return 1; // release is higher than prerelease
    }

    return 0; // versions are equal
  }

  /**
   * Compare prerelease versions
   * @param {string} prerelease1 - First prerelease
   * @param {string} prerelease2 - Second prerelease
   * @returns {number} Comparison result
   */
  comparePrerelease(prerelease1, prerelease2) {
    const parts1 = prerelease1.split('.');
    const parts2 = prerelease2.split('.');

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || '0';
      const part2 = parts2[i] || '0';

      const isNumeric1 = /^\d+$/.test(part1);
      const isNumeric2 = /^\d+$/.test(part2);

      if (isNumeric1 && isNumeric2) {
        const num1 = parseInt(part1, 10);
        const num2 = parseInt(part2, 10);
        if (num1 !== num2) {
          return num1 > num2 ? 1 : -1;
        }
      } else if (isNumeric1) {
        return -1; // numeric is lower than non-numeric
      } else if (isNumeric2) {
        return 1; // non-numeric is higher than numeric
      } else {
        // Both are non-numeric, compare as strings
        if (part1 !== part2) {
          return part1 > part2 ? 1 : -1;
        }
      }
    }

    return 0;
  }

  /**
   * Bump version according to type
   * @param {string} currentVersion - Current version
   * @param {string} bumpType - Bump type (major, minor, patch)
   * @param {string} prerelease - Optional prerelease identifier
   * @returns {string} New version
   */
  bumpVersion(currentVersion, bumpType, prerelease = null) {
    const version = this.parseVersion(currentVersion);
    if (!version) {
      throw new Error(`Invalid current version: ${currentVersion}`);
    }

    let newVersion;
    switch (bumpType.toLowerCase()) {
      case 'major':
        newVersion = `${version.major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${version.major}.${version.minor + 1}.0`;
        break;
      case 'patch':
        newVersion = `${version.major}.${version.minor}.${version.patch + 1}`;
        break;
      default:
        throw new Error(`Invalid bump type: ${bumpType}. Must be major, minor, or patch.`);
    }

    if (prerelease) {
      newVersion += `-${prerelease}`;
    }

    this.logger.info('Version bumped', {
      currentVersion,
      bumpType,
      newVersion,
      prerelease
    });

    return newVersion;
  }

  /**
   * Get next version for bump type
   * @param {string} currentVersion - Current version
   * @param {string} bumpType - Bump type
   * @returns {string} Next version
   */
  getNextVersion(currentVersion, bumpType) {
    return this.bumpVersion(currentVersion, bumpType);
  }

  /**
   * Determine bump type based on changes
   * @param {Object} changes - Change analysis
   * @returns {string} Suggested bump type
   */
  determineBumpType(changes) {
    if (!changes || typeof changes !== 'object') {
      return 'patch';
    }

    const {
      breakingChanges = 0,
      newFeatures = 0,
      bugFixes = 0,
      documentation = 0,
      refactoring = 0,
      performance = 0
    } = changes;

    // Major version for breaking changes
    if (breakingChanges > 0) {
      return 'major';
    }

    // Minor version for new features, significant refactoring, or performance improvements
    if (newFeatures > 0 || refactoring > 2 || performance > 0) {
      return 'minor';
    }

    // Patch version for bug fixes, documentation, or minor changes
    if (bugFixes > 0 || documentation > 0 || refactoring > 0) {
      return 'patch';
    }

    // Default to patch for any changes
    return 'patch';
  }

  /**
   * Check if version is prerelease
   * @param {string} version - Version string
   * @returns {boolean} True if prerelease
   */
  isPrerelease(version) {
    const parsed = this.parseVersion(version);
    return parsed && parsed.prerelease !== null;
  }

  /**
   * Check if version is stable (not prerelease)
   * @param {string} version - Version string
   * @returns {boolean} True if stable
   */
  isStable(version) {
    return !this.isPrerelease(version);
  }

  /**
   * Get version without prerelease/build metadata
   * @param {string} version - Version string
   * @returns {string} Core version
   */
  getCoreVersion(version) {
    const parsed = this.parseVersion(version);
    if (!parsed) {
      return version;
    }
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }

  /**
   * Get prerelease identifier
   * @param {string} version - Version string
   * @returns {string|null} Prerelease identifier
   */
  getPrerelease(version) {
    const parsed = this.parseVersion(version);
    return parsed ? parsed.prerelease : null;
  }

  /**
   * Get build metadata
   * @param {string} version - Version string
   * @returns {string|null} Build metadata
   */
  getBuild(version) {
    const parsed = this.parseVersion(version);
    return parsed ? parsed.build : null;
  }

  /**
   * Sort versions array
   * @param {string[]} versions - Array of version strings
   * @param {boolean} ascending - Sort ascending (default) or descending
   * @returns {string[]} Sorted versions
   */
  sortVersions(versions, ascending = true) {
    if (!Array.isArray(versions)) {
      return [];
    }

    return versions.sort((a, b) => {
      const comparison = this.compareVersions(a, b);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Get latest version from array
   * @param {string[]} versions - Array of version strings
   * @returns {string|null} Latest version
   */
  getLatestVersion(versions) {
    const sorted = this.sortVersions(versions, false);
    return sorted.length > 0 ? sorted[0] : null;
  }

  /**
   * Get oldest version from array
   * @param {string[]} versions - Array of version strings
   * @returns {string|null} Oldest version
   */
  getOldestVersion(versions) {
    const sorted = this.sortVersions(versions, true);
    return sorted.length > 0 ? sorted[0] : null;
  }

  /**
   * Check if version satisfies range
   * @param {string} version - Version to check
   * @param {string} range - Version range (e.g., ">=1.0.0 <2.0.0")
   * @returns {boolean} True if version satisfies range
   */
  satisfiesRange(version, range) {
    // Simple implementation for common ranges
    // For full semver range support, consider using semver library
    
    if (!version || !range) {
      return false;
    }

    const parsedVersion = this.parseVersion(version);
    if (!parsedVersion) {
      return false;
    }

    // Handle simple ranges like ">=1.0.0", "~1.0.0", "^1.0.0"
    if (range.startsWith('>=')) {
      const targetVersion = range.substring(2);
      return this.compareVersions(version, targetVersion) >= 0;
    } else if (range.startsWith('>')) {
      const targetVersion = range.substring(1);
      return this.compareVersions(version, targetVersion) > 0;
    } else if (range.startsWith('<=')) {
      const targetVersion = range.substring(2);
      return this.compareVersions(version, targetVersion) <= 0;
    } else if (range.startsWith('<')) {
      const targetVersion = range.substring(1);
      return this.compareVersions(version, targetVersion) < 0;
    } else if (range.startsWith('~')) {
      // Tilde range: ~1.2.3 means >=1.2.3 <1.3.0
      const targetVersion = range.substring(1);
      const target = this.parseVersion(targetVersion);
      if (!target) return false;
      
      const minVersion = `${target.major}.${target.minor}.${target.patch}`;
      const maxVersion = `${target.major}.${target.minor + 1}.0`;
      
      return this.compareVersions(version, minVersion) >= 0 && 
             this.compareVersions(version, maxVersion) < 0;
    } else if (range.startsWith('^')) {
      // Caret range: ^1.2.3 means >=1.2.3 <2.0.0
      const targetVersion = range.substring(1);
      const target = this.parseVersion(targetVersion);
      if (!target) return false;
      
      const minVersion = `${target.major}.${target.minor}.${target.patch}`;
      const maxVersion = `${target.major + 1}.0.0`;
      
      return this.compareVersions(version, minVersion) >= 0 && 
             this.compareVersions(version, maxVersion) < 0;
    }

    // Exact match
    return version === range;
  }

  /**
   * Generate version from git tags
   * @param {string[]} tags - Array of git tags
   * @returns {string|null} Latest version from tags
   */
  getVersionFromTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return null;
    }

    // Filter valid version tags
    const versionTags = tags.filter(tag => this.isValidVersion(tag));
    
    if (versionTags.length === 0) {
      return null;
    }

    return this.getLatestVersion(versionTags);
  }

  /**
   * Create version from package.json
   * @param {Object} packageJson - Package.json object
   * @returns {string} Version string
   */
  getVersionFromPackage(packageJson) {
    if (!packageJson || typeof packageJson !== 'object') {
      return '0.0.0';
    }

    return packageJson.version || '0.0.0';
  }

  /**
   * Validate and normalize version
   * @param {string} version - Version string
   * @returns {string} Normalized version
   */
  normalizeVersion(version) {
    if (!version || typeof version !== 'string') {
      return '0.0.0';
    }

    // Remove 'v' prefix if present
    const cleanVersion = version.startsWith('v') ? version.substring(1) : version;

    if (!this.isValidVersion(cleanVersion)) {
      this.logger.warn(`Invalid version format: ${version}, using 0.0.0`);
      return '0.0.0';
    }

    return cleanVersion;
  }
}

module.exports = SemanticVersioningService;
