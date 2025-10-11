/**
 * InterfaceRegistry - Registry for interface type management
 * 
 * This registry provides centralized management of interface types,
 * their configurations, and metadata. It implements the Registry
 * pattern to maintain a catalog of available interface types and
 * their associated information.
 */
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');

class InterfaceRegistry {
  /**
   * Constructor for InterfaceRegistry
   * @param {Object} dependencies - Dependency injection container
   */
  constructor(dependencies = {}) {
    this.logger = dependencies.logger || new ServiceLogger('InterfaceRegistry');
    this.configService = dependencies.configService || null;
    
    // Registry storage
    this.interfaceTypes = new Map();
    this.typeCategories = new Map();
    this.typeMetadata = new Map();
    this.typeConstraints = new Map();
    
    // Registry statistics
    this.stats = {
      totalRegistered: 0,
      totalUnregistered: 0,
      activeTypes: 0,
      lastActivity: new Date()
    };
    
    this.logger.info('InterfaceRegistry initialized');
  }

  /**
   * Register an interface type with its metadata
   * @param {string} interfaceType - Interface type identifier
   * @param {Object} metadata - Interface metadata
   * @returns {void}
   */
  registerInterfaceType(interfaceType, metadata = {}) {
    if (!interfaceType || typeof interfaceType !== 'string') {
      throw new Error('interfaceType must be a non-empty string');
    }
    
    if (typeof metadata !== 'object' || metadata === null) {
      throw new Error('metadata must be an object');
    }
    
    // Validate required metadata fields
    const requiredFields = ['name', 'description', 'version'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        throw new Error(`Required metadata field '${field}' is missing`);
      }
    }
    
    // Check if type already exists
    if (this.interfaceTypes.has(interfaceType)) {
      this.logger.warn(`Interface type '${interfaceType}' is already registered, updating metadata`);
    }
    
    // Store interface type
    this.interfaceTypes.set(interfaceType, {
      ...metadata,
      registeredAt: new Date(),
      lastUpdated: new Date()
    });
    
    // Update statistics
    this.stats.totalRegistered++;
    this.stats.activeTypes = this.interfaceTypes.size;
    this.stats.lastActivity = new Date();
    
