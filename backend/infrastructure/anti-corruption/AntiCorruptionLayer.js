/**
 * AntiCorruptionLayer - Main ACL implementation
 * Protects domain model from external system influences
 * 
 * Created: 2025-01-27
 * Purpose: Translate and validate external data before domain processing
 */

const Logger = require("@logging/Logger");
const EventBus = require("@infrastructure/messaging/EventBus");

class AntiCorruptionLayer {
  constructor(options = {}) {
    this.logger = options.logger || new Logger("AntiCorruptionLayer");
    this.eventBus = options.eventBus || new EventBus();
    
    // Translation mappings
    this.translators = new Map();
    this.validators = new Map();
    this.mappers = new Map();
    
    // Configuration
    this.strictMode = options.strictMode !== false;
    this.enableLogging = options.enableLogging !== false;
    this.maxTranslationDepth = options.maxTranslationDepth || 10;
  }

  /**
   * Register a translator for external system
   * @param {string} systemName - External system name
   * @param {Object} translator - Translator instance
   */
  registerTranslator(systemName, translator) {
    this.translators.set(systemName, translator);
    this.logger.info(`Translator registered for system: ${systemName}`);
  }

  /**
   * Register a validator for external system
   * @param {string} systemName - External system name
   * @param {Object} validator - Validator instance
   */
  registerValidator(systemName, validator) {
    this.validators.set(systemName, validator);
    this.logger.info(`Validator registered for system: ${systemName}`);
  }

  /**
   * Register a mapper for external system
   * @param {string} systemName - External system name
   * @param {Object} mapper - Mapper instance
   */
  registerMapper(systemName, mapper) {
    this.mappers.set(systemName, mapper);
    this.logger.info(`Mapper registered for system: ${systemName}`);
  }

  /**
   * Translate external data to domain model
   * @param {string} systemName - External system name
   * @param {Object} externalData - External system data
   * @param {Object} options - Translation options
   * @returns {Promise<Object>} Domain model data
   */
  async translateExternalData(systemName, externalData, options = {}) {
    try {
      this.logger.debug(`Translating external data from system: ${systemName}`);

      // Emit translation started event
      this.eventBus.emit('acl.translation.started', {
        systemName,
        timestamp: new Date().toISOString(),
        dataSize: JSON.stringify(externalData).length
      });

      // Validate external data first
      await this.validateExternalData(systemName, externalData);

      // Get translator
      const translator = this.translators.get(systemName);
      if (!translator) {
        throw new Error(`No translator found for system: ${systemName}`);
      }

      // Translate data
      const domainData = await translator.translate(externalData, options);

      // Validate translated data
      await this.validateDomainData(domainData);

      // Emit translation completed event
      this.eventBus.emit('acl.translation.completed', {
        systemName,
        timestamp: new Date().toISOString(),
        success: true
      });

      return domainData;

    } catch (error) {
      // Emit translation failed event
      this.eventBus.emit('acl.translation.failed', {
        systemName,
        timestamp: new Date().toISOString(),
        error: error.message
      });

      this.logger.error(`Translation failed for system ${systemName}:`, error);
      throw error;
    }
  }

  /**
   * Translate domain data to external format
   * @param {string} systemName - External system name
   * @param {Object} domainData - Domain model data
   * @param {Object} options - Translation options
   * @returns {Promise<Object>} External system data
   */
  async translateDomainData(systemName, domainData, options = {}) {
    try {
      this.logger.debug(`Translating domain data to system: ${systemName}`);

      // Emit reverse translation started event
      this.eventBus.emit('acl.reverse-translation.started', {
        systemName,
        timestamp: new Date().toISOString()
      });

      // Get translator
      const translator = this.translators.get(systemName);
      if (!translator) {
        throw new Error(`No translator found for system: ${systemName}`);
      }

      // Translate data
      const externalData = await translator.reverseTranslate(domainData, options);

      // Emit reverse translation completed event
      this.eventBus.emit('acl.reverse-translation.completed', {
        systemName,
        timestamp: new Date().toISOString(),
        success: true
      });

      return externalData;

    } catch (error) {
      // Emit reverse translation failed event
      this.eventBus.emit('acl.reverse-translation.failed', {
        systemName,
        timestamp: new Date().toISOString(),
        error: error.message
      });

      this.logger.error(`Reverse translation failed for system ${systemName}:`, error);
      throw error;
    }
  }

  /**
   * Validate external data
   * @param {string} systemName - External system name
   * @param {Object} externalData - External data to validate
   */
  async validateExternalData(systemName, externalData) {
    const validator = this.validators.get(systemName);
    if (!validator) {
      this.logger.warn(`No validator found for system: ${systemName}`);
      return;
    }

    const isValid = await validator.validateExternal(externalData);
    if (!isValid) {
      throw new Error(`External data validation failed for system: ${systemName}`);
    }
  }

  /**
   * Validate domain data
   * @param {Object} domainData - Domain data to validate
   */
  async validateDomainData(domainData) {
    // Basic domain data validation
    if (!domainData || typeof domainData !== 'object') {
      throw new Error('Invalid domain data: must be an object');
    }

    // Check for required domain properties
    const requiredProperties = ['id', 'type'];
    for (const prop of requiredProperties) {
      if (!domainData[prop]) {
        throw new Error(`Missing required domain property: ${prop}`);
      }
    }
  }

  /**
   * Map external field to domain field
   * @param {string} systemName - External system name
   * @param {string} externalField - External field name
   * @param {any} value - Field value
   * @returns {any} Mapped domain value
   */
  mapField(systemName, externalField, value) {
    const mapper = this.mappers.get(systemName);
    if (!mapper) {
      return value; // No mapping, return as-is
    }

    return mapper.mapField(externalField, value);
  }

  /**
   * Get translation statistics
   * @returns {Object} Translation statistics
   */
  getStatistics() {
    return {
      registeredTranslators: this.translators.size,
      registeredValidators: this.validators.size,
      registeredMappers: this.mappers.size,
      strictMode: this.strictMode,
      maxTranslationDepth: this.maxTranslationDepth
    };
  }

  /**
   * Get registered systems
   * @returns {Array} List of registered system names
   */
  getRegisteredSystems() {
    const systems = new Set();
    this.translators.forEach((_, systemName) => systems.add(systemName));
    this.validators.forEach((_, systemName) => systems.add(systemName));
    this.mappers.forEach((_, systemName) => systems.add(systemName));
    
    return Array.from(systems);
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.translators.clear();
    this.validators.clear();
    this.mappers.clear();
    this.logger.info('Anti-corruption layer cleared');
  }
}

module.exports = AntiCorruptionLayer;
