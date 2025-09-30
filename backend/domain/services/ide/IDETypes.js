/**
 * IDETypes - Standardized IDE type definitions
 * Provides constants and utilities for IDE type management
 * Selectors are now stored in separate JSON files in the selectors/ directory
 */
class IDETypes {
  // Standard IDE types
  static CURSOR = 'cursor';
  static VSCODE = 'vscode';
  static WINDSURF = 'windsurf';
  static JETBRAINS = 'jetbrains';
  static SUBLIME = 'sublime';

  // IDE type metadata (NO SELECTORS - they are in JSON files)
  static METADATA = {
    [IDETypes.CURSOR]: {
      name: 'Cursor',
      displayName: 'Cursor IDE',
      description: 'AI-powered code editor',
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'cursor',
      detectionPatterns: ['cursor', 'Cursor'],
      versionDetection: {
        method: 'cdp',
        automaticDetection: true,
        comparisonEnabled: true,
        validationEnabled: true
      },
      // Available versions are now loaded from JSON files
      availableVersions: ['1.5.7'] // This will be updated dynamically
    },
    [IDETypes.VSCODE]: {
      name: 'Visual Studio Code',
      displayName: 'VSCode',
      description: 'Microsoft code editor',
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions', 'debugging'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.py', '.java', '.cpp'],
      startupCommand: 'code',
      detectionPatterns: ['vscode', 'code', 'Code'],
      versionDetection: {
        method: 'cdp',
        automaticDetection: true,
        comparisonEnabled: true,
        validationEnabled: true
      },
      availableVersions: ['1.85.0'] // This will be updated dynamically
    },
    [IDETypes.WINDSURF]: {
      name: 'Windsurf',
      displayName: 'Windsurf IDE',
      description: 'AI-powered development environment',
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'windsurf',
      detectionPatterns: ['windsurf', 'Windsurf'],
      versionDetection: {
        method: 'cdp',
        automaticDetection: true,
        comparisonEnabled: true,
        validationEnabled: true
      },
      availableVersions: (() => {
        const VersionService = require('../version/VersionService');
        return [new VersionService().getVersion()];
      })() // Dynamic version from central version file
    },
    [IDETypes.JETBRAINS]: {
      name: 'JetBrains IDEs',
      displayName: 'JetBrains',
      description: 'Professional development environments',
      supportedFeatures: ['refactoring', 'terminal', 'git', 'extensions', 'debugging'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.java', '.py', '.cpp', '.kt'],
      startupCommand: 'jetbrains',
      detectionPatterns: ['jetbrains', 'JetBrains', 'intellij', 'IntelliJ'],
      versionDetection: {
        method: 'cdp',
        automaticDetection: false,
        comparisonEnabled: true,
        validationEnabled: true
      },
      availableVersions: [] // No versions available yet
    },
    [IDETypes.SUBLIME]: {
      name: 'Sublime Text',
      displayName: 'Sublime Text',
      description: 'Sophisticated text editor',
      supportedFeatures: ['extensions', 'git'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.py', '.java'],
      startupCommand: 'sublime',
      detectionPatterns: ['sublime', 'Sublime'],
      versionDetection: {
        method: 'cdp',
        automaticDetection: false,
        comparisonEnabled: true,
        validationEnabled: true
      },
      availableVersions: [] // No versions available yet
    }
  };

  /**
   * Get metadata for IDE type
   * @param {string} ideType - IDE type
   * @returns {Object|null} IDE metadata
   */
  static getMetadata(ideType) {
    return this.METADATA[ideType] || null;
  }

  /**
   * Get all IDE types
   * @returns {Array<string>} All IDE types
   */
  static getAllTypes() {
    return Object.keys(this.METADATA);
  }

  /**
   * Get available versions for IDE type (from metadata)
   * @param {string} ideType - IDE type
   * @returns {Array<string>} Available versions
   */
  static getAvailableVersions(ideType) {
    const metadata = this.getMetadata(ideType);
    return metadata ? metadata.availableVersions || [] : [];
  }

  /**
   * Check if IDE type is supported
   * @param {string} ideType - IDE type
   * @returns {boolean} True if supported
   */
  static isSupported(ideType) {
    return this.METADATA.hasOwnProperty(ideType);
  }

  /**
   * Get supported features for IDE type
   * @param {string} ideType - IDE type
   * @returns {Array<string>} Supported features
   */
  static getSupportedFeatures(ideType) {
    const metadata = this.getMetadata(ideType);
    return metadata ? metadata.supportedFeatures || [] : [];
  }

  /**
   * Get file extensions for IDE type
   * @param {string} ideType - IDE type
   * @returns {Array<string>} File extensions
   */
  static getFileExtensions(ideType) {
    const metadata = this.getMetadata(ideType);
    return metadata ? metadata.fileExtensions || [] : [];
  }

  /**
   * Get startup command for IDE type
   * @param {string} ideType - IDE type
   * @returns {string|null} Startup command
   */
  static getStartupCommand(ideType) {
    const metadata = this.getMetadata(ideType);
    return metadata ? metadata.startupCommand || null : null;
  }

  /**
   * Get detection patterns for IDE type
   * @param {string} ideType - IDE type
   * @returns {Array<string>} Detection patterns
   */
  static getDetectionPatterns(ideType) {
    const metadata = this.getMetadata(ideType);
    return metadata ? metadata.detectionPatterns || [] : [];
  }

  /**
   * Get version detection config for IDE type
   * @param {string} ideType - IDE type
   * @returns {Object|null} Version detection config
   */
  static getVersionDetectionConfig(ideType) {
    const metadata = this.getMetadata(ideType);
    return metadata ? metadata.versionDetection || null : null;
  }

  /**
   * Update available versions for IDE type
   * @param {string} ideType - IDE type
   * @param {Array<string>} versions - Available versions
   */
  static updateAvailableVersions(ideType, versions) {
    const metadata = this.getMetadata(ideType);
    if (metadata) {
      metadata.availableVersions = versions;
    }
  }

  /**
   * Get selectors for version (DEPRECATED - use JSONSelectorManager instead)
   * @param {string} ideType - IDE type
   * @param {string} version - IDE version
   * @returns {Object} Selectors
   * @deprecated Use JSONSelectorManager.getSelectors() instead
   */
  static getSelectorsForVersion(ideType, version) {
    throw new Error(`getSelectorsForVersion is deprecated. Use JSONSelectorManager.getSelectors('${ideType}', '${version}') instead. Selectors are now stored in JSON files.`);
  }

  /**
   * Get fallback version (DEPRECATED - no fallbacks allowed)
   * @param {string} ideType - IDE type
   * @returns {string|null} Fallback version
   * @deprecated No fallbacks allowed - specify exact version
   */
  static getFallbackVersion(ideType) {
    throw new Error(`getFallbackVersion is deprecated. No fallbacks allowed. Please specify exact version for ${ideType}.`);
  }

  /**
   * Validate IDE type
   * @param {string} ideType - IDE type to validate
   * @returns {boolean} True if valid
   */
  static isValidIDEType(ideType) {
    return this.isSupported(ideType);
  }

  /**
   * Get IDE display name
   * @param {string} ideType - IDE type
   * @returns {string} Display name
   */
  static getDisplayName(ideType) {
    const metadata = this.getMetadata(ideType);
    return metadata ? metadata.displayName || ideType : ideType;
  }

  /**
   * Get IDE description
   * @param {string} ideType - IDE type
   * @returns {string} Description
   */
  static getDescription(ideType) {
    const metadata = this.getMetadata(ideType);
    return metadata ? metadata.description || '' : '';
  }
}

module.exports = IDETypes;