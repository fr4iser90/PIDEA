/**
 * Workflow Execution Module
 * Provides execution engines and strategies for workflow processing
 */

const SequentialExecutionEngine = require('./SequentialExecutionEngine');
const ExecutionContext = require('./ExecutionContext');
const ExecutionResult = require('./ExecutionResult');
const ExecutionQueue = require('./ExecutionQueue');

module.exports = {
    SequentialExecutionEngine,
    ExecutionContext,
    ExecutionResult,
    ExecutionQueue
}; 