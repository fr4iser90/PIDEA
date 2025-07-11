/**
 * Unified Workflow Handler System - Module Exports
 * 
 * This module provides exports for the unified workflow handler system,
 * including interfaces, core components, and utilities.
 */

// Interfaces
const IHandler = require('./interfaces/IHandler');
const IHandlerAdapter = require('./interfaces/IHandlerAdapter');

// Core Components
const UnifiedWorkflowHandler = require('./UnifiedWorkflowHandler');
const HandlerRegistry = require('./HandlerRegistry');
const HandlerFactory = require('./HandlerFactory');
const HandlerValidator = require('./HandlerValidator');
const HandlerContext = require('./HandlerContext');
const HandlerResult = require('./HandlerResult');

// Adapters
const LegacyHandlerAdapter = require('./adapters/LegacyHandlerAdapter');
const CommandHandlerAdapter = require('./adapters/CommandHandlerAdapter');
const ServiceHandlerAdapter = require('./adapters/ServiceHandlerAdapter');

// Advanced Components
const HandlerMetrics = require('./HandlerMetrics');
const HandlerAudit = require('./HandlerAudit');
const HandlerOptimizer = require('./HandlerOptimizer');

// Migration Utilities
const HandlerMigrationUtility = require('./HandlerMigrationUtility');

// Exceptions
const HandlerException = require('./exceptions/HandlerException');

// Module exports
module.exports = {
  // Interfaces
  IHandler,
  IHandlerAdapter,

  // Core Components
  UnifiedWorkflowHandler,
  HandlerRegistry,
  HandlerFactory,
  HandlerValidator,
  HandlerContext,
  HandlerResult,

  // Adapters
  LegacyHandlerAdapter,
  CommandHandlerAdapter,
  ServiceHandlerAdapter,

  // Advanced Components
  HandlerMetrics,
  HandlerAudit,
  HandlerOptimizer,

  // Migration Utilities
  HandlerMigrationUtility,

  // Exceptions
  HandlerException,

  // Convenience exports
  interfaces: {
    IHandler,
    IHandlerAdapter
  },

  core: {
    UnifiedWorkflowHandler,
    HandlerRegistry,
    HandlerFactory,
    HandlerValidator,
    HandlerContext,
    HandlerResult
  },

  adapters: {
    LegacyHandlerAdapter,
    CommandHandlerAdapter,
    ServiceHandlerAdapter
  },

  advanced: {
    HandlerMetrics,
    HandlerAudit,
    HandlerOptimizer
  },

  migration: {
    HandlerMigrationUtility
  },

  exceptions: {
    HandlerException
  },

  // Factory functions for easy instantiation
  createUnifiedHandler: (dependencies = {}) => {
    return new UnifiedWorkflowHandler(dependencies);
  },

  createHandlerRegistry: (options = {}) => {
    return new HandlerRegistry(options);
  },

  createHandlerFactory: (options = {}) => {
    return new HandlerFactory(options);
  },

  createHandlerValidator: (options = {}) => {
    return new HandlerValidator(options);
  },

  createHandlerContext: (request, response, handlerId, options = {}) => {
    return new HandlerContext(request, response, handlerId, options);
  },

  createHandlerResult: (data = {}) => {
    return new HandlerResult(data);
  },

  // Utility functions
  utils: {
    /**
     * Create a complete handler system with default configuration
     * @param {Object} options - System options
     * @returns {UnifiedWorkflowHandler} Configured handler system
     */
    createHandlerSystem: (options = {}) => {
      const registry = new HandlerRegistry(options.registry || {});
      const factory = new HandlerFactory(options.factory || {});
      const validator = new HandlerValidator(options.validator || {});
      
      return new UnifiedWorkflowHandler({
        handlerRegistry: registry,
        handlerFactory: factory,
        handlerValidator: validator,
        logger: options.logger || console,
        eventBus: options.eventBus
      });
    },

    /**
     * Validate handler system configuration
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result
     */
    validateConfiguration: (config) => {
      const errors = [];
      const warnings = [];

      if (!config) {
        errors.push('Configuration is required');
        return { isValid: false, errors, warnings };
      }

      // Validate registry configuration
      if (config.registry) {
        if (config.registry.maxHandlers && config.registry.maxHandlers < 1) {
          errors.push('Registry maxHandlers must be at least 1');
        }
      }

      // Validate factory configuration
      if (config.factory) {
        if (config.factory.cacheSize && config.factory.cacheSize < 1) {
          errors.push('Factory cacheSize must be at least 1');
        }
      }

      // Validate validator configuration
      if (config.validator) {
        if (config.validator.maxRequestSize && config.validator.maxRequestSize < 1024) {
          warnings.push('Validator maxRequestSize is very small');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    },

    /**
     * Get handler system version
     * @returns {string} System version
     */
    getVersion: () => {
      return '1.0.0';
    },

    /**
     * Get handler system information
     * @returns {Object} System information
     */
    getSystemInfo: () => {
      return {
        version: '1.0.0',
        name: 'Unified Workflow Handler System',
        description: 'Core handler infrastructure for unified workflow management',
        components: [
          'UnifiedWorkflowHandler',
          'HandlerRegistry',
          'HandlerFactory',
          'HandlerValidator',
          'HandlerContext',
          'HandlerResult'
        ],
        interfaces: [
          'IHandler',
          'IHandlerAdapter'
        ]
      };
    }
  }
}; 