/**
 * IDETypes - Standardized IDE type definitions
 * Provides constants and utilities for IDE type management
 */
class IDETypes {
  // Standard IDE types
  static CURSOR = 'cursor';
  static VSCODE = 'vscode';
  static WINDSURF = 'windsurf';
  static JETBRAINS = 'jetbrains';
  static SUBLIME = 'sublime';

  // IDE type metadata
  static METADATA = {
    [IDETypes.CURSOR]: {
      name: 'Cursor',
      displayName: 'Cursor IDE',
      description: 'AI-powered code editor',
      defaultPort: 3000,
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'cursor',
      detectionPatterns: ['cursor', 'Cursor']
    },
    [IDETypes.VSCODE]: {
      name: 'VSCode',
      displayName: 'Visual Studio Code',
      description: 'Lightweight code editor',
      defaultPort: 3001,
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'code',
      detectionPatterns: ['vscode', 'VSCode', 'code']
    },
    [IDETypes.WINDSURF]: {
      name: 'Windsurf',
      displayName: 'Windsurf IDE',
      description: 'Modern development environment',
      defaultPort: 3002,
      supportedFeatures: ['chat', 'refactoring', 'terminal', 'git'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'windsurf',
      detectionPatterns: ['windsurf', 'Windsurf']
    },
    [IDETypes.JETBRAINS]: {
      name: 'JetBrains',
      displayName: 'JetBrains IDEs',
      description: 'Professional development tools',
      defaultPort: 3003,
      supportedFeatures: ['refactoring', 'terminal', 'git', 'extensions'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.java', '.py', '.php'],
      startupCommand: 'idea',
      detectionPatterns: ['jetbrains', 'JetBrains', 'idea', 'IntelliJ']
    },
    [IDETypes.SUBLIME]: {
      name: 'Sublime',
      displayName: 'Sublime Text',
      description: 'Fast text editor',
      defaultPort: 3004,
      supportedFeatures: ['refactoring', 'terminal', 'git'],
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
      startupCommand: 'subl',
      detectionPatterns: ['sublime', 'Sublime']
    }
  };

  /**
   * Get all available IDE types
   * @returns {Array<string>} Array of IDE type constants
   */
  static getAllTypes() {
    return Object.values(IDETypes).filter(value => typeof value === 'string');
  }

  /**
   * Check if IDE type is valid
   * @param {string} type - IDE type to validate
   * @returns {boolean} True if valid
   */
  static isValid(type) {
    return IDETypes.getAllTypes().includes(type);
  }

  /**
   * Get metadata for IDE type
   * @param {string} type - IDE type
   * @returns {Object|null} IDE metadata
   */
  static getMetadata(type) {
    return IDETypes.METADATA[type] || null;
  }

  /**
   * Get default port for IDE type
   * @param {string} type - IDE type
   * @returns {number|null} Default port
   */
  static getDefaultPort(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.defaultPort : null;
  }

  /**
   * Get supported features for IDE type
   * @param {string} type - IDE type
   * @returns {Array<string>} Supported features
   */
  static getSupportedFeatures(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.supportedFeatures : [];
  }

  /**
   * Check if IDE type supports a specific feature
   * @param {string} type - IDE type
   * @param {string} feature - Feature to check
   * @returns {boolean} True if feature is supported
   */
  static supportsFeature(type, feature) {
    const features = IDETypes.getSupportedFeatures(type);
    return features.includes(feature);
  }

  /**
   * Get detection patterns for IDE type
   * @param {string} type - IDE type
   * @returns {Array<string>} Detection patterns
   */
  static getDetectionPatterns(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.detectionPatterns : [];
  }

  /**
   * Get startup command for IDE type
   * @param {string} type - IDE type
   * @returns {string|null} Startup command
   */
  static getStartupCommand(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.startupCommand : null;
  }

  /**
   * Get display name for IDE type
   * @param {string} type - IDE type
   * @returns {string|null} Display name
   */
  static getDisplayName(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.displayName : null;
  }

  /**
   * Get description for IDE type
   * @param {string} type - IDE type
   * @returns {string|null} Description
   */
  static getDescription(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.description : null;
  }

  /**
   * Get supported file extensions for IDE type
   * @param {string} type - IDE type
   * @returns {Array<string>} Supported file extensions
   */
  static getSupportedFileExtensions(type) {
    const metadata = IDETypes.getMetadata(type);
    return metadata ? metadata.fileExtensions : [];
  }

  /**
   * Check if IDE type supports file extension
   * @param {string} type - IDE type
   * @param {string} extension - File extension to check
   * @returns {boolean} True if extension is supported
   */
  static supportsFileExtension(type, extension) {
    const extensions = IDETypes.getSupportedFileExtensions(type);
    return extensions.includes(extension);
  }
}

module.exports = IDETypes; 