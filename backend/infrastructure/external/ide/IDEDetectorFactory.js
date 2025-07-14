
/**
 * IDE Detector Factory
 * Manages IDE-specific detectors using the factory pattern
 * Provides unified interface for detecting different IDE types
 */

const CursorDetector = require('./detectors/CursorDetector');
const VSCodeDetector = require('./detectors/VSCodeDetector');
const WindsurfDetector = require('./detectors/WindsurfDetector');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('IDEDetectorFactory');

class IDEDetectorFactory {
  constructor() {
    this.detectors = new Map();
    this.initializeDefaultDetectors();
  }

  /**
   * Initialize default IDE detectors
   */
  initializeDefaultDetectors() {
    this.registerDetector('cursor', new CursorDetector());
    this.registerDetector('vscode', new VSCodeDetector());
    this.registerDetector('windsurf', new WindsurfDetector());
  }

  /**
   * Create detector by IDE type
   * @param {string} type - IDE type (cursor, vscode, windsurf)
   * @returns {Object} IDE detector instance
   */
  createDetector(type) {
    const detector = this.detectors.get(type.toLowerCase());
    if (!detector) {
      throw new Error(`Unsupported IDE type: ${type}`);
    }
    return detector;
  }

  /**
   * Register new detector
   * @param {string} type - IDE type
   * @param {Object} detector - Detector instance
   */
  registerDetector(type, detector) {
    if (!detector || typeof detector.scanForIDEs !== 'function') {
      throw new Error('Detector must implement scanForIDEs method');
    }
    this.detectors.set(type.toLowerCase(), detector);
  }

  /**
   * Get list of available detectors
   * @returns {Array} Array of available IDE types
   */
  getAvailableDetectors() {
    return Array.from(this.detectors.keys());
  }

  /**
   * Detect all available IDEs
   * @returns {Promise<Array>} Array of detected IDEs
   */
  async detectAll() {
    const allIDEs = [];
    const detectionPromises = [];

    for (const [type, detector] of this.detectors) {
      detectionPromises.push(
        detector.scanForIDEs()
          .then(ides => {
            // Add IDE type to each detected IDE
            return ides.map(ide => ({ ...ide, ideType: type }));
          })
          .catch(error => {
            logger.error(`[IDEDetectorFactory] Error detecting ${type} IDEs:`, error.message);
            return [];
          })
      );
    }

    const results = await Promise.allSettled(detectionPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allIDEs.push(...result.value);
      }
    });

    logger.info(`[IDEDetectorFactory] Detected ${allIDEs.length} IDEs total`);
    return allIDEs;
  }

  /**
   * Detect IDEs of specific type
   * @param {string} type - IDE type to detect
   * @returns {Promise<Array>} Array of detected IDEs of specified type
   */
  async detectByType(type) {
    const detector = this.createDetector(type);
    const ides = await detector.scanForIDEs();
    return ides.map(ide => ({ ...ide, ideType: type }));
  }

  /**
   * Find available port for specific IDE type
   * @param {string} type - IDE type
   * @returns {Promise<number>} Available port number
   */
  async findAvailablePort(type) {
    const detector = this.createDetector(type);
    if (typeof detector.findAvailablePort === 'function') {
      return await detector.findAvailablePort();
    }
    throw new Error(`Detector for ${type} does not support findAvailablePort`);
  }

  /**
   * Check if specific port is available for IDE type
   * @param {number} port - Port to check
   * @param {string} type - IDE type
   * @returns {Promise<boolean>} True if port is available
   */
  async checkPort(port, type) {
    const detector = this.createDetector(type);
    if (typeof detector.checkPort === 'function') {
      return await detector.checkPort(port);
    }
    throw new Error(`Detector for ${type} does not support checkPort`);
  }

  /**
   * Get detector configuration
   * @param {string} type - IDE type
   * @returns {Object} Detector configuration
   */
  getDetectorConfig(type) {
    const detector = this.createDetector(type);
    if (typeof detector.getConfig === 'function') {
      return detector.getConfig();
    }
    return null;
  }

  /**
   * Validate detector implementation
   * @param {string} type - IDE type
   * @returns {boolean} True if detector is valid
   */
  validateDetector(type) {
    try {
      const detector = this.createDetector(type);
      const requiredMethods = ['scanForIDEs'];
      
      return requiredMethods.every(method => 
        typeof detector[method] === 'function'
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detector statistics
   * @returns {Object} Statistics about available detectors
   */
  getDetectorStats() {
    const stats = {
      totalDetectors: this.detectors.size,
      availableTypes: this.getAvailableDetectors(),
      validDetectors: 0
    };

    for (const type of this.detectors.keys()) {
      if (this.validateDetector(type)) {
        stats.validDetectors++;
      }
    }

    return stats;
  }
}

module.exports = IDEDetectorFactory; 