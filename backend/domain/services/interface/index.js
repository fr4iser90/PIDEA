/**
 * Interface Services - Module Exports
 * 
 * This module provides exports for all interface-related services,
 * including the base interface, manager, factory, registry, and
 * specific interface implementations.
 */

// Core Interface Classes
const BaseInterface = require('./BaseInterface');
const InterfaceManager = require('./InterfaceManager');
const InterfaceFactory = require('./InterfaceFactory');
const InterfaceRegistry = require('./InterfaceRegistry');

// Specific Interface Implementations
const IDEInterface = require('./IDEInterface');

// Module exports
module.exports = {
  // Core Interface Classes
  BaseInterface,
  InterfaceManager,
  InterfaceFactory,
  InterfaceRegistry,

  // Specific Interface Implementations
  IDEInterface,

  // Convenience exports
  core: {
    BaseInterface,
    InterfaceManager,
    InterfaceFactory,
    InterfaceRegistry
  },

  implementations: {
    IDEInterface
  },

  // Factory function for creating interface manager with dependencies
  createInterfaceManager: (dependencies = {}) => {
    return new InterfaceManager(dependencies);
  },

  // Factory function for creating interface factory with dependencies
  createInterfaceFactory: (dependencies = {}) => {
    return new InterfaceFactory(dependencies);
  },

  // Factory function for creating interface registry with dependencies
  createInterfaceRegistry: (dependencies = {}) => {
    return new InterfaceRegistry(dependencies);
  },

  // Utility function to get all available interface types
  getAvailableInterfaceTypes: () => {
    return [
      'ide',
      'editor',
      'terminal',
      'browser',
      'file-system',
      'database',
      'api',
      'websocket'
    ];
  },

  // Utility function to validate interface configuration
  validateInterfaceConfig: (config) => {
    if (typeof config !== 'object' || config === null) {
      return { valid: false, error: 'Configuration must be an object' };
    }

    const requiredFields = ['name', 'type'];
    for (const field of requiredFields) {
      if (!config[field]) {
        return { valid: false, error: `Required field '${field}' is missing` };
      }
    }

    return { valid: true };
  }
};
