/**
 * Domain Interfaces - Module Exports
 * 
 * This module provides exports for all domain interfaces,
 * including workflow interfaces and handler interfaces.
 */

// Workflow Interfaces
const IWorkflow = require('./IWorkflow');
const IWorkflowContext = require('./IWorkflowContext');

// Handler Interfaces
const IHandler = require('./IHandler');
const IHandlerAdapter = require('./IHandlerAdapter');

// Module exports
module.exports = {
  // Workflow Interfaces
  IWorkflow,
  IWorkflowContext,

  // Handler Interfaces
  IHandler,
  IHandlerAdapter,

  // Convenience exports
  workflow: {
    IWorkflow,
    IWorkflowContext
  },

  handler: {
    IHandler,
    IHandlerAdapter
  }
}; 