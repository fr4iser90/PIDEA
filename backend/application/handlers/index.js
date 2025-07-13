/**
 * Handlers Module - Application Layer
 * Exports all handlers organized by categories with HandlerRegistry and HandlerBuilder
 */
const HandlerRegistry = require('./HandlerRegistry');
const HandlerBuilder = require('./HandlerBuilder');

// Export registry and builder
module.exports = {
  HandlerRegistry,
  HandlerBuilder,
  
  // Export category methods
  buildFromCategory: HandlerRegistry.buildFromCategory,
  getByCategory: HandlerRegistry.getByCategory,
  
  // Export categories
  analysis: HandlerRegistry.getByCategory('analysis'),
  generate: HandlerRegistry.getByCategory('generate'),
  refactoring: HandlerRegistry.getByCategory('refactoring'), // Updated from 'refactor'
  management: HandlerRegistry.getByCategory('management')
};