    this.logger.info(`Registered interface type: ${interfaceType}`, {
      interfaceType,
      metadata
    });
  }

  /**
   * Unregister an interface type
   * @param {string} interfaceType - Interface type to unregister
   * @returns {boolean} True if interface type was unregistered
   */
  unregisterInterfaceType(interfaceType) {
    if (!this.interfaceTypes.has(interfaceType)) {
      this.logger.warn(`Interface type not found for unregistration: ${interfaceType}`);
      return false;
    }
    
    // Remove from all registries
    this.interfaceTypes.delete(interfaceType);
    this.typeCategories.delete(interfaceType);
    this.typeMetadata.delete(interfaceType);
    this.typeConstraints.delete(interfaceType);
    
    // Update statistics
    this.stats.totalUnregistered++;
    this.stats.activeTypes = this.interfaceTypes.size;
    this.stats.lastActivity = new Date();
    
    this.logger.info(`Unregistered interface type: ${interfaceType}`);
    return true;
  }

  /**
   * Add interface type to a category
   * @param {string} interfaceType - Interface type
   * @param {string} category - Category name
   * @returns {void}
   */
  addToCategory(interfaceType, category) {
    if (!this.interfaceTypes.has(interfaceType)) {
      throw new Error(`Interface type '${interfaceType}' is not registered`);
    }
    
    if (!category || typeof category !== 'string') {
      throw new Error('category must be a non-empty string');
    }
    
    if (!this.typeCategories.has(category)) {
      this.typeCategories.set(category, new Set());
    }
    
    this.typeCategories.get(category).add(interfaceType);
    
    this.logger.debug(`Added interface type '${interfaceType}' to category '${category}'`);
  }

  /**
   * Remove interface type from a category
   * @param {string} interfaceType - Interface type
   * @param {string} category - Category name
   * @returns {boolean} True if interface type was removed from category
   */
  removeFromCategory(interfaceType, category) {
    if (!this.typeCategories.has(category)) {
      return false;
    }
    
    const categorySet = this.typeCategories.get(category);
    const removed = categorySet.delete(interfaceType);
    
    // Clean up empty categories
    if (categorySet.size === 0) {
      this.typeCategories.delete(category);
    }
    
    if (removed) {
      this.logger.debug(`Removed interface type '${interfaceType}' from category '${category}'`);
    }
    
    return removed;
  }

  /**
   * Set interface type metadata
   * @param {string} interfaceType - Interface type
   * @param {Object} metadata - Additional metadata
   * @returns {void}
   */
  setTypeMetadata(interfaceType, metadata) {
    if (!this.interfaceTypes.has(interfaceType)) {
      throw new Error(`Interface type '${interfaceType}' is not registered`);
    }
    
    if (typeof metadata !== 'object' || metadata === null) {
      throw new Error('metadata must be an object');
    }
    
    // Merge with existing metadata
    const existingMetadata = this.typeMetadata.get(interfaceType) || {};
    const mergedMetadata = {
      ...existingMetadata,
      ...metadata,
      lastUpdated: new Date()
    };
    
    this.typeMetadata.set(interfaceType, mergedMetadata);
    
    this.logger.debug(`Updated metadata for interface type: ${interfaceType}`, {
      interfaceType,
      metadata: mergedMetadata
    });
  }

  /**
   * Set interface type constraints
   * @param {string} interfaceType - Interface type
   * @param {Object} constraints - Interface constraints
   * @returns {void}
   */
  setTypeConstraints(interfaceType, constraints) {
    if (!this.interfaceTypes.has(interfaceType)) {
      throw new Error(`Interface type '${interfaceType}' is not registered`);
    }
    
    if (typeof constraints !== 'object' || constraints === null) {
      throw new Error('constraints must be an object');
    }
    
    this.typeConstraints.set(interfaceType, {
      ...constraints,
      lastUpdated: new Date()
    });
    
    this.logger.debug(`Set constraints for interface type: ${interfaceType}`, {
      interfaceType,
      constraints
    });
  }

  /**
   * Get interface type information
   * @param {string} interfaceType - Interface type
   * @returns {Object|null} Interface type information or null
   */
  getInterfaceType(interfaceType) {
    const baseInfo = this.interfaceTypes.get(interfaceType);
    if (!baseInfo) {
      return null;
    }
    
    const metadata = this.typeMetadata.get(interfaceType) || {};
    const constraints = this.typeConstraints.get(interfaceType) || {};
    
    return {
      ...baseInfo,
      metadata,
      constraints,
      categories: this.getCategoriesForType(interfaceType)
    };
  }

  /**
   * Get all registered interface types
   * @returns {Array<string>} Array of interface type identifiers
   */
  getAllInterfaceTypes() {
    return Array.from(this.interfaceTypes.keys());
  }

  /**
   * Get interface types by category
   * @param {string} category - Category name
   * @returns {Array<string>} Array of interface types in the category
   */
  getInterfaceTypesByCategory(category) {
    const categorySet = this.typeCategories.get(category);
    return categorySet ? Array.from(categorySet) : [];
  }

  /**
   * Get categories for an interface type
   * @param {string} interfaceType - Interface type
   * @returns {Array<string>} Array of categories
   */
  getCategoriesForType(interfaceType) {
    const categories = [];
    for (const [category, typeSet] of this.typeCategories.entries()) {
      if (typeSet.has(interfaceType)) {
        categories.push(category);
      }
    }
    return categories;
  }

  /**
   * Get all categories
   * @returns {Array<string>} Array of category names
   */
  getAllCategories() {
    return Array.from(this.typeCategories.keys());
  }

  /**
   * Check if interface type is registered
   * @param {string} interfaceType - Interface type
   * @returns {boolean} True if interface type is registered
   */
  isRegistered(interfaceType) {
    return this.interfaceTypes.has(interfaceType);
  }

  /**
   * Check if interface type is in category
   * @param {string} interfaceType - Interface type
   * @param {string} category - Category name
   * @returns {boolean} True if interface type is in category
   */
  isInCategory(interfaceType, category) {
    const categorySet = this.typeCategories.get(category);
    return categorySet ? categorySet.has(interfaceType) : false;
  }

  /**
   * Search interface types by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array<Object>} Array of matching interface types
   */
  searchInterfaceTypes(criteria = {}) {
    const results = [];
    
    for (const [interfaceType, info] of this.interfaceTypes.entries()) {
      let matches = true;
      
      // Check name match
      if (criteria.name && !info.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        matches = false;
      }
      
      // Check description match
      if (criteria.description && !info.description.toLowerCase().includes(criteria.description.toLowerCase())) {
        matches = false;
      }
      
      // Check version match
      if (criteria.version && info.version !== criteria.version) {
        matches = false;
      }
      
      // Check category match
      if (criteria.category && !this.isInCategory(interfaceType, criteria.category)) {
        matches = false;
      }
      
      // Check metadata match
      if (criteria.metadata) {
        const typeMetadata = this.typeMetadata.get(interfaceType) || {};
        for (const [key, value] of Object.entries(criteria.metadata)) {
          if (typeMetadata[key] !== value) {
            matches = false;
            break;
          }
        }
      }
      
      if (matches) {
        results.push(this.getInterfaceType(interfaceType));
      }
    }
    
    return results;
  }

  /**
   * Get interface type statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      categories: this.typeCategories.size,
      typesWithMetadata: this.typeMetadata.size,
      typesWithConstraints: this.typeConstraints.size
    };
  }

  /**
   * Get registry summary
   * @returns {Object} Registry summary
   */
  getSummary() {
    const categories = {};
    for (const [category, typeSet] of this.typeCategories.entries()) {
      categories[category] = Array.from(typeSet);
    }
    
    return {
      totalTypes: this.interfaceTypes.size,
      categories,
      types: this.getAllInterfaceTypes(),
      lastActivity: this.stats.lastActivity
    };
  }

  /**
   * Export registry data
   * @returns {Object} Registry data for export
   */
  exportData() {
    const data = {
      interfaceTypes: Object.fromEntries(this.interfaceTypes),
      typeCategories: Object.fromEntries(
        Array.from(this.typeCategories.entries()).map(([key, value]) => [key, Array.from(value)])
      ),
      typeMetadata: Object.fromEntries(this.typeMetadata),
      typeConstraints: Object.fromEntries(this.typeConstraints),
      stats: this.stats,
      exportedAt: new Date()
    };
    
    return data;
  }

  /**
   * Import registry data
   * @param {Object} data - Registry data to import
   * @returns {void}
   */
  importData(data) {
    if (typeof data !== 'object' || data === null) {
      throw new Error('data must be an object');
    }
    
    // Import interface types
    if (data.interfaceTypes) {
      for (const [interfaceType, info] of Object.entries(data.interfaceTypes)) {
        this.interfaceTypes.set(interfaceType, info);
      }
    }
    
    // Import categories
    if (data.typeCategories) {
      for (const [category, types] of Object.entries(data.typeCategories)) {
        this.typeCategories.set(category, new Set(types));
      }
    }
    
    // Import metadata
    if (data.typeMetadata) {
      for (const [interfaceType, metadata] of Object.entries(data.typeMetadata)) {
        this.typeMetadata.set(interfaceType, metadata);
      }
    }
    
    // Import constraints
    if (data.typeConstraints) {
      for (const [interfaceType, constraints] of Object.entries(data.typeConstraints)) {
        this.typeConstraints.set(interfaceType, constraints);
      }
    }
    
    // Update statistics
    this.stats.activeTypes = this.interfaceTypes.size;
    this.stats.lastActivity = new Date();
    
    this.logger.info('Imported registry data', {
      types: this.interfaceTypes.size,
      categories: this.typeCategories.size
    });
  }

  /**
   * Clear all registry data
   * @returns {void}
   */
  clear() {
    this.interfaceTypes.clear();
    this.typeCategories.clear();
    this.typeMetadata.clear();
    this.typeConstraints.clear();
    
    this.stats.totalRegistered = 0;
    this.stats.totalUnregistered = 0;
    this.stats.activeTypes = 0;
    this.stats.lastActivity = new Date();
    
    this.logger.info('Cleared all registry data');
  }

  /**
   * Clean up registry resources
   * @returns {void}
   */
  destroy() {
    this.clear();
    this.logger.info('InterfaceRegistry destroyed');
  }
}

module.exports = InterfaceRegistry;
