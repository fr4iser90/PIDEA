/**
 * Handlers Module - Application Layer
 * Exports all handlers organized by categories with unified registry and builder
 */
const UnifiedHandlerRegistry = require('./UnifiedHandlerRegistry');
const HandlerBuilder = require('./HandlerBuilder');

// Export unified registry and builder
module.exports = {
  UnifiedHandlerRegistry,
  HandlerRegistry: UnifiedHandlerRegistry, // Backward compatibility
  HandlerBuilder,
  
  // Export category methods
  buildFromCategory: UnifiedHandlerRegistry.buildFromCategory,
  getByCategory: UnifiedHandlerRegistry.getByCategory,
  
  // Export categories
  analysis: UnifiedHandlerRegistry.getByCategory('analysis'),
  generate: UnifiedHandlerRegistry.getByCategory('generate'),
  refactoring: UnifiedHandlerRegistry.getByCategory('refactoring'), // Updated from 'refactor'
  management: UnifiedHandlerRegistry.getByCategory('management')
};
