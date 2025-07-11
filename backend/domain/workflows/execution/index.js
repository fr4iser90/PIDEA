/**
 * Execution Module - Core Execution Engine Foundation
 * 
 * This module provides the core execution engine foundation for unified workflow management in PIDEA.
 * It includes execution engine, queue management, scheduling, context management, result handling,
 * execution strategies, and exception handling.
 */

// Core Execution Engine
const SequentialExecutionEngine = require('./SequentialExecutionEngine');

// Execution Context and Results
const ExecutionContext = require('./ExecutionContext');
const ExecutionResult = require('./ExecutionResult');

// Queue and Scheduling
const ExecutionQueue = require('./ExecutionQueue');
const ExecutionScheduler = require('./ExecutionScheduler');

// Execution Strategies
const BasicSequentialStrategy = require('./strategies/BasicSequentialStrategy');
const SimpleSequentialStrategy = require('./strategies/SimpleSequentialStrategy');

// Optimization and Resource Management Components
const WorkflowOptimizer = require('./WorkflowOptimizer');
const ResourceManager = require('./ResourceManager');
const ExecutionCache = require('./ExecutionCache');
const ExecutionMetrics = require('./ExecutionMetrics');
const ExecutionPredictor = require('./ExecutionPredictor');

// Optimization Subcomponents
const StepOptimizer = require('./optimization/StepOptimizer');
const WorkflowAnalyzer = require('./optimization/WorkflowAnalyzer');

// Resource Management Subcomponents
const ResourceAllocator = require('./resources/ResourceAllocator');
const ResourceMonitor = require('./resources/ResourceMonitor');

// Exceptions
const {
  ExecutionException,
  StrategyExecutionException,
  StepExecutionException,
  ExecutionTimeoutException,
  ResourceException,
  DependencyException,
  ValidationException
} = require('./exceptions/ExecutionException');

// Strategy Registry
const strategyRegistry = new Map();

// Register default strategies
strategyRegistry.set('basic', BasicSequentialStrategy);
strategyRegistry.set('simple', SimpleSequentialStrategy);

/**
 * Get execution strategy by name
 * @param {string} name - Strategy name
 * @returns {ExecutionStrategy|null} Execution strategy class
 */
function getStrategy(name) {
  return strategyRegistry.get(name) || null;
}

/**
 * Register execution strategy
 * @param {string} name - Strategy name
 * @param {ExecutionStrategy} strategyClass - Strategy class
 */
function registerStrategy(name, strategyClass) {
  strategyRegistry.set(name, strategyClass);
}

/**
 * Get all registered strategies
 * @returns {Array<string>} Strategy names
 */
function getRegisteredStrategies() {
  return Array.from(strategyRegistry.keys());
}

/**
 * Create execution engine with default configuration
 * @param {Object} options - Engine options
 * @returns {SequentialExecutionEngine} Execution engine
 */
function createExecutionEngine(options = {}) {
  return new SequentialExecutionEngine(options);
}

/**
 * Create execution context
 * @param {Object} options - Context options
 * @returns {ExecutionContext} Execution context
 */
function createExecutionContext(options = {}) {
  return new ExecutionContext(options);
}

/**
 * Create execution result
 * @param {Object} options - Result options
 * @returns {ExecutionResult} Execution result
 */
function createExecutionResult(options = {}) {
  return new ExecutionResult(options);
}

/**
 * Create execution queue
 * @param {Object} options - Queue options
 * @returns {ExecutionQueue} Execution queue
 */
function createExecutionQueue(options = {}) {
  return new ExecutionQueue(options);
}

/**
 * Create execution scheduler
 * @param {Object} options - Scheduler options
 * @returns {ExecutionScheduler} Execution scheduler
 */
function createExecutionScheduler(options = {}) {
  return new ExecutionScheduler(options);
}

module.exports = {
  // Core Execution Engine
  SequentialExecutionEngine,
  
  // Execution Context and Results
  ExecutionContext,
  ExecutionResult,
  
  // Queue and Scheduling
  ExecutionQueue,
  ExecutionScheduler,
  
  // Execution Strategies
  BasicSequentialStrategy,
  SimpleSequentialStrategy,
  
  // Optimization and Resource Management Components
  WorkflowOptimizer,
  ResourceManager,
  ExecutionCache,
  ExecutionMetrics,
  ExecutionPredictor,
  
  // Optimization Subcomponents
  StepOptimizer,
  WorkflowAnalyzer,
  
  // Resource Management Subcomponents
  ResourceAllocator,
  ResourceMonitor,
  
  // Exceptions
  ExecutionException,
  StrategyExecutionException,
  StepExecutionException,
  ExecutionTimeoutException,
  ResourceException,
  DependencyException,
  ValidationException,
  
  // Utility Functions
  getStrategy,
  registerStrategy,
  getRegisteredStrategies,
  createExecutionEngine,
  createExecutionContext,
  createExecutionResult,
  createExecutionQueue,
  createExecutionScheduler
}; 