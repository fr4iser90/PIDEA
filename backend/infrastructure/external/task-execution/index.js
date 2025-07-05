/**
 * Task Execution Engine - Module Exports
 */

// Constants
const EXECUTION_CONSTANTS = require('./constants/ExecutionConstants');

// Utilities
const ExecutionUtils = require('./utils/ExecutionUtils');
const FileUtils = require('./utils/FileUtils');
const RefactoringUtils = require('./utils/RefactoringUtils');

// Validators
const TaskValidator = require('./validators/TaskValidator');

// Handlers
const EventHandlers = require('./handlers/EventHandlers');

// Services
const AnalysisService = require('./services/AnalysisService');
const ScriptService = require('./services/ScriptService');
const OptimizationService = require('./services/OptimizationService');
const SecurityService = require('./services/SecurityService');
const RefactoringService = require('./services/RefactoringService');
const TestingService = require('./services/TestingService');
const DeploymentService = require('./services/DeploymentService');
const CustomTaskService = require('./services/CustomTaskService');

module.exports = {
    // Constants
    EXECUTION_CONSTANTS,
    
    // Utilities
    ExecutionUtils,
    FileUtils,
    RefactoringUtils,
    
    // Validators
    TaskValidator,
    
    // Handlers
    EventHandlers,
    
    // Services
    AnalysisService,
    ScriptService,
    OptimizationService,
    SecurityService,
    RefactoringService,
    TestingService,
    DeploymentService,
    CustomTaskService
}; 