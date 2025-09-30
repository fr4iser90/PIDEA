/**
 * Version Service - Reads from central version file
 * All services should use this instead of hardcoded versions
 */

const CentralVersionManager = require('../../../config/version/CentralVersionManager');

class VersionService {
  constructor() {
    this.versionManager = new CentralVersionManager();
  }

  /**
   * Get current version
   */
  getVersion() {
    return this.versionManager.getVersion();
  }

  /**
   * Get full version data
   */
  getVersionData() {
    return this.versionManager.getVersionData();
  }

  /**
   * Get version for display
   */
  getDisplayVersion() {
    return this.versionManager.getDisplayVersion();
  }

  /**
   * Get build number
   */
  getBuildNumber() {
    return this.versionManager.getVersionData().buildNumber;
  }

  /**
   * Get changelog info
   */
  getChangelogInfo() {
    return this.versionManager.getChangelogInfo();
  }

  /**
   * Check if version is compatible
   */
  isVersionCompatible(requiredVersion) {
    const currentVersion = this.getVersion();
    // Simple version comparison - can be enhanced
    return currentVersion >= requiredVersion;
  }

  /**
   * Get version metadata
   */
  getMetadata() {
    return this.versionManager.getVersionData().metadata;
  }
}

module.exports = VersionService;
