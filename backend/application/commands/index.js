/**
 * Commands Module - Application Layer
 * Exports all commands organized by categories with registry and builder
 */
const CommandRegistry = require('./CommandRegistry');
const CommandBuilder = require('./CommandBuilder');

// Export registry and builder
module.exports = {
  CommandRegistry,
  CommandBuilder,
  
  // Export category methods
  buildFromCategory: CommandBuilder.buildFromCategory,
  getByCategory: CommandRegistry.getByCategory,
  
  // Export categories
  analysis: CommandRegistry.getByCategory('analysis'),
  generate: CommandRegistry.getByCategory('generate'),
  refactor: CommandRegistry.getByCategory('refactor'),
  management: CommandRegistry.getByCategory('management')
};
