/**
 * Handlers Module - Application Layer
 * Exports all handlers organized by categories with registry and builder
 */
const HandlerRegistry = require('./HandlerRegistry');
const HandlerBuilder = require('./HandlerBuilder');

// Export registry and builder
module.exports = {
  HandlerRegistry,
  HandlerBuilder,
  
  // Export category methods
  buildFromCategory: HandlerBuilder.buildFromCategory,
  getByCategory: HandlerRegistry.getByCategory,
  
  // Export categories
  analysis: HandlerRegistry.getByCategory('analysis'),
  generate: HandlerRegistry.getByCategory('generate'),
  refactor: HandlerRegistry.getByCategory('refactor'),
  management: HandlerRegistry.getByCategory('management')
};
